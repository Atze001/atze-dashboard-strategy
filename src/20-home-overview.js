
class AtzeHomeOverviewCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._clockTimer = null;
    this._blueprintEnsureStarted = false;
    this._scrollTopCleanup = null;
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(value) {
    this._hass = value;

    if (
      value &&
      !this._blueprintEnsureStarted
    ) {
      this._blueprintEnsureStarted = true;

      ensureAtzeLightBlueprint(value).catch((error) => {
        console.error(
          "Atze Dashboard: Lichtsteuerungs-Blueprint konnte beim Laden der Startseite nicht automatisch angelegt werden.",
          error
        );
      });
    }

    this._render();
  }

  get hass() {
    return this._hass;
  }

  connectedCallback() {
    this._startClock();

    if (!this._scrollTopCleanup) {
      this._scrollTopCleanup =
        setupAtzeScrollTopButton(this);
    }

    this._render();
  }

  disconnectedCallback() {
    if (this._clockTimer) {
      clearInterval(this._clockTimer);
      this._clockTimer = null;
    }

    this._scrollTopCleanup?.();
    this._scrollTopCleanup = null;
  }

  _startClock() {
    if (this._clockTimer) return;

    this._clockTimer = setInterval(
      () => this._render(),
      30000
    );
  }

  _toggleKioskMode() {
    const rawQuery = String(
      window.location.search || ""
    );

    let parts = rawQuery.startsWith("?")
      ? rawQuery.slice(1).split("&").filter(Boolean)
      : rawQuery
        ? rawQuery.split("&").filter(Boolean)
        : [];

    const keyOf = (part) =>
      decodeURIComponent(
        String(part).split("=")[0] || ""
      );

    const hasKey = (key) =>
      parts.some((part) => keyOf(part) === key);

    const removeKey = (key) => {
      parts = parts.filter(
        (part) => keyOf(part) !== key
      );
    };

    const active =
      !hasKey("disable_km") &&
      (
        hasKey("hide_header") ||
        hasKey("kiosk") ||
        this._config?.force_kiosk === true
      );

    for (const key of [
      "kiosk",
      "hide_header",
      "hide_sidebar",
      "disable_km",
      "atze_km_auto",
    ]) {
      removeKey(key);
    }

    if (active) {
      parts.push("disable_km");
    } else {
      // Enter the same stable kiosk state that the automatic fallback uses.
      // The marker prevents a second corrective reload on the next render.
      parts.push("hide_header");
      parts.push("atze_km_auto=1");
    }

    const query = parts.length
      ? `?${parts.join("&")}`
      : "";

    window.location.replace(
      `${window.location.pathname}${query}${window.location.hash || ""}`
    );
  }

  _state(entityId) {
    return entityId
      ? this._hass?.states?.[entityId] || null
      : null;
  }

  _homeBaseStatus() {
    const candidates = [
      this._config?.homebase_entity,
      ...asArray(
        this._config?.homebase_entities
      ),
      "select.atzehomebase_guard_mode",
    ].filter(Boolean);

    let fallback = null;

    for (const entityId of [...new Set(candidates)]) {
      const stateObj = this._state(entityId);

      if (!stateObj) continue;

      const result = {
        entityId,
        stateObj,
      };

      if (!fallback) {
        fallback = result;
      }

      const state = String(
        stateObj.state || ""
      ).toLowerCase();

      if (
        ![
          "unknown",
          "unavailable",
          "",
        ].includes(state)
      ) {
        return result;
      }
    }

    return fallback;
  }

  _isActive(stateObj) {
    const state = String(stateObj?.state || "").toLowerCase();

    return [
      "on",
      "open",
      "opening",
      "detected",
      "occupied",
      "home",
      "problem",
      "unsafe",
      "unlocked",
    ].includes(state);
  }

  _formatted(entityId) {
    const stateObj = this._state(entityId);
    if (!stateObj) return "";

    if (typeof this._hass?.formatEntityState === "function") {
      return this._hass.formatEntityState(stateObj);
    }

    const unit = stateObj.attributes?.unit_of_measurement || "";
    return `${stateObj.state}${unit ? ` ${unit}` : ""}`;
  }


  _personPicture(stateObj) {
    const picture = stateObj?.attributes?.entity_picture;
    if (!picture) return null;

    try {
      return new URL(
        picture,
        window.location.origin
      ).href;
    } catch (_error) {
      return picture;
    }
  }

  _personName(stateObj) {
    return (
      stateObj?.attributes?.friendly_name ||
      this._config.title ||
      "Zuhause"
    );
  }

  _personState(stateObj) {
    if (!stateObj) return "";

    if (typeof this._hass?.formatEntityState === "function") {
      return this._hass.formatEntityState(stateObj);
    }

    const raw = String(stateObj.state || "");

    if (raw === "home") return "Zuhause";
    if (raw === "not_home") return "Unterwegs";

    return raw;
  }


  _alarmText(stateObj) {
    if (!stateObj) return "Nicht verfügbar";

    const state = String(stateObj.state || "").toLowerCase();

    const map = {
      disarmed: "Unscharf",
      armed_home: "Zuhause",
      armed_away: "Scharf",
      armed_night: "Nacht",
      armed_vacation: "Urlaub",
      armed_custom_bypass: "Scharf",
      pending: "Wird geschaltet",
      arming: "Wird scharf",
      disarming: "Wird unscharf",
      triggered: "ALARM",
    };

    return map[state] || stateObj.state || "—";
  }

  _isDisabledStatus(stateObj, entityId = null) {
    if (!stateObj) return false;

    const values = [
      stateObj.state,
      entityId ? this._formatted(entityId) : "",
    ].map((value) =>
      String(value || "")
        .trim()
        .toLowerCase()
    );

    return values.some((value) =>
      [
        "disarmed",
        "disabled",
        "deaktiviert",
      ].includes(value)
    );
  }

  _weatherText(state) {
    const map = {
      "clear-night": "Klar",
      cloudy: "Bewölkt",
      fog: "Nebel",
      hail: "Hagel",
      lightning: "Gewitter",
      "lightning-rainy": "Gewitterregen",
      partlycloudy: "Teilweise bewölkt",
      pouring: "Starkregen",
      rainy: "Regen",
      snowy: "Schnee",
      "snowy-rainy": "Schneeregen",
      sunny: "Sonnig",
      windy: "Windig",
      "windy-variant": "Windig",
      exceptional: "Ungewöhnlich",
    };

    return map[state] || state || "Wetter";
  }

  _weatherIcon(state) {
    const map = {
      "clear-night": "mdi:weather-night",
      cloudy: "mdi:weather-cloudy",
      fog: "mdi:weather-fog",
      hail: "mdi:weather-hail",
      lightning: "mdi:weather-lightning",
      "lightning-rainy": "mdi:weather-lightning-rainy",
      partlycloudy: "mdi:weather-partly-cloudy",
      pouring: "mdi:weather-pouring",
      rainy: "mdi:weather-rainy",
      snowy: "mdi:weather-snowy",
      "snowy-rainy": "mdi:weather-snowy-rainy",
      sunny: "mdi:weather-sunny",
      windy: "mdi:weather-windy",
      "windy-variant": "mdi:weather-windy-variant",
    };

    return map[state] || "mdi:weather-partly-cloudy";
  }


  _roomImageCandidates(room, lightsOn = false) {
    const useLightImage = Boolean(lightsOn && room.light_image);
    const cacheKey = `${room.area_id}:${useLightImage ? "light" : "dark"}`;
    const fileName = useLightImage
      ? room.light_image_file
      : (
          room.image_file ||
          `${room.area_id}.jpg`
        );
    const candidates = [];

    const add = (value) => {
      if (!value) return;

      try {
        const absolute = new URL(value, window.location.origin).href;

        if (!candidates.includes(absolute)) {
          candidates.push(absolute);
        }
      } catch (_error) {
        // Ignore malformed candidates.
      }
    };

    // 0) Reuse the path that already loaded successfully for this room.
    add(
      ATZE_HOME_ROOM_IMAGE_CACHE.get(cacheKey)
    );

    // 1) Generated/default room image for the current light state.
    add(useLightImage ? room.light_image : room.image);

    // 2) Explicit YAML asset root.
    if (this._config.asset_base && fileName) {
      try {
        const base = String(this._config.asset_base).endsWith("/")
          ? String(this._config.asset_base)
          : `${this._config.asset_base}/`;

        add(
          new URL(
            fileName,
            new URL(base, window.location.origin)
          ).href
        );
      } catch (_error) {
        // Continue with automatic paths.
      }
    }

    // 3) Relative to the loaded ES module.
    if (fileName) {
      add(new URL(fileName, ATZE_ASSET_BASE_URL).href);
    }

    // 4) Discover the actual HA resource URL from browser performance entries.
    try {
      const resources = performance
        .getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((name) =>
          /atze-dashboard-strat.*\.js/i.test(name)
        )
        .reverse();

      for (const resourceUrl of resources) {
        try {
          if (fileName) {
            add(
              new URL(
                `assets/${fileName}`,
                new URL("./", resourceUrl)
              ).href
            );
          }
        } catch (_error) {
          // Try next resource entry.
        }
      }
    } catch (_error) {
      // Fixed fallbacks below still work.
    }

    // 5) Common installation names.
    if (fileName) {
      add(`/hacsfiles/atze-dashboard-strategy/assets/${fileName}`);
      add(`/local/atze-dashboard-strategy/assets/${fileName}`);
      add(`/local/atze-dashboard-strat/assets/${fileName}`);
    }

    return candidates;
  }

  _loadRoomImage(img, room, lightsOn = false) {
    const useLightImage = Boolean(lightsOn && room.light_image);
    const cacheKey = `${room.area_id}:${useLightImage ? "light" : "dark"}`;
    const candidates = this._roomImageCandidates(room, lightsOn);

    if (!candidates.length) {
      img.remove();
      return;
    }

    let index = 0;
    let currentCandidate = null;

    const loadNext = () => {
      if (index >= candidates.length) {
        img.style.display = "none";
        return;
      }

      currentCandidate = candidates[index];
      index += 1;

      // Keep the element visible while the browser resolves the cached image.
      // No opacity reset = no blinking on every hass update.
      img.src = currentCandidate;
    };

    img.addEventListener("error", () => {
      if (
        ATZE_HOME_ROOM_IMAGE_CACHE.get(cacheKey) ===
        currentCandidate
      ) {
        ATZE_HOME_ROOM_IMAGE_CACHE.delete(cacheKey);
      }

      loadNext();
    });

    img.addEventListener("load", () => {
      if (currentCandidate) {
        ATZE_HOME_ROOM_IMAGE_CACHE.set(
          cacheKey,
          currentCandidate
        );
      }

      img.style.display = "block";
    });

    loadNext();
  }

  _navigate(path) {
    if (!path) return;

    const current = window.location.pathname;
    const parts = current.split("/").filter(Boolean);

    if (parts.length) {
      parts[parts.length - 1] = path;
    } else {
      parts.push(path);
    }

    const target =
      `/${parts.join("/")}${window.location.search || ""}`;

    window.history.pushState(null, "", target);
    window.dispatchEvent(new Event("location-changed"));
  }

  _navigateHacs() {
    const target = "/hacs/dashboard";

    window.history.pushState(null, "", target);
    window.dispatchEvent(
      new Event("location-changed")
    );
  }

  _openPopup(hash) {
    const target = String(hash || "").startsWith("#")
      ? String(hash)
      : `#${String(hash || "")}`;

    if (target === "#") return;

    if (window.location.hash === target) {
      window.dispatchEvent(new Event("hashchange"));
    } else {
      window.location.hash = target;
    }
  }

  _escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  _moreInfo(entityId) {
    if (!entityId) return;

    this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        bubbles: true,
        composed: true,
        detail: { entityId },
      })
    );
  }

  _favoriteIcon(entityId, stateObj) {
    if (stateObj?.attributes?.icon) {
      return stateObj.attributes.icon;
    }

    return (
      DOMAIN_META[domainOf(entityId)]?.icon ||
      "mdi:star-outline"
    );
  }

  async _activateFavorite(entityId) {
    const stateObj = this._state(entityId);
    if (!stateObj) return;

    const domain = domainOf(entityId);

    if (
      [
        "light",
        "switch",
        "input_boolean",
        "fan",
        "media_player",
      ].includes(domain)
    ) {
      await this._hass.callService(
        "homeassistant",
        "toggle",
        {},
        { entity_id: entityId }
      );
      return;
    }

    if (domain === "cover") {
      const position = this._coverPosition(entityId);
      const state = String(stateObj.state || "").toLowerCase();
      const isOpen =
        position != null
          ? position > 0
          : state !== "closed";

      await this._hass.callService(
        "cover",
        isOpen ? "close_cover" : "open_cover",
        {},
        { entity_id: entityId }
      );
      return;
    }

    if (["button", "input_button"].includes(domain)) {
      await this._hass.callService(
        domain,
        "press",
        {},
        { entity_id: entityId }
      );
      return;
    }

    if (["scene", "script"].includes(domain)) {
      await this._hass.callService(
        domain,
        "turn_on",
        {},
        { entity_id: entityId }
      );
      return;
    }

    this._moreInfo(entityId);
  }

  async _allLightsOff() {
    const entities = this._config.light_entities || [];
    if (!entities.length) return;

    await this._hass.callService(
      "light",
      "turn_off",
      {},
      { entity_id: entities }
    );
  }

  async _allLightsOn() {
    const entities = this._config.light_entities || [];
    if (!entities.length) return;

    await this._hass.callService(
      "light",
      "turn_on",
      {},
      { entity_id: entities }
    );
  }

  async _toggleRoomLights(areaId) {
    const room = (this._config.room_tiles || []).find(
      (entry) => entry.area_id === areaId
    );

    const entities = (room?.light_entities || []).filter(
      (entityId) => this._state(entityId)
    );

    if (!entities.length) return;

    const anyLightOn = entities.some(
      (entityId) =>
        String(this._state(entityId)?.state || "").toLowerCase() === "on"
    );

    await this._hass.callService(
      "light",
      anyLightOn ? "turn_off" : "turn_on",
      {},
      { entity_id: entities }
    );
  }

  async _allCoversClose() {
    const entities = this._config.cover_entities || [];
    if (!entities.length) return;

    await this._hass.callService(
      "cover",
      "close_cover",
      {},
      { entity_id: entities }
    );
  }

  async _allCoversOpen() {
    const entities = this._config.cover_entities || [];
    if (!entities.length) return;

    await this._hass.callService(
      "cover",
      "open_cover",
      {},
      { entity_id: entities }
    );
  }

  async _toggleNight() {
    const entityId = this._config.night_entity;
    if (!entityId) return;

    const domain = String(entityId).split(".")[0];

    if (domain === "input_boolean") {
      await this._hass.callService(
        "input_boolean",
        "toggle",
        {},
        { entity_id: entityId }
      );
      return;
    }

    if (domain === "switch") {
      await this._hass.callService(
        "switch",
        "toggle",
        {},
        { entity_id: entityId }
      );
    }
  }


  _coverPosition(entityId) {
    const stateObj = this._state(entityId);
    if (!stateObj) return null;

    const position = Number(
      stateObj.attributes?.current_position
    );

    if (Number.isFinite(position)) {
      return Math.max(0, Math.min(100, Math.round(position)));
    }

    const state = String(stateObj.state || "").toLowerCase();

    if (state === "closed") return 0;
    if (state === "open") return 100;

    return null;
  }

  _roomStatusBadges(room) {
    const badges = [];

    if (room.window_entity) {
      const stateObj = this._state(room.window_entity);
      const active = this._isActive(stateObj);
      const deviceClass =
        String(stateObj?.attributes?.device_class || "").toLowerCase();
      const isDoor = deviceClass === "door";

      badges.push({
        type: isDoor ? "door" : "window",
        active,
        icon: isDoor
          ? (
              active
                ? "mdi:door-open"
                : "mdi:door-closed"
            )
          : (
              active
                ? "mdi:window-open-variant"
                : "mdi:window-closed-variant"
            ),
        title: isDoor
          ? (
              active
                ? "Tür offen"
                : "Tür geschlossen"
            )
          : (
              active
                ? "Fenster offen"
                : "Fenster geschlossen"
            ),
      });
    }

    if (room.cover_entity) {
      const position = this._coverPosition(room.cover_entity);
      const stateObj = this._state(room.cover_entity);
      const state = String(stateObj?.state || "").toLowerCase();

      let active = false;
      let hasState = false;

      if (position != null) {
        active = position > 0;
        hasState = true;
      } else if (state) {
        active = state !== "closed";
        hasState = true;
      }

      if (hasState) {
        badges.push({
          type: "cover",
          active,
          icon: "mdi:window-shutter",
          title:
            position != null
              ? `Rollladen ${position} %`
              : `Rollladen ${this._formatted(room.cover_entity)}`,
        });
      }
    }

    if (room.roller_sensor_entity) {
      const stateObj = this._state(room.roller_sensor_entity);
      const active = this._isActive(stateObj);

      badges.push({
        type: "roller-sensor",
        active,
        icon: active
          ? "mdi:shield-alert-outline"
          : "mdi:shield-check-outline",
        title: active ? "Rollladen unsicher" : "Rollladen sicher",
      });
    }

    if (room.lock_entity) {
      const stateObj = this._state(room.lock_entity);
      const state = String(stateObj?.state || "").toLowerCase();

      if (
        state &&
        !["unknown", "unavailable"].includes(state)
      ) {
        const locked = state === "locked";

        badges.push({
          type: "lock",
          active: !locked,
          icon: locked
            ? "mdi:lock"
            : "mdi:lock-open-variant",
          title: locked
            ? "Tür verriegelt"
            : "Tür entriegelt",
        });
      }
    }

    // A safe state needs no permanent indicator on the room image.
    // Keep the top-right badges focused on conditions that require attention.
    return badges.filter((badge) => badge.active);
  }

  _formatPower() {
    const primary = this._state(this._config.power_entity);

    if (primary) {
      return this._formatted(this._config.power_entity);
    }

    let total = 0;
    let count = 0;

    for (const entityId of this._config.power_entities || []) {
      const value = Number.parseFloat(
        this._state(entityId)?.state
      );

      if (Number.isFinite(value)) {
        total += value;
        count += 1;
      }
    }

    if (!count) return "—";
    return `${Math.round(total)} W`;
  }

  _render() {
    if (!this.shadowRoot || !this._config || !this._hass) return;

    const now = new Date();
    const heroIsDay = now.getHours() >= 7 && now.getHours() < 20;
    const heroImage = heroIsDay
      ? this._config.hero_day_image
      : this._config.hero_night_image;

    const time = new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(now);

    const date = new Intl.DateTimeFormat("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(now);

    const hacsUpdateEntities = asArray(
      this._config.hacs_update_entities
    );

    const hacsUpdatesAvailable =
      hacsUpdateEntities.filter((entityId) =>
        String(
          this._state(entityId)?.state || ""
        ).toLowerCase() === "on"
      );

    const hacsUpdateAvailable =
      hacsUpdatesAvailable.length > 0;

    const person = this._state(this._config.person_entity);
    const personPicture = this._personPicture(person);
    const personName = this._personName(person);
    const personState = this._personState(person);
    const personHome =
      String(person?.state || "").toLowerCase() === "home";

    const miniPeople = asArray(
      this._config.people_entities
    )
      .slice(0, 5)
      .map((entityId) => {
        const stateObj = this._state(entityId);
        if (!stateObj) return null;

        return {
          entityId,
          stateObj,
          name:
            stateObj.attributes?.friendly_name ||
            entityId.split(".").pop() ||
            "Person",
          picture: this._personPicture(stateObj),
          home:
            String(stateObj.state || "")
              .toLowerCase() === "home",
        };
      })
      .filter(Boolean);

    const miniPeopleHtml = miniPeople.length
      ? `
          <div
            class="mini-people"
            aria-label="Anwesenheit"
          >
            ${miniPeople.map((entry) => `
              <div
                class="mini-person ${entry.home ? "home" : "away"}"
                data-entity-id="${this._escapeHtml(entry.entityId)}"
                role="button"
                tabindex="0"
                title="${this._escapeHtml(entry.name)}"
              >
                ${entry.picture
                  ? `
                    <img
                      class="mini-person-avatar"
                      src="${this._escapeHtml(entry.picture)}"
                      alt="${this._escapeHtml(entry.name)}"
                    />
                  `
                  : `
                    <div class="mini-person-fallback">
                      <ha-icon icon="mdi:account"></ha-icon>
                    </div>
                  `
                }
                <div class="mini-person-name">
                  ${this._escapeHtml(entry.name)}
                </div>
              </div>
            `).join("")}
          </div>
        `
      : "";

    const weather = this._state(this._config.weather_entity);
    const weatherTemperature =
      weather?.attributes?.temperature != null
        ? `${Math.round(Number(weather.attributes.temperature))} °C`
        : "—";

    const weatherText = this._weatherText(weather?.state);
    const weatherIcon = this._weatherIcon(weather?.state);

    const powerState = this._state(this._config.power_entity);
    const powerAvailable = Boolean(
      powerState &&
      !["", "unknown", "unavailable"].includes(
        String(powerState.state || "").toLowerCase()
      ) &&
      Number.isFinite(
        Number.parseFloat(powerState.state)
      )
    );

    const alarmState = this._state(this._config.alarm_entity);
    const alarmText = this._alarmText(alarmState);
    const alarmDisabled = this._isDisabledStatus(
      alarmState,
      this._config.alarm_entity
    );
    const alarmAvailable = Boolean(
      alarmState &&
      !["", "unknown", "unavailable"].includes(
        String(alarmState.state || "").toLowerCase()
      )
    );

    const homeBaseStatus =
      this._homeBaseStatus();

    const homeBaseState =
      homeBaseStatus?.stateObj || null;

    const homeBaseEntityId =
      homeBaseStatus?.entityId || null;

    const homeBaseText = homeBaseState
      ? this._formatted(homeBaseEntityId)
      : "Nicht verfügbar";

    const homeBaseIcon =
      homeBaseState?.attributes?.icon ||
      "mdi:shield-home";

    const homeBaseDisabled = this._isDisabledStatus(
      homeBaseState,
      homeBaseEntityId
    );
    const homeBaseAvailable = Boolean(
      homeBaseState &&
      !["", "unknown", "unavailable"].includes(
        String(homeBaseState.state || "").toLowerCase()
      )
    );

    const securityEntityIds =
      this._config.security_entities || [];

    const securityIssueCount =
      securityEntityIds.filter((entityId) =>
        securityEntityIsIssue(
          this._hass,
          entityId
        )
      ).length;

    const securityActive = securityIssueCount > 0;

    const securityText =
      securityIssueCount > 0
        ? `${securityIssueCount} ${
            securityIssueCount === 1
              ? "Warnung"
              : "Warnungen"
          }`
        : securityEntityIds.length
          ? "Alles ok"
          : "Keine Daten";

    const batteryCount = (
      this._config.battery_entities || []
    ).length;

    const batterySubText =
      batteryCount === 1
        ? "1 Sensor"
        : `${batteryCount} Sensoren`;

    const favoriteStates = asArray(
      this._config.favorite_entities
    )
      .map((entityId) => ({
        entityId,
        stateObj: this._state(entityId),
      }))
      .filter((entry) => entry.stateObj);

    const customPageLinks = asArray(this._config.custom_pages)
      .filter(
        (page) =>
          page?.title && (page?.path || page?.popup_hash)
      );

    const customPageLinksHtml = customPageLinks.length
      ? `
          <nav class="custom-page-links" aria-label="Eigene Seiten">
            ${customPageLinks
              .map((page) => `
                <button
                  type="button"
                  class="custom-page-link"
                  ${page.path
                    ? `data-path="${this._escapeHtml(page.path)}"`
                    : ""}
                  ${page.popup_hash
                    ? `data-popup-hash="${this._escapeHtml(page.popup_hash)}"`
                    : ""}
                  title="${this._escapeHtml(page.title)}"
                >
                  <ha-icon
                    icon="${this._escapeHtml(page.icon || "mdi:view-dashboard-outline")}"
                  ></ha-icon>
                  <span>${this._escapeHtml(page.title)}</span>
                </button>
              `)
              .join("")}
          </nav>
        `
      : "";

    const favoriteHtml = favoriteStates.length
      ? `
          <section class="favorites" aria-label="Favoriten">
            <div class="section-heading">
              <ha-icon icon="mdi:star"></ha-icon>
              <span>Favoriten</span>
            </div>
            <div class="favorite-grid">
              ${favoriteStates
                .map(({ entityId, stateObj }) => {
                  const name =
                    stateObj.attributes?.friendly_name ||
                    entityId;
                  const state = this._formatted(entityId) || "—";
                  const active = this._isActive(stateObj);

                  return `
                    <button
                      type="button"
                      class="favorite-card ${active ? "active" : ""}"
                      data-entity-id="${entityId}"
                      title="${name}"
                    >
                      <span class="favorite-icon">
                        <ha-icon
                          icon="${this._favoriteIcon(entityId, stateObj)}"
                        ></ha-icon>
                      </span>
                      <span class="favorite-copy">
                        <span class="favorite-name">${name}</span>
                        <span class="favorite-state">${state}</span>
                      </span>
                    </button>
                  `;
                })
                .join("")}
            </div>
          </section>
        `
      : "";

    const controlCenterHtml =
      customPageLinksHtml || favoriteHtml
        ? `
            <section
              class="control-center ${
                customPageLinksHtml ? "has-links" : ""
              } ${favoriteHtml ? "has-favorites" : ""}"
              style="--control-center-image: url('${this._escapeHtml(
                this._config.control_center_image || ""
              )}')"
              aria-label="Schnellzugriff und Favoriten"
            >
              ${customPageLinksHtml}
              ${favoriteHtml}
            </section>
          `
        : "";

    const roomHtml = (this._config.room_tiles || [])
      .map((room) => {
        const temp = room.temperature
          ? this._formatted(room.temperature)
          : "";

        const humidity = room.humidity
          ? this._formatted(room.humidity)
          : "";

        const powerState = room.power
          ? this._state(room.power)
          : null;

        const power =
          powerState &&
          !["unknown", "unavailable"].includes(
            String(powerState.state || "").toLowerCase()
          )
            ? this._formatted(room.power)
            : "";

        const illuminanceState = room.illuminance
          ? this._state(room.illuminance)
          : null;

        const illuminance =
          illuminanceState &&
          !["unknown", "unavailable"].includes(
            String(illuminanceState.state || "").toLowerCase()
          )
            ? this._formatted(room.illuminance)
            : "";

        const roomPrimaryMetric = power || illuminance;
        const roomPrimaryMetricLabel = power
          ? "Leistung"
          : "Helligkeit";
        const roomPrimaryMetricIcon = power
          ? "mdi:lightning-bolt"
          : "mdi:white-balance-sunny";
        const roomPrimaryMetricMoreInfoEntity =
          !power && illuminance
            ? "input_number.lichtschwelle"
            : "";

        const occupancyState = room.occupancy
          ? this._isActive(this._state(room.occupancy))
          : null;

        const motionInterrupterOff = Boolean(
          room.motion_interrupter &&
          String(
            this._state(room.motion_interrupter)?.state || ""
          ).toLowerCase() === "off"
        );

        const occupancyText =
          occupancyState == null
            ? ""
            : occupancyState
              ? "Erkannt"
              : "Frei";

        const roomLightEntities = (room.light_entities || []).filter(
          (entityId) => this._state(entityId)
        );

        const roomLightsOn = roomLightEntities.some(
          (entityId) =>
            String(this._state(entityId)?.state || "").toLowerCase() === "on"
        );

        const roomStatusBadges = this._roomStatusBadges(room);

        const roomStatusHtml = roomStatusBadges.length
          ? `
              <div class="room-status-badges">
                ${roomStatusBadges
                  .map(
                    (badge) => `
                      <span
                        class="room-status-badge ${
                          badge.active ? "warning" : "safe"
                        }"
                        title="${badge.title || ""}"
                        aria-label="${badge.title || ""}"
                      >
                        <ha-icon icon="${badge.icon}"></ha-icon>
                      </span>
                    `
                  )
                  .join("")}
              </div>
            `
          : "";

        return `
          <div
            class="room ${roomPrimaryMetric ? "has-power" : ""}"
            data-path="${room.path}"
            data-area-id="${room.area_id}"
            data-lights-on="${roomLightsOn ? "true" : "false"}"
            role="button"
            tabindex="0"
          >
            ${
              room.image
                ? `
                  <img
                    class="room-bg"
                    alt=""
                    aria-hidden="true"
                  />
                `
                : ""
            }

            <div class="room-shade"></div>

            ${
              roomPrimaryMetric
                ? `
                  <div
                    class="room-power ${roomPrimaryMetricMoreInfoEntity ? "clickable" : ""}"
                    title="${roomPrimaryMetricLabel} ${roomPrimaryMetric}"
                    aria-label="${roomPrimaryMetricLabel} ${roomPrimaryMetric}"
                    ${
                      roomPrimaryMetricMoreInfoEntity
                        ? `data-more-info-entity="${roomPrimaryMetricMoreInfoEntity}" role="button" tabindex="0"`
                        : ""
                    }
                  >
                    <ha-icon icon="${roomPrimaryMetricIcon}"></ha-icon>
                    <span>${roomPrimaryMetric}</span>
                  </div>
                `
                : ""
            }

            ${roomStatusHtml}

            <div class="room-top">
              <span class="room-icon">
                <ha-icon icon="${room.icon}"></ha-icon>
              </span>
            </div>

            <div class="room-bottom">
              <div class="room-name">${room.name}</div>

              <div class="room-meta">
                ${
                  temp
                    ? `
                      <span class="room-temperature">
                        <ha-icon icon="mdi:thermometer"></ha-icon>
                        <span class="room-meta-value">${temp}</span>
                      </span>
                    `
                    : ""
                }

                ${
                  humidity
                    ? `
                      <span class="room-humidity">
                        <ha-icon icon="mdi:water-percent"></ha-icon>
                        <span class="room-meta-value">${humidity}</span>
                      </span>
                    `
                    : ""
                }

                ${
                  occupancyText
                    ? `
                      <span
                        class="room-presence ${
                          motionInterrupterOff
                            ? "interrupted"
                            : occupancyState
                              ? "active"
                              : ""
                        }"
                        title="${
                          motionInterrupterOff
                            ? "Anwesenheitserkennung deaktiviert"
                            : `Anwesenheit: ${occupancyText}`
                        }"
                        aria-label="${
                          motionInterrupterOff
                            ? "Anwesenheitserkennung deaktiviert"
                            : `Anwesenheit: ${occupancyText}`
                        }"
                      >
                        <ha-icon icon="${
                          motionInterrupterOff
                            ? "mdi:account-off"
                            : "mdi:account"
                        }"></ha-icon>
                      </span>
                    `
                    : ""
                }
              </div>
            </div>

          </div>
        `;
      })
      .join("");

    const hasNight = Boolean(
      this._config.night_entity &&
      this._state(this._config.night_entity)
    );

    const lockState = this._state(this._config.lock_entity);
    const lockText = lockState
      ? this._formatted(this._config.lock_entity)
      : "";

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: auto;
          box-sizing: border-box;
          --home-shell-bg: #111111;
          background: var(--home-shell-bg);
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }

        :host::-webkit-scrollbar,
        ha-card::-webkit-scrollbar,
        .page::-webkit-scrollbar {
          width: 0 !important;
          height: 0 !important;
          display: none !important;
        }

        * {
          box-sizing: border-box;
        }

        ha-card {
          --home-card-bg: rgba(27, 29, 33, 0.84);
          --home-card-border: rgba(255,255,255,0.11);
          --home-muted: rgba(235,235,245,0.62);
          --home-blue: #0A84FF;
          --home-green: #30D158;
          --home-red: #FF453A;
          --home-yellow: #FFD60A;

          background: #111111;
          border: none;
          box-shadow: none;
          border-radius: 0;
          min-height: 100vh;
          overflow: hidden;
        }

        .page {
          width: min(1180px, 100%);
          margin: 0 auto;
          padding: 34px 24px 48px;
        }

        .hacs-update-wrap {
          display: flex;
          justify-content: center;
          margin: 0 0 12px;
        }

        .hacs-update-badge {
          appearance: none;
          border: 1px solid rgba(255,69,58,0.78);
          border-radius: 999px;
          background: rgba(255,69,58,0.16);
          color: rgb(255,95,87);
          min-height: 34px;
          padding: 6px 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          font: inherit;
          font-size: 13px;
          line-height: 1;
          font-weight: 700;
          letter-spacing: 0.1px;
          cursor: pointer;
          box-shadow:
            0 4px 14px rgba(0,0,0,0.18),
            inset 0 1px 0 rgba(255,255,255,0.08);
          -webkit-tap-highlight-color: transparent;
        }

        .hacs-update-badge:hover {
          background: rgba(255,69,58,0.24);
        }

        .hacs-update-badge ha-icon {
          --mdc-icon-size: 17px;
          width: 17px;
          height: 17px;
        }

        .home-status-panel {
          position: relative;
          isolation: isolate;
          margin-bottom: 26px;
          padding: 28px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 34px;
          box-shadow: 0 14px 38px rgba(0,0,0,0.28);
        }

        .home-status-panel::before,
        .home-status-panel::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .home-status-panel::before {
          z-index: -2;
          background-image: var(--home-hero-image);
          background-position: center center;
          background-repeat: no-repeat;
          background-size: cover;
          transform: scale(1.01);
        }

        .home-status-panel::after {
          z-index: -1;
          background:
            linear-gradient(
              90deg,
              rgba(5,7,10,0.64) 0%,
              rgba(5,7,10,0.36) 48%,
              rgba(5,7,10,0.57) 100%
            ),
            linear-gradient(
              180deg,
              rgba(5,7,10,0.12) 0%,
              rgba(5,7,10,0.52) 100%
            );
        }

        .home-status-panel.day::after {
          background:
            linear-gradient(
              90deg,
              rgba(5,7,10,0.56) 0%,
              rgba(5,7,10,0.28) 48%,
              rgba(5,7,10,0.54) 100%
            ),
            linear-gradient(
              180deg,
              rgba(5,7,10,0.16) 0%,
              rgba(5,7,10,0.50) 100%
            );
        }

        .hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 28px;
          margin-bottom: 30px;
        }


        .person-hero {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
        }

        .person-avatar {
          width: 82px;
          height: 82px;
          flex: 0 0 82px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(255,255,255,0.14);
          box-shadow:
            0 8px 24px rgba(0,0,0,0.22),
            inset 0 1px 0 rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.08);
        }

        .person-avatar-fallback {
          width: 82px;
          height: 82px;
          flex: 0 0 82px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.08);
        }

        .person-avatar-fallback ha-icon {
          width: 42px;
          height: 42px;
          color: rgba(235,235,245,0.78);
        }

        .person-copy {
          min-width: 0;
        }

        .person-name {
          font-size: clamp(28px, 4.2vw, 46px);
          line-height: 0.90;
          letter-spacing: -0.9px;
          font-weight: 740;
          color: var(--primary-text-color);
          max-width: 230px;
          white-space: normal;
          overflow-wrap: anywhere;
          word-break: break-word;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          overflow: hidden;
        }

        .person-state {
          margin-top: 10px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: var(--home-muted);
          font-size: clamp(17px, 2.2vw, 24px);
          font-weight: 500;
        }

        .person-state-label {
          display: inline-block;
          transform: translateY(5px);
          line-height: 1;
        }

        .person-state ha-icon {
          width: 20px;
          height: 20px;
          color: var(--home-green);
        }

        .person-state.away ha-icon {
          color: var(--home-muted);
        }

        .person-stack {
          min-width: 0;
        }

        .mini-people {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-top: 14px;
          padding-left: 2px;
        }

        .mini-person {
          width: 50px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          user-select: none;
          -webkit-user-select: none;
          -webkit-tap-highlight-color: transparent;
        }

        .mini-person-avatar,
        .mini-person-fallback {
          width: 40px;
          height: 40px;
          box-sizing: border-box;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.22);
          box-shadow: 0 4px 12px rgba(0,0,0,0.24);
          background: rgba(255,255,255,0.10);
        }

        .mini-person-avatar {
          display: block;
          object-fit: cover;
        }

        .mini-person-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mini-person-fallback ha-icon {
          width: 23px;
          height: 23px;
          color: rgba(235,235,245,0.82);
        }

        .mini-person.away .mini-person-avatar {
          border-color: rgba(255,69,58,0.95);
          filter:
            grayscale(1)
            sepia(1)
            saturate(7)
            hue-rotate(315deg)
            brightness(0.82);
        }

        .mini-person.away .mini-person-fallback {
          border-color: rgba(255,69,58,0.95);
          background: rgba(255,69,58,0.28);
        }

        .mini-person.away .mini-person-fallback ha-icon {
          color: rgb(255,105,97);
        }

        .mini-person-name {
          width: 64px;
          margin-left: -7px;
          margin-right: -7px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-align: center;
          color: var(--home-muted);
          font-size: 12px;
          line-height: 1.15;
          font-weight: 550;
        }

        .title {
          font-size: clamp(42px, 7vw, 72px);
          line-height: 0.95;
          letter-spacing: -2.2px;
          font-weight: 750;
          color: var(--primary-text-color);
        }

        .subtitle {
          margin-top: 12px;
          color: var(--home-muted);
          font-size: clamp(18px, 2.4vw, 28px);
          font-weight: 450;
        }

        .clock {
          text-align: right;
          white-space: nowrap;
        }

        .time {
          font-size: clamp(48px, 8vw, 84px);
          line-height: 0.95;
          letter-spacing: -2px;
          font-weight: 350;
          color: var(--primary-text-color);
        }

        .time.kiosk-toggle {
          cursor: pointer;
          user-select: none;
          -webkit-user-select: none;
          -webkit-tap-highlight-color: transparent;
        }

        .date {
          margin-top: 10px;
          color: var(--home-muted);
          font-size: clamp(15px, 2vw, 22px);
        }

        .status-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          grid-auto-rows: 72px;
          gap: 14px;
          margin-bottom: 0;
        }

        .status {
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
          height: 100%;
          min-height: 72px;
          padding: 6px 18px;
          display: flex;
          align-items: center;
          gap: 7px;
          border: 1px solid var(--home-card-border);
          border-radius: 28px;
          background: var(--home-card-bg);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          color: var(--primary-text-color);
          overflow: hidden;
        }

        .status > div {
          margin-left: -15px;
        }

        .status ha-icon {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          transform: translateY(6px);
        }

        .status.weather ha-icon {
          color: var(--home-yellow);
        }

        .status.power ha-icon {
          color: var(--home-yellow);
        }

        .status.security ha-icon,
        .status.battery ha-icon,
        .status.alarmo ha-icon,
        .status.homebase ha-icon {
          color: var(--home-green);
        }

        .status.security.warning ha-icon,
        .status.windows.warning ha-icon,
        .status.alarmo.warning ha-icon,
        .status.homebase.warning ha-icon {
          color: var(--home-red);
        }

        .status.windows ha-icon {
          color: rgba(235,235,245,0.80);
        }

        .status-main {
          min-width: 0;
          font-size: 20px;
          font-weight: 650;
          line-height: 1.05;
          white-space: nowrap;
        }

        #security-status,
        #battery-status,
        #alarm-status,
        #homebase-status {
          cursor: pointer;
        }

        .status-sub {
          margin-top: 1px;
          color: var(--home-muted);
          font-size: 14px;
          line-height: 1.05;
          white-space: nowrap;
        }

        .control-center {
          position: relative;
          isolation: isolate;
          margin-bottom: 28px;
          padding: 22px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 34px;
          box-shadow: 0 14px 38px rgba(0,0,0,0.25);
        }

        .control-center::before,
        .control-center::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .control-center::before {
          z-index: -2;
          background-image: var(--control-center-image);
          background-position: center center;
          background-repeat: no-repeat;
          background-size: cover;
          transform: scale(1.01);
        }

        .control-center::after {
          z-index: -1;
          background:
            linear-gradient(
              90deg,
              rgba(5,7,10,0.32) 0%,
              rgba(5,7,10,0.14) 50%,
              rgba(5,7,10,0.30) 100%
            ),
            linear-gradient(
              180deg,
              rgba(5,7,10,0.06) 0%,
              rgba(5,7,10,0.30) 100%
            );
        }

        .control-center .custom-page-links {
          position: relative;
          z-index: 1;
          margin-bottom: 22px;
        }

        .control-center:not(.has-favorites) .custom-page-links {
          margin-bottom: 0;
        }

        .control-center .favorites {
          position: relative;
          z-index: 1;
          margin: 0;
        }

        .control-center .custom-page-link,
        .control-center .favorite-card {
          background: rgba(27,29,33,0.88);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .custom-page-links {
          margin: 0 0 20px;
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
        }

        .custom-page-link {
          min-width: 0;
          min-height: 42px;
          padding: 7px 14px 7px 10px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid var(--home-card-border);
          border-radius: 999px;
          background: var(--home-card-bg);
          color: var(--primary-text-color);
          font: inherit;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }

        .custom-page-link:active {
          transform: scale(0.97);
        }

        .custom-page-link ha-icon {
          width: 23px;
          height: 23px;
          color: var(--primary-color, #03a9f4);
        }

        .custom-page-link span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .favorites {
          margin: 2px 0 28px;
        }

        .section-heading {
          margin: 0 4px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--primary-text-color);
          font-size: 18px;
          font-weight: 650;
        }

        .section-heading ha-icon {
          width: 21px;
          height: 21px;
          color: var(--home-yellow);
        }

        .favorite-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .favorite-card {
          min-width: 0;
          min-height: 74px;
          padding: 10px 13px;
          display: flex;
          align-items: center;
          gap: 11px;
          border: 1px solid var(--home-card-border);
          border-radius: 23px;
          background: var(--home-card-bg);
          color: var(--primary-text-color);
          font: inherit;
          text-align: left;
          cursor: pointer;
        }

        .favorite-card:active {
          transform: scale(0.98);
        }

        .favorite-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(118,118,128,0.20);
          color: rgba(235,235,245,0.86);
        }

        .favorite-icon ha-icon {
          width: 23px;
          height: 23px;
        }

        .favorite-card.active .favorite-icon {
          background: rgba(255,214,10,0.18);
          color: var(--home-yellow);
        }

        .favorite-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .favorite-name,
        .favorite-state {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .favorite-name {
          font-size: 15px;
          font-weight: 650;
        }

        .favorite-state {
          color: var(--home-muted);
          font-size: 12px;
        }

        .rooms {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .room {
          position: relative;
          min-height: 235px;
          border: 1px solid var(--home-card-border);
          border-radius: 30px;
          overflow: hidden;
          padding: 20px;
          background-color: #202226;
          color: white;
          text-align: left;
          cursor: pointer;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.04),
            0 8px 30px rgba(0,0,0,0.14);
          transition:
            transform 120ms ease,
            filter 120ms ease;
        }

        .room:active {
          transform: scale(0.985);
          filter: brightness(0.92);
        }

        .room:has(.room-power[data-more-info-entity]:active) {
          transform: none;
          filter: none;
        }

        .room-chevron {
          display: none !important;
        }

        .room-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          opacity: 1;
          pointer-events: none;
        }

        .room-shade {
          position: absolute;
          inset: 0;
          z-index: 1;
          background:
            linear-gradient(
              180deg,
              rgba(5, 8, 12, 0.10) 0%,
              rgba(5, 8, 12, 0.24) 45%,
              rgba(5, 8, 12, 0.90) 100%
            );
          pointer-events: none;
        }

        .room-top,
        .room-bottom,
        .room-status-badges,
        .room-power {
          z-index: 2;
        }

        .room-top {
          position: absolute;
          top: 55px;
          left: 20px;
        }

        .room-power {
          position: absolute;
          top: 8px;
          left: 10px;
          min-height: 34px;
          padding: 0 11px 0 9px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          border-radius: 17px;
          border: 1px solid rgba(255,255,255,0.13);
          background: rgba(32, 32, 35, 0.78);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          color: rgba(255,255,255,0.96);
          box-shadow: 0 4px 14px rgba(0,0,0,0.18);
          font-size: 14px;
          line-height: 1;
          font-weight: 650;
          white-space: nowrap;
        }

        .room-power ha-icon {
          --mdc-icon-size: 15px;
          width: 15px;
          height: 15px;
          color: var(--home-yellow);
        }

        .room-power.clickable {
          cursor: pointer;
        }

        .room-status-badges {
          position: absolute;
          top: 8px !important;
          right: 10px !important;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: flex-end;
          gap: 7px;
          max-width: calc(100% - 86px);
        }

        .room-status-badge {
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 0;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.13);
          background: rgba(32, 32, 35, 0.78);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          color: rgba(255,255,255,0.94);
          box-shadow: 0 4px 14px rgba(0,0,0,0.18);
        }

        .room-status-badge ha-icon {
          --mdc-icon-size: 14px;
          --iron-icon-width: 14px;
          --iron-icon-height: 14px;
          width: 14px !important;
          height: 14px !important;
          display: block;
          flex: 0 0 14px;
        }

        .room-status-badge.safe {
          border-color: rgba(48,209,88,0.34);
          background: rgba(24, 78, 42, 0.70);
        }

        .room-status-badge.safe ha-icon {
          color: var(--home-green);
        }

        .room-status-badge.warning {
          border-color: rgba(255,69,58,0.45);
          background: rgba(118, 35, 31, 0.82);
        }

        .room-status-badge.warning ha-icon {
          color: #fff;
        }

        .room-icon {
          width: 68px;
          height: 68px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(10,132,255,0.25);
          border: 1px solid rgba(10,132,255,0.64);
          backdrop-filter: blur(18px);
          line-height: 0;
        }

        .room-icon ha-icon {
          --mdc-icon-size: 34px;
          width: 34px;
          height: 34px;
          display: block;
          flex: 0 0 34px;
          color: #0A84FF;
          transform: none;
        }

        .room-bottom {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .room-name {
          position: absolute;
          top: 149px;
          left: 22px;
          right: 22px;
          font-size: clamp(25px, 3.5vw, 34px);
          font-weight: 720;
          letter-spacing: -0.7px;
          text-shadow: 0 2px 10px rgba(0,0,0,0.55);
        }

        .room-meta {
          position: absolute;
          top: 197px;
          left: 22px;
          right: 22px;
          margin-top: 0;
          display: flex;
          gap: 18px;
          align-items: center;
          flex-wrap: nowrap;
          width: auto;
          color: rgba(255,255,255,0.90);
          font-size: 17px;
          font-weight: 520;
        }

        .room-meta span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
        }

        .room-meta .room-presence {
          margin-left: auto;
          justify-content: flex-end;
          text-align: right;
        }

        .room-meta ha-icon {
          width: 20px;
          height: 20px;
          color: rgba(255,255,255,0.82);
        }

        .room-meta .room-temperature ha-icon,
        .room-meta .room-humidity ha-icon {
          width: 17px;
          height: 17px;
          --mdc-icon-size: 17px;
        }

        .room-meta .room-meta-value {
          transform: translateY(4px);
        }

        .room-meta .room-humidity ha-icon {
          color: #20A0FF;
        }

        .room-meta .room-presence ha-icon {
          color: rgba(235,235,245,0.62);
        }

        .room-meta .active ha-icon {
          color: var(--home-green);
        }

        .room-meta .room-presence.interrupted ha-icon {
          color: var(--home-red);
        }

        .quick {
          margin-top: 28px;
          padding-top: 26px;
          border-top: 1px solid rgba(255,255,255,0.10);
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .quick button {
          min-height: 82px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 11px;
          border: 1px solid var(--home-card-border);
          border-radius: 26px;
          background: var(--home-card-bg);
          color: var(--primary-text-color);
          font: inherit;
          font-size: 15px;
          font-weight: 650;
          cursor: pointer;
        }

        .quick button:active {
          transform: scale(0.98);
        }

        .quick ha-icon {
          width: 27px;
          height: 27px;
        }

        .quick .lights ha-icon {
          color: var(--home-yellow);
        }

        .quick .covers ha-icon {
          color: rgba(235,235,245,0.85);
        }

        .quick .lock ha-icon {
          color: var(--home-green);
        }

        .quick .night ha-icon {
          color: rgba(235,235,245,0.90);
        }

        .quick small {
          display: block;
          margin-top: 2px;
          color: var(--home-muted);
          font-weight: 450;
          font-size: 11px;
        }

        @media (max-width: 900px) {
          .status-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .favorite-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .quick {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 650px) {
          .page {
            padding: 24px 14px 36px;
          }

          .home-status-panel {
            margin-bottom: 20px;
            padding: 20px 14px;
            border-radius: 28px;
          }

          .control-center {
            margin-bottom: 24px;
            padding: 18px 14px;
            border-radius: 28px;
          }

          .hero {
            align-items: flex-start;
            margin-bottom: 24px;
          }

          .person-hero {
            gap: 10px;
          }

          .person-avatar,
          .person-avatar-fallback {
            width: 58px;
            height: 58px;
            flex-basis: 58px;
          }

          .person-avatar-fallback ha-icon {
            width: 34px;
            height: 34px;
          }

          .person-name {
            font-size: 30px;
            line-height: 0.90;
            letter-spacing: -0.6px;
            max-width: 180px;
          }

          .person-state {
            margin-top: 6px;
            font-size: 16px;
          }

          .person-state-label {
            transform: translateY(2px);
          }

          .title {
            font-size: 46px;
          }

          .subtitle {
            font-size: 17px;
          }

          .time {
            font-size: 42px;
          }

          .date {
            font-size: 12px;
            max-width: 150px;
            white-space: normal;
          }

          .status-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            grid-auto-rows: 56px;
            gap: 10px;
          }

          .status {
            height: 100%;
            min-height: 56px;
            border-radius: 21px;
            padding: 4px 14px;
          }

          .status-main {
            font-size: 16px;
          }

          .status-sub {
            font-size: 12px;
          }

          .favorites {
            margin-bottom: 24px;
          }

          .custom-page-links {
            margin-bottom: 18px;
            flex-wrap: nowrap;
            overflow-x: auto;
            scrollbar-width: none;
          }

          .custom-page-links::-webkit-scrollbar {
            display: none;
          }

          .custom-page-link {
            flex: 0 0 auto;
            min-height: 40px;
            padding: 6px 13px 6px 9px;
          }

          .section-heading {
            font-size: 17px;
          }

          .favorite-grid {
            gap: 10px;
          }

          .favorite-card {
            min-height: 66px;
            padding: 8px 10px;
            border-radius: 21px;
          }

          .favorite-icon {
            width: 38px;
            height: 38px;
            flex-basis: 38px;
          }

          .favorite-icon ha-icon {
            width: 21px;
            height: 21px;
          }

          .favorite-name {
            font-size: 14px;
          }

          .rooms {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .room {
            min-height: 190px;
            border-radius: 25px;
          }

          .room-icon {
            width: 58px;
            height: 58px;
          }

          .room-top {
            top: 51px;
            left: 20px;
          }

          .room-power {
            top: 7px;
            left: 9px;
            min-height: 31px;
            padding: 0 9px 0 8px;
            font-size: 13px;
          }

          .room-power ha-icon {
            --mdc-icon-size: 14px;
            width: 14px;
            height: 14px;
          }

          .room-status-badges {
            top: 8px !important;
            right: 10px !important;
            gap: 5px;
            max-width: calc(100% - 72px);
          }

          .room-status-badge {
            width: 30px;
            height: 30px;
            flex-basis: 30px;
          }

          .room-status-badge ha-icon {
            --mdc-icon-size: 13px;
            --iron-icon-width: 13px;
            --iron-icon-height: 13px;
            width: 13px !important;
            height: 13px !important;
            display: block;
            flex: 0 0 13px;
          }

          .room-icon ha-icon {
            --mdc-icon-size: 29px;
            width: 29px;
            height: 29px;
            flex-basis: 29px;
          }

          .room-name {
            top: 115px;
            font-size: 27px;
          }

          .room-meta {
            top: 154px;
            gap: 11px;
            font-size: 15px;
          }

          .room-meta .room-presence {
            margin-left: auto;
          }
        }
      </style>

      <ha-card>
        <div class="page">
          ${hacsUpdateAvailable ? `
            <div class="hacs-update-wrap">
              <button
                class="hacs-update-badge"
                id="hacs-update-badge"
                type="button"
                title="${hacsUpdatesAvailable.length} HACS-Update${hacsUpdatesAvailable.length === 1 ? "" : "s"} verfügbar"
              >
                <ha-icon icon="mdi:package-up"></ha-icon>
                <span>Update vorhanden</span>
              </button>
            </div>
          ` : ""}

          <section
            class="home-status-panel ${heroIsDay ? "day" : "night"}"
            style="--home-hero-image: url('${this._escapeHtml(heroImage || "")}')"
            aria-label="Hausstatus"
          >
            <div class="hero">
            <div class="person-stack">
            ${
              person
                ? `
                  <div
                    class="person-hero"
                    id="person-hero"
                    role="button"
                    tabindex="0"
                  >
                    ${
                      personPicture
                        ? `
                          <img
                            class="person-avatar"
                            src="${personPicture}"
                            alt="${personName}"
                          />
                        `
                        : `
                          <div class="person-avatar-fallback">
                            <ha-icon icon="mdi:account"></ha-icon>
                          </div>
                        `
                    }

                    <div class="person-copy">
                      <div class="person-name">${personName}</div>
                      <div class="person-state ${personHome ? "" : "away"}">
                        <ha-icon
                          icon="${personHome ? "mdi:home-account" : "mdi:account-arrow-right-outline"}"
                        ></ha-icon>
                        <span class="person-state-label">${personState}</span>
                      </div>
                    </div>
                  </div>
                `
                : `
                  <div>
                    <div class="title">${this._config.title || "Zuhause"}</div>
                    ${
                      this._config.subtitle
                        ? `<div class="subtitle">${this._config.subtitle}</div>`
                        : ""
                    }
                  </div>
                `
            }
            ${miniPeopleHtml}
            </div>

            <div class="clock">
              <div
                class="time ${
                  this._config.clock_kiosk_toggle !== false
                    ? "kiosk-toggle"
                    : ""
                }"
                ${
                  this._config.clock_kiosk_toggle !== false
                    ? 'id="kiosk-clock" role="button" tabindex="0" title="Kiosk-Modus umschalten"'
                    : ""
                }
              >${time}</div>
              <div class="date">${date}</div>
            </div>
            </div>

            <div class="status-grid">
            <div class="status weather">
              <ha-icon icon="${weatherIcon}"></ha-icon>
              <div>
                <div class="status-main">${weatherTemperature}</div>
                <div class="status-sub">${weatherText}</div>
              </div>
            </div>

            ${powerAvailable ? `
              <div class="status power">
                <ha-icon icon="mdi:flash"></ha-icon>
                <div>
                  <div class="status-main">${this._formatPower()}</div>
                  <div class="status-sub">Gesamt</div>
                </div>
              </div>
            ` : ""}

            <div
              class="status security ${securityActive ? "warning" : ""}"
              id="security-status"
            >
              <ha-icon icon="${securityActive ? "mdi:shield-alert" : "mdi:shield-check"}"></ha-icon>
              <div>
                <div class="status-main">${securityText}</div>
                <div class="status-sub">Sicherheit</div>
              </div>
            </div>

            <div
              class="status battery"
              id="battery-status"
            >
              <ha-icon icon="mdi:battery-heart-variant"></ha-icon>
              <div>
                <div class="status-main">Batterie</div>
                <div class="status-sub">${batterySubText}</div>
              </div>
            </div>

            ${alarmAvailable ? `
              <div
                class="status alarmo ${alarmDisabled ? "warning" : ""}"
                id="alarm-status"
              >
                <ha-icon
                  icon="${
                    alarmDisabled
                      ? "mdi:shield-off-outline"
                      : "mdi:shield-lock"
                  }"
                ></ha-icon>
                <div>
                  <div class="status-main">${alarmText}</div>
                  <div class="status-sub">Alarmo</div>
                </div>
              </div>
            ` : ""}

            ${homeBaseAvailable ? `
              <div
                class="status homebase ${homeBaseDisabled ? "warning" : ""}"
                id="homebase-status"
              >
                <ha-icon icon="${homeBaseIcon}"></ha-icon>
                <div>
                  <div class="status-main">${homeBaseText}</div>
                  <div class="status-sub">AtzeHomeBase</div>
                </div>
              </div>
            ` : ""}
            </div>
          </section>

          ${controlCenterHtml}

          <div class="rooms">
            ${roomHtml}
          </div>

          <div class="quick">
            <button class="lights" id="all-lights">
              <ha-icon icon="mdi:lightbulb-outline"></ha-icon>
              <span>Lichter aus</span>
            </button>

            <button class="covers" id="all-covers">
              <ha-icon icon="mdi:window-shutter"></ha-icon>
              <span>Rollläden zu</span>
            </button>

            <button class="lights" id="all-lights-on">
              <ha-icon icon="mdi:lightbulb-on-outline"></ha-icon>
              <span>Lichter an</span>
            </button>

            <button class="covers" id="all-covers-open">
              <ha-icon icon="mdi:window-shutter-open"></ha-icon>
              <span>Rollläden auf</span>
            </button>

            ${
              this._config.lock_entity
                ? `
                  <button class="lock" id="lock-info">
                    <ha-icon icon="mdi:lock-smart"></ha-icon>
                    <span>
                      Tür
                      <small>${lockText}</small>
                    </span>
                  </button>
                `
                : ""
            }

            ${
              hasNight
                ? `
                  <button class="night" id="night-mode">
                    <ha-icon icon="mdi:weather-night"></ha-icon>
                    <span>Nachtmodus</span>
                  </button>
                `
                : ""
            }
          </div>
        </div>
      </ha-card>
    `;

    this.shadowRoot
      .querySelectorAll(".room")
      .forEach((element) => {
        const room = (this._config.room_tiles || []).find(
          (entry) => entry.area_id === element.dataset.areaId
        );

        const img = element.querySelector(".room-bg");

        if (img && room) {
          this._loadRoomImage(
            img,
            room,
            element.dataset.lightsOn === "true"
          );
        }

        element.addEventListener(
          "click",
          () => this._navigate(element.dataset.path)
        );

        element.addEventListener("keydown", (event) => {
          if (event.target !== element) return;

          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            this._navigate(element.dataset.path);
          }
        });
      });

    this.shadowRoot
      .querySelectorAll(".custom-page-link[data-path]")
      .forEach((element) => {
        element.addEventListener("click", () =>
          this._navigate(element.dataset.path)
        );
      });

    this.shadowRoot
      .querySelectorAll(".custom-page-link[data-popup-hash]")
      .forEach((element) => {
        element.addEventListener("click", () =>
          this._openPopup(element.dataset.popupHash)
        );
      });

    this.shadowRoot
      .querySelectorAll(".room-power[data-more-info-entity]")
      .forEach((element) => {
        const openMoreInfo = (event) => {
          event.preventDefault();
          event.stopPropagation();
          this._moreInfo(element.dataset.moreInfoEntity);
        };

        element.addEventListener("click", openMoreInfo);
        element.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            openMoreInfo(event);
          }
        });
      });

    this.shadowRoot
      .querySelectorAll(".favorite-card[data-entity-id]")
      .forEach((element) => {
        element.addEventListener("click", () =>
          this._activateFavorite(
            element.dataset.entityId
          )
        );
      });

    this.shadowRoot
      .querySelector("#person-hero")
      ?.addEventListener(
        "click",
        () => this._moreInfo(this._config.person_entity)
      );

    this.shadowRoot
      .querySelector("#person-hero")
      ?.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this._moreInfo(this._config.person_entity);
        }
      });

    this.shadowRoot
      .querySelectorAll(".mini-person[data-entity-id]")
      .forEach((element) => {
        const openPerson = (event) => {
          event?.preventDefault?.();
          this._moreInfo(element.dataset.entityId);
        };

        element.addEventListener("click", openPerson);
        element.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            openPerson(event);
          }
        });
      });

    this.shadowRoot
      .querySelector("#hacs-update-badge")
      ?.addEventListener(
        "click",
        () => this._navigateHacs()
      );

    const kioskClock =
      this.shadowRoot.querySelector("#kiosk-clock");

    if (kioskClock) {
      let pressStartedAt = 0;
      let pressMoved = false;

      kioskClock.addEventListener("pointerdown", () => {
        pressStartedAt = performance.now();
        pressMoved = false;
      });

      kioskClock.addEventListener("pointermove", () => {
        pressMoved = true;
      });

      kioskClock.addEventListener("pointercancel", () => {
        pressStartedAt = 0;
        pressMoved = true;
      });

      kioskClock.addEventListener("pointerup", (event) => {
        if (!pressStartedAt) return;

        const duration = performance.now() - pressStartedAt;
        pressStartedAt = 0;

        event.preventDefault();
        event.stopPropagation();

        if (!pressMoved && duration >= 900) {
          this._navigateHacs();
          return;
        }

        if (!pressMoved) {
          this._toggleKioskMode();
        }
      });

      // Pointerup owns tap/hold handling. Suppress the synthetic click so
      // touch devices cannot execute a second action afterwards.
      kioskClock.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
    }

    kioskClock?.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();
          this._toggleKioskMode();
        }
      }
    );

    this.shadowRoot
      .querySelector("#security-status")
      ?.addEventListener(
        "click",
        () => this._navigate(this._config.security_path)
      );

    this.shadowRoot
      .querySelector("#battery-status")
      ?.addEventListener(
        "click",
        () => this._navigate(this._config.maintenance_path)
      );

    this.shadowRoot
      .querySelector("#alarm-status")
      ?.addEventListener(
        "click",
        () => this._moreInfo(this._config.alarm_entity)
      );

    this.shadowRoot
      .querySelector("#homebase-status")
      ?.addEventListener(
        "click",
        () => this._moreInfo(this._config.homebase_entity)
      );

    this.shadowRoot
      .querySelector("#all-lights")
      ?.addEventListener("click", () => this._allLightsOff());

    this.shadowRoot
      .querySelector("#all-covers")
      ?.addEventListener("click", () => this._allCoversClose());

    this.shadowRoot
      .querySelector("#all-lights-on")
      ?.addEventListener("click", () => this._allLightsOn());

    this.shadowRoot
      .querySelector("#all-covers-open")
      ?.addEventListener("click", () => this._allCoversOpen());

    this.shadowRoot
      .querySelector("#lock-info")
      ?.addEventListener(
        "click",
        () => this._moreInfo(this._config.lock_entity)
      );

    this.shadowRoot
      .querySelector("#night-mode")
      ?.addEventListener("click", () => this._toggleNight());
  }

  getCardSize() {
    return 12;
  }
}

if (!customElements.get("atze-home-overview-card")) {
  customElements.define(
    "atze-home-overview-card",
    AtzeHomeOverviewCard
  );
}

window.customCards = window.customCards || [];

if (
  !window.customCards.some(
    (card) => card.type === "atze-home-overview-card"
  )
) {
  window.customCards.push({
    type: "atze-home-overview-card",
    name: "Atze Home Overview",
    description: "Apple-Home-inspirierte Atze Dashboard Startseite",
  });
}


