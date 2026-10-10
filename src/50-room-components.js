
class AtzeRoomNavHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._scrollTopCleanup = null;
    this._homeSwipeCleanup = null;
  }

  setConfig(config) {
    this._config = {
      icon: "mdi:home",
      area_name: "",
      navigation_path: "home",
      ...config,
    };
    this._render();
  }

  set hass(value) {
    this._hass = value;
    this._render();
  }

  get hass() {
    return this._hass;
  }

  connectedCallback() {
    if (!this._scrollTopCleanup) {
      this._scrollTopCleanup =
        setupAtzeScrollTopButton(this);
    }

    if (!this._homeSwipeCleanup) {
      this._homeSwipeCleanup =
        setupAtzeHomeSwipe(
          this,
          () =>
            this._config?.navigation_path ||
            "home"
        );
    }

    this._render();
  }

  disconnectedCallback() {
    this._scrollTopCleanup?.();
    this._scrollTopCleanup = null;

    this._homeSwipeCleanup?.();
    this._homeSwipeCleanup = null;
  }

  getCardSize() {
    return 1;
  }

  _targetPath() {
    const requested = String(
      this._config?.navigation_path || "home"
    ).trim();

    if (requested.startsWith("/")) {
      return requested;
    }

    const cleanTarget =
      requested.replace(/^\/+|\/+$/g, "") || "home";

    const currentParts =
      window.location.pathname.split("/").filter(Boolean);

    if (!currentParts.length) {
      return `/${cleanTarget}`;
    }

    currentParts[currentParts.length - 1] = cleanTarget;
    return `/${currentParts.join("/")}`;
  }

  _navigate() {
    const target = this._targetPath();
    const nextUrl =
      `${target}${window.location.search || ""}`;

    if (
      `${window.location.pathname}${window.location.search}` ===
      nextUrl
    ) {
      return;
    }

    window.history.pushState(null, "", nextUrl);
    window.dispatchEvent(new Event("location-changed"));
  }

  _render() {
    if (!this.shadowRoot || !this._config) return;

    const areaName =
      String(this._config.area_name || "").trim() || "Bereich";

    const lightEntities = Array.isArray(this._config.light_entities)
      ? this._config.light_entities
      : [];
    const lightsOn = lightEntities.some(
      (entityId) => this._hass?.states?.[entityId]?.state === "on"
    );
    const windowEntities = Array.isArray(this._config.window_entities)
      ? this._config.window_entities
      : [];
    const coverEntities = Array.isArray(this._config.cover_entities)
      ? this._config.cover_entities
      : [];
    const lockEntities = Array.isArray(this._config.lock_entities)
      ? this._config.lock_entities
      : [];
    const windowOpen = windowEntities.some((entityId) => {
      const state = this._hass?.states?.[entityId]?.state;
      return state === "on" || state === "open";
    });
    const coverOpen = coverEntities.some((entityId) => {
      const stateObj = this._hass?.states?.[entityId];
      const pos = Number(stateObj?.attributes?.current_position);
      return stateObj?.state === "open" || (Number.isFinite(pos) && pos > 0);
    });
    const lockState = lockEntities.map((entityId) => String(this._hass?.states?.[entityId]?.state || "").toLowerCase()).find(Boolean) || "";
    const cinemaEntities = Array.isArray(this._config.cinema_entities)
      ? this._config.cinema_entities
      : [];
    const cinemaOn = cinemaEntities.some((entityId) => {
      const state = String(this._hass?.states?.[entityId]?.state || "").toLowerCase();
      return !["", "off", "idle", "standby", "unavailable", "unknown"].includes(state);
    });
    const motionLightOn = String(this._hass?.states?.[this._config.motion_light_entity]?.state || "").toLowerCase() === "on";
    const stateKey =
      this._config.state_mode === "motion_light"
        ? `light_${motionLightOn ? "on" : "off"}`
        : this._config.state_mode === "cinema"
        ? `${lightsOn ? "light_on" : "light_off"}_cinema_${cinemaOn ? "on" : "off"}`
        : this._config.state_mode === "door_lock"
          ? (windowOpen
              ? `${lightsOn ? "light_on" : "light_off"}_door_open`
              : `${lightsOn ? "light_on" : "light_off"}_door_closed_${lockState === "locked" ? "locked" : "unlocked"}`)
          : `${lightsOn ? "light_on" : "light_off"}_${windowOpen ? "window_open" : "window_closed"}_${coverOpen ? "cover_open" : "cover_closed"}`;
    const stateImages =
      this._config.state_images && typeof this._config.state_images === "object"
        ? this._config.state_images
        : {};
    const hour = new Date().getHours();
    const period = hour >= 7 && hour < 20 ? "day" : "night";
    const timedStateKey = `${period}_${stateKey}`;
    const simpleDayNightRoom = ["buro", "arbeitszimmer", "3d_drucker", "3d-drucker", "zentrale"].includes(String(this._config.area_id || ""));
    const reactiveImage =
      stateImages[timedStateKey] ||
      stateImages[stateKey] ||
      (simpleDayNightRoom
        ? (period === "day" ? this._config.light_image : this._config.dark_image)
        : (lightsOn ? this._config.light_image : this._config.dark_image));
    const backgroundImage =
      reactiveImage || this._config.background_image || "";
    const imageHeight = Math.max(170, Number(this._config.image_height) || 170);

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          -webkit-tap-highlight-color: transparent;
        }

        ha-card {
          margin: 0;
          padding: 0 0 10px;
          border: 0;
          box-shadow: none;
          background: transparent;
          overflow: visible;
        }

        ha-card.has-background {
          min-height: ${imageHeight}px;
          padding: 0;
          border-radius: var(--ha-card-border-radius, 12px);
          overflow: hidden;
          border: 1px solid rgba(210, 210, 210, 0.78);
          background:
            linear-gradient(180deg, rgba(0,0,0,0.02) 45%, rgba(0,0,0,0.62) 100%),
            var(--atze-room-header-image) center / cover no-repeat;
        }

        ha-card.has-background .nav-row {
          min-height: ${imageHeight}px;
          padding: 18px;
          box-sizing: border-box;
          align-items: flex-end;
          color: white;
        }

        ha-card.has-background .area-name {
          text-shadow: 0 1px 4px rgba(0,0,0,0.75);
        }

        .overlay-badges {
          position: absolute;
          top: 10px;
          left: 10px;
          right: 10px;
          display: grid;
          gap: 8px;
          z-index: 2;
        }

        .overlay-badge-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        ha-card.has-background {
          position: relative;
        }

        .nav-row {
          width: 100%;
          max-width: 100%;
          margin: 0;
          min-height: 42px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 10px;
          cursor: pointer;
          user-select: none;
          color: var(--primary-text-color);
          transition:
            opacity 120ms ease,
            transform 120ms ease;
        }

        .nav-row:hover {
          opacity: 0.88;
        }

        .nav-row:active {
          transform: scale(0.98);
        }

        .home-icon {
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0A84FF;
          box-shadow:
            0 4px 14px rgba(0,0,0,0.16),
            inset 0 1px 0 rgba(255,255,255,0.16);
        }

        .home-icon ha-icon {
          --mdc-icon-size: 18px;
          width: 18px;
          height: 18px;
          color: white;
          transform: translateY(-2px);
        }

        .area-name {
          min-width: 0;
          font-size: 24px;
          line-height: 1;
          font-weight: 650;
          letter-spacing: -0.35px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @media (max-width: 600px) {
          ha-card {
            padding-bottom: 8px;
          }

          ha-card.has-background {
            min-height: 190px;
          }

          ha-card.has-background .nav-row {
            min-height: 190px;
          }

          .nav-row {
            min-height: 38px;
            gap: 9px;
          }

          .home-icon {
            width: 31px;
            height: 31px;
            flex-basis: 31px;
          }

          .home-icon ha-icon {
            --mdc-icon-size: 17px;
            width: 17px;
            height: 17px;
            transform: translateY(-2px);
          }

          .area-name {
            font-size: 21px;
          }
        }
      </style>

      <ha-card class="${backgroundImage ? "has-background" : ""}">
        <div
          class="nav-row"
          role="button"
          tabindex="0"
          title="Zurück zu Zuhause"
          aria-label="Zurück zu Zuhause – ${areaName}"
        >
          ${this._config.hide_home_icon ? "" : `
          <span class="home-icon">
            <ha-icon icon="${this._config.icon || "mdi:home"}"></ha-icon>
          </span>
          `}
          <span class="area-name">${areaName}</span>
        </div>
        ${Array.isArray(this._config.overlay_badges) && this._config.overlay_badges.length ? `
          <div class="overlay-badges" id="overlay-badges"></div>
        ` : ""}
      </ha-card>
    `;

    const card = this.shadowRoot.querySelector("ha-card");
    if (card && backgroundImage) {
      card.style.setProperty("--atze-room-header-image", `url("${String(backgroundImage).replace(/"/g, "%22")}")`);
    }

    const overlayBadges = this.shadowRoot.querySelector("#overlay-badges");
    if (overlayBadges) {
      const badges = this._config.overlay_badges || [];
      const secondRowBadges = badges.filter((badgeConfig) =>
        ["window", "roller_shutter"].includes(badgeConfig?.atze_badge_group)
      );
      const firstRowBadges = badges.filter((badgeConfig) =>
        !["window", "roller_shutter"].includes(badgeConfig?.atze_badge_group)
      );

      const appendRow = (badgeConfigs) => {
        if (!badgeConfigs.length) return;
        const row = document.createElement("div");
        row.className = "overlay-badge-row";

        for (const badgeConfig of badgeConfigs) {
          const badge = document.createElement("hui-badge");
          badge.hass = this._hass;
          badge.config = badgeConfig;
          row.appendChild(badge);
        }

        overlayBadges.appendChild(row);
      };

      appendRow(firstRowBadges);
      appendRow(secondRowBadges);
    }

    const row = this.shadowRoot.querySelector(".nav-row");

    row?.addEventListener(
      "click",
      () => this._navigate()
    );

    row?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this._navigate();
      }
    });
  }
}

