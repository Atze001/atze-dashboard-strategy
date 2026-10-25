
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
    this._navigationEditActive = false;
    this._pendingHassRender = false;
    this._entityFilter = "";
    this._favoriteFilter = "";
    this._pendingCustomPageValues = new Map();
    this._openEntityAreaIds = new Set();
    this._openPrimaryAreaIds = new Set();
    this._openEditorSections = new Set();
    this._dashboardBackgroundStatus = "";
    this._dashboardBackgroundError = false;
    this._backgroundFileInput = null;
    this._backgroundPickerActive = false;
  }

  set hass(value) {
    const first = !this._hass;
    this._hass = value;
    if (this._backgroundPickerActive) return;
    if (first || this._areas.length === 0) {
      this._loadRegistries();
    }
    // Live state updates are frequent. The editor uses registries and its own
    // saved configuration, so rebuilding all selectors on every update is unnecessary.

  }

  get hass() {
    return this._hass;
  }

  setConfig(config) {
    this._config = { ...(config || {}) };
    if (this._backgroundPickerActive) return;
    if (this._navigationEditActive || this._homeLayoutSelectActive) {
      this._pendingHassRender = true;
      return;
    }
    this._render();
  }

  connectedCallback() {
    // Reset only on opening the editor, not on config or state updates.
    this._openEditorSections.clear();
    this._openEntityAreaIds.clear();
    this._openPrimaryAreaIds.clear();
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

  _exportDashboardBackup() {
    try {
      const backup = {
        format: "atze-dashboard-config",
        schema_version: 1,
        exported_at: new Date().toISOString(),
        config: JSON.parse(JSON.stringify(this._config)),
      };
      const contents = JSON.stringify(backup, null, 2);
      const filename = "atze-dashboard-backup-" + new Date().toISOString().slice(0, 10) + ".json";

      // WKWebView does not reliably handle synthetic Blob downloads.
      // ATZE Home provides a native iOS share sheet for saving the JSON file.
      const nativeExport = window.webkit?.messageHandlers?.atzeBackupExport;
      if (nativeExport && typeof nativeExport.postMessage === "function") {
        nativeExport.postMessage({ filename, contents });
        return;
      }

      const blob = new Blob([contents], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      window.alert("Export fehlgeschlagen: " + (error?.message || String(error)));
    }
  }

  async _importDashboardBackup(file) {
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("Datei ist zu groß (maximal 2 MB).");
      const parsed = JSON.parse(await file.text());
      if (!parsed || parsed.format !== "atze-dashboard-config" || parsed.schema_version !== 1 ||
          !parsed.config || typeof parsed.config !== "object" || Array.isArray(parsed.config)) {
        throw new Error("Keine gültige Atze-Dashboard-Sicherungsdatei.");
      }
      const config = parsed.config;
      if (Object.keys(config).some((key) => ["__proto__", "prototype", "constructor"].includes(key))) {
        throw new Error("Ungültige Konfigurationsschlüssel.");
      }
      if (!window.confirm("Die aktuelle Dashboard-Konfiguration wird vollständig durch die Sicherung ersetzt. Fortfahren?")) return;
      this._fireConfigChanged(JSON.parse(JSON.stringify(config)));
      window.alert("Konfiguration übernommen. Bitte Dashboard-Einstellungen speichern, falls Home Assistant dies verlangt.");
    } catch (error) {
      window.alert("Import fehlgeschlagen: " + (error?.message || String(error)));
    }
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

  async _resetDirectDragLayout() {
    const keys = [];
    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key && key.startsWith("atze-dashboard:")) {
          if (
            key.startsWith("atze-dashboard:card-order:") ||
            key.startsWith("atze-dashboard:hidden-cards:") ||
            key === "atze-dashboard:home-room-order" ||
            key === "atze-dashboard:hidden-home-rooms" ||
            key === "atze-dashboard:favorite-order"
          ) keys.push(key);
        }
      }
      keys.forEach((key) => localStorage.removeItem(key));
    } catch (_e) {}
    try {
      const raw = await this._hass.callWS({ type: "lovelace/config", force: true });
      if (raw?.strategy?.type === STRATEGY_TYPE) {
        const strategy = { ...raw.strategy };
        delete strategy[ATZE_LAYOUT_FIELD];
        await this._hass.callWS({ type: "lovelace/config/save", config: { ...raw, strategy } });
        delete this._config[ATZE_LAYOUT_FIELD];
      }
    } catch (error) {
      console.error("Atze Dashboard: zentraler Drag-&-Drop-Reset fehlgeschlagen", error);
    }
    window.dispatchEvent(new Event("location-changed"));
    window.location.reload();
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

  _captureOpenEntityAreas() {
    if (!this.shadowRoot) return;

    for (
      const details of
        this.shadowRoot.querySelectorAll(
          ".entity-area[data-entity-area], .entity-area[data-favorite-area]"
        )
    ) {
      const areaId =
        details.dataset.entityArea ||
        details.dataset.favoriteArea;

      if (!areaId) continue;

      if (details.open) {
        this._openEntityAreaIds.add(areaId);
      } else {
        this._openEntityAreaIds.delete(areaId);
      }
    }
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
        activeElement?.classList?.contains("outdoor-illuminance-sensor-select") ||
        activeElement?.classList?.contains("hof-motion-sensor-select") ||
        activeElement?.classList?.contains("entity-filter-input") ||
        activeElement?.classList?.contains("favorite-filter-input") ||
        activeElement?.matches?.("[data-page-key]")
      ) {
        return;
      }

      this._entityVisibilityActive = false;

      if (this._pendingHassRender) {
        // Preserve the current details state before the deferred HA-state
        // refresh rebuilds the editor DOM. This is especially important when
        // the favorites search loses focus because an area is opened.
        this._captureOpenEntityAreas();
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

  _resetRoomEntityVisibility() {
    const overrides = this._config.entity_overrides || {};
    const changed = Object.values(overrides).some((override) =>
      override && (
        Object.prototype.hasOwnProperty.call(override, "visibility") ||
        Object.prototype.hasOwnProperty.call(override, "visible") ||
        Object.prototype.hasOwnProperty.call(override, "hidden") ||
        override.card === "hidden"
      )
    );

    if (!changed) return;
    if (!window.confirm(
      "Alle Sichtbarkeitseinstellungen für Entitäten pro Raum auf Auto zurücksetzen? Andere Entitätseinstellungen bleiben erhalten."
    )) return;

    const entityOverrides = {};
    for (const [entityId, override] of Object.entries(overrides)) {
      if (!override || typeof override !== "object") continue;
      const nextOverride = { ...override };
      delete nextOverride.visibility;
      delete nextOverride.visible;
      delete nextOverride.hidden;
      if (nextOverride.card === "hidden") delete nextOverride.card;
      if (Object.keys(nextOverride).length) {
        entityOverrides[entityId] = nextOverride;
      }
    }

    const next = { ...this._config };
    if (Object.keys(entityOverrides).length) {
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

  _setFavoriteConfirmation(entityId, checked) {
    const confirmations = asArray(
      this._config.favorite_confirm_entities
    ).map(String);

    const nextConfirmations = checked
      ? [...new Set([...confirmations, entityId])]
      : confirmations.filter((id) => id !== entityId);

    const next = { ...this._config };

    if (nextConfirmations.length > 0) {
      next.favorite_confirm_entities = nextConfirmations;
    } else {
      delete next.favorite_confirm_entities;
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
    const confirmations = new Set(
      asArray(this._config.favorite_confirm_entities).map(String)
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
          <span class="favorite-controls">
            <label class="favorite-confirm-option" title="Vor dem Ausführen bestätigen">
              <span>Bestätigen</span>
              <input
                class="favorite-confirm-toggle"
                type="checkbox"
                data-entity-id="${this._escape(entityId)}"
                ${confirmations.has(entityId) ? "checked" : ""}
                ${favorites.has(entityId) ? "" : "disabled"}
              />
            </label>
            <input
              class="favorite-toggle"
              type="checkbox"
              data-entity-id="${this._escape(entityId)}"
              ${favorites.has(entityId) ? "checked" : ""}
            />
          </span>
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

  _outdoorIlluminanceSensorOptionsHtml(selectedEntityId = "") {
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
          deviceClass === "illuminance" ||
          ["lx", "lux"].includes(unit)
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
      `<option value="">Nicht ausgewählt</option>`,
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

  _outdoorIlluminanceSensorSelectHtml() {
    const selected =
      String(this._config.home_outdoor_illuminance_entity || "");

    return `
      <label class="row outdoor-illuminance-sensor-setting-row">
        <span class="copy">
          <span class="name">Helligkeit-Aussensensor</span>
          <span class="desc">
            Helligkeitssensor für die mittige Badge auf der obersten Hauptkachel.
          </span>
        </span>
        <select
          class="outdoor-illuminance-sensor-select"
          aria-label="Helligkeit-Aussensensor auswählen"
        >
          ${this._outdoorIlluminanceSensorOptionsHtml(selected)}
        </select>
      </label>
    `;
  }

  _setHomeOutdoorIlluminanceEntity(entityId) {
    const next = { ...this._config };
    const value = String(entityId || "");

    if (value) {
      next.home_outdoor_illuminance_entity = value;
    } else {
      delete next.home_outdoor_illuminance_entity;
    }

    this._fireConfigChanged(next);
  }

  _hofMotionSensorOptionsHtml(selectedEntityId = "") {
    const sensors = Object.keys(this._hass?.states || {})
      .filter((entityId) => {
        if (!entityId.startsWith("binary_sensor.")) return false;
        const deviceClass = String(
          this._hass.states[entityId]?.attributes?.device_class || ""
        ).toLowerCase();
        return ["motion", "occupancy", "presence"].includes(deviceClass);
      })
      .map((entityId) => ({
        entityId,
        name: this._hass.states[entityId]?.attributes?.friendly_name || entityId,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "de"));

    return [
      `<option value="">Nicht ausgewählt</option>`,
      ...sensors.map(({ entityId, name }) => `
        <option value="${this._escape(entityId)}" ${entityId === selectedEntityId ? "selected" : ""}>
          ${this._escape(name)}
        </option>
      `),
    ].join("");
  }

  _hofMotionSensorSelectHtml() {
    const selected = String(this._config.hof_motion_entity || "");
    return `
      <label class="row hof-motion-sensor-setting-row">
        <span class="copy">
          <span class="name">Hof-Beleuchtungssensor</span>
          <span class="desc">
            Bewegungs-/Präsenzsensor, dessen Status die Beleuchtung im Hof-Bereichsbild steuert.
          </span>
        </span>
        <select class="hof-motion-sensor-select" aria-label="Hof-Beleuchtungssensor auswählen">
          ${this._hofMotionSensorOptionsHtml(selected)}
        </select>
      </label>
    `;
  }

  _setHofMotionEntity(entityId) {
    const next = { ...this._config };
    const value = String(entityId || "");
    if (value) next.hof_motion_entity = value;
    else delete next.hof_motion_entity;
    this._fireConfigChanged(next);
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
    const people = Array(4).fill("");
    asArray(this._config.home_people_entities)
      .slice(0, 4)
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

  _nameGroupFilters() {
    const defaults = {
      steckdose: ["steckdose", "plug", "socket", "outlet"],
      switch: ["schalter", "taster"],
      fan: ["ventilator", "lüfter", "luefter", "fan"],
      luftpflege: ["luftreiniger", "air purifier", "airpurifier", "entfeuchter", "dehumidifier"],
      cover: ["rollladen", "rollo", "jalousie", "shutter", "blind"],
    };
    const configured = this._config.name_group_filters;
    if (!configured || typeof configured !== "object") return defaults;

    const filters = { ...defaults, ...configured };
    const oldSwitchDefaults = ["steckdose", "plug", "socket", "schalter", "switch"];
    const currentSwitch = Array.isArray(configured.switch) ? configured.switch : [];
    if (
      currentSwitch.length === oldSwitchDefaults.length &&
      oldSwitchDefaults.every((word) => currentSwitch.includes(word))
    ) {
      filters.switch = defaults.switch;
    }
    return filters;
  }

  _setNameGroupFilter(group, value) {
    const filters = this._nameGroupFilters();
    const words = String(value || "").split(",").map((word) => word.trim()).filter(Boolean);
    this._fireConfigChanged({ ...this._config, name_group_filters: { ...filters, [group]: words } });
  }

  _nameGroupFilterRow(group, label, description) {
    const value = (this._nameGroupFilters()[group] || []).join(", ");
    return `<label class="row"><span class="copy"><span class="name">${this._escape(label)}</span><span class="desc">${this._escape(description)}</span></span><input class="name-group-filter" data-group="${this._escape(group)}" type="text" value="${this._escape(value)}" placeholder="Begriffe, durch Komma getrennt" /></label>`;
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

  _dashboardPages() {
    return this._customPages()
      .map((page, index) => ({ page, index }))
      .filter(({ page }) => !page.navigation_path);
  }

  _navigationPages() {
    return this._customPages()
      .map((page, index) => ({ page, index }))
      .filter(({ page }) => Boolean(page.navigation_path));
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
    if (template === "navigation") {
      pages.push({
        title: "Geräte",
        icon: "mdi:devices",
        navigation_path: "/config/devices/dashboard",
      });
      this._fireConfigChanged({ ...this._config, custom_pages: pages });
      return;
    }
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

    if (page.navigation_path) {
      return `
        <div class="custom-page" data-custom-page="${index}">
          <div class="custom-page-heading"><strong>${this._escape(page.title || "Navigation")}</strong><button class="custom-page-remove" type="button" data-index="${index}">Entfernen</button></div>
          <div class="navigation-fields">
            <label class="custom-page-field"><span>Name</span><input class="navigation-field" data-index="${index}" data-key="title" type="text" value="${this._escape(page.title || "")}" placeholder="Geräte" /></label>
            <label class="custom-page-field"><span>Icon</span><ha-selector class="navigation-selector" data-index="${index}" data-key="icon"></ha-selector></label>
            <label class="custom-page-field"><span>Ziel</span><ha-selector class="navigation-selector" data-index="${index}" data-key="navigation_path"></ha-selector></label>
          </div>
        </div>
      `;
    }

    return `
      <div class="custom-page" data-custom-page="${index}">
        <div class="custom-page-heading">
          <strong>${this._escape(page.title || `Eigene Seite ${index + 1}`)}</strong>
          <button class="custom-page-remove" type="button" data-index="${index}">Entfernen</button>
        </div>
        <ha-yaml-editor class="custom-page-yaml" data-page-key="view" data-index="${index}" aria-label="YAML für ${this._escape(view.title || `Eigene Seite ${index + 1}`)}"></ha-yaml-editor>
      </div>
    `;
  }


  _energySourceOptionsHtml(selected = "") {
    const options = Object.entries(this._hass?.states || {})
      .filter(([id, state]) => id.startsWith("sensor.") &&
        state.attributes?.device_class === "energy" &&
        ["kWh"].includes(state.attributes?.unit_of_measurement) &&
        ["total", "total_increasing"].includes(state.attributes?.state_class))
      .sort((a, b) => String(a[1].attributes?.friendly_name || a[0])
        .localeCompare(String(b[1].attributes?.friendly_name || b[0]), "de"));
    return '<option value="">Bitte kWh-Quelle auswählen</option>' +
      options.map(([id, state]) => '<option value="' + this._escape(id) + '"' +
        (id === selected ? ' selected' : '') + '>' +
        this._escape(state.attributes?.friendly_name || id) + ' (' +
        this._escape(id) + ')</option>').join("") +
      (selected && !options.some(([id]) => id === selected)
        ? '<option selected value="' + this._escape(selected) + '">' +
          this._escape(selected) + ' (nicht verfügbar)</option>' : "");
  }

  _energyMeterOptionsHtml(selected = "") {
    const states = this._hass?.states || {};
    const options = Object.entries(states)
      .filter(([id, state]) => id.startsWith("sensor.") &&
        state.attributes?.device_class === "energy" &&
        ["kWh"].includes(state.attributes?.unit_of_measurement))
      .sort((a, b) => String(a[1].attributes?.friendly_name || a[0])
        .localeCompare(String(b[1].attributes?.friendly_name || b[0]), "de"));
    return '<option value="">Noch nicht zugeordnet</option>' +
      options.map(([id, state]) => '<option value="' + this._escape(id) + '"' +
        (id === selected ? ' selected' : '') + '>' +
        this._escape(state.attributes?.friendly_name || id) + '</option>').join("") +
      (selected && !options.some(([id]) => id === selected)
        ? '<option selected value="' + this._escape(selected) + '">' +
          this._escape(selected) + ' (nicht verfügbar)</option>' : "");
  }

  _setEnergySetupField(key, value) {
    const setup = { ...(this._config.energy_setup || {}) };
    if (value) setup[key] = value;
    else delete setup[key];
    const next = { ...this._config };
    if (Object.keys(setup).length) next.energy_setup = setup;
    else delete next.energy_setup;
    this._fireConfigChanged(next);
  }

  _energySetupHtml() {
    const setup = this._config.energy_setup || {};
    const fields = [["year", "Jahr · automatisch 1. Januar"],
      ["month", "Monat · nur manuell"], ["day", "Tag · nur manuell"]];
    return `
      <div class="editor-section-help">
        Wähle einen fortlaufenden Energiesensor (kWh). Vorhandene Zähler
        können direkt zugeordnet werden. Fehlende Utility-Meter-Helfer lassen
        sich anschließend automatisch anlegen. Jahr setzt sich am 1. Januar
        zurück; Monat und Tag nur manuell. Bestehende Zähler werden nie überschrieben.
      </div>
      <label class="primary-field"><span>kWh-Quellsensor</span>
        <select class="energy-setup-field" data-key="total">
          ${this._energySourceOptionsHtml(setup.total || "")}
        </select>
      </label>
      ${fields.map(([key, title]) => `
        <label class="primary-field"><span>${title}</span>
          <select class="energy-setup-field" data-key="${key}">
            ${this._energyMeterOptionsHtml(setup[key] || "")}
          </select>
        </label>`).join("")}
      <div class="toolbar">
        <button id="energy-create-meters" type="button"
          ${!setup.total ? "disabled" : ""}>Fehlende Zähler anlegen (Jahr / Monat / Tag)</button>
      </div>
      <div class="editor-section-help" id="energy-setup-status" role="status">
        Nur neue Helfer werden angelegt. Ein Vorgabewert kann nach der
        Zuordnung unten gesetzt werden.
      </div>
      ${fields.map(([key, title]) => `
        <label class="primary-field"><span>${title.split(" · ")[0]} · Vorgabewert (kWh)</span>
          <span style="display:flex;gap:8px;align-items:center">
            <input class="energy-calibration-value" data-key="${key}"
              type="number" step="any" min="0" placeholder="z. B. 0"
              style="min-width:0;flex:1" />
            <button class="energy-calibrate" data-key="${key}" type="button"
              ${!setup[key] ? "disabled" : ""}>Setzen</button>
            ${key !== "year" ? `<button class="energy-reset" data-key="${key}"
              type="button" ${!setup[key] ? "disabled" : ""}>Reset</button>` : ""}
          </span>
        </label>`).join("")}
      <div class="editor-section-help">
        Kalibrieren setzt den gewählten Zähler auf den eingegebenen Wert.
        Reset setzt Monat oder Tag nach Bestätigung auf 0 kWh.
        Die Zähler werden in Home Assistant gespeichert.
      </div>`;
  }

  async _createEnergyMeters(status) {
    // Use verified flow for year, month and day, one at a time.
    if (this._creatingEnergyMeters) return;
    const setup = { ...(this._config.energy_setup || {}) };
    const source = setup.total;
    const attributes = this._hass?.states?.[source]?.attributes;
    if (!source?.startsWith("sensor.") ||
        attributes?.device_class !== "energy" ||
        attributes?.unit_of_measurement !== "kWh" ||
        !["total", "total_increasing"].includes(attributes?.state_class)) {
      status.textContent = "Bitte einen fortlaufenden kWh-Energiesensor auswählen.";
      return;
    }
    const missing = [["year", "Jahr", "jahr"], ["month", "Monat", "monat"], ["day", "Tag", "tag"]]
      .filter(([key]) => !setup[key]);
    if (!missing.length) {
      status.textContent = "Jahres-, Monats- und Tageszähler sind bereits zugeordnet.";
      return;
    }
    const registry = () => this._hass.callWS({ type: "config/entity_registry/list" });
    const before = await registry();
    const sourceEntry = before.find(e => e.entity_id === source);
    const device = this._devices.find(d => d.id === sourceEntry?.device_id);
    const deviceName = String(device?.name_by_user || device?.name || "").trim();
    const sourceFriendly = String(attributes.friendly_name || "").trim();
    let localName = sourceFriendly;
    if (deviceName) {
      if (!sourceFriendly.toLocaleLowerCase("de-DE").startsWith(
          deviceName.toLocaleLowerCase("de-DE") + " ")) {
        status.textContent = "Der Gerätename (" + deviceName +
          ") passt nicht zum Sensornamen (" + sourceFriendly +
          "). Keine Erstellung, damit keine doppelten Namen entstehen.";
        return;
      }
      localName = sourceFriendly.slice(deviceName.length).trim();
    }
    if (!localName) {
      status.textContent = "Sensornamen-Anteil konnte nicht ermittelt werden. Kein Helfer erstellt.";
      return;
    }
    // Native cycle=none keeps these meters running until an explicit manual reset.
    if (!window.confirm("Fehlende Jahres-, Monats- und Tageszähler anlegen?\n\n" +
      missing.map(([, label, suffix]) =>
        "Name: " + localName + " " + label +
        "\nEntitäts-ID: " + source + "_" + suffix).join("\n\n") +
      "\n\nJahr automatisch am 1. Januar; Monat/Tag nur manuell. Bestehende Zähler bleiben unverändert.")) return;
    const button = this.shadowRoot.querySelector("#energy-create-meters");
    this._creatingEnergyMeters = true;
    if (button) button.disabled = true;
    try {
      for (const [key, label, suffix] of missing) {
        const expectedId = source + "_" + suffix;
        const name = localName + " " + label;
        const entriesBefore = await registry();
        if (entriesBefore.some(e => e.entity_id === expectedId)) {
          status.textContent = expectedId +
            " existiert bereits. Bitte zuordnen; es wurde kein weiterer Helfer erstellt.";
          return;
        }
        const legacy = entriesBefore.filter(e => e.platform === "utility_meter" &&
          e.entity_id?.endsWith("_" + source.split(".")[1] + "_" + suffix));
        if (legacy.length) {
          status.textContent = "Möglicherweise bereits vorhandener " + label +
            "-Zähler: " + legacy.map(e => e.entity_id).join(", ") +
            ". Bitte erst zuordnen, damit kein Duplikat entsteht.";
          return;
        }
        status.textContent = label + " wird angelegt …";
        const init = await this._hass.callApi("POST",
          "config/config_entries/flow", { handler: "utility_meter" });
        if (init.type !== "form" || !init.flow_id) {
          throw Error("Utility-Meter-Einrichtungsdialog nicht verfügbar.");
        }
        const result = await this._hass.callApi("POST",
          "config/config_entries/flow/" + encodeURIComponent(init.flow_id),
          { name, source, cycle: key === "year" ? "yearly" : "none", offset: 0, tariffs: [],
            net_consumption: false, delta_values: false, periodically_resetting: true });
        if (result.type !== "create_entry") {
          throw Error(label + ": Home Assistant hat die Anlage nicht bestätigt: " +
            (result.errors ? JSON.stringify(result.errors) : result.type));
        }
        const previousIds = new Set(entriesBefore.map(e => e.entity_id));
        let created = "";
        for (let attempt = 0; attempt < 12 && !created; attempt++) {
          const entries = await registry();
          const added = entries.filter(e => e.platform === "utility_meter" &&
            e.entity_id?.startsWith("sensor.") && !previousIds.has(e.entity_id));
          if (added.some(e => e.entity_id === expectedId)) created = expectedId;
          else if (added.length === 1) created = added[0].entity_id;
          if (!created) await new Promise(resolve => setTimeout(resolve, 500));
        }
        if (!created) {
          status.textContent = label + " wurde angelegt, Entitäts-ID aber nicht erkannt. " +
            "Bitte Home Assistant prüfen und nicht erneut anlegen.";
          return;
        }
        if (created !== expectedId) {
          status.textContent = label + " wurde mit falscher Entitäts-ID angelegt: " +
            created + " (erwartet " + expectedId +
            "). Keine nachträgliche Umbenennung. Bitte nicht erneut anlegen.";
          return;
        }
        setup[key] = created;
        this._config = { ...this._config, energy_setup: { ...setup } };
        this.dispatchEvent(new CustomEvent("config-changed", {
          detail: { config: this._config }, bubbles: true, composed: true
        }));
        const current = this.shadowRoot.querySelector("#energy-setup-status");
        if (current) current.textContent = label + " korrekt angelegt: " + created;
      }
      this._fireConfigChanged({ ...this._config, energy_setup: setup });
      const current = this.shadowRoot.querySelector("#energy-setup-status");
      if (current) current.textContent = "Alle fehlenden Zähler korrekt eingerichtet.";
    } catch (error) {
      const current = this.shadowRoot.querySelector("#energy-setup-status") || status;
      current.textContent = "Erstellung fehlgeschlagen: " + (error?.message || error);
      console.error("ATZE Strom: Zähler-Erstellung", error);
    } finally {
      this._creatingEnergyMeters = false;
      if (button?.isConnected) button.disabled = false;
    }
  }

  async _calibrateEnergyMeter(key, value, status) {
    const entityId = this._config.energy_setup?.[key];
    const number = Number(String(value).replace(",", "."));
    if (!entityId || !this._hass?.states?.[entityId]) {
      status.textContent = "Zähler nicht verfügbar oder noch nicht zugeordnet.";
      return;
    }
    if (String(value).trim() === "" || !Number.isFinite(number) || number < 0) {
      status.textContent = "Bitte einen gültigen, nichtnegativen kWh-Wert eingeben.";
      return;
    }
    if (!window.confirm(entityId + " wirklich auf " + number + " setzen?")) return;
    try {
      await this._hass.callService("utility_meter", "calibrate",
        { value: number }, { entity_id: entityId });
      status.textContent = entityId + " auf " + number + " gesetzt.";
    } catch (error) { status.textContent = "Kalibrierung fehlgeschlagen: " + error; }
  }

  _render() {
    if (!this.shadowRoot || this._backgroundPickerActive) return;

    const blocked = this._blockedAreaIds();
    const selected = this._selectedAreaIds();
    const customPagesHtml = this._dashboardPages()
      .map(({ page, index }) => this._customPageHtml(page, index))
      .join("");
    const navigationPagesHtml = this._navigationPages()
      .map(({ page, index }) => this._customPageHtml(page, index))
      .join("");

    const sensorRoles = [
      ["temperature", "Temperatur", "sensor"],
      ["humidity", "Luftfeuchtigkeit", "sensor"],
      ["presence", "Präsenz / Bewegung", "binary_sensor"],
      ["energy", "Stromverbrauch (kWh)", "sensor"],
      ["power", "Aktuelle Leistung (W)", "sensor"],
    ];
    const primarySensorHtml = this._eligibleAreas()
      .filter(area => selected.has(area.area_id))
      .map(area => {
        const values = this._config.area_overrides?.[area.area_id]?.primary_sensors || {};
        return `<details class="entity-area primary-area" data-primary-area="${this._escape(area.area_id)}"
          ${this._openPrimaryAreaIds.has(area.area_id) ? "open" : ""}>
          <summary><span class="entity-summary-main"><ha-icon icon="${this._escape(area.icon || "mdi:home-outline")}"></ha-icon>
          <span>${this._escape(area.name || area.area_id)}</span></span>
          <span class="entity-summary-end"><span class="entity-count">${sensorRoles.filter(([key]) => values[key]).length}/5</span>
          <ha-icon class="entity-chevron" icon="mdi:chevron-right"></ha-icon></span></summary>
          <div class="primary-fields"></div></details>`;
      }).join("");

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
        >
          <span class="area">\n            <ha-icon
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
          padding: 12px 12px 24px;
          border-radius: 18px;
          background: rgba(10, 12, 16, 0.72);
        }

        .primary-fields { display:grid; gap:12px; padding:14px 16px; }
        .primary-field { display:grid; gap:6px; min-width:0; font-size:13px; }
        .primary-selector { width:100%; min-width:0; }
        .primary-area { margin-bottom:8px; }
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
          background: rgba(24, 26, 31, 0.96);
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
        .navigation-fields {
          display: grid;
          gap: 12px;
        }
        .navigation-fields .custom-page-field input {
          min-width: 0;
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
        .power-sensor-select,
        .outdoor-illuminance-sensor-select,
        .hof-motion-sensor-select {
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

        .favorite-controls {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .favorite-confirm-option {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: var(--secondary-text-color);
          font-size: 12px;
          white-space: nowrap;
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
              <label class="row"><span class="copy"><span class="name">Hauptdashboard</span><span class="desc">Raumbilder oder kompakte Raumbuttons anzeigen.</span></span><div class="home-dashboard-layout-buttons" style="display:flex;gap:6px;flex-wrap:wrap;"><button type="button" data-layout="standard" aria-pressed="${this._config.home_dashboard_layout !== "compact"}" style="padding:9px 12px;border-radius:10px;${this._config.home_dashboard_layout !== "compact" ? "background:var(--primary-color);color:white;" : ""}">Standard</button><button type="button" data-layout="compact" aria-pressed="${this._config.home_dashboard_layout === "compact"}" style="padding:9px 12px;border-radius:10px;${this._config.home_dashboard_layout === "compact" ? "background:var(--primary-color);color:white;" : ""}">Kompakt</button></div></label>
              <label class="row">
                <span class="copy">
                  <span class="name">Zeitpläne</span>
                  <span class="desc">Zeigt auf der Startseite einen Button, der ein Popup mit Scheduler Card öffnet.</span>
                </span>
                <input
                  class="setting-toggle"
                  type="checkbox"
                  data-key="scheduler_popup"
                  data-default="false"
                  ${this._schedulerPopupEnabled() ? "checked" : ""}
                />
              </label>
              <div class="dashboard-background-setting" style="padding:16px 18px;border-bottom:1px solid var(--divider-color, rgba(127,127,127,.24));">
                <div class="name" style="font-weight:600;">Dashboard-Hintergrundbild</div>
                <div class="desc" style="margin-top:6px;color:var(--secondary-text-color);font-size:13px;">Foto vom Gerät auswählen. Das Bild wird für das Dashboard optimiert und gespeichert.</div>
                <div style="display:flex;gap:8px;align-items:center;margin-top:12px;flex-wrap:wrap;">
                  <input class="dashboard-background-file" type="file" accept="image/*" style="display:none" aria-label="Hintergrundfoto auswählen" />
                  <button class="dashboard-background-pick" type="button" style="padding:8px 12px;border-radius:10px;">Foto auswählen</button>
                  <button class="dashboard-background-clear" type="button" style="padding:8px 12px;border-radius:10px;">Hintergrund entfernen</button>
                </div>
                ${this._config.dashboard_background_image ? `<img alt="Hintergrund-Vorschau" src="${this._escape(this._config.dashboard_background_image)}" style="display:block;width:100%;max-height:150px;object-fit:cover;border-radius:10px;margin-top:12px;" />` : ""}
                <div class="dashboard-background-status" role="status" aria-live="polite" style="margin-top:8px;color:${this._dashboardBackgroundError ? "var(--error-color)" : "var(--secondary-text-color)"};font-size:12px;">${this._escape(this._dashboardBackgroundStatus || "")}</div>
              </div>
              ${this._toggleHtml(
                "hide_scrollbar",
                "Scrollbalken ausblenden",
                "Scrollen bleibt möglich.",
                true
              )}
              ${this._toggleHtml(
                "page_scroll",
                "Seitenweises Scrollen",
                "Wischt ungefähr eine Bildschirmhöhe weiter und rastet seitenweise ein.",
                false
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
              ${this._outdoorIlluminanceSensorSelectHtml()}
              ${this._hofMotionSensorSelectHtml()}
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
              Lege zusätzliche Dashboard-Seiten an oder bearbeite bestehende Seiten als YAML.
              Eigene Seiten erscheinen als Button auf der Startseite und öffnen eine Dashboard-Ansicht.
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
          data-editor-section="navigation"
          ${this._openEditorSections.has("navigation") ? "open" : ""}
        >
          <summary>
            <span class="editor-section-summary-main">
              <ha-icon icon="mdi:navigation-variant-outline"></ha-icon>
              <span class="editor-section-summary-title">Navigation</span>
            </span>
            <ha-icon class="editor-section-chevron" icon="mdi:chevron-right"></ha-icon>
          </summary>

          <div class="editor-section-body">
            <div class="editor-section-help">
              Lege direkte Navigations-Buttons zu Home-Assistant-Seiten wie Geräte,
              Entitäten, Automationen oder HACS an.
            </div>
            <div class="toolbar">
              <button id="add-navigation-link" type="button">Navigation hinzufügen</button>
            </div>
            <div class="custom-pages-list">
              ${navigationPagesHtml || '<div class="loading">Noch keine Navigation angelegt.</div>'}
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
              Die Reihenfolge der Räume wird direkt auf der Startseite\n              per langem Drücken und Verschieben geändert. Bereiche mit\n              <b>no-strategy</b> oder <b>no-dboard</b> bleiben
              immer ausgeblendet.
            </div>

            <div class="toolbar">
              <button id="select-all" type="button">Alle</button>
              <button id="select-none" type="button">Keine</button>
              <button id="reset-drag-layout" type="button">Drag & Drop komplett zurücksetzen</button>
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

        <details class="panel editor-section" data-editor-section="primary-sensors"
          ${this._openEditorSections.has("primary-sensors") ? "open" : ""}>
          <summary><span class="editor-section-summary-main">
            <ha-icon icon="mdi:tune-vertical"></ha-icon>
            <span class="editor-section-summary-title">Hauptsensoren</span></span>
            <ha-icon class="editor-section-chevron" icon="mdi:chevron-right"></ha-icon>
          </summary>
          <div class="editor-section-body">
            <div class="editor-section-help">Wähle für jeden Raum die Hauptsensoren. Ohne Auswahl
              gilt weiterhin die automatische Erkennung. Diese Zuordnungen werden zunächst nur
              gespeichert; die bisherigen Karten bleiben unverändert.</div>
            ${this._loading ? '<div class="loading">Bereiche werden geladen …</div>' :
              (primarySensorHtml || '<div class="loading">Keine ausgewählten Räume gefunden.</div>')}
          </div>
        </details>
        <details class="panel editor-section" data-editor-section="energy-setup"
          ${this._openEditorSections.has("energy-setup") ? "open" : ""}>
          <summary><span class="editor-section-summary-main">
            <ha-icon icon="mdi:lightning-bolt-circle"></ha-icon>
            <span class="editor-section-summary-title">Stromverbrauch einrichten</span>
          </span><ha-icon class="editor-section-chevron" icon="mdi:chevron-right"></ha-icon></summary>
          <div class="editor-section-body" style="display:grid;gap:12px;padding:16px">
            ${this._energySetupHtml()}
          </div>
        </details>
        <details class="panel editor-section" data-editor-section="name-filters" ${this._openEditorSections.has("name-filters") ? "open" : ""}>
          <summary><span class="editor-section-summary-main"><ha-icon icon="mdi:filter-cog-outline"></ha-icon><span class="editor-section-summary-title">Namensfilter / Zuordnung</span></span><ha-icon class="editor-section-chevron" icon="mdi:chevron-right"></ha-icon></summary>
          <div class="editor-section-body">
            <div class="editor-section-help">Ordnet Entitäten anhand von Entity-ID oder Friendly Name einer Gruppe zu. Manuelle Gruppen-Zuordnungen haben weiterhin Vorrang. Begriffe mit Komma trennen.</div>
            <div class="rows">
              ${this._toggleHtml("name_group_filters_enabled", "Namensfilter aktiv", "Automatische Zuordnung anhand der folgenden Begriffe verwenden.", true)}
              ${this._nameGroupFilterRow("steckdose", "Steckdosen", "z. B. Steckdose, Plug, Socket, Outlet")}
              ${this._nameGroupFilterRow("switch", "Schalter", "z. B. Schalter, Taster")}
              ${this._nameGroupFilterRow("fan", "Lüfter", "z. B. Ventilator, Lüfter, Fan")}
              ${this._nameGroupFilterRow("luftpflege", "Luftreiniger / Entfeuchter", "z. B. Luftreiniger, Air Purifier, Entfeuchter, Dehumidifier")}
              ${this._nameGroupFilterRow("cover", "Rollläden", "z. B. Rollladen, Rollo, Jalousie, Shutter")}
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

            <div class="toolbar">
              <button id="reset-room-entity-visibility" type="button">
                <ha-icon icon="mdi:restore"></ha-icon>
                Sichtbarkeit aller Entitäten auf Auto zurücksetzen
              </button>
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
        <details class="panel editor-section" data-editor-section="backup" ${this._openEditorSections.has("backup") ? "open" : ""}>
          <summary>
            <span class="editor-section-summary-main">
              <ha-icon icon="mdi:backup-restore"></ha-icon>
              <span class="editor-section-summary-title">Sichern & Wiederherstellen</span>
            </span>
            <ha-icon class="editor-section-chevron" icon="mdi:chevron-right"></ha-icon>
          </summary>
          <div class="editor-section-body">
            <div class="editor-section-help">Sichere deine Dashboard-Einstellungen einschließlich Raumreihenfolge, Favoriten, eigener Seiten und Drag-&-Drop-Anordnung als JSON-Datei. Beim Import wird die aktuelle Konfiguration ersetzt.</div>
            <div class="toolbar">
              <button id="atze-backup-export" type="button"><ha-icon icon="mdi:download"></ha-icon> Konfiguration exportieren</button>
              <button id="atze-backup-import" type="button"><ha-icon icon="mdi:upload"></ha-icon> Konfiguration importieren</button>
              <input id="atze-backup-file" type="file" accept=".json,application/json" style="display:none" />
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

    this.shadowRoot.querySelector("#atze-backup-export")
      ?.addEventListener("click", () => this._exportDashboardBackup());
    this.shadowRoot.querySelector("#atze-backup-import")
      ?.addEventListener("click", () => this.shadowRoot.querySelector("#atze-backup-file")?.click());
    this.shadowRoot.querySelector("#atze-backup-file")
      ?.addEventListener("change", async (event) => {
        const input = event.currentTarget;
        const file = input.files?.[0];
        await this._importDashboardBackup(file);
        if (input.isConnected) input.value = "";
      });

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
      .querySelector("#reset-drag-layout")
      ?.addEventListener("click", () =>
        this._resetDirectDragLayout()
      );

    this.shadowRoot
      .querySelector("#reset-room-entity-visibility")
      ?.addEventListener("click", () =>
        this._resetRoomEntityVisibility()
      );

    this.shadowRoot
      .querySelector("#reset-order")
      ?.addEventListener("click", () =>
        this._resetAreaOrder()
      );

    this.shadowRoot
      .querySelector("#add-navigation-link")
      ?.addEventListener("click", () =>
        this._addCustomPage("navigation")
      );

    this.shadowRoot
      .querySelector("#add-custom-page")
      ?.addEventListener("click", () =>
        this._addCustomPage("empty")
      );

    const saveNavigationValue = (index, key, value) => {
      const pages = this._customPages().map((page) => ({ ...page }));
      if (!pages[index] || !key) return;
      pages[index][key] = String(value ?? "").trim();
      this._config = { ...this._config, custom_pages: pages };
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
    };

    for (const select of this.shadowRoot.querySelectorAll(".energy-setup-field")) {
      select.addEventListener("change", () =>
        this._setEnergySetupField(select.dataset.key, select.value));
    }
    const energyStatus = this.shadowRoot.querySelector("#energy-setup-status");
    this.shadowRoot.querySelector("#energy-create-meters")
      ?.addEventListener("click", () => this._createEnergyMeters(energyStatus));
    for (const button of this.shadowRoot.querySelectorAll(".energy-calibrate")) {
      button.addEventListener("click", () => {
        const input = this.shadowRoot.querySelector(
          '.energy-calibration-value[data-key="' + button.dataset.key + '"]');
        this._calibrateEnergyMeter(button.dataset.key, input?.value || "", energyStatus);
      });
    }
    for (const button of this.shadowRoot.querySelectorAll(".energy-reset")) {
      button.addEventListener("click", () =>
        this._calibrateEnergyMeter(button.dataset.key, "0", energyStatus));
    }

    // Build expensive Home Assistant selectors only when a room is opened.
    const initialisePrimaryArea = panel => {
      if (!panel.open || !panel.isConnected) return;
      const container = panel.querySelector(".primary-fields");
      if (!container || container.dataset.initialised === "true") return;
      container.dataset.initialised = "true";
      const areaId = panel.dataset.primaryArea;
      const roles = [
        ["temperature", "Temperatur", "sensor", ["°C", "°F", "K"]],
        ["humidity", "Luftfeuchtigkeit", "sensor", ["%"]],
        ["presence", "Präsenz / Bewegung", "binary_sensor", null],
        ["energy", "Stromverbrauch (kWh)", "sensor", ["kWh"]],
        ["power", "Aktuelle Leistung (W)", "sensor", ["W"]],
      ];
      for (const [role, title, domain, units] of roles) {
        const label = document.createElement("label");
        label.className = "primary-field";
        const caption = document.createElement("span");
        caption.textContent = title;
        label.appendChild(caption);
        const selector = document.createElement("ha-selector");
        selector.className = "primary-selector";
        label.appendChild(selector);
        container.appendChild(label);
        selector.hass = this._hass;
        selector.selector = { entity: {
          filter: { domain,
            ...(units ? { unit_of_measurement: units } : {}),
            ...(role === "presence" ? { device_class: ["motion", "occupancy", "presence"] } : {}),
          },
        } };
        selector.value = this._config.area_overrides?.[areaId]?.primary_sensors?.[role] || "";
        selector.addEventListener("pointerdown", () => { this._navigationEditActive = true; }, true);
        selector.addEventListener("focusin", () => { this._navigationEditActive = true; });
        selector.addEventListener("value-changed", event => {
          event.stopPropagation();
          const value = String(event.detail?.value || "").trim();
          const overrides = { ...(this._config.area_overrides || {}) };
          const area = { ...(overrides[areaId] || {}) };
          const primary = { ...(area.primary_sensors || {}) };
          if ((primary[role] || "") === value) return;
          if (value) primary[role] = value;
          else delete primary[role];
          if (Object.keys(primary).length) area.primary_sensors = primary;
          else delete area.primary_sensors;
          if (Object.keys(area).length) overrides[areaId] = area;
          else delete overrides[areaId];
          const next = { ...this._config };
          if (Object.keys(overrides).length) next.area_overrides = overrides;
          else delete next.area_overrides;
          this._config = next;
          panel.querySelector(".entity-count").textContent =
            roles.filter(([key]) => primary[key]).length + "/5";
          this.dispatchEvent(new CustomEvent("config-changed", {
            detail: { config: next }, bubbles: true, composed: true,
          }));
          this._navigationEditActive = false;
        });
      }
    };
    for (const panel of this.shadowRoot.querySelectorAll(".primary-area")) {
      panel.addEventListener("toggle", () => {
        if (panel.open) {
          this._openPrimaryAreaIds.add(panel.dataset.primaryArea);
          initialisePrimaryArea(panel);
        } else {
          this._openPrimaryAreaIds.delete(panel.dataset.primaryArea);
          const container = panel.querySelector(".primary-fields");
          if (container) {
            container.replaceChildren();
            delete container.dataset.initialised;
          }
          this._navigationEditActive = false;
        }
      });
      if (panel.open) initialisePrimaryArea(panel);
    }
    for (const input of this.shadowRoot.querySelectorAll(".navigation-field")) {
      input.addEventListener("focus", () => { this._navigationEditActive = true; });
      input.addEventListener("pointerdown", () => { this._navigationEditActive = true; });
      input.addEventListener("input", () => saveNavigationValue(Number(input.dataset.index), input.dataset.key, input.value));
      input.addEventListener("blur", () => { this._navigationEditActive = false; });
    }

    for (const selector of this.shadowRoot.querySelectorAll(".navigation-selector")) {
      const index = Number(selector.dataset.index), key = selector.dataset.key;
      const page = this._customPages()[index] || {};
      selector.hass = this._hass;
      selector.selector = key === "icon" ? { icon: {} } : { navigation: {} };
      selector.value = page[key] || "";
      selector.addEventListener("pointerdown", () => { this._navigationEditActive = true; }, true);
      selector.addEventListener("focusin", () => { this._navigationEditActive = true; });
      selector.addEventListener("value-changed", (event) => {
        event.stopPropagation();
        saveNavigationValue(index, key, event.detail?.value || "");
        window.setTimeout(() => {
          this._navigationEditActive = false;
          if (this._pendingHassRender) {
            this._pendingHassRender = false;
            this._render();
          }
        }, 250);
      });
      selector.addEventListener("focusout", () => {});
    }

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
          if (value.navigation_path) {
            this._updateCustomPage(index, value);
          } else {
            this._pendingCustomPageValues.set(index, value);
          }
        }
      });

      field.addEventListener("editor-save", commitPendingValue);

      const page = this._customPages()[index];
      const value = page?.navigation_path
        ? { title: page.title || "Geräte", icon: page.icon || "mdi:devices", navigation_path: page.navigation_path }
        : this._customPageView(page, index);
      const initialize = () => field.setValue?.(value);

      if (customElements.get("ha-yaml-editor")) initialize();
      else customElements.whenDefined("ha-yaml-editor").then(initialize);
    }


    const placeholderBackgroundFile = this.shadowRoot.querySelector(".dashboard-background-file");
    if (!this._backgroundFileInput) this._backgroundFileInput = placeholderBackgroundFile;
    else placeholderBackgroundFile?.replaceWith(this._backgroundFileInput);
    const backgroundFile = this._backgroundFileInput;
    const backgroundStatus = this.shadowRoot.querySelector(".dashboard-background-status");
    const setBackgroundStatus = (message, error = false) => {
      this._dashboardBackgroundStatus = message;
      this._dashboardBackgroundError = error;
      if (!backgroundStatus) return;
      backgroundStatus.textContent = message;
      backgroundStatus.style.color = error ? "var(--error-color)" : "var(--secondary-text-color)";
    };
    const saveBackground = (value) => {
      const next = { ...this._config };
      if (value) next.dashboard_background_image = value;
      else delete next.dashboard_background_image;
      this._fireConfigChanged(next);
      setBackgroundStatus(value ? "Hintergrundbild übernommen. Bitte Dashboard-Einstellungen speichern." : "Hintergrundbild entfernt.");
    };
    this.shadowRoot.querySelector(".dashboard-background-pick")?.addEventListener("click", () => {
      this._backgroundPickerActive = true;
      setBackgroundStatus("Fotoauswahl geöffnet …");
      backgroundFile?.click();
    });
    backgroundFile?.addEventListener("cancel", () => {
      this._backgroundPickerActive = false;
      setBackgroundStatus("Fotoauswahl abgebrochen.");
    }, { once: true });
    backgroundFile.onchange = async (event) => {
      this._backgroundPickerActive = false;
      const file = event.currentTarget.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/") && !/\.(heic|heif|jpg|jpeg|png|webp)$/i.test(file.name)) {
        setBackgroundStatus("Bitte eine Bilddatei auswählen.", true);
        return;
      }
      setBackgroundStatus("Foto wird verarbeitet …");
      try {
        const url = URL.createObjectURL(file);
        const image = new Image();
        try {
          await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = () => reject(new Error("Dieses Bildformat konnte nicht geöffnet werden."));
            image.src = url;
          });
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Bildverarbeitung nicht verfügbar.");
          let data = "";
          for (const maxSide of [1280, 1024, 800, 640, 480]) {
            const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
            canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            for (const quality of [0.7, 0.55, 0.4, 0.3]) {
              data = canvas.toDataURL("image/jpeg", quality);
              if (data.length <= 250000) break;
            }
            if (data.length <= 250000) break;
          }
          if (!data.startsWith("data:image/jpeg;base64,")) throw new Error("Das Bild konnte nicht als JPEG verarbeitet werden.");
          if (data.length > 250000) throw new Error("Das Foto ist nach dem Verkleinern noch zu groß.");
          saveBackground(data);
        } finally {
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        setBackgroundStatus("Foto nicht übernommen: " + (error.message || error), true);
      } finally {
        if (backgroundFile?.isConnected) backgroundFile.value = "";
      }
    };
    this.shadowRoot.querySelector(".dashboard-background-clear")?.addEventListener("click", () => saveBackground(""));

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

    const outdoorIlluminanceSensorSelect =
      this.shadowRoot.querySelector(
        ".outdoor-illuminance-sensor-select"
      );

    if (outdoorIlluminanceSensorSelect) {
      const beginInteraction = () =>
        this._beginEntityVisibilityInteraction();

      outdoorIlluminanceSensorSelect.addEventListener(
        "pointerdown",
        beginInteraction
      );
      outdoorIlluminanceSensorSelect.addEventListener(
        "focus",
        beginInteraction
      );
      outdoorIlluminanceSensorSelect.addEventListener(
        "blur",
        () => this._endEntityVisibilityInteraction()
      );
      outdoorIlluminanceSensorSelect.addEventListener(
        "change",
        (event) => {
          this._entityVisibilityActive = false;
          this._pendingHassRender = false;
          this._setHomeOutdoorIlluminanceEntity(
            event.currentTarget.value
          );
        }
      );
    }

    const hofMotionSensorSelect =
      this.shadowRoot.querySelector(".hof-motion-sensor-select");

    if (hofMotionSensorSelect) {
      const beginInteraction = () => this._beginEntityVisibilityInteraction();
      hofMotionSensorSelect.addEventListener("pointerdown", beginInteraction);
      hofMotionSensorSelect.addEventListener("focus", beginInteraction);
      hofMotionSensorSelect.addEventListener(
        "blur",
        () => this._endEntityVisibilityInteraction()
      );
      hofMotionSensorSelect.addEventListener("change", (event) => {
        this._entityVisibilityActive = false;
        this._pendingHassRender = false;
        this._setHofMotionEntity(event.currentTarget.value);
      });
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

    for (const input of this.shadowRoot.querySelectorAll(".name-group-filter")) {
      input.addEventListener("pointerdown", () => this._beginEntityVisibilityInteraction());
      input.addEventListener("focus", () => this._beginEntityVisibilityInteraction());
      input.addEventListener("blur", (event) => {
        const target = event.currentTarget;
        this._setNameGroupFilter(target.dataset.group, target.value);
        this._endEntityVisibilityInteraction();
      });
    }

    this.shadowRoot.querySelectorAll(".home-dashboard-layout-buttons button").forEach((button) => {
      button.addEventListener("click", () => {
        const layout = button.dataset.layout === "compact" ? "compact" : "standard";
        if ((this._config.home_dashboard_layout || "standard") === layout) return;
        this._fireConfigChanged({ ...this._config, home_dashboard_layout: layout });
      });
    });

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

    for (
      const input of
        this.shadowRoot.querySelectorAll(".favorite-confirm-toggle")
    ) {
      input.addEventListener("change", (event) => {
        const target = event.currentTarget;
        this._setFavoriteConfirmation(
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
    "Automatisches, flexibel anpassbares Area-Dashboard mit eigenen Atze-Raumkarten und Popups.",
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
