class AtzeHomeOverviewCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._clockTimer = null;
    this._blueprintEnsureStarted = false;
    this._scrollTopCleanup = null;
    this._pageScrollCleanup = null;
    this._weatherPopupOpen = false;
    this._powerPopupOpen = false;
    this._groupControlPopup = null;
    this._climateHistoryPopup = null;
    this._climateHistory = [];
    this._climateHistoryLoading = false;
    this._presenceHistoryPopup = null;
    this._presenceHistory = [];
    this._presenceHistoryLoading = false;
    this._presenceHistoryError = false;
    this._weatherForecast = [];
    this._weatherForecastLoading = false;
    this._roomDrag = null;
    this._hiddenRoomIds = [];
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

    if (!this._interactionActive) this._render();
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

    if (!this._pageScrollCleanup) {
      this._pageScrollCleanup =
        setupAtzePageScroll(
          this,
          this._config?.page_scroll === true
        );
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

    this._pageScrollCleanup?.();
    this._pageScrollCleanup = null;
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
      parts.push("hide_header");

      if (this._config?.force_kiosk === true) {
        parts.push("atze_km_auto=1");
      }
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

  async _openWeatherPopup() {
    if (!this._config?.weather_entity) return;
    this._weatherPopupOpen = true;
    this._render();
    if (this._weatherForecastLoading) return;
    this._weatherForecastLoading = true;
    try {
      const response = await this._hass.callWS({
        type: "weather/get_forecasts",
        forecast_type: "daily",
        entity_ids: [this._config.weather_entity],
      });
      this._weatherForecast = response?.[this._config.weather_entity]?.forecast || [];
    } catch (_error) {
      this._weatherForecast = [];
    } finally {
      this._weatherForecastLoading = false;
      if (this._weatherPopupOpen) this._render();
    }
  }

  _closeWeatherPopup() {
    this._weatherPopupOpen = false;
    this._render();
  }

  _weatherPopupHtml(weather) {
    if (!this._weatherPopupOpen || !weather) return "";
    const attrs = weather.attributes || {};
    const metric = (icon, label, value, unit = "") =>
      value == null || value === "" ? "" :
      `<div class="weather-metric"><ha-icon icon="${icon}"></ha-icon><div><span>${label}</span><strong>${value}${unit}</strong></div></div>`;
    const forecast = this._weatherForecast.slice(0, 5).map((day) => {
      const date = day.datetime ? new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }).format(new Date(day.datetime)) : "";
      const high = day.temperature != null ? `${Math.round(Number(day.temperature))}°` : "—";
      const low = day.templow != null ? `${Math.round(Number(day.templow))}°` : "";
      const precipitation = day.precipitation_probability != null ? `${Math.round(Number(day.precipitation_probability))}%` : "";
      return `<div class="weather-forecast-day"><span>${date}</span><ha-icon icon="${this._weatherIcon(day.condition)}"></ha-icon><strong>${high}${low ? ` / ${low}` : ""}</strong>${precipitation ? `<small><ha-icon icon="mdi:water-percent"></ha-icon>${precipitation}</small>` : ""}</div>`;
    }).join("");
    return `<div class="weather-popup-backdrop" id="weather-popup-backdrop"><section class="weather-popup" role="dialog" aria-modal="true" aria-label="Wetterinformationen"><div class="weather-popup-current"><ha-icon class="weather-popup-icon" icon="${this._weatherIcon(weather.state)}"></ha-icon><div><div class="weather-popup-temp">${attrs.temperature != null ? Math.round(Number(attrs.temperature)) + " °C" : "—"}</div><div class="weather-popup-condition">${this._weatherText(weather.state)}</div></div></div><div class="weather-metrics">${metric("mdi:water-percent", "Luftfeuchtigkeit", attrs.humidity, " %")}${metric("mdi:weather-windy", "Wind", attrs.wind_speed, attrs.wind_speed_unit ? " " + attrs.wind_speed_unit : "")}${metric("mdi:gauge", "Luftdruck", attrs.pressure, attrs.pressure_unit ? " " + attrs.pressure_unit : "")}${metric("mdi:weather-rainy", "Niederschlag", attrs.precipitation, attrs.precipitation_unit ? " " + attrs.precipitation_unit : "")}</div><div class="weather-forecast"><h3>Vorhersage</h3>${this._weatherForecastLoading ? '<div class="weather-loading">Wird geladen …</div>' : (forecast ? `<div class="weather-forecast-grid">${forecast}</div>` : '<div class="weather-loading">Keine Tagesvorhersage verfügbar.</div>')}</div></section></div>`;
  }



  _openPowerPopup() {
    this._powerPopupOpen = true;
    this._render();
  }

  _closePowerPopup() {
    this._powerPopupOpen = false;
    this._render();
  }

  _powerPopupHtml() {
    if (!this._powerPopupOpen) return "";

    const rows = (this._config.room_tiles || [])
      .map((room) => {
        const entityId =
          typeof room.power === "string"
            ? room.power
            : room.power?.entity_id;
        const state = this._state(entityId);
        const value = Number.parseFloat(state?.state);
        if (
          !entityId ||
          !Number.isFinite(value) ||
          ["unknown", "unavailable"].includes(String(state?.state || "").toLowerCase())
        ) return null;

        const unit = state?.attributes?.unit_of_measurement || "W";
        const formatted = unit === "W"
          ? `${Math.round(value)} W`
          : `${Math.round(value * 10) / 10} ${unit}`;

        return {
          name: room.name || room.area_id || "Raum",
          value,
          formatted,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.value - a.value);

    const rowHtml = rows.length
      ? rows.map((row) => `
          <div class="power-popup-row">
            <div class="power-popup-room">
              <ha-icon icon="mdi:home-outline"></ha-icon>
              <span>${row.name}</span>
            </div>
            <strong>${row.formatted}</strong>
          </div>
        `).join("")
      : '<div class="power-popup-empty">Keine Raumzähler verfügbar.</div>';

    return `
      <div class="weather-popup-backdrop" id="power-popup-backdrop">
        <section class="weather-popup power-popup" role="dialog" aria-modal="true" aria-label="Gesamtverbrauch">
<div class="weather-popup-current">
            <ha-icon class="weather-popup-icon" icon="mdi:flash"></ha-icon>
            <div>
              <div class="weather-popup-temp">${this._formatPower()}</div>
              <div class="weather-popup-condition">Gesamtverbrauch</div>
            </div>
          </div>
          <div class="power-popup-list">
            <h3>Raumzähler</h3>
            ${rowHtml}
          </div>
        </section>
      </div>
    `;
  }


  async _openClimateHistory(entityId, kind, roomName, range = "24h") {
    if (!entityId || !this._hass) return;
    this._climateHistoryPopup = { entityId, kind, roomName, range };
    this._climateHistory = [];
    this._climateHistoryLoading = true;
    this._render();

    const hours = { "8h": 8, "24h": 24, "7d": 168, "30d": 720 }[range] || 24;
    const start = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    try {
      const endTime = new Date().toISOString();
      const response = await this._hass.callApi(
        "GET",
        `history/period/${encodeURIComponent(start)}?end_time=${encodeURIComponent(endTime)}&filter_entity_id=${encodeURIComponent(entityId)}&minimal_response&no_attributes`
      );
      const states = Array.isArray(response?.[0]) ? response[0] : [];
      this._climateHistory = states
        .map((entry) => ({
          time: new Date(entry.last_changed || entry.last_updated).getTime(),
          value: Number.parseFloat(entry.state),
        }))
        .filter((entry) => Number.isFinite(entry.time) && Number.isFinite(entry.value));
    } catch (error) {
      console.warn("Atze Dashboard: Verlauf konnte nicht geladen werden.", error);
      this._climateHistory = [];
    } finally {
      this._climateHistoryLoading = false;
      if (this._climateHistoryPopup?.entityId === entityId) this._render();
    }
  }

  _closeClimateHistory() {
    this._climateHistoryPopup = null;
    this._climateHistory = [];
    this._climateHistoryLoading = false;
    this._render();
  }

  _climateHistoryChartHtml() {
    const points = this._climateHistory || [];
    if (this._climateHistoryLoading) {
      return '<div class="history-empty">Verlauf wird geladen …</div>';
    }
    if (points.length < 2) {
      return '<div class="history-empty">Für diesen Zeitraum sind keine Verlaufsdaten verfügbar.</div>';
    }

    const sortedPoints = [...points].sort((a, b) => a.time - b.time);
    const range = this._climateHistoryPopup?.range || "24h";
    const rangeHours = { "8h": 8, "24h": 24, "7d": 168, "30d": 720 }[range] || 24;
    const bucketMinutes = { "8h": 5, "24h": 15, "7d": 120, "30d": 720 }[range] || 15;
    const bucketMs = bucketMinutes * 60 * 1000;
    const end = Date.now();
    const start = end - rangeHours * 60 * 60 * 1000;

    const buckets = new Map();
    sortedPoints.forEach((point) => {
      if (point.time < start || point.time > end) return;
      const bucket = Math.floor((point.time - start) / bucketMs);
      const current = buckets.get(bucket) || { total: 0, count: 0 };
      current.total += point.value;
      current.count += 1;
      buckets.set(bucket, current);
    });
    const chartPoints = [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([bucket, sample]) => ({
        time: start + (bucket + 0.5) * bucketMs,
        value: sample.total / sample.count,
      }));

    if (chartPoints.length < 2) {
      return '<div class="history-empty">Für diesen Zeitraum sind keine ausreichenden Verlaufsdaten verfügbar.</div>';
    }

    const values = chartPoints.map((point) => point.value);
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (min === max) {
      min -= 0.5;
      max += 0.5;
    }
    const pad = Math.max((max - min) * 0.12, 0.25);
    min -= pad;
    max += pad;

    const span = Math.max(1, end - start);
    const coords = chartPoints.map((point) => {
      const x = 12 + ((point.time - start) / span) * 276;
      const y = 138 - ((point.value - min) / (max - min)) * 116;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");

    return `
      <div class="history-chart-wrap">
        <div class="history-scale"><span>${max.toFixed(1)}</span><span>${min.toFixed(1)}</span></div>
        <svg class="history-chart" viewBox="0 0 300 150" preserveAspectRatio="none" aria-label="Verlaufsdiagramm">
          <line x1="12" y1="22" x2="288" y2="22"></line>
          <line x1="12" y1="80" x2="288" y2="80"></line>
          <line x1="12" y1="138" x2="288" y2="138"></line>
          <polyline points="${coords}"></polyline>
        </svg>
      </div>
    `;
  }

  _climateHistoryPopupHtml() {
    const popup = this._climateHistoryPopup;
    if (!popup) return "";

    const state = this._state(popup.entityId);
    const value = this._formatted(popup.entityId) || "—";
    const temperature = popup.kind === "temperature";
    const icon = temperature ? "mdi:thermometer" : "mdi:water-percent";
    const label = temperature ? "Temperatur" : "Luftfeuchtigkeit";
    const ranges = ["8h", "24h", "7d", "30d"];

    return `
      <div class="weather-popup-backdrop" id="history-popup-backdrop">
        <section class="weather-popup history-popup" role="dialog" aria-modal="true" aria-label="${label} Verlauf">
<div class="weather-popup-current">
            <ha-icon class="weather-popup-icon" icon="${icon}"></ha-icon>
            <div>
              <div class="weather-popup-temp">${value}</div>
              <div class="weather-popup-condition">${popup.roomName} · ${label}</div>
            </div>
          </div>
          <div class="history-range">
            ${ranges.map((range) => `<button type="button" data-history-range="${range}" class="${popup.range === range ? "active" : ""}">${range}</button>`).join("")}
          </div>
          ${this._climateHistoryChartHtml()}
          <div class="history-sensor">${state?.attributes?.friendly_name || popup.entityId}</div>
        </section>
      </div>
    `;
  }



  async _openPresenceHistory(range = "24h", entityId = null) {
    const personId = entityId || this._config?.person_entity || "person.alexander_reimann";
    const trackerId = "device_tracker.atzes_iphone_17_pro_2";
    const request = { personId, trackerId };
    this._presenceHistoryPopup = request;
    this._presenceHistory = [];
    this._presenceHistoryLoading = true;
    this._presenceHistoryError = false;
    this._render();
    const hours = 24;
    const start = new Date(Date.now() - hours * 3600000).toISOString();
    const end = new Date().toISOString();
    try {
      const response = await this._hass.callApi("GET",
        `history/period/${encodeURIComponent(start)}?end_time=${encodeURIComponent(end)}&filter_entity_id=${encodeURIComponent(personId + "," + trackerId)}&no_attributes`);
      if (this._presenceHistoryPopup !== request) return;
      const events = [];
      for (const entries of Array.isArray(response) ? response : []) {
        if (!Array.isArray(entries)) continue;
        let previous = null;
        for (const entry of entries) {
          const source = entry.entity_id;
          if (source !== personId && source !== trackerId) continue;
          const state = String(entry.state ?? "");
          const timestamp = new Date(entry.last_changed || entry.last_updated).getTime();
          if (!Number.isFinite(timestamp)) continue;
          // The first record is the state at the start of the requested window.
          if (previous === null) { previous = state; continue; }
          if (previous === state) continue;
          previous = state;
          events.push({ source, state, timestamp });
        }
      }
      this._presenceHistory = events.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.warn("Atze Dashboard: Anwesenheitsverlauf konnte nicht geladen werden.", error);
      if (this._presenceHistoryPopup === request) this._presenceHistoryError = true;
    } finally {
      if (this._presenceHistoryPopup === request) {
        this._presenceHistoryLoading = false;
        this._render();
      }
    }
  }

  _closePresenceHistory() {
    this._presenceHistoryPopup = null;
    this._presenceHistory = [];
    this._presenceHistoryLoading = false;
    this._render();
  }

  _presenceHistoryPopupHtml() {
    const popup = this._presenceHistoryPopup;
    if (!popup) return "";
    const formatState = (state) => ({
      home: "Zuhause", not_home: "Abwesend",
      unavailable: "Nicht verfügbar", unknown: "Unbekannt"
    }[state] || state);
    const formatTime = (timestamp) => new Intl.DateTimeFormat("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    }).format(new Date(timestamp));
    const stateBadge = (id) => this._escapeHtml(formatState(this._state(id)?.state || "unavailable"));
    const events = this._presenceHistory.map((event) => `
      <div class="presence-event">
        <span class="presence-event-time">${formatTime(event.timestamp)}</span>
        <span class="presence-event-source">${event.source === popup.personId ? "Person" : "iCloud iPhone"}</span>
        <strong>${this._escapeHtml(formatState(event.state))}</strong>
      </div>`).join("");
    return `
      <div class="weather-popup-backdrop" id="presence-history-backdrop">
        <section class="weather-popup presence-history-popup" role="dialog" aria-modal="true" aria-label="Anwesenheitsverlauf">
          <div class="presence-history-title"><ha-icon icon="mdi:account-clock"></ha-icon><div><strong>Anwesenheitsverlauf</strong><small>Person und iCloud im Vergleich</small></div></div>
          <div class="presence-summary">
            <div><span>Person</span><strong>${stateBadge(popup.personId)}</strong></div>
            <div><span>iCloud iPhone</span><strong>${stateBadge(popup.trackerId)}</strong></div>
          </div>
          <div class="presence-event-list">
            ${this._presenceHistoryLoading ? '<div class="history-empty">Verlauf wird geladen …</div>' :
              this._presenceHistoryError ? '<div class="history-empty">Verlauf konnte nicht geladen werden.</div>' :
              events || '<div class="history-empty">Keine Zustandswechsel im gewählten Zeitraum.</div>'}
          </div>
        </section>
      </div>`;
  }

  _roomImageState(room, lightsOn = false) {
    if (room.state_mode === "motion_light" && room.state_images) {
      const motionOn = String(this._state(room.motion_light_entity)?.state || "").toLowerCase() === "on";
      const hour = new Date().getHours();
      const period = hour >= 7 && hour < 20 ? "day" : "night";
      return `${period}_light_${motionOn ? "on" : "off"}`;
    }
    if (room.state_mode === "cinema" && room.state_images) {
      const cinemaOn = (room.cinema_entities || []).some((entityId) => {
        const state = String(this._state(entityId)?.state || "").toLowerCase();
        return !["", "off", "idle", "standby", "unavailable", "unknown"].includes(state);
      });
      const hour = new Date().getHours();
      const period = hour >= 7 && hour < 20 ? "day" : "night";
      return `${period}_light_${lightsOn ? "on" : "off"}_cinema_${cinemaOn ? "on" : "off"}`;
    }
    const windowState = room.window_entity ? this._state(room.window_entity) : null;
    const windowOpen = Boolean(windowState && ["on", "open"].includes(String(windowState.state || "").toLowerCase()));
    if (room.area_id === "flur" && room.state_images) {
      const lockState = room.lock_entity ? String(this._state(room.lock_entity)?.state || "").toLowerCase() : "";
      const hour = new Date().getHours();
      const period = hour >= 7 && hour < 20 ? "day" : "night";
      const baseState = windowOpen
        ? `light_${lightsOn ? "on" : "off"}_door_open`
        : `light_${lightsOn ? "on" : "off"}_door_closed_${lockState === "locked" ? "locked" : "unlocked"}`;
      return `${period}_${baseState}`;
    }
    const coverEntity = room.cover_entity || room.roller_sensor_entity;
    const coverState = coverEntity ? this._state(coverEntity) : null;
    const coverPosition = Number(coverState?.attributes?.current_position);
    const coverOpen = Boolean(coverState && (
      Number.isFinite(coverPosition)
        ? coverPosition > 0
        : ["open", "opening", "on"].includes(String(coverState.state || "").toLowerCase())
    ));
    const baseState = `light_${lightsOn ? "on" : "off"}_window_${windowOpen ? "open" : "closed"}_cover_${coverOpen ? "open" : "closed"}`;
    if (room.state_images) {
      const hour = new Date().getHours();
      const period = hour >= 7 && hour < 20 ? "day" : "night";
      const timedState = `${period}_${baseState}`;
      if (room.state_images[timedState]) return timedState;
    }
    return baseState;
  }

  _roomImageCandidates(room, lightsOn = false) {
    const stateKey = this._roomImageState(room, lightsOn);
    const stateImage = room.state_images?.[stateKey];
    const simpleDayNightRoom = ["buro", "arbeitszimmer", "3d_drucker", "3d-drucker", "zentrale"].includes(room.area_id);
    const hour = new Date().getHours();
    const useDayImage = simpleDayNightRoom && hour >= 7 && hour < 20 && room.light_image;
    const useLightImage = Boolean(!stateImage && !simpleDayNightRoom && lightsOn && room.light_image);
    const fallbackImage = useDayImage ? room.light_image : room.image;
    const cacheKey = `${room.area_id}:${stateImage ? stateKey : (useDayImage ? "day" : (useLightImage ? "light" : "dark"))}`;
    const fileName = stateImage
      ? String(stateImage).split("/").pop()
      : (useDayImage || useLightImage)
        ? room.light_image_file
        : (room.image_file || `${room.area_id}.jpg`);
    const candidates = [];

    const add = (value) => {
      if (!value) return;
      try {
        const absolute = new URL(value, window.location.origin).href;
        if (!candidates.includes(absolute)) candidates.push(absolute);
      } catch (_error) {}
    };

    add(ATZE_HOME_ROOM_IMAGE_CACHE.get(cacheKey));
    add(stateImage || (useLightImage ? room.light_image : fallbackImage));

    if (this._config.asset_base && fileName) {
      try {
        const base = String(this._config.asset_base).endsWith("/") ? String(this._config.asset_base) : `${this._config.asset_base}/`;
        add(new URL(fileName, new URL(base, window.location.origin)).href);
      } catch (_error) {}
    }
    if (fileName) add(new URL(fileName, ATZE_ASSET_BASE_URL).href);
    try {
      const resources = performance.getEntriesByType("resource").map((entry) => entry.name).filter((name) => /atze-dashboard-strat.*\.js/i.test(name)).reverse();
      for (const resourceUrl of resources) {
        try { if (fileName) add(new URL(`assets/${fileName}`, new URL("./", resourceUrl)).href); } catch (_error) {}
      }
    } catch (_error) {}
    if (fileName) {
      add(`/hacsfiles/atze-dashboard-strategy/assets/${fileName}`);
      add(`/local/atze-dashboard-strategy/assets/${fileName}`);
      add(`/local/atze-dashboard-strat/assets/${fileName}`);
    }
    return { candidates, cacheKey };
  }

  _loadRoomImage(img, room, lightsOn = false) {
    const { candidates, cacheKey } = this._roomImageCandidates(room, lightsOn);
    if (!candidates.length) { img.remove(); return; }
    let index = 0;
    let currentCandidate = null;
    const loadNext = () => {
      if (index >= candidates.length) { img.style.display = "none"; return; }
      currentCandidate = candidates[index++];
      img.src = currentCandidate;
    };
    img.addEventListener("error", () => {
      if (ATZE_HOME_ROOM_IMAGE_CACHE.get(cacheKey) === currentCandidate) ATZE_HOME_ROOM_IMAGE_CACHE.delete(cacheKey);
      loadNext();
    });
    img.addEventListener("load", () => {
      if (currentCandidate) ATZE_HOME_ROOM_IMAGE_CACHE.set(cacheKey, currentCandidate);
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

  _openHomeAssistantUpdate() {
    const entityId = this._config?.home_assistant_update_entity;
    if (entityId) {
      this._moreInfo(entityId);
    }
  }

  _openPopup(hash) {
    const target = String(hash || "").startsWith("#")
      ? String(hash)
      : `#${String(hash || "")}`;

    if (target === "#") return;

    const url = new URL(window.location.href);
    url.hash = target;
    window.history.replaceState(window.history.state, "", url);

    // Bubble Card listens for hashchange. Updating the history entry directly
    // avoids Home Assistant treating the popup hash as dashboard navigation
    // and rebuilding the strategy before the popup opens.
    window.dispatchEvent(new HashChangeEvent("hashchange"));
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
    const confirmEntities = new Set(
      asArray(this._config.favorite_confirm_entities).map(String)
    );

    if (confirmEntities.has(entityId)) {
      const name = stateObj.attributes?.friendly_name || entityId;
      const state = String(stateObj.state || "").toLowerCase();
      let action = "ausführen";

      if (["light", "switch", "input_boolean", "fan", "media_player"].includes(domain)) {
        action = state === "on" ? "ausschalten" : "einschalten";
      } else if (domain === "cover") {
        const position = this._coverPosition(entityId);
        action = position != null ? (position > 0 ? "schließen" : "öffnen") : (state === "closed" ? "öffnen" : "schließen");
      } else if (["button", "input_button"].includes(domain)) {
        action = "betätigen";
      } else if (["scene", "script"].includes(domain)) {
        action = "ausführen";
      }

      if (!window.confirm(`${name} ${action}?`)) {
        return;
      }
    }

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
    const entities = this._groupControlEntities("lights");
    if (!entities.length) return;

    await this._hass.callService(
      "light",
      "turn_off",
      {},
      { entity_id: entities }
    );
  }

  async _allLightsOn() {
    const entities = this._groupControlEntities("lights");
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


  _groupControlEntities(kind) {
    const domain = kind === "lights" ? "light" : "cover";
    const configured = kind === "lights"
      ? (this._config.room_tiles || []).flatMap((room) => room.light_entities || [])
      : this._config.cover_entities;
    return [...new Set(Array.isArray(configured) ? configured : [])]
      .filter((id) => typeof id === "string" && id.startsWith(domain + "."));
  }

  _groupControlPopupHtml() {
    const kind = this._groupControlPopup;
    if (!kind) return "";
    const lights = kind === "lights";
    const domain = lights ? "light" : "cover";
    const entities = this._groupControlEntities(kind);
    const label = lights ? "Lichter" : "Rollläden";
    const icon = lights ? "mdi:lightbulb-group" : "mdi:window-shutter";
    const rows = entities.map((id) => {
      const state = this._state(id);
      const name = this._escapeHtml(state?.attributes?.friendly_name || id);
      const available = state && !["unavailable", "unknown"].includes(state.state);
      const position = !lights && available ? this._coverPosition(id) : null;
      const active = available && (lights ? state.state === "on" : (position != null ? position > 0 : ["open", "opening"].includes(state.state)));
      return `<div class="group-control-row">
        <div class="group-control-name"><ha-icon icon="${lights ? (active ? "mdi:lightbulb-on" : "mdi:lightbulb-outline") : "mdi:window-shutter"}"></ha-icon><span>${name}</span></div>
        <div class="group-control-actions">
          ${!lights && position != null ? `<span class="group-control-position">${Math.round(position)} %</span>` : ""}
          <button class="group-control-toggle ${active ? "is-active" : ""}" type="button" data-group-entity="${this._escapeHtml(id)}" data-group-action="toggle" ${available ? "" : "disabled"} aria-label="${lights ? (active ? "Ausschalten" : "Einschalten") : (active ? "Schließen" : "Öffnen")}"><ha-icon icon="${lights ? (active ? "mdi:toggle-switch" : "mdi:toggle-switch-off-outline") : (active ? "mdi:window-shutter-open" : "mdi:window-shutter")}"></ha-icon></button>
          <button class="group-control-details" type="button" data-group-more-info="${this._escapeHtml(id)}" ${available ? "" : "disabled"} title="Weitere Steuerung"><ha-icon icon="mdi:tune"></ha-icon></button>
        </div>
      </div>`;
    }).join("");
    return `<div class="weather-popup-backdrop" id="group-control-backdrop">
      <section class="weather-popup group-control-popup" role="dialog" aria-modal="true" aria-label="${label}">
        <div class="group-control-heading"><ha-icon icon="${icon}"></ha-icon><h2>${label}</h2></div>
        <div class="group-control-all">
          <button type="button" data-group-all="on">${lights ? "Alle an" : "Alle öffnen"}</button>
          <button type="button" data-group-all="off">${lights ? "Alle aus" : "Alle schließen"}</button>
        </div>
        <div class="group-control-list">${rows || '<div class="power-popup-empty">Keine Geräte konfiguriert.</div>'}</div>
      </section>
    </div>`;
  }

  async _groupControlAction(entityId) {
    if (!this._groupControlEntities(this._groupControlPopup).includes(entityId)) return;
    const state = this._state(entityId);
    if (!state || ["unavailable", "unknown"].includes(state.state)) return;
    const lights = this._groupControlPopup === "lights";
    const open = lights ? state.state === "on" : (this._coverPosition(entityId) != null ? this._coverPosition(entityId) > 0 : state.state !== "closed");
    await this._hass.callService(lights ? "light" : "cover", lights ? (open ? "turn_off" : "turn_on") : (open ? "close_cover" : "open_cover"), {}, { entity_id: entityId });
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

    const rawPosition = stateObj.attributes?.current_position;
    const position = rawPosition == null || rawPosition === "" ? NaN : Number(rawPosition);

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
    if (!this.shadowRoot || !this._config || !this._hass || this._interactionActive) return;

    // Preserve scroll positions when HA state updates rebuild the popup DOM.
    const presenceScroll = this.shadowRoot.querySelector(".presence-history-popup");
    const presenceList = this.shadowRoot.querySelector(".presence-event-list");
    const presencePopupScrollTop = presenceScroll?.scrollTop ?? 0;
    const presenceListScrollTop = presenceList?.scrollTop ?? 0;

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

    const homeAssistantUpdateEntity =
      this._config.home_assistant_update_entity;
    const homeAssistantUpdateState =
      this._state(homeAssistantUpdateEntity);
    const homeAssistantUpdateAvailable =
      String(homeAssistantUpdateState?.state || "").toLowerCase() === "on";
    const homeAssistantInstalledVersion =
      homeAssistantUpdateState?.attributes?.installierte_version || "";
    const homeAssistantLatestVersion =
      homeAssistantUpdateState?.attributes?.aktuelle_version || "";

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

    const outdoorIlluminanceEntity =
      this._config.outdoor_illuminance_entity;
    const outdoorIlluminanceState =
      this._state(outdoorIlluminanceEntity);
    const outdoorIlluminanceAvailable = Boolean(
      outdoorIlluminanceState &&
      !["", "unknown", "unavailable"].includes(
        String(outdoorIlluminanceState.state || "").toLowerCase()
      )
    );
    const outdoorIlluminanceText =
      outdoorIlluminanceAvailable
        ? this._formatted(outdoorIlluminanceEntity)
        : "";

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
          page?.title && (page?.path || page?.popup_hash || page?.navigation_path)
      );

    const customPageLinksHtml = customPageLinks.length
      ? `
          <nav class="custom-page-links" aria-label="Eigene Seiten">
            ${customPageLinks
              .map((page) => `
                <button
                  type="button"
                  class="custom-page-link"
                  ${page.navigation_path
                    ? `data-navigation-path="${this._escapeHtml(page.navigation_path)}"`
                    : page.path
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

    const favoriteOrderKey = "atze-dashboard:favorite-order";
    let savedFavoriteOrder = [];
    try { savedFavoriteOrder = JSON.parse(localStorage.getItem(favoriteOrderKey) || "[]"); } catch (_e) {}
    if (Array.isArray(savedFavoriteOrder) && savedFavoriteOrder.length) {
      const rank = new Map(savedFavoriteOrder.map((id, index) => [id, index]));
      favoriteStates.sort((a, b) => (rank.get(a.entityId) ?? 9999) - (rank.get(b.entityId) ?? 9999));
    }

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

        return `
          <div
            class="room ${roomPrimaryMetric ? "has-power" : ""}"
            data-path="${room.path}"
            data-area-id="${room.area_id}"
            data-atze-scroll-snap="room"
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
              room.smoke_entity
                ? `
                  <div
                    class="room-smoke ${["on", "smoke", "detected", "alarm", "triggered"].includes(String(this._state(room.smoke_entity)?.state || "").toLowerCase()) ? "active" : ""}"
                    title="Rauchmelder: ${this._formatted(room.smoke_entity)}"
                    aria-label="Rauchmelder: ${this._formatted(room.smoke_entity)}"
                  >
                    <ha-icon icon="mdi:smoke-detector-variant"></ha-icon>
                  </div>
                `
                : ""
            }

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

            <div class="room-bottom">
              <div class="room-name">${room.name}</div>

              <div class="room-meta">
                ${
                  temp
                    ? `
                      <span class="room-temperature room-history-trigger" data-history-entity="${room.temperature}" data-history-kind="temperature" data-history-room="${this._escapeHtml(room.name)}" role="button" tabindex="0">
                        <ha-icon icon="mdi:thermometer"></ha-icon>
                        <span class="room-meta-value">${temp}</span>
                      </span>
                    `
                    : ""
                }

                ${
                  humidity
                    ? `
                      <span class="room-humidity room-history-trigger" data-history-entity="${room.humidity}" data-history-kind="humidity" data-history-room="${this._escapeHtml(room.name)}" role="button" tabindex="0">
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
        .room-trash { position:fixed; left:50%; bottom:28px; transform:translate(-50%,24px); z-index:99999; display:flex; align-items:center; gap:8px; padding:12px 18px; border-radius:24px; background:rgba(40,40,42,.96); color:#fff; opacity:0; pointer-events:none; transition:.18s ease; box-shadow:0 6px 24px rgba(0,0,0,.35); } .room-trash.visible { opacity:1; transform:translate(-50%,0); pointer-events:auto; } .room-trash.over { background:#c62828; transform:translate(-50%,0) scale(1.08); }

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
          gap: 8px;
          flex-wrap: wrap;
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
          border: 1px solid rgba(210, 210, 210, 0.78);
          border-radius: 34px;
          box-shadow: 0 14px 38px rgba(0,0,0,0.28);
        }

        .outdoor-illuminance-badge {
          position: absolute;
          top: 14px;
          left: 50%;
          z-index: 2;
          transform: translateX(-50%);
          min-height: 30px;
          padding: 4px 11px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: 1px solid rgba(255,255,255,0.28);
          border-radius: 999px;
          background: rgba(0,0,0,0.48);
          color: #fff;
          font-size: 13px;
          font-weight: 650;
          line-height: 1;
          white-space: nowrap;
          backdrop-filter: blur(8px) saturate(1.12);
          -webkit-backdrop-filter: blur(8px) saturate(1.12);
        }

        .outdoor-illuminance-badge ha-icon {
          --mdc-icon-size: 17px;
          width: 17px;
          height: 17px;
          color: var(--home-yellow);
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

        .testing-build-badge {
          position: absolute;
          top: 14px;
          right: 18px;
          z-index: 2;
          padding: 4px 9px;
          border: 1px solid rgba(255,255,255,0.28);
          border-radius: 999px;
          background: rgba(0,0,0,0.48);
          color: #fff;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          line-height: 1.2;
          pointer-events: none;
          backdrop-filter: blur(8px);
        }

        .testing-build-badge.update-available {
          pointer-events: auto;
          cursor: pointer;
        }

        .hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 28px;
          margin-bottom: 30px;
        }

        .home-status-panel.has-outdoor-illuminance .person-stack,
        .home-status-panel.has-outdoor-illuminance .clock {
          transform: translateY(20px);
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
          border: 1px solid rgba(210, 210, 210, 0.78);
          border-radius: 28px;
          background: rgba(48, 50, 54, 0.30);
          backdrop-filter: blur(8px) saturate(1.12);
          -webkit-backdrop-filter: blur(8px) saturate(1.12);
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

        #weather-status,
        #power-status,
        #security-status,
        #battery-status,
        #alarm-status,
        #homebase-status {
          cursor: pointer;
        }

        .weather-popup-backdrop { position:fixed; inset:0; z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px; background:rgba(0,0,0,.62); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); }
        .weather-popup { position:relative; width:min(620px,calc(100vw - 40px)); max-height:calc(100vh - 40px); overflow:auto; padding:24px; border:1px solid rgba(255,255,255,.12); border-radius:28px; background:rgba(20,22,27,.98); box-shadow:0 24px 70px rgba(0,0,0,.48); }
        .weather-popup-current { display:flex; align-items:center; gap:18px; padding-right:48px; }
        .weather-popup-icon { --mdc-icon-size:64px; color:var(--home-yellow); }
        .weather-popup-temp { font-size:36px; font-weight:700; line-height:1; }
        .weather-popup-condition { margin-top:6px; color:var(--home-muted); font-size:16px; }
        .weather-metrics { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-top:22px; }
        .weather-metric { display:flex; align-items:center; gap:10px; padding:12px; border-radius:16px; background:rgba(118,118,128,.14); }
        .weather-metric ha-icon, .weather-forecast-day > ha-icon { color:var(--home-yellow); }
        .weather-metric div { min-width:0; display:flex; flex-direction:column; }
        .weather-metric span { color:var(--home-muted); font-size:12px; }
        .weather-metric strong { font-size:15px; }
        .power-popup-list { margin-top:22px; }
        .power-popup-list h3 { margin:0 0 10px; font-size:16px; }
        .power-popup-row { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:13px 14px; border-radius:16px; background:rgba(118,118,128,.14); }
        .power-popup-row + .power-popup-row { margin-top:8px; }
        .power-popup-room { min-width:0; display:flex; align-items:center; gap:10px; }
        .power-popup-room ha-icon { color:var(--home-yellow); }
        .power-popup-room span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .power-popup-row strong { flex:0 0 auto; font-size:16px; }
        .power-popup-empty { padding:14px; border-radius:16px; color:var(--home-muted); background:rgba(118,118,128,.14); }
        .weather-forecast h3 { margin:22px 0 10px; font-size:16px; }
        .weather-forecast-grid { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:8px; }
        .weather-forecast-day { min-width:0; padding:10px 6px; border-radius:14px; background:rgba(118,118,128,.12); text-align:center; display:grid; justify-items:center; gap:6px; }
        .weather-forecast-day > span, .weather-forecast-day small, .weather-loading { color:var(--home-muted); font-size:11px; }
        .weather-forecast-day small { display:flex; align-items:center; gap:2px; }
        .weather-forecast-day small ha-icon { --mdc-icon-size:13px; }
        @media (max-width:600px) { .weather-popup{padding:20px;border-radius:24px}.weather-metrics{grid-template-columns:1fr}.weather-forecast-grid{grid-template-columns:repeat(5,minmax(70px,1fr));overflow-x:auto} }

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
          border: 1px solid rgba(210, 210, 210, 0.78);
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
          background: rgba(48, 50, 54, 0.30);
          backdrop-filter: blur(8px) saturate(1.12);
          -webkit-backdrop-filter: blur(8px) saturate(1.12);
        }

        .custom-page-links {
          margin: 0 0 20px;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
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
          background: rgba(48, 50, 54, 0.30);
          backdrop-filter: blur(8px) saturate(1.12);
          -webkit-backdrop-filter: blur(8px) saturate(1.12);
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
          background: rgba(48, 50, 54, 0.30);
          backdrop-filter: blur(8px) saturate(1.12);
          -webkit-backdrop-filter: blur(8px) saturate(1.12);
          color: var(--primary-text-color);
          font: inherit;
          text-align: left;
          cursor: pointer;
          touch-action: auto;
          user-select: none;
          -webkit-user-select: none;
        }

        .favorite-card.dragging { opacity:.45; }
        .favorite-card.drag-over { outline:2px solid var(--primary-color,#03a9f4); border-radius:14px; }

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
          transform: translate(-2px, -1px);
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
          border: 1px solid rgba(210, 210, 210, 0.78);
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
          touch-action: auto;
          user-select: none;
          -webkit-user-select: none;
        }

        .room.dragging { opacity:.45; }
        .room.drag-over { outline:2px solid var(--primary-color,#03a9f4); border-radius:14px; }

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

        .room-smoke {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 3;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          border: 1px solid rgba(48, 209, 88, 0.65);
          background: rgba(48, 209, 88, 0.20);
          backdrop-filter: blur(8px) saturate(1.12);
          -webkit-backdrop-filter: blur(8px) saturate(1.12);
          color: #30D158;
          pointer-events: none;
          box-shadow: 0 4px 14px rgba(0,0,0,0.18);
        }

        .room-smoke.active {
          border-color: rgba(255, 69, 58, 0.72);
          background: rgba(255, 69, 58, 0.22);
          color: #FF453A;
        }

        .room-smoke ha-icon {
          --mdc-icon-size: 20px;
          transform: translateY(-1px);
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

        .room-history-trigger { pointer-events:auto; cursor:pointer; border-radius:10px; padding:3px 5px; margin:-3px -5px; }
        .room-meta .room-temperature ha-icon {
          width: 17px;
          height: 17px;
          --mdc-icon-size: 17px;
        }
        .room-history-trigger:active { background:rgba(255,255,255,.12); }
        .history-range { display:grid; grid-template-columns:repeat(4,1fr); gap:7px; margin:20px 0 14px; }
        .history-range button { border:1px solid rgba(255,255,255,.14); border-radius:12px; padding:9px 4px; background:rgba(118,118,128,.14); color:var(--primary-text-color); font:inherit; font-size:13px; cursor:pointer; }
        .history-range button.active { background:rgba(10,132,255,.34); border-color:rgba(10,132,255,.7); }
        .history-chart-wrap { position:relative; min-height:170px; padding:8px 0 0 34px; }
        .history-chart { display:block; width:100%; height:160px; overflow:visible; }
        .history-chart line { stroke:rgba(255,255,255,.10); stroke-width:1; vector-effect:non-scaling-stroke; }
        .history-chart polyline { fill:none; stroke:var(--home-blue,#0a84ff); stroke-width:3; stroke-linecap:round; stroke-linejoin:round; vector-effect:non-scaling-stroke; }
        .history-scale { position:absolute; inset:12px auto 17px 0; display:flex; flex-direction:column; justify-content:space-between; color:var(--home-muted); font-size:11px; }
        .presence-history-popup { width:min(580px,calc(100vw - 40px)); }
        .presence-history-title { display:flex; align-items:center; gap:14px; }
        .presence-history-title ha-icon { --mdc-icon-size:34px; color:var(--home-yellow); }
        .presence-history-title div { display:flex; flex-direction:column; gap:4px; }
        .presence-history-title strong { font-size:21px; }
        .presence-history-title small, .presence-summary span { color:var(--home-muted); font-size:12px; }
        .presence-summary { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:16px 0; }
        .presence-summary > div { display:flex; flex-direction:column; gap:7px; padding:12px; border-radius:14px; background:rgba(118,118,128,.14); }
        .presence-event-list { max-height:50vh; overflow:auto; }
        .presence-event { display:grid; grid-template-columns:1fr auto; gap:5px 12px; padding:12px 3px; border-bottom:1px solid rgba(255,255,255,.09); }
        .presence-event-time { color:var(--home-muted); font-size:12px; }
        .presence-event-source { font-size:12px; color:var(--home-muted); text-align:right; }
        .presence-event strong { grid-column:1 / -1; font-size:14px; }
        .history-empty { min-height:150px; display:grid; place-items:center; text-align:center; color:var(--home-muted); padding:20px; }
        .history-sensor { margin-top:8px; color:var(--home-muted); font-size:11px; text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
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

        .group-control-tile { font:inherit; text-align:left; cursor:pointer; }
        .group-control-tile ha-icon { color:var(--home-yellow); }
        .group-control-tile.lights-off ha-icon { color:rgba(235,235,245,.55); }
        .group-control-tile .status-main { overflow:hidden; text-overflow:ellipsis; }
        .group-control-all button, .group-control-actions button { cursor:pointer; font:inherit; color:var(--primary-text-color); border:1px solid var(--home-card-border); background:rgba(118,118,128,.20); border-radius:15px; padding:10px 15px; }
        .group-control-heading { display:flex; align-items:center; gap:12px; }
        .group-control-heading h2 { margin:0; font-size:23px; }
        .group-control-heading ha-icon { color:var(--home-yellow); --mdc-icon-size:30px; }
        .group-control-all { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:22px 0 16px; }
        .group-control-all button { font-weight:650; padding:14px 8px; }
        .group-control-list { display:grid; gap:8px; }
        .group-control-row { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:10px 12px; border-radius:15px; background:rgba(118,118,128,.13); min-width:0; }
        .group-control-name { display:flex; align-items:center; gap:9px; min-width:0; overflow:hidden; }
        .group-control-name span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .group-control-name ha-icon { flex-shrink:0; color:var(--home-yellow); }
        .group-control-actions { display:flex; align-items:center; gap:7px; flex-shrink:0; }
        .group-control-actions button { padding:7px; display:flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:13px; }
        .group-control-actions button ha-icon { --mdc-icon-size:23px; }
        .group-control-actions .is-active ha-icon { color:var(--home-green); }
        .group-control-popup { width:min(720px,calc(100vw - 28px)); padding:20px; }
        .group-control-name { flex:1 1 auto; }
        .group-control-position { white-space:nowrap; }
        .group-control-actions button[disabled] { opacity:.4; cursor:default; }
        .group-control-position { color:var(--home-muted); font-size:12px; }
        @media (max-width:550px) { .group-control-popup { padding:14px; } .group-control-row { flex-wrap:nowrap; } .group-control-actions { margin-left:0; } .group-control-position { font-size:11px; } .group-control-actions button { width:34px; height:34px; padding:5px; } }

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
          background: rgba(48, 50, 54, 0.30);
          backdrop-filter: blur(8px) saturate(1.12);
          -webkit-backdrop-filter: blur(8px) saturate(1.12);
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
            flex-wrap: wrap;
            overflow-x: visible;
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
          ${hacsUpdateAvailable || homeAssistantUpdateAvailable ? `
            <div class="hacs-update-wrap">
              ${hacsUpdateAvailable ? `
                <button
                  class="hacs-update-badge"
                  id="hacs-update-badge"
                  type="button"
                  title="${hacsUpdatesAvailable.length} HACS-Update${hacsUpdatesAvailable.length === 1 ? "" : "s"} verfügbar"
                >
                  <ha-icon icon="mdi:package-up"></ha-icon>
                  <span>HACS Update</span>
                </button>
              ` : ""}
              ${homeAssistantUpdateAvailable ? `
                <button
                  class="hacs-update-badge"
                  id="home-assistant-update-badge"
                  type="button"
                  title="Home Assistant Update verfügbar${homeAssistantInstalledVersion && homeAssistantLatestVersion ? `: ${homeAssistantInstalledVersion} → ${homeAssistantLatestVersion}` : ""}"
                >
                  <ha-icon icon="mdi:home-assistant"></ha-icon>
                  <span>Home Assistant Update</span>
                </button>
              ` : ""}
            </div>
          ` : ""}

          <section
            class="home-status-panel ${heroIsDay ? "day" : "night"} ${outdoorIlluminanceAvailable ? "has-outdoor-illuminance" : ""}"
            aria-label="Hausstatus"
          >
            ${ATZE_TESTING_BUILD ? `<div class="testing-build-badge" id="testing-build-badge" role="status">TESTING · ${ATZE_TESTING_REVISION || "DEV"}</div>` : ""}
            ${outdoorIlluminanceAvailable ? `
              <div
                class="outdoor-illuminance-badge"
                title="Helligkeit außen: ${this._escapeHtml(outdoorIlluminanceText)}"
                aria-label="Helligkeit außen: ${this._escapeHtml(outdoorIlluminanceText)}"
              >
                <ha-icon icon="mdi:white-balance-sunny"></ha-icon>
                <span>${this._escapeHtml(outdoorIlluminanceText)}</span>
              </div>
            ` : ""}
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
            <div class="status weather" id="weather-status" role="button" tabindex="0">
              <ha-icon icon="${weatherIcon}"></ha-icon>
              <div>
                <div class="status-main">${weatherTemperature}</div>
                <div class="status-sub">${weatherText}</div>
              </div>
            </div>

            ${powerAvailable ? `
              <div class="status power" id="power-status" role="button" tabindex="0">
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
              <button type="button" class="status group-control-tile ${this._groupControlEntities("lights").some((id) => this._state(id)?.state === "on") ? "" : "lights-off"}" id="group-lights"><ha-icon icon="mdi:lightbulb-group"></ha-icon><div><div class="status-main">Lichter</div></div></button>
              <button type="button" class="status group-control-tile" id="group-covers"><ha-icon icon="mdi:window-shutter"></ha-icon><div><div class="status-main">Rollläden</div></div></button>
            </div>
          </section>

          ${controlCenterHtml}

          <div class="rooms">
            ${roomHtml}
          </div>

          <div class="quick" data-atze-scroll-snap="quick-actions">
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
        ${this._weatherPopupHtml(weather)}
          ${this._powerPopupHtml()}
          ${this._groupControlPopupHtml()}
          ${this._climateHistoryPopupHtml()}
          ${this._presenceHistoryPopupHtml()}
      </ha-card>
    `;

    const newPresenceScroll = this.shadowRoot.querySelector(".presence-history-popup");
    const newPresenceList = this.shadowRoot.querySelector(".presence-event-list");
    if (newPresenceScroll) newPresenceScroll.scrollTop = presencePopupScrollTop;
    if (newPresenceList) newPresenceList.scrollTop = presenceListScrollTop;

    const homeStatusPanel = this.shadowRoot.querySelector(".home-status-panel");
    if (homeStatusPanel && heroImage) {
      homeStatusPanel.style.setProperty("--home-hero-image", `url("${String(heroImage).replace(/"/g, "%22")}")`);
    }

    const roomGrid = this.shadowRoot.querySelector(".rooms");
    let hiddenRoomIds = [];
    hiddenRoomIds = atzeLayoutValue(this._config, "hidden_home_rooms", []);
    if (!hiddenRoomIds.length) hiddenRoomIds = atzeLayoutValue(this._config, "hidden_home_rooms", []);
    if (!hiddenRoomIds.length) try { hiddenRoomIds = JSON.parse(localStorage.getItem("atze-dashboard:hidden-home-rooms") || "[]"); } catch (_e) {}
    if (Array.isArray(hiddenRoomIds)) {
      for (const el of this.shadowRoot.querySelectorAll(".room")) if (hiddenRoomIds.includes(el.dataset.areaId)) el.remove();
    }
    const roomOrderKey = "atze-dashboard:home-room-order";
    let roomOrder = [];
    roomOrder = atzeLayoutValue(this._config, "home_room_order", []);
    if (!roomOrder.length) roomOrder = atzeLayoutValue(this._config, "home_room_order", []);
    if (!roomOrder.length) try { roomOrder = JSON.parse(localStorage.getItem(roomOrderKey) || "[]"); } catch (_e) {}
    if (roomGrid && Array.isArray(roomOrder) && roomOrder.length) {
      const rank = new Map(roomOrder.map((id, index) => [id, index]));
      const rooms = [...roomGrid.querySelectorAll(".room")];
      const sourceRank = new Map(rooms.map((room, index) => [room.dataset.areaId, index]));
      rooms
        .sort((a, b) => {
          const ai = rank.has(a.dataset.areaId) ? rank.get(a.dataset.areaId) : roomOrder.length + (sourceRank.get(a.dataset.areaId) ?? 0);
          const bi = rank.has(b.dataset.areaId) ? rank.get(b.dataset.areaId) : roomOrder.length + (sourceRank.get(b.dataset.areaId) ?? 0);
          return ai - bi;
        })
        .forEach((room) => roomGrid.appendChild(room));
    }


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

        element.addEventListener("click", (event) => {
          const historyTrigger = event.target?.closest?.(".room-history-trigger");
          if (!historyTrigger) return;
          event.preventDefault();
          event.stopImmediatePropagation();
          this._openClimateHistory(
            historyTrigger.dataset.historyEntity,
            historyTrigger.dataset.historyKind,
            historyTrigger.dataset.historyRoom,
            "24h"
          );
        }, true);

        element.querySelectorAll(".room-history-trigger").forEach((trigger) => {
          trigger.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            event.stopPropagation();
            this._openClimateHistory(
              trigger.dataset.historyEntity,
              trigger.dataset.historyKind,
              trigger.dataset.historyRoom,
              "24h"
            );
          });
        });

        element.addEventListener("click", (event) => {
          if (event.target?.closest?.(".room-history-trigger")) return;
          this._navigate(element.dataset.path);
        });

        element.addEventListener("keydown", (event) => {
          if (event.target !== element) return;

          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            this._navigate(element.dataset.path);
          }
        });
      });

    const installProvenDrag = (container, selector, idGetter, storageKey) => {
      if (!container) return;
      const elements = [...container.querySelectorAll(selector)];
      let dragIndex = null;

      elements.forEach((element, index) => {
        element.draggable = true;
        // Keep normal vertical page scrolling available until the browser
        // actually starts a native long-press drag.
        element.style.touchAction = "pan-y";
        element.addEventListener("dragstart", (event) => {
          dragIndex = index;
          element.classList.add("dragging");
          event.dataTransfer?.setData("text/plain", String(index));
        });
        element.addEventListener("dragend", () => {
          dragIndex = null;
          for (const entry of container.querySelectorAll(selector)) {
            entry.classList.remove("dragging", "drag-over");
          }
        });
        element.addEventListener("dragover", (event) => {
          event.preventDefault();
          if (dragIndex !== index) element.classList.add("drag-over");
        });
        element.addEventListener("dragleave", () => element.classList.remove("drag-over"));
        element.addEventListener("drop", (event) => {
          event.preventDefault();
          element.classList.remove("drag-over");
          const from = dragIndex ?? Number(event.dataTransfer?.getData("text/plain"));
          if (!Number.isInteger(from) || from === index) return;
          const current = [...container.querySelectorAll(selector)];
          const source = current[from];
          const target = current[index];
          if (!source || !target) return;
          if (from < index) target.after(source); else target.before(source);
          const ids = [...container.querySelectorAll(selector)].map(idGetter).filter(Boolean);
          try { localStorage.setItem(storageKey, JSON.stringify(ids)); } catch (_e) {}
          const field = storageKey === roomOrderKey ? "home_room_order" : "favorite_order";
          saveAtzeStrategyLayout(this._hass, this._config, { [field]: ids });
          dragIndex = null;
        });
      });
    };

    installProvenDrag(
      roomGrid,
      ".room",
      (element) => element.dataset.areaId,
      roomOrderKey
    );
    installProvenDrag(
      this.shadowRoot.querySelector(".favorite-grid"),
      ".favorite-card",
      (element) => element.dataset.entityId,
      "atze-dashboard:favorite-order"
    );

    this.shadowRoot
      .querySelectorAll(".custom-page-link[data-navigation-path]")
      .forEach((element) => {
        element.addEventListener("click", () => {
          const target = element.dataset.navigationPath;
          if (!target) return;
          window.history.pushState(null, "", target);
          window.dispatchEvent(new Event("location-changed"));
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
        element.addEventListener("click", (event) => {
          if (element.classList.contains("just-dragged")) {
            event.preventDefault();
            return;
          }
          this._activateFavorite(element.dataset.entityId);
        });
      });

    this.shadowRoot
      .querySelector("#person-hero")
      ?.addEventListener(
        "click",
        () => this._openPresenceHistory("24h", this._config.person_entity)
      );

    this.shadowRoot
      .querySelector("#person-hero")
      ?.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this._openPresenceHistory("24h", this._config.person_entity);
        }
      });

    this.shadowRoot
      .querySelectorAll(".mini-person[data-entity-id]")
      .forEach((element) => {
        const openPerson = (event) => {
          event?.preventDefault?.();
          this._openPresenceHistory("24h", element.dataset.entityId);
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

    this.shadowRoot
      .querySelector("#home-assistant-update-badge")
      ?.addEventListener(
        "click",
        () => this._openHomeAssistantUpdate()
      );


    const kioskClock =
      this.shadowRoot.querySelector("#kiosk-clock");

    kioskClock?.addEventListener(
      "click",
      () => this._toggleKioskMode()
    );

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

    const weatherStatus = this.shadowRoot.querySelector("#weather-status");
    weatherStatus?.addEventListener("click", () => this._openWeatherPopup());
    weatherStatus?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this._openWeatherPopup();
      }
    });
    this.shadowRoot.querySelector("#weather-popup-backdrop")?.addEventListener("click", (event) => {
      if (event.target?.id === "weather-popup-backdrop") this._closeWeatherPopup();
    });
    this.shadowRoot.querySelector("#history-popup-backdrop")?.addEventListener("click", (event) => {
      if (event.target?.id === "history-popup-backdrop") this._closeClimateHistory();
    });
    this.shadowRoot.querySelectorAll("[data-history-range]").forEach((button) => {
      button.addEventListener("click", () => {
        const popup = this._climateHistoryPopup;
        if (!popup) return;
        this._openClimateHistory(popup.entityId, popup.kind, popup.roomName, button.dataset.historyRange);
      });
    });

    this.shadowRoot.querySelector("#presence-history-backdrop")?.addEventListener("click", (event) => {
      if (event.target?.id === "presence-history-backdrop") this._closePresenceHistory();
    });
    const powerStatus = this.shadowRoot.querySelector("#power-status");
    powerStatus?.addEventListener("click", () => this._openPowerPopup());
    powerStatus?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this._openPowerPopup();
      }
    });
    this.shadowRoot.querySelector("#power-popup-backdrop")?.addEventListener("click", (event) => {
      if (event.target?.id === "power-popup-backdrop") this._closePowerPopup();
    });

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

    this.shadowRoot.querySelector("#group-lights")?.addEventListener("click", () => { this._groupControlPopup = "lights"; this._render(); });
    this.shadowRoot.querySelector("#group-covers")?.addEventListener("click", () => { this._groupControlPopup = "covers"; this._render(); });
    this.shadowRoot.querySelector("#group-control-backdrop")?.addEventListener("click", (event) => {
      if (event.target?.id === "group-control-backdrop") { this._groupControlPopup = null; this._render(); }
    });
    this.shadowRoot.querySelectorAll("[data-group-all]").forEach((button) => button.addEventListener("click", async () => {
      if (this._groupControlPopup === "lights") await (button.dataset.groupAll === "on" ? this._allLightsOn() : this._allLightsOff());
      else await (button.dataset.groupAll === "on" ? this._allCoversOpen() : this._allCoversClose());
    }));
    this.shadowRoot.querySelectorAll("[data-group-entity]").forEach((button) => button.addEventListener("click", () => this._groupControlAction(button.dataset.groupEntity)));
    this.shadowRoot.querySelectorAll("[data-group-more-info]").forEach((button) => button.addEventListener("click", () => this._moreInfo(button.dataset.groupMoreInfo)));

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


