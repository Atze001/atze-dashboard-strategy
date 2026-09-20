

class AtzeDashboardStrategy extends HTMLElement {
  static getCreateSuggestions(_hass) {
    return {
      title: `Atze Dashboard ${ATZE_VERSION}`,
      icon: "mdi:view-dashboard-variant",
    };
  }

  static async getConfigElement() {
    await customElements.whenDefined(
      "atze-dashboard-strategy-editor"
    );

    return document.createElement(
      "atze-dashboard-strategy-editor"
    );
  }

  static async generate(config, hass) {
    applyAtzeSidebarAccess(config);

    hideAtzeDashboardScrollbars(
      config.hide_scrollbar !== false
    );

    const [areas, devices, entities, labels] = await Promise.all([
      hass.callWS({ type: "config/area_registry/list" }),
      hass.callWS({ type: "config/device_registry/list" }),
      hass.callWS({ type: "config/entity_registry/list" }),
      hass
        .callWS({ type: "config/label_registry/list" })
        .catch(() => []),
    ]);

    const deviceById = new Map(devices.map((device) => [device.id, device]));
    RUNTIME_DEVICE_BY_ID = deviceById;

    const areaById = new Map(areas.map((area) => [area.area_id, area]));
    const registryByEntityId = new Map(
      entities.map((entity) => [entity.entity_id, entity])
    );

    const noStrategyLabelIds = matchingNoStrategyLabelIds(
      labels,
      config
    );

    const noStrategyAreaIds = new Set(
      areas
        .filter((area) =>
          areaHasNoStrategyLabel(
            area,
            noStrategyLabelIds,
            config
          )
        )
        .map((area) => area.area_id)
    );

    const includeAreasConfigured =
      Array.isArray(config.include_areas);

    const includeAreas = new Set(asArray(config.include_areas));
    const excludeAreas = new Set(asArray(config.exclude_areas));
    const excludeEntities = new Set(asArray(config.exclude_entities));

    const securityLabelIds = matchingSecurityLabelIds(
      labels,
      config
    );

    const securityEntities = entities.filter((entity) => {
      const entityId = entity.entity_id;

      if (!hass.states[entityId]) return false;
      if (entity.disabled_by) return false;
      if (
        entityHasNoStrategyLabel(
          entity,
          noStrategyLabelIds,
          config
        )
      ) {
        return false;
      }
      if (shouldHideExactEntity(config, entityId)) return false;
      if (
        noStrategyAreaIds.has(
          effectiveAreaId(entity, deviceById)
        )
      ) {
        return false;
      }
      if (config.include_hidden !== true && entity.hidden_by) {
        return false;
      }
      if (excludeEntities.has(entityId)) return false;

      const override = getOverride(
        config.entity_overrides,
        entityId
      );

      if (
        override.hidden === true ||
        override.card === "hidden"
      ) {
        return false;
      }

      return (
        domainOf(entityId) === "cover" ||
        entityHasDirectSecurityLabel(
          entity,
          securityLabelIds,
          config
        )
      );
    });

    const securityEntityIds = securityEntities.map(
      (entity) => entity.entity_id
    );

    const batteryEntities = entities.filter((entity) => {
      const entityId = entity.entity_id;

      if (!hass.states[entityId]) return false;
      if (entity.disabled_by) return false;
      if (
        entityHasNoStrategyLabel(
          entity,
          noStrategyLabelIds,
          config
        )
      ) {
        return false;
      }
      if (shouldHideExactEntity(config, entityId)) return false;
      if (
        noStrategyAreaIds.has(
          effectiveAreaId(entity, deviceById)
        )
      ) {
        return false;
      }
      if (
        config.include_hidden !== true &&
        entity.hidden_by
      ) {
        return false;
      }
      if (excludeEntities.has(entityId)) return false;

      const override = getOverride(
        config.entity_overrides,
        entityId
      );

      if (
        override.hidden === true ||
        override.card === "hidden"
      ) {
        return false;
      }

      return isBatteryEntity(hass, entity);
    });

    const usableEntities = entities.filter((entity) => {
      const entityId = entity.entity_id;

      if (!hass.states[entityId]) return false;
      if (entity.disabled_by) return false;
      if (
        entityHasNoStrategyLabel(
          entity,
          noStrategyLabelIds,
          config
        )
      ) {
        return false;
      }
      if (shouldHideExactEntity(config, entityId)) return false;
      if (
        noStrategyAreaIds.has(
          effectiveAreaId(entity, deviceById)
        )
      ) {
        return false;
      }
      if (config.include_hidden !== true && entity.hidden_by) return false;
      if (excludeEntities.has(entityId)) return false;
      if (config.hide_unavailable === true && isUnavailable(hass, entityId)) {
        return false;
      }

      if (
        config.hide_unknown === true &&
        hass.states[entityId]?.state === "unknown"
      ) {
        return false;
      }

      const override = getOverride(config.entity_overrides, entityId);
      if (override.hidden === true || override.card === "hidden") return false;

      return true;
    });

    RUNTIME_AGGREGATE_DEVICE_PARENTS =
      discoverRuntimeAggregateParents(
        hass,
        usableEntities,
        config,
        deviceById,
        areaById
      );

    RUNTIME_HIDDEN_ENTITY_IDS =
      discoverRuntimeHiddenEntities(
        hass,
        usableEntities,
        deviceById,
        areaById
      );

    const popupMap = buildDevicePopupMap(
      hass,
      usableEntities,
      config,
      deviceById,
      areaById
    );
    const entitiesByArea = new Map();

    for (const entity of usableEntities) {
      const areaId = effectiveAreaId(entity, deviceById);
      if (!areaId || !areaById.has(areaId)) continue;

      if (!entitiesByArea.has(areaId)) entitiesByArea.set(areaId, []);
      entitiesByArea.get(areaId).push(entity);
    }

    const filteredAreas = areas
      .filter((area) => {
        const override = getOverride(config.area_overrides, area.area_id);

        if (override.hidden === true) return false;
        if (noStrategyAreaIds.has(area.area_id)) return false;
        if (excludeAreas.has(area.area_id)) return false;
        if (
          includeAreasConfigured &&
          !includeAreas.has(area.area_id)
        ) {
          return false;
        }

        const count = entitiesByArea.get(area.area_id)?.length || 0;
        return config.show_empty_areas === true || count > 0;
      })
      .sort(compareAreas(config));

    const roomViews = filteredAreas.map((area) =>
      buildAreaView(
        hass,
        area,
        entitiesByArea.get(area.area_id) || [],
        config,
        popupMap,
        registryByEntityId
      )
    );

    const securityView =
      config.security_view === false
        ? null
        : buildSecurityView(
            hass,
            securityEntities,
            areaById,
            deviceById,
            config
          );

    const maintenanceView =
      config.maintenance_view === false
        ? null
        : buildMaintenanceView(
            hass,
            batteryEntities,
            areaById,
            deviceById,
            config
          );

    const customPageViews = buildCustomPageViews(config);

    const views =
      config.home_view === false
        ? [
            ...(securityView ? [securityView] : []),
            ...(maintenanceView
              ? [maintenanceView]
              : []),
            ...customPageViews,
            ...roomViews,
          ]
        : [
            buildHomeOverviewView(
              hass,
              filteredAreas,
              entitiesByArea,
              usableEntities,
              config,
              popupMap,
              areaById,
              securityEntityIds,
              batteryEntities.map(
                (entity) => entity.entity_id
              )
            ),
            ...(securityView ? [securityView] : []),
            ...(maintenanceView
              ? [maintenanceView]
              : []),
            ...customPageViews,
            ...roomViews,
          ];

    if (views.length === 0) {
      views.push({
        title: `Atze Dashboard ${ATZE_VERSION}`,
        path: "atze-dashboard",
        icon: "mdi:view-dashboard-alert-outline",
        type: "sections",
        sections: [
          {
            type: "grid",
            cards: [
              {
                type: "heading",
                heading: "Keine Bereiche gefunden",
                icon: "mdi:alert-circle-outline",
              },
              {
                type: "markdown",
                content:
                  "Die Strategy hat keine passenden Bereiche/Entitäten gefunden. " +
                  "Prüfe `include_areas`, `exclude_areas` und die Bereichszuordnung deiner Geräte.",
              },
            ],
          },
        ],
      });
    }

    return {
      title: config.title || `Atze Dashboard ${ATZE_VERSION}`,
      ...(config.kiosk_mode != null
        ? { kiosk_mode: config.kiosk_mode }
        : {}),
      views,
    };
  }
}


