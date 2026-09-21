
class AtzeDashboardStrategyEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._config = {};
    this._areas = [];
    this._labels = [];
    this._devices = [];
    this._entities = [];
    this._loading = false;
    this._draggedAreaId = null;
    this._entityVisibilityActive = false;
    this._pendingHassRender = false;
    this._entityFilter = "";
    this._favoriteFilter = "";
    this._pendingCustomPageValues = new Map();
    this._openEntityAreaIds = new Set();
    this._openEditorSections = new Set();
  }

  set hass(value) {
    const first = !this._hass;
    this._hass = value;
    if (first || this._areas.length === 0) {
      this._loadRegistries();
    } else if (this._entityVisibilityActive) {
      this._pendingHassRender = true;
    } else {
      this._render();
    }

  }

  get hass() {
    return this._hass;
  }

  setConfig(config) {
    this._config = { ...(config || {}) };
    this._render();
  }

  connectedCallback() {
    // Reset only on opening the editor, not on config or state updates.
    this._openEditorSections.clear();
    this._openEntityAreaIds.clear();
    this._entityFilter = "";
    this._favoriteFilter = "";
    this._pendingCustomPageValues.clear();
    this._entityVisibilityActive = false;
    this._pendingHassRender = false;
    this._loadRegistries();
    this._render();
  }

  async _loadRegistries() {
    if (!this._hass || this._loading) return;
    this._loading = true;

    try {
      const [areas, labels, devices, entities] =
        await Promise.all([
          this._hass.callWS({
            type: "config/area_registry/list",
          }),
          this._hass
            .callWS({
              type: "config/label_registry/list",
            })
            .catch(() => []),
          this._hass.callWS({
            type: "config/device_registry/list",
          }),
          this._hass.callWS({
            type: "config/entity_registry/list",
          }),
        ]);

      this._areas = [...(areas || [])].sort((a, b) =>
        String(a?.name || a?.area_id || "")
          .localeCompare(
            String(b?.name || b?.area_id || ""),
            "de"
          )
      );
      this._labels = labels || [];
      this._devices = devices || [];
      this._entities = entities || [];
    } catch (_error) {
      this._areas = [];
      this._labels = [];
      this._devices = [];
      this._entities = [];
    } finally {
      this._loading = false;
      this._render();
    }
  }

  _escape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  _blockedAreaIds() {
    const labelIds = matchingNoStrategyLabelIds(
      this._labels,
      this._config
    );

    return new Set(
      this._areas
        .filter((area) =>
          areaHasNoStrategyLabel(
            area,
            labelIds,
            this._config
          )
        )
        .map((area) => area.area_id)
    );
  }

  _orderedAreas() {
    return [...this._areas].sort(
      compareAreas(this._config)
    );
  }

  _eligibleAreas() {
    const blocked = this._blockedAreaIds();

    return this._orderedAreas().filter(
      (area) => !blocked.has(area.area_id)
    );
  }

  _selectedAreaIds() {
    const blocked = this._blockedAreaIds();

    if (Array.isArray(this._config.include_areas)) {
      return new Set(
        this._config.include_areas.filter(
          (areaId) => !blocked.has(areaId)
        )
      );
    }

    return new Set(
      this._eligibleAreas().map(
        (area) => area.area_id
      )
    );
  }

  _fireConfigChanged(nextConfig) {
    this._config = nextConfig;
    this._render();

    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: nextConfig },
        bubbles: true,
        composed: true,
      })
    );
  }

  _setArea(areaId, checked) {
    const selected = this._selectedAreaIds();

    if (checked) selected.add(areaId);
    else selected.delete(areaId);

    this._fireConfigChanged({
      ...this._config,
      include_areas: this._eligibleAreas()
        .filter((area) =>
          selected.has(area.area_id)
        )
        .map((area) => area.area_id),
    });
  }

  _selectAllAreas() {
    const next = { ...this._config };
    delete next.include_areas;
    this._fireConfigChanged(next);
  }

  _selectNoAreas() {
    this._fireConfigChanged({
      ...this._config,
      include_areas: [],
    });
  }

  _setAreaOrder(areaIds) {
    const areaOverrides = {
      ...(this._config.area_overrides || {}),
    };

    areaIds.forEach((areaId, index) => {
      areaOverrides[areaId] = {
        ...(areaOverrides[areaId] || {}),
        order: (index + 1) * 10,
      };
    });

    this._fireConfigChanged({
      ...this._config,
      area_overrides: areaOverrides,
    });
  }

  _moveArea(draggedAreaId, targetAreaId) {
    if (
      !draggedAreaId ||
      !targetAreaId ||
      draggedAreaId === targetAreaId
    ) {
      return;
    }

    const areaIds = this._eligibleAreas().map(
      (area) => area.area_id
    );

    const from = areaIds.indexOf(draggedAreaId);
    const to = areaIds.indexOf(targetAreaId);

    if (from < 0 || to < 0) return;

    const [moved] = areaIds.splice(from, 1);
    areaIds.splice(to, 0, moved);

    this._setAreaOrder(areaIds);
  }

  _resetAreaOrder() {
    const current = {
      ...(this._config.area_overrides || {}),
    };

    const nextOverrides = {};

    for (const [areaId, value] of Object.entries(current)) {
      const cleaned = {
        ...(value || {}),
      };

      delete cleaned.order;

      if (Object.keys(cleaned).length > 0) {
        nextOverrides[areaId] = cleaned;
      }
    }

    const next = {
      ...this._config,
    };

    if (Object.keys(nextOverrides).length > 0) {
      next.area_overrides = nextOverrides;
    } else {
      delete next.area_overrides;
    }

    this._fireConfigChanged(next);
  }

  _deviceById() {
    return new Map(
      (this._devices || []).map(
        (device) => [device.id, device]
      )
    );
  }

  _availableEntities() {
    return (this._entities || []).filter((entity) => {
      if (!entity?.entity_id) return false;
      if (entity.disabled_by) return false;
      if (isBuiltInHiddenEntity(entity.entity_id)) {
        return false;
      }

      return Boolean(
        this._hass?.states?.[entity.entity_id]
      );
    });
  }

  _entitiesForArea(areaId) {
    if (!areaId) return [];

    const deviceById = this._deviceById();

    return this._availableEntities()
      .filter((entity) => {
        return (
          effectiveAreaId(
            entity,
            deviceById
          ) === areaId
        );
      })
      .sort((a, b) => {
        const an = rawFriendlyName(
          this._hass,
          a.entity_id,
          a
        );
        const bn = rawFriendlyName(
          this._hass,
          b.entity_id,
          b
        );

        return String(an).localeCompare(
          String(bn),
          "de",
          {
            numeric: true,
            sensitivity: "base",
          }
        );
      });
  }

  _entitiesWithoutArea() {
    const deviceById = this._deviceById();
    const knownAreaIds = new Set(
      this._areas.map((area) => area.area_id)
    );

    return this._availableEntities()
      .filter((entity) => {
        const areaId = effectiveAreaId(
          entity,
          deviceById
        );

        return !areaId || !knownAreaIds.has(areaId);
      })
      .sort((a, b) => {
        const an = rawFriendlyName(
          this._hass,
          a.entity_id,
          a
        );
        const bn = rawFriendlyName(
          this._hass,
          b.entity_id,
          b
        );

        return String(an).localeCompare(
          String(bn),
          "de",
          {
            numeric: true,
            sensitivity: "base",
          }
        );
      });
  }

  _beginEntityVisibilityInteraction() {
    this._entityVisibilityActive = true;
  }

  _endEntityVisibilityInteraction() {
    window.setTimeout(() => {
      const activeElement = this.shadowRoot?.activeElement;

      if (
        activeElement?.classList?.contains("entity-visibility") ||
        activeElement?.classList?.contains("person-entity-select") ||
        activeElement?.classList?.contains("power-sensor-select") ||
        activeElement?.classList?.contains("entity-filter-input") ||
        activeElement?.classList?.contains("favorite-filter-input") ||
        activeElement?.matches?.("[data-page-key]")
      ) {
        return;
      }

      this._entityVisibilityActive = false;

      if (this._pendingHassRender) {
        this._pendingHassRender = false;
        this._render();
      }
    }, 150);
  }

  _setEntityVisibility(entityId, mode) {
    const entityOverrides = {
      ...(this._config.entity_overrides || {}),
    };

    const nextOverride = {
      ...(entityOverrides[entityId] || {}),
    };

    delete nextOverride.visibility;
    delete nextOverride.visible;
    delete nextOverride.hidden;

    if (nextOverride.card === "hidden") {
      delete nextOverride.card;
    }

    if (mode === "show") {
      nextOverride.visibility = "show";
    } else if (mode === "hide") {
      nextOverride.visibility = "hide";
    }

    if (Object.keys(nextOverride).length > 0) {
      entityOverrides[entityId] = nextOverride;
    } else {
      delete entityOverrides[entityId];
    }

    const next = {
      ...this._config,
    };

    if (Object.keys(entityOverrides).length > 0) {
      next.entity_overrides = entityOverrides;
    } else {
      delete next.entity_overrides;
    }

    this._fireConfigChanged(next);
  }

  _setFavoriteEntity(entityId, checked) {
    const favorites = asArray(
      this._config.favorite_entities
    ).map(String);

    const nextFavorites = checked
      ? [...new Set([...favorites, entityId])]
      : favorites.filter((id) => id !== entityId);

    const next = { ...this._config };

    if (nextFavorites.length > 0) {
      next.favorite_entities = nextFavorites;
    } else {
      delete next.favorite_entities;
    }

    this._fireConfigChanged(next);
  }

  _favoriteEntityRows(area) {
    return this._favoriteEntityRowsForEntities(
      this._entitiesForArea(area.area_id)
    );
  }

  _favoriteEntityRowsForEntities(entities) {
    const favorites = new Set(
      asArray(this._config.favorite_entities).map(String)
    );

    if (!entities.length) {
      return `
        <div class="entity-empty">
          Keine Entities in diesem Bereich gefunden.
        </div>
      `;
    }

    return entities.map((entity) => {
      const entityId = entity.entity_id;
      const name = rawFriendlyName(
        this._hass,
        entityId,
        entity
      );

      return `
        <label class="entity-row favorite-config-row">
          <span class="entity-copy">
            <span class="entity-name">
              ${this._escape(name)}
            </span>
            <span class="entity-meta">
              ${this._escape(domainOf(entityId))}
            </span>
            <span class="entity-id">
              ${this._escape(entityId)}
            </span>
          </span>
          <input
            class="favorite-toggle"
            type="checkbox"
            data-entity-id="${this._escape(entityId)}"
            ${favorites.has(entityId) ? "checked" : ""}
          />
        </label>
      `;
    }).join("");
  }

  _applyEntityFilter() {
    if (!this.shadowRoot) return;

    const query = String(this._entityFilter || "")
      .trim()
      .toLocaleLowerCase("de");
    let visibleRows = 0;

    for (
      const details of
        this.shadowRoot.querySelectorAll(
          ".entity-area[data-entity-area]"
        )
    ) {
      const rows = [
        ...details.querySelectorAll(
          ".entity-config-row"
        ),
      ];

      let matchesInArea = 0;

      for (const row of rows) {
        const searchText = String(row.textContent || "")
          .toLocaleLowerCase("de");
        const matches =
          !query || searchText.includes(query);

        row.hidden = !matches;

        if (matches) {
          matchesInArea += 1;
          visibleRows += 1;
        }
      }

      details.hidden =
        Boolean(query) && matchesInArea === 0;

      if (query && matchesInArea > 0) {
        details.open = true;
      }
    }

    const empty = this.shadowRoot.querySelector(
      ".entity-filter-empty"
    );

    if (empty) {
      empty.hidden = !query || visibleRows > 0;
    }
  }

  _applyFavoriteFilter() {
    if (!this.shadowRoot) return;

    const query = String(this._favoriteFilter || "")
      .trim()
      .toLocaleLowerCase("de");
    let visibleRows = 0;

    for (
      const details of
        this.shadowRoot.querySelectorAll(
          ".entity-area[data-favorite-area]"
        )
    ) {
      const rows = [
        ...details.querySelectorAll(
          ".favorite-config-row"
        ),
      ];

      let matchesInArea = 0;

      for (const row of rows) {
        const searchText = String(row.textContent || "")
          .toLocaleLowerCase("de");
        const matches =
          !query || searchText.includes(query);

        row.hidden = !matches;

        if (matches) {
          matchesInArea += 1;
          visibleRows += 1;
        }
      }

      details.hidden = Boolean(query) && matchesInArea === 0;

      if (query && matchesInArea > 0) {
        details.open = true;
      }
    }

    const empty = this.shadowRoot.querySelector(
      ".favorite-filter-empty"
    );

    if (empty) {
      empty.hidden = !query || visibleRows > 0;
    }
  }

  _entityVisibilityRows(area) {
    const entities =
      this._entitiesForArea(area.area_id);

    if (!entities.length) {
      return `
        <div class="entity-empty">
          Keine Entities in diesem Bereich gefunden.
        </div>
      `;
    }

    return entities.map((entity) => {
      const entityId = entity.entity_id;
      const mode =
        roomEntityVisibilityMode(
          this._config,
          entityId
        );

      const name = rawFriendlyName(
        this._hass,
        entityId,
        entity
      );

      const domain = domainOf(entityId);

      const autoVisible =
        shouldAutoShowRoomEntity(
          this._hass,
          entity,
          this._config
        );

      const effectiveVisible =
        mode === "show"
          ? true
          : mode === "hide"
            ? false
            : autoVisible;

      const modeLabel =
        mode === "show"
          ? "Anzeigen"
          : mode === "hide"
            ? "Ausblenden"
            : "Auto";

      return `
        <div class="entity-row entity-config-row">
          <span class="entity-copy">
            <span class="entity-name">
              ${this._escape(name)}
            </span>

            <span class="entity-status-line">
              <span
                class="entity-status ${effectiveVisible ? "visible" : "hidden"}"
              >
                ${effectiveVisible ? "Sichtbar" : "Unsichtbar"}
              </span>

              <span class="entity-mode">
                ${this._escape(modeLabel)}
              </span>
            </span>

            <span class="entity-meta">
              ${this._escape(domain)}
            </span>

            <span class="entity-id">
              ${this._escape(entityId)}
            </span>
          </span>

          <select
            class="entity-visibility"
            data-entity-id="${this._escape(entityId)}"
            aria-label="Sichtbarkeit ${this._escape(name)}"
          >
            <option value="auto" ${mode === "auto" ? "selected" : ""}>
              Auto
            </option>
            <option value="show" ${mode === "show" ? "selected" : ""}>
              Anzeigen
            </option>
            <option value="hide" ${mode === "hide" ? "selected" : ""}>
              Ausblenden
            </option>
          </select>
        </div>
      `;
    }).join("");
  }

  _setBoolean(key, value, defaultValue) {
    const next = { ...this._config };

    if (value === defaultValue) {
      delete next[key];
    } else {
      next[key] = value;
    }

    this._fireConfigChanged(next);
  }

  _effectiveBoolean(key, defaultValue) {
    const value = this._config?.[key];
    return value == null
      ? defaultValue
      : value === true;
  }

  _powerSensorOptionsHtml(selectedEntityId = "") {
    const sensors = Object.keys(
      this._hass?.states || {}
    )
      .filter((entityId) => {
        if (!entityId.startsWith("sensor.")) return false;

        const stateObj = this._hass.states[entityId];
        const deviceClass = String(
          stateObj?.attributes?.device_class || ""
        ).toLowerCase();
        const unit = String(
          stateObj?.attributes?.unit_of_measurement || ""
        ).toLowerCase();

        return (
          deviceClass === "power" ||
          ["w", "kw", "mw"].includes(unit)
        );
      })
      .map((entityId) => ({
        entityId,
        name:
          this._hass.states[entityId]?.attributes
            ?.friendly_name ||
          entityId,
      }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, "de")
      );

    return [
      `<option value="">Automatisch</option>`,
      ...sensors.map(({ entityId, name }) => `
        <option
          value="${this._escape(entityId)}"
          ${entityId === selectedEntityId ? "selected" : ""}
        >
          ${this._escape(name)}
        </option>
      `),
    ].join("");
  }

  _powerSensorSelectHtml() {
    const selected =
      String(this._config.home_power_entity || "");

    return `
      <label class="row power-sensor-setting-row">
        <span class="copy">
          <span class="name">Stromsensor</span>
          <span class="desc">
            Leistungssensor für die Strom-Kachel auf der Startseite.
          </span>
        </span>
        <select
          class="power-sensor-select"
          aria-label="Stromsensor auswählen"
        >
          ${this._powerSensorOptionsHtml(selected)}
        </select>
      </label>
    `;
  }

  _setHomePowerEntity(entityId) {
    const next = { ...this._config };
    const value = String(entityId || "");

    if (value) {
      next.home_power_entity = value;
    } else {
      delete next.home_power_entity;
    }

    this._fireConfigChanged(next);
  }

  _personOptionsHtml(selectedEntityId = "") {
    const people = Object.keys(
      this._hass?.states || {}
    )
      .filter((entityId) =>
        entityId.startsWith("person.")
      )
      .map((entityId) => ({
        entityId,
        name:
          this._hass.states[entityId]?.attributes
            ?.friendly_name ||
          entityId,
      }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, "de")
      );

    return [
      `<option value="">Nicht belegt</option>`,
      ...people.map(({ entityId, name }) => `
        <option
          value="${this._escape(entityId)}"
          ${entityId === selectedEntityId ? "selected" : ""}
        >
          ${this._escape(name)}
        </option>
      `),
    ].join("");
  }

  _personSelectHtml(index) {
    const selected =
      asArray(this._config.home_people_entities)[index] ||
      "";

    return `
      <label class="row person-setting-row">
        <span class="copy">
          <span class="name">Person ${index + 1}</span>
          <span class="desc">
            Profilbild und Anwesenheit auf der Startseite.
          </span>
        </span>
        <select
          class="person-entity-select"
          data-person-index="${index}"
          aria-label="Person ${index + 1} auswählen"
        >
          ${this._personOptionsHtml(selected)}
        </select>
      </label>
    `;
  }

  _setHomePerson(index, entityId) {
    const people = Array(5).fill("");
    asArray(this._config.home_people_entities)
      .slice(0, 5)
      .forEach((value, itemIndex) => {
        people[itemIndex] = String(value || "");
      });

    people[index] = String(entityId || "");

    const next = { ...this._config };

    if (people.some(Boolean)) {
      next.home_people_entities = people;
    } else {
      delete next.home_people_entities;
    }

    this._fireConfigChanged(next);
  }

  _toggleHtml(key, label, description, defaultValue) {
    const checked =
      this._effectiveBoolean(key, defaultValue);

    return `
      <label class="row">
        <span class="copy">
          <span class="name">${this._escape(label)}</span>
          <span class="desc">${this._escape(description)}</span>
        </span>
        <input
          class="setting-toggle"
          type="checkbox"
          data-key="${this._escape(key)}"
          data-default="${defaultValue ? "true" : "false"}"
          ${checked ? "checked" : ""}
        />
      </label>
    `;
  }

  _customPages() {
    return asArray(this._config.custom_pages).filter(
      (page) =>
        page &&
        typeof page === "object" &&
        !isSchedulerCustomPage(page)
    );
  }

  _schedulerPopupEnabled() {
    return schedulerPopupEnabled(this._config || {});
  }

  _setSchedulerPopup(value) {
    const pages = asArray(this._config.custom_pages).filter(
      (page) => !isSchedulerCustomPage(page)
    );
    const next = {
      ...this._config,
      scheduler_popup: value === true,
    };

    if (pages.length > 0) next.custom_pages = pages;
    else delete next.custom_pages;

    this._fireConfigChanged(next);
  }

  _addCustomPage(template = "empty") {
    const pages = [...this._customPages()];
    const scheduler = template === "scheduler";

    pages.push({
      title: scheduler ? "Zeitpläne" : "Eigene Seite",
      path: scheduler ? "zeitplaene" : `eigene-seite-${pages.length + 1}`,
      icon: scheduler ? "mdi:calendar-clock" : "mdi:view-dashboard-outline",
      cards: [{
        type: scheduler ? "custom:scheduler-card" : "markdown",
        ...(scheduler ? {} : { content: "# Eigene Seite" }),
      }],
    });

    this._fireConfigChanged({
      ...this._config,
      custom_pages: pages,
    });
  }

  _updateCustomPage(index, value) {
    const pages = this._customPages().map((page) => ({ ...page }));
    if (!pages[index]) return;

    pages[index] = value;
    this._fireConfigChanged({
      ...this._config,
      custom_pages: pages,
    });
  }

  _removeCustomPage(index) {
    const pages = this._customPages().filter((_, itemIndex) => itemIndex !== index);
    const next = { ...this._config };

    if (pages.length > 0) next.custom_pages = pages;
    else delete next.custom_pages;

    this._fireConfigChanged(next);
  }

  _customPageView(page, index) {
    return page.view && typeof page.view === "object"
      ? page.view
      : page.card && !page.cards && !page.sections
        ? {
            title: page.title || `Eigene Seite ${index + 1}`,
            path: page.path || `eigene-seite-${index + 1}`,
            icon: page.icon || "mdi:view-dashboard-outline",
            cards: [{ ...page.card }],
          }
        : page;
  }

  _customPageHtml(page, index) {
    const view = this._customPageView(page, index);

    return `
      <div class="custom-page" data-custom-page="${index}">
        <div class="custom-page-heading">
          <strong>${this._escape(page.title || `Eigene Seite ${index + 1}`)}</strong>
          <button class="custom-page-remove" type="button" data-index="${index}">
            Entfernen
          </button>
        </div>
        <ha-yaml-editor
          class="custom-page-yaml"
          data-page-key="view"
          data-index="${index}"
          aria-label="YAML für ${this._escape(view.title || `Eigene Seite ${index + 1}`)}"
        ></ha-yaml-editor>
      </div>
    `;
  }

  _render() {
    if (!this.shadowRoot) return;

    const blocked = this._blockedAreaIds();
    const selected = this._selectedAreaIds();
    const customPagesHtml = this._customPages()
      .map((page, index) => this._customPageHtml(page, index))
      .join("");

    const entityAreaPanels =
      this._eligibleAreas()
        .filter((area) =>
          selected.has(area.area_id)
        )
        .map((area) => `
          <details
            class="entity-area"
            data-entity-area="${this._escape(area.area_id)}"
            ${this._openEntityAreaIds.has(area.area_id) ? "open" : ""}
          >
            <summary>
              <span class="entity-summary-main">
                <ha-icon
                  icon="${this._escape(
                    area.icon || "mdi:home-outline"
                  )}"
                ></ha-icon>
                <span>
                  ${this._escape(
                    area.name || area.area_id
                  )}
                </span>
              </span>

              <span class="entity-summary-end">
                <span class="entity-count">
                  ${this._entitiesForArea(area.area_id).length}
                </span>
                <ha-icon
                  class="entity-chevron"
                  icon="mdi:chevron-right"
                ></ha-icon>
              </span>
            </summary>

            <div class="entity-rows">
              ${this._entityVisibilityRows(area)}
            </div>
          </details>
        `)
        .join("");

    const configuredFavorites = new Set(
      asArray(this._config.favorite_entities).map(String)
    );

    const assignedFavoriteAreaPanels =
      this._eligibleAreas()
        .filter((area) => selected.has(area.area_id))
        .map((area) => {
          const entities = this._entitiesForArea(area.area_id);
          const favoriteCount = entities.filter((entity) =>
            configuredFavorites.has(entity.entity_id)
          ).length;

          return `
            <details
              class="entity-area"
              data-favorite-area="${this._escape(area.area_id)}"
              ${this._openEntityAreaIds.has(area.area_id) ? "open" : ""}
            >
              <summary>
                <span class="entity-summary-main">
                  <ha-icon
                    icon="${this._escape(
                      area.icon || "mdi:home-outline"
                    )}"
                  ></ha-icon>
                  <span>${this._escape(area.name || area.area_id)}</span>
                </span>

                <span class="entity-summary-end">
                  <span class="entity-count">
                    ${favoriteCount} / ${entities.length}
                  </span>
                  <ha-icon
                    class="entity-chevron"
                    icon="mdi:chevron-right"
                  ></ha-icon>
                </span>
              </summary>

              <div class="entity-rows">
                ${this._favoriteEntityRows(area)}
              </div>
            </details>
          `;
        })
        .join("");

    const unassignedEntities = this._entitiesWithoutArea();
    const unassignedFavoriteCount = unassignedEntities.filter(
      (entity) => configuredFavorites.has(entity.entity_id)
    ).length;
    const unassignedAreaId = "__unassigned__";

    const favoriteAreaPanels = `
      ${assignedFavoriteAreaPanels}
      <details
        class="entity-area"
        data-favorite-area="${unassignedAreaId}"
        ${this._openEntityAreaIds.has(unassignedAreaId) ? "open" : ""}
      >
        <summary>
          <span class="entity-summary-main">
            <ha-icon icon="mdi:tray-remove"></ha-icon>
            <span>Ohne Bereich</span>
          </span>

          <span class="entity-summary-end">
            <span class="entity-count">
              ${unassignedFavoriteCount} / ${unassignedEntities.length}
            </span>
            <ha-icon
              class="entity-chevron"
              icon="mdi:chevron-right"
            ></ha-icon>
          </span>
        </summary>

        <div class="entity-rows">
          ${this._favoriteEntityRowsForEntities(unassignedEntities)}
        </div>
      </details>
    `;

    const areaRows = this._orderedAreas().map((area) => {
      const blockedArea = blocked.has(area.area_id);
      const checked =
        !blockedArea &&
        selected.has(area.area_id);

      return `
        <label
          class="row area-config-row ${blockedArea ? "blocked" : ""}"
          data-area-row="${this._escape(area.area_id)}"
          draggable="${blockedArea ? "false" : "true"}"
        >
          <span class="area">
            <span
              class="drag-handle"
              title="${blockedArea ? "" : "Ziehen zum Sortieren"}"
              aria-hidden="true"
            >
              <ha-icon icon="mdi:drag-vertical"></ha-icon>
            </span>
            <ha-icon
              class="area-icon"
              icon="${this._escape(
                area.icon || "mdi:home-outline"
              )}"
            ></ha-icon>
            <span class="copy">
              <span class="name">
                ${this._escape(area.name || area.area_id)}
              </span>
              ${blockedArea
                ? '<span class="desc">Label no-strategy / no-dboard</span>'
                : ""}
            </span>
          </span>
          <input
            class="area-toggle"
            type="checkbox"
            data-area-id="${this._escape(area.area_id)}"
            ${checked ? "checked" : ""}
            ${blockedArea ? "disabled" : ""}
          />
        </label>
      `;
    }).join("");

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          color: var(--primary-text-color);
          font-family: var(--ha-font-family-body, inherit);
        }
        .editor {
          display: grid;
          gap: 16px;
          padding: 4px 0 24px;
        }

        .editor-version {
          padding: 0 4px 2px;
          color: var(--secondary-text-color);
          font-size: 14px;
          font-weight: 500;
        }
        .editor-settings-divider {
          height: 1px;
          margin: 2px 12px;
          background: var(--divider-color, rgba(127,127,127,.24));
        }

        .panel {
          background: var(
            --ha-card-background,
            var(--card-background-color)
          );
          border: 1px solid var(
            --divider-color,
            rgba(127,127,127,.18)
          );
          border-radius: 16px;
          overflow: hidden;
        }

        .editor-section > summary {
          min-height: 72px;
          padding: 0 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          cursor: pointer;
          user-select: none;
          list-style: none;
        }

        .editor-section > summary::-webkit-details-marker {
          display: none;
        }

        .editor-section > summary::marker {
          content: "";
        }

        .editor-section-summary-main {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .editor-section-summary-main > ha-icon {
          width: 28px;
          height: 28px;
          color: var(--primary-color);
        }

        .editor-section-summary-title {
          font-size: 18px;
          font-weight: 600;
        }

        .editor-section-chevron {
          width: 24px;
          height: 24px;
          color: var(--secondary-text-color);
          transition: transform 160ms ease;
          flex: 0 0 auto;
        }

        .editor-section[open]
          > summary
          .editor-section-chevron {
          transform: rotate(90deg);
        }

        .editor-section-body {
          border-top: 1px solid var(
            --divider-color,
            rgba(127,127,127,.18)
          );
        }

        .editor-section-help {
          padding: 14px 18px 12px;
          color: var(--secondary-text-color);
          font-size: 13px;
          line-height: 1.4;
        }

        .header {
          padding: 16px 18px 12px;
        }
        .title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
          font-weight: 600;
        }
        .title ha-icon {
          color: var(--primary-color);
        }
        .help {
          margin-top: 6px;
          color: var(--secondary-text-color);
          font-size: 13px;
          line-height: 1.4;
        }

        .entity-filter-wrap,
        .favorite-filter-wrap {
          margin: 0 16px 14px;
          min-height: 46px;
          padding: 0 13px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid var(
            --divider-color,
            rgba(127,127,127,.22)
          );
          border-radius: 13px;
          background: var(
            --secondary-background-color,
            rgba(127,127,127,.10)
          );
        }

        .entity-filter-wrap:focus-within,
        .favorite-filter-wrap:focus-within {
          border-color: var(--primary-color, #03a9f4);
          box-shadow: 0 0 0 1px var(--primary-color, #03a9f4);
        }

        .entity-filter-wrap ha-icon,
        .favorite-filter-wrap ha-icon {
          width: 22px;
          height: 22px;
          flex: 0 0 auto;
          color: var(--secondary-text-color);
        }

        .entity-filter-input,
        .favorite-filter-input {
          min-width: 0;
          width: 100%;
          height: 44px;
          padding: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--primary-text-color);
          font: inherit;
          font-size: 15px;
        }

        .entity-filter-input::placeholder,
        .favorite-filter-input::placeholder {
          color: var(--secondary-text-color);
          opacity: 1;
        }

        .entity-filter-empty,
        .favorite-filter-empty {
          padding: 4px 18px 16px;
          color: var(--secondary-text-color);
          font-size: 13px;
        }

        /* Author display rules must not override the hidden attribute. */
        .entity-config-row[hidden],
        .entity-area[data-entity-area][hidden],
        .entity-filter-empty[hidden],
        .favorite-config-row[hidden],
        .entity-area[data-favorite-area][hidden],
        .favorite-filter-empty[hidden] {
          display: none !important;
        }

        .toolbar {
          display: flex;
          gap: 8px;
          padding: 0 16px 12px;
        }
        .toolbar button {
          border: 0;
          border-radius: 10px;
          padding: 8px 12px;
          cursor: pointer;
          background: var(
            --secondary-background-color,
            rgba(127,127,127,.12)
          );
          color: var(--primary-text-color);
          font: inherit;
        }
        .custom-pages-list {
          display: grid;
          gap: 12px;
          padding: 0 16px 16px;
        }
        .custom-page {
          display: grid;
          gap: 12px;
          padding: 14px;
          border: 1px solid var(--divider-color, rgba(127,127,127,.18));
          border-radius: 13px;
          background: var(--secondary-background-color, rgba(127,127,127,.08));
        }
        .custom-page-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .custom-page-remove {
          border: 0;
          background: transparent;
          color: var(--error-color, #db4437);
          cursor: pointer;
          font: inherit;
        }
        .custom-page-field {
          display: grid;
          gap: 5px;
          color: var(--secondary-text-color);
          font-size: 12px;
        }
        .custom-page-field input,
        .custom-page-field textarea {
          box-sizing: border-box;
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--divider-color, rgba(127,127,127,.22));
          border-radius: 10px;
          outline: 0;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font: inherit;
        }
        .custom-page-field textarea {
          resize: vertical;
          font-family: var(--code-font-family, monospace);
        }
        .custom-page-field input:focus,
        .custom-page-field textarea:focus {
          border-color: var(--primary-color, #03a9f4);
        }
        .custom-page-error {
          color: var(--error-color, #db4437);
          font-size: 12px;
        }
        .custom-page-yaml {
          display: block;
          min-height: 220px;
          --code-mirror-max-height: 55vh;
        }
        .rows {
          border-top: 1px solid var(
            --divider-color,
            rgba(127,127,127,.18)
          );
        }
        .row {
          min-height: 58px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 10px 18px;
          border-bottom: 1px solid var(
            --divider-color,
            rgba(127,127,127,.12)
          );
          cursor: pointer;
        }
        .row:last-child {
          border-bottom: 0;
        }
        .row.blocked {
          opacity: .48;
          cursor: default;
        }
        .person-entity-select,
        .power-sensor-select {
          width: min(260px, 46%);
          min-width: 150px;
          min-height: 38px;
          box-sizing: border-box;
          padding: 7px 34px 7px 10px;
          border: 1px solid var(
            --divider-color,
            rgba(127,127,127,.28)
          );
          border-radius: 10px;
          background: var(
            --card-background-color,
            var(--ha-card-background)
          );
          color: var(--primary-text-color);
          font: inherit;
        }
        .area {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .area-icon {
          width: 22px;
          height: 22px;
          color: var(--secondary-text-color);
        }
        .drag-handle {
          width: 24px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--secondary-text-color);
          cursor: grab;
          opacity: .72;
        }
        .drag-handle ha-icon {
          width: 22px;
          height: 22px;
        }
        .area-config-row.dragging {
          opacity: .42;
        }
        .area-config-row.drag-over {
          box-shadow:
            inset 0 2px 0
            var(--primary-color, #03a9f4);
        }
        .blocked .drag-handle {
          cursor: default;
          opacity: .18;
        }
        .copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .name {
          font-size: 15px;
          font-weight: 500;
        }
        .desc {
          color: var(--secondary-text-color);
          font-size: 12px;
          line-height: 1.3;
        }
        input[type="checkbox"] {
          width: 20px;
          height: 20px;
          flex: 0 0 auto;
          accent-color: var(--primary-color, #03a9f4);
          cursor: pointer;
        }
        .loading {
          padding: 20px 18px;
          color: var(--secondary-text-color);
        }

        .entity-area {
          border-top: 1px solid var(
            --divider-color,
            rgba(127,127,127,.14)
          );
        }

        .entity-area:first-child {
          border-top: 0;
        }

        .entity-area summary {
          min-height: 54px;
          padding: 10px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          cursor: pointer;
          user-select: none;
          list-style: none;
        }

        .entity-area summary::-webkit-details-marker {
          display: none;
        }

        .entity-area summary::marker {
          content: "";
        }

        .entity-summary-main,
        .entity-summary-end {
          display: flex;
          align-items: center;
        }

        .entity-summary-main {
          min-width: 0;
          gap: 10px;
          font-weight: 600;
        }

        .entity-summary-end {
          gap: 8px;
          flex: 0 0 auto;
        }

        .entity-area summary ha-icon {
          width: 20px;
          height: 20px;
          color: var(--primary-color);
        }

        .entity-chevron {
          color: var(--secondary-text-color) !important;
          transition: transform 160ms ease;
        }

        .entity-area[open] .entity-chevron {
          transform: rotate(90deg);
        }

        .entity-count {
          color: var(--secondary-text-color);
          font-size: 12px;
        }

        .entity-rows {
          border-top: 1px solid var(
            --divider-color,
            rgba(127,127,127,.10)
          );
        }

        .entity-row {
          min-height: 68px;
          padding: 10px 18px 10px 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          border-bottom: 1px solid var(
            --divider-color,
            rgba(127,127,127,.10)
          );
        }

        .entity-row:last-child {
          border-bottom: 0;
        }

        .entity-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .entity-name {
          font-size: 14px;
          font-weight: 550;
        }

        .entity-status-line {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 2px;
        }

        .entity-status {
          display: inline-flex;
          align-items: center;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.25;
        }


        .entity-status.visible {
          color: #30D158;
        }

        .entity-status.hidden {
          color: var(--secondary-text-color);
        }

        .entity-mode {
          color: var(--secondary-text-color);
          font-size: 11px;
          line-height: 1.25;
        }

        .entity-meta,
        .entity-id {
          color: var(--secondary-text-color);
          font-size: 11px;
          line-height: 1.25;
          overflow-wrap: anywhere;
        }

        .entity-visibility {
          min-width: 112px;
          flex: 0 0 auto;
          padding: 7px 8px;
          border-radius: 9px;
          border: 1px solid var(
            --divider-color,
            rgba(127,127,127,.22)
          );
          background: var(
            --secondary-background-color,
            rgba(127,127,127,.10)
          );
          color: var(--primary-text-color);
          font: inherit;
        }

        .entity-empty {
          padding: 16px 18px 16px 48px;
          color: var(--secondary-text-color);
          font-size: 13px;
        }

        @media (max-width: 600px) {
          .entity-row {
            padding-left: 18px;
            align-items: flex-start;
          }

          .entity-visibility {
            min-width: 102px;
          }
        }
      </style>

      <div class="editor">
        <div class="editor-version">
          Atze Dashboard ${ATZE_VERSION}
        </div>

        <details
          class="panel editor-section"
          data-editor-section="views"
          ${this._openEditorSections.has("views") ? "open" : ""}
        >
          <summary>
            <span class="editor-section-summary-main">
              <ha-icon icon="mdi:view-dashboard-outline"></ha-icon>
              <span class="editor-section-summary-title">Ansichten</span>
            </span>
            <ha-icon
              class="editor-section-chevron"
              icon="mdi:chevron-right"
            ></ha-icon>
          </summary>

          <div class="editor-section-body">
            <div class="rows">
              ${this._toggleHtml(
                "security_view",
                "Sicherheit anzeigen",
                "Labelbasierte Sicherheitsansicht.",
                true
              )}
              ${this._toggleHtml(
                "maintenance_view",
                "Wartung anzeigen",
                "Batterie- und Wartungsansicht.",
                true
              )}
              ${this._toggleHtml(
                "single_room_navigation",
                "Räume als Unterseiten",
                "Raumansichten als Subviews öffnen.",
                true
              )}
            </div>
          </div>
        </details>

        <details
          class="panel editor-section"
          data-editor-section="display"
          ${this._openEditorSections.has("display") ? "open" : ""}
        >
          <summary>
            <span class="editor-section-summary-main">
              <ha-icon icon="mdi:tune-variant"></ha-icon>
              <span class="editor-section-summary-title">Darstellung</span>
            </span>
            <ha-icon
              class="editor-section-chevron"
              icon="mdi:chevron-right"
            ></ha-icon>
          </summary>

          <div class="editor-section-body">
            <div class="rows">
              <label class="row">
                <span class="copy">
                  <span class="name">Zeitpläne</span>
                  <span class="desc">Zeigt auf der Startseite einen Button, der ein Bubble-Popup mit Scheduler Card öffnet.</span>
                </span>
                <input
                  class="setting-toggle"
                  type="checkbox"
                  data-key="scheduler_popup"
                  data-default="false"
                  ${this._schedulerPopupEnabled() ? "checked" : ""}
                />
              </label>
              ${this._toggleHtml(
                "force_kiosk",
                "Header ausblenden",
                "Atze-Kiosk-Fallback mit Sidebar-Menüknopf.",
                false
              )}
              ${this._toggleHtml(
                "clock_kiosk_toggle",
                "Kiosk-Modus",
                "Aktiviert oder deaktiviert Kiosk-Mode. Aus setzt ?disable_km und stellt den Home-Assistant-Header wieder her.",
                true
              )}
              ${this._toggleHtml(
                "hide_scrollbar",
                "Scrollbalken ausblenden",
                "Scrollen bleibt möglich.",
                true
              )}
            </div>
          </div>
        </details>

        <div class="editor-settings-divider" aria-hidden="true"></div>

        <details
          class="panel editor-section"
          data-editor-section="people"
          ${this._openEditorSections.has("people") ? "open" : ""}
        >
          <summary>
            <span class="editor-section-summary-main">
              <ha-icon icon="mdi:account-group-outline"></ha-icon>
              <span class="editor-section-summary-title">
                Personen / Anwesenheit
              </span>
            </span>
            <ha-icon
              class="editor-section-chevron"
              icon="mdi:chevron-right"
            ></ha-icon>
          </summary>

          <div class="editor-section-body">
            <div class="editor-section-help">
              Bis zu fünf Personen werden unter dem großen Profil auf
              der Startseite angezeigt. Zuhause erscheint das normale
              Profilbild, bei Abwesenheit wird es rot dargestellt.
            </div>
            <div class="rows">
              ${this._personSelectHtml(0)}
              ${this._personSelectHtml(1)}
              ${this._personSelectHtml(2)}
              ${this._personSelectHtml(3)}
              ${this._personSelectHtml(4)}
            </div>
          </div>
        </details>

        <details
          class="panel editor-section"
          data-editor-section="home-status"
          ${this._openEditorSections.has("home-status") ? "open" : ""}
        >
          <summary>
            <span class="editor-section-summary-main">
              <ha-icon icon="mdi:home-lightning-bolt-outline"></ha-icon>
              <span class="editor-section-summary-title">
                Startseite / Status
              </span>
            </span>
            <ha-icon
              class="editor-section-chevron"
              icon="mdi:chevron-right"
            ></ha-icon>
          </summary>

          <div class="editor-section-body">
            <div class="editor-section-help">
              Lege fest, welcher Leistungssensor für die Strom-Kachel
              verwendet wird. Ist der Sensor nicht verfügbar, wird die
              Kachel automatisch ausgeblendet.
            </div>
            <div class="rows">
              ${this._powerSensorSelectHtml()}
            </div>
          </div>
        </details>

        <details
          class="panel editor-section"
          data-editor-section="favorites"
          ${this._openEditorSections.has("favorites") ? "open" : ""}
        >
          <summary>
            <span class="editor-section-summary-main">
              <ha-icon icon="mdi:star-outline"></ha-icon>
              <span class="editor-section-summary-title">
                Favoriten
              </span>
            </span>
            <ha-icon
              class="editor-section-chevron"
              icon="mdi:chevron-right"
            ></ha-icon>
          </summary>

          <div class="editor-section-body">
            <div class="editor-section-help">
              Wähle die Entitäten aus, die auf der Startseite zwischen
              den sechs Statuskacheln und den Raum-Bildern erscheinen sollen.
              Bedienelemente lassen sich dort direkt schalten; Sensoren und
              weitere Entitäten öffnen ihre Detailansicht.
            </div>

            <div class="favorite-filter-wrap">
              <ha-icon icon="mdi:magnify"></ha-icon>
              <input
                class="favorite-filter-input"
                type="search"
                inputmode="search"
                autocomplete="off"
                placeholder="Entität suchen …"
                aria-label="Favoriten-Entitäten durchsuchen"
                value="${this._escape(this._favoriteFilter)}"
              />
            </div>

            <div class="favorite-filter-empty" hidden>
              Keine passende Entität gefunden.
            </div>

            <div class="entity-area-list">
              ${this._loading
                ? '<div class="loading">Entities werden geladen …</div>'
                : (
                    favoriteAreaPanels ||
                    '<div class="loading">Keine ausgewählten Räume gefunden.</div>'
                  )}
            </div>
          </div>
        </details>

        <details
          class="panel editor-section"
          data-editor-section="custom-pages"
          ${this._openEditorSections.has("custom-pages") ? "open" : ""}
        >
          <summary>
            <span class="editor-section-summary-main">
              <ha-icon icon="mdi:card-multiple-outline"></ha-icon>
              <span class="editor-section-summary-title">Eigene Seiten</span>
            </span>
            <ha-icon class="editor-section-chevron" icon="mdi:chevron-right"></ha-icon>
          </summary>

          <div class="editor-section-body">
            <div class="editor-section-help">
              Lege zusätzliche Dashboard-Seiten an oder kopiere die YAML einer
              vorhandenen Ansicht hinein. Verwende den Inhalt einer einzelnen
              Ansicht mit title, path und cards oder sections – ohne den äußeren
              Schlüssel views. Eigene Seiten erscheinen in der Navigation.
            </div>
            <div class="toolbar">
              <button id="add-custom-page" type="button">Leere Seite</button>
            </div>
            <div class="custom-pages-list">
              ${customPagesHtml || '<div class="loading">Noch keine eigene Seite angelegt.</div>'}
            </div>
          </div>
        </details>

        <details
          class="panel editor-section"
          data-editor-section="rooms"
          ${this._openEditorSections.has("rooms") ? "open" : ""}
        >
          <summary>
            <span class="editor-section-summary-main">
              <ha-icon icon="mdi:floor-plan"></ha-icon>
              <span class="editor-section-summary-title">Räume</span>
            </span>
            <ha-icon
              class="editor-section-chevron"
              icon="mdi:chevron-right"
            ></ha-icon>
          </summary>

          <div class="editor-section-body">
            <div class="editor-section-help">
              Wähle aus, welche Bereiche angezeigt werden.
              Ziehe Räume am Griff nach oben oder unten, um ihre
              Reihenfolge zu ändern. Bereiche mit
              <b>no-strategy</b> oder <b>no-dboard</b> bleiben
              immer ausgeblendet.
            </div>

            <div class="toolbar">
              <button id="select-all" type="button">Alle</button>
              <button id="select-none" type="button">Keine</button>
              <button id="reset-order" type="button">
                Reihenfolge zurücksetzen
              </button>
            </div>

            <div class="rows">
              ${this._loading
                ? '<div class="loading">Bereiche werden geladen …</div>'
                : (
                    areaRows ||
                    '<div class="loading">Keine Bereiche gefunden.</div>'
                  )}
            </div>
          </div>
        </details>

        <details
          class="panel editor-section"
          data-editor-section="entities"
          ${this._openEditorSections.has("entities") ? "open" : ""}
        >
          <summary>
            <span class="editor-section-summary-main">
              <ha-icon icon="mdi:format-list-checks"></ha-icon>
              <span class="editor-section-summary-title">
                Entitäten pro Raum
              </span>
            </span>
            <ha-icon
              class="editor-section-chevron"
              icon="mdi:chevron-right"
            ></ha-icon>
          </summary>

          <div class="editor-section-body">
            <div class="editor-section-help">
              Auto zeigt nur typische Bedienelemente und sinnvolle
              Sicherheits-Sensoren. Sensorwerte, Diagnose-Entities,
              Regler und Konfiguration bleiben standardmäßig in
              Badges, Popups oder Wartung. Mit Anzeigen oder
              Ausblenden kannst du jede Entity gezielt überschreiben.
            </div>

            <div class="rows">
              ${this._toggleHtml(
                "strict_room_entity_auto",
                "Strenge automatische Auswahl",
                "Empfohlen: technische Sensoren werden nicht als eigene Raumkarten angezeigt.",
                true
              )}
              ${this._toggleHtml(
                "hide_unavailable",
                "Nicht verfügbare Entitäten ausblenden",
                "Deaktivierte, entfernte oder nicht verfügbare Entitäten werden nicht als Raumkarten angezeigt.",
                false
              )}
            </div>

            <div class="entity-filter-wrap">
              <ha-icon icon="mdi:magnify"></ha-icon>
              <input
                class="entity-filter-input"
                type="search"
                inputmode="search"
                autocomplete="off"
                placeholder="Entität suchen …"
                aria-label="Entitäten pro Raum durchsuchen"
                value="${this._escape(this._entityFilter)}"
              />
            </div>

            <div class="entity-filter-empty" hidden>
              Keine passende Entität gefunden.
            </div>

            <div class="entity-area-list">
              ${this._loading
                ? '<div class="loading">Entities werden geladen …</div>'
                : (
                    entityAreaPanels ||
                    '<div class="loading">Keine ausgewählten Räume gefunden.</div>'
                  )}
            </div>
          </div>
        </details>
      </div>
    `;

    for (
      const details of
        this.shadowRoot.querySelectorAll(
          ".editor-section[data-editor-section]"
        )
    ) {
      details.addEventListener(
        "toggle",
        () => {
          const sectionId =
            details.dataset.editorSection;

          if (!sectionId) return;

          if (details.open) {
            this._openEditorSections.add(sectionId);
          } else {
            this._openEditorSections.delete(sectionId);
          }
        }
      );
    }

    this.shadowRoot
      .querySelector("#select-all")
      ?.addEventListener("click", () =>
        this._selectAllAreas()
      );

    this.shadowRoot
      .querySelector("#select-none")
      ?.addEventListener("click", () =>
        this._selectNoAreas()
      );

    this.shadowRoot
      .querySelector("#reset-order")
      ?.addEventListener("click", () =>
        this._resetAreaOrder()
      );

    this.shadowRoot
      .querySelector("#add-custom-page")
      ?.addEventListener("click", () =>
        this._addCustomPage("empty")
      );

    for (const button of this.shadowRoot.querySelectorAll(".custom-page-remove")) {
      button.addEventListener("click", () => {
        this._removeCustomPage(Number(button.dataset.index));
      });
    }

    for (const field of this.shadowRoot.querySelectorAll(".custom-page-yaml")) {
      const beginInteraction = () =>
        this._beginEntityVisibilityInteraction();
      const index = Number(field.dataset.index);
      const commitPendingValue = () => {
        const value = this._pendingCustomPageValues.get(index);
        if (!value) return;

        this._pendingCustomPageValues.delete(index);
        this._updateCustomPage(index, value);
      };

      field.addEventListener("pointerdown", beginInteraction);
      field.addEventListener("focusin", beginInteraction);
      field.addEventListener("focusout", () => {
        window.setTimeout(() => {
          if (field.matches(":focus-within")) return;
          commitPendingValue();
          this._endEntityVisibilityInteraction();
        }, 100);
      });

      field.addEventListener("value-changed", (event) => {
        event.stopPropagation();
        const value = event.detail?.value;

        if (
          event.detail?.isValid &&
          value &&
          typeof value === "object" &&
          !Array.isArray(value)
        ) {
          this._pendingCustomPageValues.set(index, value);
        }
      });

      field.addEventListener("editor-save", commitPendingValue);

      const page = this._customPages()[index];
      const value = this._customPageView(page, index);
      const initialize = () => field.setValue?.(value);

      if (customElements.get("ha-yaml-editor")) initialize();
      else customElements.whenDefined("ha-yaml-editor").then(initialize);
    }

    for (
      const row of
        this.shadowRoot.querySelectorAll(
          ".area-config-row[draggable='true']"
        )
    ) {
      row.addEventListener("dragstart", (event) => {
        const areaId = row.dataset.areaRow;
        this._draggedAreaId = areaId || null;
        row.classList.add("dragging");

        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData(
            "text/plain",
            areaId || ""
          );
        }
      });

      row.addEventListener("dragend", () => {
        this._draggedAreaId = null;

        for (
          const item of
            this.shadowRoot.querySelectorAll(
              ".area-config-row"
            )
        ) {
          item.classList.remove(
            "dragging",
            "drag-over"
          );
        }
      });

      row.addEventListener("dragover", (event) => {
        event.preventDefault();

        if (
          this._draggedAreaId &&
          this._draggedAreaId !== row.dataset.areaRow
        ) {
          row.classList.add("drag-over");

          if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "move";
          }
        }
      });

      row.addEventListener("dragleave", () => {
        row.classList.remove("drag-over");
      });

      row.addEventListener("drop", (event) => {
        event.preventDefault();
        row.classList.remove("drag-over");

        const dragged =
          this._draggedAreaId ||
          event.dataTransfer?.getData("text/plain");

        this._moveArea(
          dragged,
          row.dataset.areaRow
        );
      });
    }

    for (const input of this.shadowRoot.querySelectorAll(".area-toggle")) {
      input.addEventListener("change", (event) => {
        const target = event.currentTarget;
        this._setArea(
          target.dataset.areaId,
          target.checked
        );
      });
    }

    for (
      const details of
        this.shadowRoot.querySelectorAll(
          ".entity-area[data-entity-area], .entity-area[data-favorite-area]"
        )
    ) {
      details.addEventListener(
        "toggle",
        () => {
          const areaId =
            details.dataset.entityArea ||
            details.dataset.favoriteArea;

          if (!areaId) return;

          if (details.open) {
            this._openEntityAreaIds.add(areaId);
          } else {
            this._openEntityAreaIds.delete(areaId);
          }
        }
      );
    }

    for (
      const select of
        this.shadowRoot.querySelectorAll(
          ".entity-visibility"
        )
    ) {
      const beginInteraction = () =>
        this._beginEntityVisibilityInteraction();

      select.addEventListener(
        "pointerdown",
        beginInteraction
      );

      select.addEventListener(
        "focus",
        beginInteraction
      );

      select.addEventListener(
        "blur",
        () => this._endEntityVisibilityInteraction()
      );

      select.addEventListener(
        "change",
        (event) => {
          const target = event.currentTarget;
          const areaDetails = target.closest(
            ".entity-area[data-entity-area]"
          );
          const areaId =
            areaDetails?.dataset?.entityArea;

          if (areaDetails?.open && areaId) {
            this._openEntityAreaIds.add(areaId);
          }

          this._entityVisibilityActive = false;
          this._pendingHassRender = false;

          this._setEntityVisibility(
            target.dataset.entityId,
            target.value
          );
        }
      );
    }

    const powerSensorSelect =
      this.shadowRoot.querySelector(
        ".power-sensor-select"
      );

    if (powerSensorSelect) {
      const beginInteraction = () =>
        this._beginEntityVisibilityInteraction();

      powerSensorSelect.addEventListener(
        "pointerdown",
        beginInteraction
      );
      powerSensorSelect.addEventListener(
        "focus",
        beginInteraction
      );
      powerSensorSelect.addEventListener(
        "blur",
        () => this._endEntityVisibilityInteraction()
      );
      powerSensorSelect.addEventListener(
        "change",
        (event) => {
          this._entityVisibilityActive = false;
          this._pendingHassRender = false;
          this._setHomePowerEntity(
            event.currentTarget.value
          );
        }
      );
    }

    for (
      const select of
        this.shadowRoot.querySelectorAll(
          ".person-entity-select"
        )
    ) {
      const beginInteraction = () =>
        this._beginEntityVisibilityInteraction();

      select.addEventListener(
        "pointerdown",
        beginInteraction
      );
      select.addEventListener(
        "focus",
        beginInteraction
      );
      select.addEventListener(
        "blur",
        () => this._endEntityVisibilityInteraction()
      );
      select.addEventListener("change", (event) => {
        const target = event.currentTarget;
        this._entityVisibilityActive = false;
        this._pendingHassRender = false;
        this._setHomePerson(
          Number(target.dataset.personIndex),
          target.value
        );
      });
    }

    for (const input of this.shadowRoot.querySelectorAll(".setting-toggle")) {
      input.addEventListener("change", (event) => {
        const target = event.currentTarget;

        if (target.dataset.key === "scheduler_popup") {
          this._setSchedulerPopup(target.checked);
          return;
        }


        this._setBoolean(
          target.dataset.key,
          target.checked,
          target.dataset.default === "true"
        );
      });
    }

    for (
      const input of
        this.shadowRoot.querySelectorAll(".favorite-toggle")
    ) {
      input.addEventListener("change", (event) => {
        const target = event.currentTarget;
        this._setFavoriteEntity(
          target.dataset.entityId,
          target.checked
        );
      });
    }

    const entityFilter = this.shadowRoot.querySelector(
      ".entity-filter-input"
    );

    if (entityFilter) {
      entityFilter.addEventListener(
        "focus",
        () => this._beginEntityVisibilityInteraction()
      );

      entityFilter.addEventListener(
        "blur",
        () => this._endEntityVisibilityInteraction()
      );

      entityFilter.addEventListener("input", (event) => {
        this._entityFilter = event.currentTarget.value;
        this._applyEntityFilter();
      });
    }

    const favoriteFilter = this.shadowRoot.querySelector(
      ".favorite-filter-input"
    );

    if (favoriteFilter) {
      favoriteFilter.addEventListener(
        "focus",
        () => this._beginEntityVisibilityInteraction()
      );

      favoriteFilter.addEventListener(
        "blur",
        () => this._endEntityVisibilityInteraction()
      );

      favoriteFilter.addEventListener("input", (event) => {
        this._favoriteFilter = event.currentTarget.value;
        this._applyFavoriteFilter();
      });
    }

    this._applyEntityFilter();
    this._applyFavoriteFilter();
  }
}

if (!customElements.get("atze-dashboard-strategy-editor")) {
  customElements.define(
    "atze-dashboard-strategy-editor",
    AtzeDashboardStrategyEditor
  );
}


const strategyElement = `ll-strategy-dashboard-${STRATEGY_TYPE}`;

if (!customElements.get(strategyElement)) {
  customElements.define(strategyElement, AtzeDashboardStrategy);
}

window.customStrategies = window.customStrategies || [];

const atzeStrategyRegistration = {
  type: STRATEGY_TYPE,
  strategyType: "dashboard",
  name: "Atze Dashboard",
  description:
    "Automatisches, flexibel anpassbares Area-Dashboard mit Bubble-Card-Unterstützung.",
};

const existingAtzeStrategy = window.customStrategies.find(
  (entry) =>
    entry.type === STRATEGY_TYPE &&
    entry.strategyType === "dashboard"
);

if (existingAtzeStrategy) {
  Object.assign(
    existingAtzeStrategy,
    atzeStrategyRegistration
  );
} else {
  window.customStrategies.push(
    atzeStrategyRegistration
  );
}

console.info(
  `%c ATZE-DASHBOARD %c v${ATZE_VERSION} `,
  "background:#03a9f4;color:white;font-weight:700;padding:2px 6px;border-radius:4px 0 0 4px;",
  "background:#263238;color:white;padding:2px 6px;border-radius:0 4px 4px 0;"
);