if (!customElements.get("atze-room-nav-header")) {
  customElements.define(
    "atze-room-nav-header",
    AtzeRoomNavHeader
  );
}


class AtzeWarningBadgeV2 extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
  }

  setConfig(config) {
    if (!config?.entity) {
      throw new Error("Atze state badge requires an entity");
    }

    this._config = { ...config };
    this._render();
  }

  set hass(value) {
    this._hass = value;
    this._render();
  }

  get hass() {
    return this._hass;
  }

  connectedCallback() {
    this._render();
  }

  _isActive(stateObj) {
    const state = String(stateObj?.state || "").toLowerCase();

    return [
      "on",
      "open",
      "opening",
      "unlocked",
      "detected",
      "problem",
    ].includes(state);
  }

  _openMoreInfo() {
    if (!this._config?.entity) return;

    this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        bubbles: true,
        composed: true,
        detail: {
          entityId: this._config.entity,
        },
      })
    );
  }

  _render() {
    if (!this.shadowRoot || !this._config || !this._hass) return;

    const stateObj = this._hass.states?.[this._config.entity];
    if (!stateObj) {
      this.hidden = true;
      this.style.display = "none";
      this.shadowRoot.innerHTML = "";
      return;
    }

    const active = this._isActive(stateObj);

    const stateText =
      active && this._config.active_text
        ? this._config.active_text
        : (
            this._hass.formatEntityState?.(stateObj) ||
            stateObj.state ||
            ""
          );

    const hideInactive =
      this._config.hide_inactive === true &&
      !active;

    // Warning-only badges should take up no space at all in the HA badge row
    // while everything is safe/closed.
    if (hideInactive) {
      this.hidden = true;
      this.style.display = "none";
      this.shadowRoot.innerHTML = "";
      return;
    }

    this.hidden = false;
    this.style.display = "inline-flex";

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-flex;
          -webkit-tap-highlight-color: transparent;
        }

        .badge {
          height: var(--ha-badge-size, 36px);
          min-width: var(--ha-badge-size, 36px);
          padding: 0 12px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--ha-space-2, 8px);
          border-radius:
            var(
              --ha-badge-border-radius,
              calc(var(--ha-badge-size, 36px) / 2)
            );
          cursor: pointer;
          user-select: none;
          transition:
            background 180ms ease,
            border-color 180ms ease,
            color 180ms ease;
          background:
            ${active
              ? "rgba(255, 69, 58, 0.90)"
              : "rgba(48, 50, 54, 0.30)"};
          border:
            var(--ha-card-border-width, 1px)
            solid
            ${active
              ? "rgba(255, 69, 58, 0.96)"
              : "var(--ha-card-border-color, var(--divider-color, rgba(255,255,255,0.10)))"};
          color:
            ${active
              ? "white"
              : "var(--primary-text-color)"};
          box-shadow: var(--ha-card-box-shadow, none);
          backdrop-filter: blur(8px) saturate(1.12);
          -webkit-backdrop-filter: blur(8px) saturate(1.12);
        }

        ha-state-icon {
          --mdc-icon-size: var(--ha-badge-icon-size, 18px);
          color:
            ${active
              ? "white"
              : "var(--secondary-text-color)"};
          flex: 0 0 auto;
          margin-inline-start: -4px;
        }

        .state {
          font-size:
            var(--atze-warning-badge-font-size, 13px);
          font-weight: var(--ha-font-weight-medium, 500);
          line-height: var(--ha-line-height-condensed, 1.2);
          letter-spacing: 0.1px;
          white-space: nowrap;
        }
      </style>

      <div class="badge" role="button" tabindex="0">
        <ha-state-icon id="icon"></ha-state-icon>
        <span class="state"></span>
      </div>
    `;

    const badge = this.shadowRoot.querySelector(".badge");
    const icon = this.shadowRoot.querySelector("#icon");
    const state = this.shadowRoot.querySelector(".state");

    if (icon) {
      icon.stateObj = stateObj;
      if (this._config.icon) {
        icon.icon = this._config.icon;
      }
    }

    if (state) {
      state.textContent = stateText;
    }

    if (badge) {
      badge.addEventListener("click", () => this._openMoreInfo());
      badge.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this._openMoreInfo();
        }
      });
    }
  }
}

if (!customElements.get("atze-warning-badge-v2")) {
  customElements.define(
    "atze-warning-badge-v2",
    AtzeWarningBadgeV2
  );
}


class AtzeStatusBadgeV1 extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
  }

  setConfig(config) {
    if (!config?.entity) {
      throw new Error("Atze status badge requires an entity");
    }

    this._config = { ...config };
    this._render();
  }

  set hass(value) {
    this._hass = value;
    this._render();
  }

  get hass() {
    return this._hass;
  }

  connectedCallback() {
    this._render();
  }

  _isActive(stateObj) {
    const state = String(stateObj?.state || "").toLowerCase();

    return [
      "on",
      "open",
      "opening",
      "unlocked",
      "detected",
      "problem",
    ].includes(state);
  }

  _openMoreInfo() {
    if (!this._config?.entity) return;

    this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        bubbles: true,
        composed: true,
        detail: {
          entityId: this._config.entity,
        },
      })
    );
  }

  _render() {
    if (!this.shadowRoot || !this._config || !this._hass) return;

    const stateObj = this._hass.states?.[this._config.entity];

    if (!stateObj) {
      this.hidden = true;
      this.style.display = "none";
      this.shadowRoot.innerHTML = "";
      return;
    }

    this.hidden = false;
    this.style.display = "inline-flex";

    const active = this._isActive(stateObj);

    const stateText =
      this._hass.formatEntityState?.(stateObj) ||
      stateObj.state ||
      "";

    const iconColor = active
      ? (
          this._config.active_icon_color ||
          "#FF453A"
        )
      : (
          this._config.inactive_icon_color ||
          "#30D158"
        );

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-flex;
          -webkit-tap-highlight-color: transparent;
        }

        .badge {
          height: var(--ha-badge-size, 36px);
          min-width: var(--ha-badge-size, 36px);
          padding: 0 12px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--ha-space-2, 8px);
          border-radius:
            var(
              --ha-badge-border-radius,
              calc(var(--ha-badge-size, 36px) / 2)
            );
          cursor: pointer;
          user-select: none;
          background: rgba(48, 50, 54, 0.30);
          backdrop-filter: blur(8px) saturate(1.12);
          -webkit-backdrop-filter: blur(8px) saturate(1.12);
          border:
            var(--ha-card-border-width, 1px)
            solid
            var(
              --ha-card-border-color,
              var(--divider-color, rgba(255,255,255,0.10))
            );
          color: var(--primary-text-color);
          box-shadow: var(--ha-card-box-shadow, none);
        }

        ha-state-icon {
          --mdc-icon-size: var(--ha-badge-icon-size, 18px);
          color: ${iconColor};
          flex: 0 0 auto;
          margin-inline-start: -4px;
        }

        .state {
          font-size:
            var(--atze-status-badge-font-size, 13px);
          font-weight: var(--ha-font-weight-medium, 500);
          line-height: var(--ha-line-height-condensed, 1.2);
          letter-spacing: 0.1px;
          white-space: nowrap;
        }
      </style>

      <div class="badge" role="button" tabindex="0">
        <ha-state-icon id="icon"></ha-state-icon>
        <span class="state"></span>
      </div>
    `;

    const badge = this.shadowRoot.querySelector(".badge");
    const icon = this.shadowRoot.querySelector("#icon");
    const state = this.shadowRoot.querySelector(".state");

    if (icon) {
      icon.stateObj = stateObj;
      if (this._config.icon) {
        icon.icon = this._config.icon;
      }
    }

    if (state) {
      state.textContent = stateText;
    }

    if (badge) {
      badge.addEventListener("click", () => this._openMoreInfo());
      badge.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this._openMoreInfo();
        }
      });
    }
  }
}

if (!customElements.get("atze-status-badge-v1")) {
  customElements.define(
    "atze-status-badge-v1",
    AtzeStatusBadgeV1
  );
}



class AtzeRoomGroup extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
  }

  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(value) {
    this._hass = value;
    for (const card of this.shadowRoot?.querySelectorAll("hui-card")) {
      card.hass = value;
    }
  }

  getCardSize() { return 1; }

  _hiddenEntities() {
    let hidden = atzeLayoutValue(
      this._config?.strategy_config,
      "hidden_cards:" + String(this._config?.area_id || "room"),
      []
    );
    if (!hidden.length) {
      try {
        hidden = JSON.parse(
          localStorage.getItem(
            "atze-dashboard:hidden-cards:" + String(this._config?.area_id || "room")
          ) || "[]"
        );
      } catch (_e) {}
    }
    return new Set(Array.isArray(hidden) ? hidden : []);
  }

  _render() {
    if (!this.shadowRoot || !this._config) return;
    const hidden = this._hiddenEntities();
    const visibleCards = (this._config.cards || []).filter(
      (card) => card?.entity && !hidden.has(card.entity)
    );

    if (!visibleCards.length) {
      this.style.display = "none";
      this.shadowRoot.innerHTML = "";
      return;
    }

    this.style.display = "block";
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; }
        .heading { display:flex; align-items:center; gap:12px; margin:20px 8px 12px; font-size:16px; line-height:20px; font-weight:400; }
        .heading ha-icon { --mdc-icon-size:24px; }
      </style>
      <div class="heading"><ha-icon></ha-icon><span></span></div>
      <hui-card class="sortable"></hui-card>
      <div class="popups"></div>
    `;

    const heading = this.shadowRoot.querySelector(".heading");
    heading.querySelector("ha-icon").setAttribute("icon", this._config.icon || "mdi:shape-outline");
    heading.querySelector("span").textContent = this._config.heading || "";

    const sortable = this.shadowRoot.querySelector(".sortable");
    sortable.hass = this._hass;
    sortable.config = {
      type: "custom:atze-sortable-switch-grid",
      area_id: this._config.area_id,
      group_key: this._config.group_key,
      strategy_config: this._config.strategy_config,
      columns: this._config.columns,
      cards: visibleCards,
    };

    const popups = this.shadowRoot.querySelector(".popups");
    for (const popupConfig of this._config.popup_cards || []) {
      const popup = document.createElement("hui-card");
      popup.hass = this._hass;
      popup.config = popupConfig;
      popups.appendChild(popup);
    }
  }
}

if (!customElements.get("atze-room-group")) {
  customElements.define("atze-room-group", AtzeRoomGroup);
}


class AtzeSortableSwitchGrid extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._dragIndex = null;
    this._cards = [];
  }

  setConfig(config) {
    this._config = { columns: 2, cards: [], ...config };

    let hidden = atzeLayoutValue(
      this._config?.strategy_config,
      "hidden_cards:" + String(this._config?.area_id || "room"),
      []
    );
    if (!hidden.length) {
      try {
        hidden = JSON.parse(localStorage.getItem(this._hiddenKey()) || "[]");
      } catch (_e) {}
    }
    hidden = Array.isArray(hidden) ? hidden : [];

    const visibleCards = (this._config.cards || []).filter(
      (card) => !hidden.includes(card?.entity)
    );
    this._cards = this._orderedCards(visibleCards);
    this._syncGroupVisibility();
    this._render();
  }

  _syncGroupVisibility() {
    const section = this.closest("hui-card, hui-grid-card, .card");
    const groupContainer = section?.parentElement;
    if (groupContainer) {
      groupContainer.style.display = this._cards.length ? "" : "none";
    }
  }

  set hass(value) {
    this._hass = value;
    for (const card of this.shadowRoot?.querySelectorAll("hui-card")) {
      card.hass = value;
    }
  }

  getCardSize() { return 1; }

  _itemId(card) {
    const field = this._config?.id_field || "entity";
    return card?.[field];
  }

  _layoutOrderKey() {
    return "card_order:" + String(this._config?.area_id || "room") + ":" + String(this._config?.group_key || "switch");
  }

  _layoutOrderKey() {
    return "card_order:" + String(this._config?.area_id || "room") + ":" + String(this._config?.group_key || "switch");
  }

  _storageKey() {
    if (this._config?.storage_key) return this._config.storage_key;
    return "atze-dashboard:card-order:" + String(this._config?.area_id || "room") + ":" + String(this._config?.group_key || "switch");
  }

  _hiddenKey() {
    return "atze-dashboard:hidden-cards:" + String(this._config?.area_id || "room");
  }

  _hideCard(card) {
    const entityId = card?.entity;
    if (!entityId) return;
    let hidden = [];
    hidden = atzeLayoutValue(this._config?.strategy_config, "hidden_cards:" + String(this._config?.area_id || "room"), []);
    if (!hidden.length) try { hidden = JSON.parse(localStorage.getItem(this._hiddenKey()) || "[]"); } catch (_e) {}
    hidden = Array.isArray(hidden) ? hidden : [];
    if (!hidden.includes(entityId)) hidden.push(entityId);
    try { localStorage.setItem(this._hiddenKey(), JSON.stringify(hidden)); } catch (_e) {}
    if (this._hass && this._config?.strategy_config) saveAtzeStrategyLayout(this._hass, this._config.strategy_config, { ["hidden_cards:" + String(this._config?.area_id || "room")]: hidden });
    this._cards = this._cards.filter((entry) => entry.entity !== entityId);
    this._saveOrder();
    window.dispatchEvent(new CustomEvent("atze-card-hidden", { detail: { entityId, areaId: this._config?.area_id } }));
    this._syncGroupVisibility();
    this._render();
  }

  _orderedCards(cards) {
    let saved = [];
    saved = atzeLayoutValue(this._config?.strategy_config, this._layoutOrderKey(), []);
    if (!saved.length) saved = atzeLayoutValue(this._config?.strategy_config, this._layoutOrderKey(), []);
    if (!saved.length) try { saved = JSON.parse(localStorage.getItem(this._storageKey()) || "[]"); } catch (_e) {}
    if (!Array.isArray(saved) || !saved.length) return [...cards];
    const rank = new Map(saved.map((id, index) => [id, index]));
    return [...cards].sort((a, b) => {
      const ai = rank.has(this._itemId(a)) ? rank.get(this._itemId(a)) : Number.MAX_SAFE_INTEGER;
      const bi = rank.has(this._itemId(b)) ? rank.get(this._itemId(b)) : Number.MAX_SAFE_INTEGER;
      return ai - bi;
    });
  }

  _saveOrder() {
    const ids = this._cards.map((card) => this._itemId(card)).filter(Boolean);
    try { localStorage.setItem(this._storageKey(), JSON.stringify(ids)); } catch (_e) {}
    if (this._hass && this._config?.strategy_config) {
      saveAtzeStrategyLayout(this._hass, this._config.strategy_config, { [this._layoutOrderKey()]: ids });
    }
  }

  _move(from, to) {
    if (from == null || to == null || from === to) return;
    const [moved] = this._cards.splice(from, 1);
    this._cards.splice(to, 0, moved);
    this._saveOrder();
    this._render();
  }

  _render() {
    if (!this.shadowRoot || !this._config) return;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; }
        .grid {
          display:grid;
          grid-template-columns:repeat(${Number(this._config.columns) || 2}, minmax(0,1fr));
          gap:8px;
        }
        .item { min-width:0; cursor:grab; touch-action:pan-y; }
        .item.dragging { opacity:.45; }
        .item.drag-over { outline:2px solid var(--primary-color,#03a9f4); border-radius:14px; }
        .trash { position:fixed; left:50%; bottom:28px; transform:translate(-50%,24px); z-index:9999; display:flex; gap:8px; align-items:center; padding:12px 18px; border-radius:24px; background:rgba(40,40,42,.96); color:#fff; opacity:0; pointer-events:none; transition:.18s ease; box-shadow:0 6px 24px rgba(0,0,0,.35); }
        .trash.visible { opacity:1; transform:translate(-50%,0); pointer-events:auto; }
        .trash.over { background:#c62828; transform:translate(-50%,0) scale(1.08); }
      </style>
      <div class="grid"></div>
      <div class="trash" aria-label="Karte ausblenden"><ha-icon icon="mdi:trash-can-outline"></ha-icon><span>Ausblenden</span></div>
    `;
    const grid = this.shadowRoot.querySelector(".grid");
    const trash = this.shadowRoot.querySelector(".trash");
    trash?.addEventListener("dragover", (event) => { event.preventDefault(); trash.classList.add("over"); });
    trash?.addEventListener("dragleave", () => trash.classList.remove("over"));
    trash?.addEventListener("drop", (event) => { event.preventDefault(); const index = this._dragIndex ?? Number(event.dataTransfer?.getData("text/plain")); const card = this._cards[index]; trash.classList.remove("over","visible"); this._dragIndex = null; if (card) this._hideCard(card); });
    this._cards.forEach((cardConfig, index) => {
      const item = document.createElement("div");
      item.className = "item";
      item.draggable = true;
      item.dataset.index = String(index);
      const card = document.createElement("hui-card");
      card.hass = this._hass;
      card.config = cardConfig;
      item.appendChild(card);
      item.addEventListener("dragstart", (event) => {
        this._dragIndex = index;
        item.classList.add("dragging");
        trash?.classList.add("visible");
        event.dataTransfer?.setData("text/plain", String(index));
      });
      item.addEventListener("dragend", () => {
        this._dragIndex = null;
        trash?.classList.remove("visible","over");
        for (const el of grid.querySelectorAll(".item")) el.classList.remove("dragging","drag-over");
      });
      item.addEventListener("dragover", (event) => {
        event.preventDefault();
        if (this._dragIndex !== index) item.classList.add("drag-over");
      });
      item.addEventListener("dragleave", () => item.classList.remove("drag-over"));
      item.addEventListener("drop", (event) => {
        event.preventDefault();
        item.classList.remove("drag-over");
        const from = this._dragIndex ?? Number(event.dataTransfer?.getData("text/plain"));
        this._move(from, index);
      });
      grid.appendChild(item);
    });
  }
}

if (!customElements.get("atze-sortable-switch-grid")) {
  customElements.define("atze-sortable-switch-grid", AtzeSortableSwitchGrid);
}


class AtzeEntityCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._busy = false;
  }

  setConfig(config) {
    if (!config?.entity || !/^(light|cover)\./.test(config.entity)) {
      throw new Error("Atze Entity Card benötigt eine light- oder cover-Entität");
    }
    this._config = config;
    this._render();
  }

  set hass(value) {
    this._hass = value;
    this._render();
  }

  getCardSize() { return 1; }
  getGridOptions() { return { columns: 6, rows: 1, min_columns: 3 }; }

  _moreInfo() {
    this.dispatchEvent(new CustomEvent("hass-more-info", {
      bubbles: true, composed: true, detail: { entityId: this._config.entity },
    }));
  }

  async _toggle() {
    if (this._busy || !this._hass) return;
    const id = this._config.entity;
    const state = this._hass.states[id];
    if (!state || ["unknown", "unavailable"].includes(state.state)) return;
    const domain = id.split(".")[0];
    let service;
    if (domain === "light") {
      service = "toggle";
    } else if (["opening", "closing"].includes(state.state)) {
      service = "stop_cover";
    } else {
      const pos = Number(state.attributes?.current_position);
      const open = Number.isFinite(pos) && state.attributes?.current_position != null
        ? pos > 0 : state.state === "open";
      service = open ? "close_cover" : "open_cover";
    }
    this._busy = true;
    try {
      await this._hass.callService(domain, service, { entity_id: id });
    } catch (error) {
      console.error("Atze Entity Card: Steuerung fehlgeschlagen", error);
    } finally {
      this._busy = false;
    }
  }

  _render() {
    if (!this.shadowRoot || !this._config.entity) return;
    const id = this._config.entity;
    const state = this._hass?.states[id];
    const cover = id.startsWith("cover.");
    const unavailable = !state || ["unknown", "unavailable"].includes(state.state);
    const moving = cover && ["opening", "closing"].includes(state?.state);
    const active = cover
      ? (state?.attributes?.current_position != null
          ? Number(state.attributes.current_position) > 0
          : ["open", "opening"].includes(state?.state))
      : state?.state === "on";
    const icon = cover ? (moving ? "mdi:stop" : (active ? "mdi:window-shutter-open" : "mdi:window-shutter")) : (active ? "mdi:toggle-switch" : "mdi:toggle-switch-off-outline");
    const name = this._config.name || state?.attributes?.friendly_name || id;
    const iconColor = cover ? "#0A84FF" : (active ? "#30D158" : "var(--secondary-text-color, #8e8e93)");
    const position = cover && state?.attributes?.current_position != null ? Number(state.attributes.current_position) : null;
    // DOM nodes, rather than innerHTML interpolation, prevent entity names from injecting markup.
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; min-width:0; }
        ha-card { box-sizing:border-box; height:56px; min-width:0; display:flex; align-items:center;
          gap:10px; padding:10px 12px; border-radius:15px;
          border:1px solid var(--home-card-border, rgba(255,255,255,.10)); background:rgba(118,118,128,.13);
          color:var(--primary-text-color);
          overflow:hidden; box-shadow:none; }
        button { appearance:none; border:0; cursor:pointer; font:inherit; color:inherit; }
         .control { width:38px; height:38px; flex:0 0 38px; display:grid; place-items:center; border:1px solid var(--home-card-border, rgba(255,255,255,.10));
          border-radius:13px; background:rgba(118,118,128,.20); }
        .control ha-icon { --mdc-icon-size:23px; color:${iconColor}; }
        .details { flex:1; min-width:0; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; font-size:14px; font-weight:500; }
        .position { flex-shrink:0; color:var(--secondary-text-color); font-size:12px; }
        .settings { width:38px; height:38px; flex:0 0 38px; display:grid; place-items:center;
          border:1px solid var(--home-card-border, rgba(255,255,255,.10)); border-radius:13px;
          background:rgba(118,118,128,.20); }
        .settings ha-icon { --mdc-icon-size:23px; }
        button:disabled { opacity:.4; cursor:default; }
      </style>
      <ha-card>
        <button class="control" type="button" aria-label="Steuern" ${unavailable ? "disabled" : ""}><ha-icon icon="${icon}"></ha-icon></button>
        <span class="details"></span>
        ${cover && position != null && Number.isFinite(position) ? `<span class="position">${Math.round(position)} %</span>` : ""}
        <button class="settings" type="button" aria-label="Weitere Steuerung" title="Weitere Steuerung"><ha-icon icon="mdi:tune"></ha-icon></button>
      </ha-card>`;
    const details = this.shadowRoot.querySelector(".details");
    details.textContent = name;
    details.title = name;
    this.shadowRoot.querySelector(".control")?.addEventListener("click", () => this._toggle());
    this.shadowRoot.querySelector(".settings")?.addEventListener("click", () => this._moreInfo());
  }
}

if (!customElements.get("atze-entity-card")) {
  customElements.define("atze-entity-card", AtzeEntityCard);
}

class AtzeThermostatCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._busy = false;
  }
  setConfig(config) {
    if (!config?.entity?.startsWith("climate.")) {
      throw new Error("Atze Thermostat Card benötigt eine climate-Entität");
    }
    this._config = config;
    this._render();
  }
  set hass(value) {
    this._hass = value;
    if (this._serviceOpen) this._refreshServicePopup();
    else this._render();
  }
  getCardSize() { return 1; }
  getGridOptions() { return { columns: 6, rows: 1, min_columns: 3 }; }
  _moreInfo() {
    this.dispatchEvent(new CustomEvent("hass-more-info", {
      bubbles: true, composed: true, detail: { entityId: this._config.entity },
    }));
  }
  _serviceItems() {
    const stem = this._config.entity.slice(8);
    return [
      ["button","identify","Identifizieren"],["switch","child_lock","Kindersicherung"],
      ["button","calibrate","Kalibrieren"],["select","sensor","Temperatursensor"],
      ["switch","valve_detection","Ventilerkennung"],["switch","window_detection","Fenstererkennung"],
      ["binary_sensor","calibrated","Kalibriert"],["binary_sensor","valve_alarm","Ventilalarm"]
    ].map(([domain,suffix,label]) => {
      const id = domain + "." + stem + "_" + suffix;
      return { id, domain, label, state:this._hass?.states?.[id] };
    }).filter(x => x.state);
  }
  _escape(s) {
    return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  _popupHtml() {
    const rows = this._serviceItems().map(({id,domain,label,state}) => {
      const disabled = ["unavailable","unknown"].includes(state.state);
      let action = "";
      if (domain === "button") action = '<button data-service="' + this._escape(id) + '"' + (disabled ? " disabled" : "") + '>Ausführen</button>';
      if (domain === "switch") action = '<button data-service="' + this._escape(id) + '"' + (disabled ? " disabled" : "") + '>' + (state.state === "on" ? "Ein" : "Aus") + '</button>';
      if (domain === "select") action = '<select data-service="' + this._escape(id) + '"' + (disabled ? " disabled" : "") + '>' + (state.attributes.options || []).map(o => '<option value="' + this._escape(o) + '"' + (o === state.state ? " selected" : "") + '>' + this._escape(o) + '</option>').join("") + '</select>';
      if (domain === "binary_sensor") action = '<span>' + (disabled ? "Nicht verfügbar" : state.state === "on" ? "Ja" : "Nein") + '</span>';
      return '<div class="service-row"><span>' + label + '</span>' + action + '</div>';
    }).join("");
    return '<div class="service-backdrop"><section class="service-dialog" role="dialog" aria-modal="true"><h3>Thermostat · Service</h3>' + (rows || "Keine Service-Entitäten vorhanden") + '</section></div>';
  }
  async _serviceAction(id, option) {
    const item = this._serviceItems().find(x => x.id === id);
    if (!item || ["unknown","unavailable"].includes(item.state.state)) return;
    try {
      if (item.domain === "button") await this._hass.callService("button","press",{entity_id:id});
      if (item.domain === "switch") await this._hass.callService("switch",item.state.state === "on" ? "turn_off" : "turn_on",{entity_id:id});
      if (item.domain === "select") await this._hass.callService("select","select_option",{entity_id:id,option});
    } catch(e) { console.error("Thermostat Service",e); }
  }
  _refreshServicePopup() {
    const dialog = this.shadowRoot?.querySelector(".service-dialog");
    if (!dialog) return;
    for (const item of this._serviceItems()) {
      const el = [...dialog.querySelectorAll("[data-service]")].find(node => node.dataset.service === item.id);
      const disabled = ["unknown", "unavailable"].includes(item.state.state);
      if (el) {
        el.disabled = disabled;
        if (item.domain === "switch") el.textContent = item.state.state === "on" ? "Ein" : "Aus";
        // Preserve an open native dropdown and the user's current selection.
        if (item.domain === "select" && document.activeElement !== el && this.shadowRoot.activeElement !== el) {
          if ([...el.options].some(o => o.value === item.state.state)) el.value = item.state.state;
        }
      } else if (item.domain === "binary_sensor") {
        const rows = [...dialog.querySelectorAll(".service-row")];
        const row = rows.find(node => node.querySelector("span")?.textContent === item.label);
        const value = row?.querySelector("span:last-child");
        if (value) value.textContent = disabled ? "Nicht verfügbar" : item.state.state === "on" ? "Ja" : "Nein";
      }
    }
  }
  _openService() { this._serviceOpen = true; this._lockScroll(); this._render(); }
  _lockScroll() {
    if (this._scrollCleanup) return;
    const prevent = (event) => { if (this._serviceOpen && !event.target.closest?.(".service-dialog")) event.preventDefault(); };
    document.addEventListener("touchmove", prevent, { passive:false });
    document.addEventListener("wheel", prevent, { passive:false });
    this._scrollCleanup = () => { document.removeEventListener("touchmove", prevent); document.removeEventListener("wheel", prevent); };
  }
  _closeService() { this._serviceOpen = false; this._scrollCleanup?.(); this._scrollCleanup = null; this._render(); }
  disconnectedCallback() { this._scrollCleanup?.(); this._scrollCleanup = null; }
  async _toggle() {
    if (this._busy || !this._hass) return;
    const entityId = this._config.entity;
    const state = this._hass.states[entityId];
    if (!state || ["unknown", "unavailable"].includes(state.state)) return;
    const enabled = state.state !== "off";
    const modes = state.attributes?.hvac_modes || [];
    const nextMode = enabled ? "off" : (modes.includes("heat") ? "heat" : null);
    if (!nextMode || !modes.includes(nextMode)) return;
    this._busy = true;
    try {
      await this._hass.callService("climate", "set_hvac_mode", {
        entity_id: entityId, hvac_mode: nextMode,
      });
    } catch (error) {
      console.error("Atze Thermostat Card: Umschalten fehlgeschlagen", error);
    } finally {
      this._busy = false;
    }
  }
  _render() {
    if (!this.shadowRoot || !this._config.entity) return;
    const state = this._hass?.states[this._config.entity];
    const attributes = state?.attributes || {};
    const unavailable = !state || ["unknown", "unavailable"].includes(state.state);
    const enabled = !unavailable && state.state !== "off";
    const modes = attributes.hvac_modes || [];
    const canToggle = !unavailable && modes.includes("off") && (enabled || modes.includes("heat"));
    const unit = this._hass?.config?.unit_system?.temperature || "°C";
    const format = value => {
      const n = Number(value);
      return value == null || value === "" || !Number.isFinite(n)
        ? "–" : n.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    };
    const name = this._config.name || attributes.friendly_name || this._config.entity;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; min-width:0; }
        ha-card { box-sizing:border-box; height:56px; min-width:0; display:flex; align-items:center;
          gap:10px; padding:7px 12px; border-radius:15px;
          border:1px solid var(--home-card-border, rgba(255,255,255,.10));
          background:rgba(118,118,128,.13); color:var(--primary-text-color);
          overflow:hidden; box-shadow:none; }
        .thermometer, .settings { width:38px; height:38px; flex:0 0 38px;
          display:grid; place-items:center; border:1px solid var(--home-card-border, rgba(255,255,255,.10));
          border-radius:13px; background:rgba(118,118,128,.20); }
        .thermometer ha-icon { --mdc-icon-size:23px; color:${enabled ? "#FF453A" : "var(--secondary-text-color, #8e8e93)"}; }
        .info { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; border:0; padding:0; background:transparent; color:inherit; text-align:left; cursor:pointer; }

        .name { font-size:14px; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .current { font-size:11px; color:var(--secondary-text-color); white-space:nowrap; }
        .target { flex-shrink:0; display:flex; flex-direction:column; align-items:flex-end; gap:2px; border:0; padding:0; background:transparent; color:inherit; cursor:pointer; }

        .target-value { font-size:16px; font-weight:600; white-space:nowrap; }
        .target-label { font-size:10px; color:var(--secondary-text-color); }
        button { appearance:none; cursor:pointer; font:inherit; color:inherit; }
        .settings ha-icon { --mdc-icon-size:23px; }
        .thermometer:disabled { opacity:.4; cursor:default; }
        .service-backdrop { position:fixed; inset:0; z-index:1000; display:flex; justify-content:center; align-items:center; padding:18px; box-sizing:border-box; background:rgba(0,0,0,.65); }
        .service-dialog { width:min(430px,100%); max-height:85vh; overflow:auto; padding:20px; box-sizing:border-box; border-radius:20px; background:var(--card-background-color,#242429); border:1px solid var(--divider-color); }
        .service-dialog h3 { margin:0 0 16px; }
        .service-row { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:12px 8px; border-bottom:1px solid var(--divider-color); }
        .service-row span:first-child { font-size:13px; }
        .service-row button,.service-row select { padding:9px; border-radius:10px; background:rgba(118,118,128,.2); color:var(--primary-text-color); border:1px solid var(--divider-color); }
      </style>
      <ha-card>
        <button class="thermometer" type="button" aria-label="${enabled ? "Heizung ausschalten" : "Heizung einschalten"}" title="${enabled ? "Heizung ausschalten" : "Heizung einschalten"}" ${canToggle ? "" : "disabled"}><ha-icon icon="mdi:thermometer"></ha-icon></button>
        <button class="info" type="button" aria-label="Thermostat Service öffnen" title="Thermostat Service öffnen"><span class="name"></span><span class="current"></span></button>
        <button class="target" type="button" aria-label="Thermostat Service öffnen" title="Thermostat Service öffnen"><span class="target-value"></span><span class="target-label">Soll</span></button>
        <button class="settings" type="button" aria-label="Thermostateinstellungen" title="Thermostateinstellungen"><ha-icon icon="mdi:tune"></ha-icon></button>
      </ha-card>
      ${this._serviceOpen ? this._popupHtml() : ""}`;
    const nameEl = this.shadowRoot.querySelector(".name");
    nameEl.textContent = name;
    nameEl.title = name;
    this.shadowRoot.querySelector(".current").textContent =
      "Ist " + (unavailable ? "–" : format(attributes.current_temperature)) + " " + unit;
    this.shadowRoot.querySelector(".target-value").textContent =
      (unavailable ? "–" : format(attributes.temperature)) + " " + unit;
    this.shadowRoot.querySelector(".thermometer").addEventListener("click", () => this._toggle());
    this.shadowRoot.querySelector(".info").addEventListener("click", () => this._openService());
    this.shadowRoot.querySelector(".target").addEventListener("click", () => this._openService());
    this.shadowRoot.querySelector(".settings").addEventListener("click", () => this._moreInfo());
    this.shadowRoot.querySelector(".service-backdrop")?.addEventListener("click", e => {
      if (e.target.classList.contains("service-backdrop")) { this._closeService(); }
    });
    this.shadowRoot.querySelectorAll("[data-service]").forEach(el => {
      const id = el.dataset.service;
      el.addEventListener(el.tagName === "SELECT" ? "change" : "click", () => this._serviceAction(id, el.value));
    });

  }
}
if (!customElements.get("atze-thermostat-card")) {
  customElements.define("atze-thermostat-card", AtzeThermostatCard);
}
