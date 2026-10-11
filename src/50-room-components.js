
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
              : "rgba(35, 38, 46, 0.78)"};
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
          backdrop-filter: blur(22px) saturate(1.25);
          -webkit-backdrop-filter: blur(22px) saturate(1.25);
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
          background: rgba(35, 38, 46, 0.78);
          backdrop-filter: blur(22px) saturate(1.25);
          -webkit-backdrop-filter: blur(22px) saturate(1.25);
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

  connectedCallback() {
    // HA sections are laid out outside the card's shadow DOM.
    // Apply the compact row spacing only to the room view containing this card.
    requestAnimationFrame(() => this._compactSectionSpacing());
  }

  _compactSectionSpacing() {
    let node = this;
    while (node) {
      const root = node.getRootNode?.();
      const host = root?.host;
      if (!host || host === node) break;
      if (host.localName === "hui-sections-view") {
        const viewRoot = host.shadowRoot;
        if (viewRoot && !viewRoot.querySelector("#atze-room-section-spacing")) {
          const style = document.createElement("style");
          style.id = "atze-room-section-spacing";
          style.textContent = `
            #sections, .sections {
              row-gap: 12px !important;
            }
          `;
          viewRoot.appendChild(style);
        }
        break;
      }
      node = host;
    }
  }

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
        :host { display:block; margin-bottom:-12px; }
        .heading { display:flex; align-items:center; gap:12px; margin:16px 8px 8px; font-size:16px; line-height:20px; font-weight:400; }
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
    this._lightPopupOpen = false;
    this._coverPopupOpen = false;
    this._brightnessDragging = false;
    this._coverDragging = false;
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
    if (!this._brightnessDragging && !this._coverDragging) this._render();
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

  _openLightPopup() {
    this._lightPopupOpen = true;
    this._render();
  }

  _closeLightPopup() {
    this._lightPopupOpen = false;
    this._render();
  }

  _openCoverPopup() {
    this._coverPopupOpen = true;
    this._render();
  }

  _closeCoverPopup() {
    this._coverPopupOpen = false;
    this._render();
  }

  async _setCoverPosition(position) {
    if (this._busy || !this._hass) return;
    const state = this._hass.states[this._config.entity];
    if (!state || ["unknown", "unavailable"].includes(state.state)) return;
    const features = Number(state.attributes?.supported_features || 0);
    const service = position === 0 ? "close_cover" : position === 100 ? "open_cover" : "set_cover_position";
    const supported = position === 0 ? (features & 2) : position === 100 ? (features & 1) : (features & 4);
    if (!supported) return;
    this._busy = true;
    try {
      await this._hass.callService("cover", service, {
        entity_id: this._config.entity,
        ...(service === "set_cover_position" ? { position } : {}),
      });
    } catch (error) {
      console.error("Atze Rollladen-Popup: Position fehlgeschlagen", error);
    } finally {
      this._busy = false;
    }
  }

  _coverPopupMarkup(name, state) {
    const features = Number(state?.attributes?.supported_features || 0);
    const position = Number(state?.attributes?.current_position);
    const hasPosition = state?.attributes?.current_position != null && Number.isFinite(position);
    const unavailable = !state || ["unknown", "unavailable"].includes(state.state);
    const presets = [
      [0, "Geschlossen", "mdi:window-shutter"],
      [100, "Offen", "mdi:window-shutter-open"],
      [70, "Halb offen", "mdi:window-shutter"],
      [10, "Schlitz offen", "mdi:window-shutter"],
    ];
    const choices = presets.map(([value, label, icon]) => {
      const supported = value === 0 ? (features & 2) : value === 100 ? (features & 1) : (features & 4);
      const selected = hasPosition && Math.abs(position - value) <= 1;
      return `<button type="button" class="light-choice${selected ? " is-active" : ""}" data-cover-position="${value}" ${!supported || unavailable ? "disabled" : ""}><ha-icon icon="${icon}"></ha-icon><strong>${label}</strong><small>${value} %</small></button>`;
    }).join("");
    return `<div class="light-overlay cover-overlay"><section class="light-dialog" role="dialog" aria-modal="true" aria-label="Rollladen Positionen">
      <header><ha-icon icon="mdi:window-shutter"></ha-icon><span class="cover-title"></span></header>
      <div class="light-divider"></div>
      <div class="light-heading">Position</div>
      <div class="cover-options">${choices}</div>
      <div class="light-section-divider"></div>
      <div class="light-brightness-heading"><span>Rollladenposition</span><strong data-cover-value>${hasPosition ? Math.round(position) : "–"} %</strong></div>
      <input class="light-brightness cover-slider" type="range" min="0" max="100" step="1" value="${hasPosition ? Math.round(position) : 0}" aria-label="Rollladenposition" ${!unavailable && (features & 4) ? "" : "disabled"}>
    </section></div>`;
  }

  async _setColorTemperature(kelvin) {
    if (this._busy || !this._hass) return;
    this._busy = true;
    try {
      await this._hass.callService("light", "turn_on", {
        entity_id: this._config.entity,
        color_temp_kelvin: kelvin,
      });
    } catch (error) {
      console.error("Atze Licht-Popup: Farbtemperatur fehlgeschlagen", error);
    } finally {
      this._busy = false;
    }
  }

  async _setBrightness(percent) {
    if (!this._hass) return;
    const brightness = Math.round(Math.max(1, Math.min(100, percent)) * 255 / 100);
    try {
      await this._hass.callService("light", "turn_on", {
        entity_id: this._config.entity,
        brightness,
      });
    } catch (error) {
      console.error("Atze Licht-Popup: Helligkeit fehlgeschlagen", error);
    }
  }

  _lightPopupMarkup(name, state) {
    const registryEntity = this._hass?.entities?.[this._config.entity];
    const device = registryEntity?.device_id ? this._hass?.devices?.[registryEntity.device_id] : null;
    const title = device?.name_by_user || device?.name || name;
    const modes = state?.attributes?.supported_color_modes || [];
    const supportsTemperature = modes.includes("color_temp");
    const min = Number(state?.attributes?.min_color_temp_kelvin);
    const max = Number(state?.attributes?.max_color_temp_kelvin);
    const current = Number(state?.attributes?.color_temp_kelvin);
    const brightnessSupported = modes.some(mode => ["brightness", "color_temp", "hs", "xy", "rgb", "rgbw", "rgbww", "white"].includes(mode));
    const rawBrightness = Number(state?.attributes?.brightness);
    const brightnessPercent = state?.state === "on" && Number.isFinite(rawBrightness)
      ? Math.round(rawBrightness / 255 * 100) : 0;
    const presets = [
      [2200, "Kerzenlicht", "#ffad55"],
      [2700, "Warmweiß", "#ffc782"],
      [3000, "Weiß warm", "#ffdaa4"],
      [4000, "Neutralweiß", "#fff0d5"],
      [5000, "Tageslicht", "#f4f7ff"],
      [6500, "Kaltweiß", "#dceaff"],
    ];
    const choices = presets.map(([kelvin,label,color]) => {
      const available = supportsTemperature && Number.isFinite(min) && Number.isFinite(max) && kelvin >= min && kelvin <= max;
      const selected = state?.state === "on" && Number.isFinite(current) && Math.abs(current-kelvin) < 100;
      return '<button type="button" class="light-choice' + (selected ? ' is-active' : '') + '" data-kelvin="' + kelvin + '"' + (available ? '' : ' disabled') + '><span class="light-dot" style="background:' + color + '"></span><strong>' + kelvin + ' K</strong><small>' + label + '</small></button>';
    }).join("");
    return `<div class="light-overlay"><section class="light-dialog" role="dialog" aria-modal="true" aria-label="Licht Farbtemperatur">
      <header><ha-icon icon="mdi:lightbulb"></ha-icon><span class="light-title"></span></header>
      <div class="light-divider"></div>
      <div class="light-heading">Farbtemperatur</div>
      <div class="light-options">${choices}</div>
      ${supportsTemperature ? "" : '<p class="light-hint">Diese Lampe unterstützt keine Farbtemperatursteuerung.</p>'}
      <div class="light-section-divider"></div>
      <div class="light-brightness-heading"><span>Helligkeit</span><strong data-brightness-value>${brightnessPercent} %</strong></div>
      <input class="light-brightness" type="range" min="1" max="100" step="1" value="${Math.max(1,brightnessPercent)}" aria-label="Helligkeit" ${brightnessSupported ? "" : "disabled"}>
      ${brightnessSupported ? "" : '<p class="light-hint">Diese Lampe unterstützt keine Helligkeitsregelung.</p>'}
    </section></div>`;
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
          border:1px solid var(--home-card-border, rgba(255,255,255,.10)); background:rgba(55,58,67,.30); backdrop-filter:blur(10px) saturate(1.2); -webkit-backdrop-filter:blur(10px) saturate(1.2);
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
        .details.light-details { cursor:pointer; }
        ha-card:has(.light-details),ha-card:has(.cover-details) { cursor:pointer; }
        .light-overlay { position:fixed; inset:0; z-index:10000; display:flex; align-items:center; justify-content:center; padding:18px; box-sizing:border-box; background:rgba(0,0,0,.65); }
        .light-dialog { box-sizing:border-box; width:min(430px,100%); max-height:85vh; overflow:auto; padding:22px; border-radius:22px; border:1px solid rgba(255,255,255,.17); background:rgba(38,40,46,.94); backdrop-filter:blur(22px); color:#fff; box-shadow:0 18px 55px rgba(0,0,0,.4); }
        .light-dialog header { display:flex; align-items:center; gap:12px; font-size:18px; font-weight:600; margin-bottom:16px; }
        .light-dialog header ha-icon { color:#64d2ff; }
        .light-title { min-width:0; overflow:hidden; text-overflow:ellipsis; }
        .light-divider { height:1px; background:rgba(255,255,255,.16); margin-bottom:20px; }
        .light-heading { font-size:14px; font-weight:600; margin-bottom:12px; }
        .light-options { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
        .light-choice { display:flex; flex-direction:column; align-items:center; gap:7px; padding:12px 4px; min-width:0; border:1px solid rgba(255,255,255,.17); border-radius:14px; background:rgba(255,255,255,.07); color:#fff; font-size:12px; }
        .light-choice.is-active { border-color:#64d2ff; background:rgba(20,107,153,.35); }
        .light-choice:disabled { opacity:.35; cursor:default; }
        .light-dot { display:block; width:36px; height:36px; border-radius:50%; border:1px solid rgba(255,255,255,.3); }
        .light-choice strong { font-size:12px; }
        .cover-options { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
        .cover-options .light-choice { min-height:100px; }
        .cover-options .light-choice ha-icon { --mdc-icon-size:30px; color:#bec2cc; }
        .cover-options .light-choice.is-active ha-icon { color:#64d2ff; }
        .light-choice small { font-size:11px; color:#c6c6cc; }
        .light-hint { font-size:12px; color:#c6c6cc; }
        .light-section-divider { height:1px; background:rgba(255,255,255,.16); margin-top:22px; }
        .light-section-divider + .light-brightness-heading { margin-top:16px; }
        .light-brightness-heading { display:flex; justify-content:space-between; align-items:center; margin:22px 0 12px; font-size:14px; font-weight:600; }
        .light-brightness-heading strong { font-size:14px; font-weight:500; color:#64d2ff; }
        .light-brightness { display:block; width:100%; margin:0; accent-color:#64d2ff; cursor:pointer; }
        .light-brightness:disabled { opacity:.35; cursor:default; }

      </style>
      <ha-card>
        <button class="control" type="button" aria-label="Steuern" ${unavailable ? "disabled" : ""}><ha-icon icon="${icon}"></ha-icon></button>
        <span class="details ${cover ? "cover-details" : "light-details"}" role="button" tabindex="0"></span>
        ${cover && position != null && Number.isFinite(position) ? `<span class="position">${Math.round(position)} %</span>` : ""}
        <button class="settings" type="button" aria-label="Weitere Steuerung" title="Weitere Steuerung"><ha-icon icon="mdi:tune"></ha-icon></button>
      </ha-card>${!cover && this._lightPopupOpen ? this._lightPopupMarkup(name, state) : ""}${cover && this._coverPopupOpen ? this._coverPopupMarkup(name, state) : ""}`;
    const details = this.shadowRoot.querySelector(".details");
    details.textContent = name;
    details.title = name;
    this.shadowRoot.querySelector(".control")?.addEventListener("click", () => this._toggle());
    this.shadowRoot.querySelector(".settings")?.addEventListener("click", () => this._moreInfo());
    if (cover) {
      const open = () => this._openCoverPopup();
      this.shadowRoot.querySelector("ha-card").addEventListener("click", event => {
        if (event.target.closest("button")) return;
        open();
      });
      details.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); }
      });
      const overlay = this.shadowRoot.querySelector(".cover-overlay");
      if (overlay) {
        const registryEntity = this._hass?.entities?.[id];
        const device = registryEntity?.device_id ? this._hass?.devices?.[registryEntity.device_id] : null;
        overlay.querySelector(".cover-title").textContent = device?.name_by_user || device?.name || name;
        overlay.addEventListener("click", event => {
          if (event.target === overlay) this._closeCoverPopup();
        });
        const slider = overlay.querySelector(".cover-slider");
        if (slider) {
          slider.addEventListener("input", () => {
            this._coverDragging = true;
            overlay.querySelector("[data-cover-value]").textContent = slider.value + " %";
          });
          slider.addEventListener("change", () => {
            const position = Number(slider.value);
            this._coverDragging = false;
            this._setCoverPosition(position);
          });
          slider.addEventListener("pointercancel", () => { this._coverDragging = false; });
          slider.addEventListener("touchcancel", () => { this._coverDragging = false; }, { passive:true });
        }
        overlay.querySelectorAll("[data-cover-position]").forEach(button => {
          button.addEventListener("click", () => this._setCoverPosition(Number(button.dataset.coverPosition)));
        });
      }
    } else {
      const open = () => this._openLightPopup();
      this.shadowRoot.querySelector("ha-card").addEventListener("click", event => {
        if (event.target.closest("button")) return;
        open();
      });
      details.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); }
      });
      const overlay = this.shadowRoot.querySelector(".light-overlay");
      if (overlay) {
        overlay.querySelector(".light-title").textContent = (() => {
          const registryEntity = this._hass?.entities?.[id];
          const device = registryEntity?.device_id ? this._hass?.devices?.[registryEntity.device_id] : null;
          return device?.name_by_user || device?.name || name;
        })();
        overlay.addEventListener("click", event => {
          if (event.target === overlay) this._closeLightPopup();
        });
        const slider = overlay.querySelector(".light-brightness");
        if (slider) {
          slider.addEventListener("input", () => {
            this._brightnessDragging = true;
            overlay.querySelector("[data-brightness-value]").textContent = slider.value + " %";
          });
          slider.addEventListener("change", () => {
            const percent = Number(slider.value);
            this._brightnessDragging = false;
            this._setBrightness(percent);
          });
          slider.addEventListener("pointercancel", () => { this._brightnessDragging = false; });
        }
        overlay.querySelectorAll("[data-kelvin]").forEach(button => {
          button.addEventListener("click", () => this._setColorTemperature(Number(button.dataset.kelvin)));
        });
      }
    }
  }
}

const atzeEntityCardTag = ATZE_TESTING_BUILD ? "atze-entity-card-testing" : "atze-entity-card";
if (!customElements.get(atzeEntityCardTag)) {
  customElements.define(atzeEntityCardTag, AtzeEntityCard);
}

class AtzeThermostatCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._busy = false;
    this._temperatureDragging = false;
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
    if (this._serviceOpen && !this._temperatureDragging) this._refreshServicePopup();
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
    const registryEntity = this._hass?.entities?.[this._config.entity];
    const deviceId = registryEntity?.device_id;
    if (!deviceId) return [];
    const names = {
      identify:"Identifizieren", child_lock:"Kindersicherung", calibrate:"Kalibrieren",
      sensor:"Temperatursensor", valve_detection:"Ventilerkennung",
      window_detection:"Fenstererkennung", calibrated:"Kalibriert",
      valve_alarm:"Ventilalarm", battery:"Batterie", valve_position:"Ventilöffnung",
      temperature_offset:"Temperatur-Offset", external_temperature:"Externe Temperatur",
    };
    const domains = new Set(["button","switch","select","binary_sensor","sensor","number"]);
    return Object.entries(this._hass?.entities || {}).filter(([id, entry]) =>
      entry?.device_id === deviceId && id !== this._config.entity &&
      domains.has(id.split(".")[0]) && !entry.disabled_by && !entry.hidden_by &&
      this._hass?.states?.[id]
    ).map(([id,entry]) => {
      const domain = id.split(".")[0];
      const state = this._hass.states[id];
      const suffix = id.split(".")[1].split("_").slice(-2).join("_");
      const label = entry.name || entry.original_name || state.attributes?.friendly_name ||
        names[suffix] || id;
      return { id, domain, label, state };
    }).sort((a,b) => a.label.localeCompare(b.label,"de"));
  }
  _batteryItem(items = this._serviceItems()) {
    return items.find(item => item.domain === "sensor" &&
      (item.state.attributes?.device_class === "battery" ||
       /(?:^|_)battery(?:_level)?$/.test(item.id.split(".")[1])) &&
      (item.state.attributes?.unit_of_measurement === "%" || item.state.attributes?.device_class === "battery"));
  }
  _batteryMarkup(item) {
    if (!item) return "";
    const n = Number(item.state.state);
    const valid = !["unknown","unavailable"].includes(item.state.state) && Number.isFinite(n);
    const percent = valid ? Math.max(0,Math.min(100,Math.round(n))) : null;
    const icon = percent == null ? "mdi:battery-unknown" : percent <= 10 ? "mdi:battery-outline" :
      percent >= 95 ? "mdi:battery" : "mdi:battery-" + Math.max(10,Math.min(90,Math.round(percent/10)*10));
    const color = percent == null ? "unknown" : percent <= 20 ? "low" : percent <= 40 ? "medium" : "good";
    return '<span class="thermostat-battery ' + color + '" title="Batteriestand"><ha-icon icon="' + icon +
      '"></ha-icon><span class="battery-percent">' + (percent == null ? "–" : percent) + '%</span></span>';
  }
  _deviceTitle() {
    const entry = this._hass?.entities?.[this._config.entity];
    const device = entry?.device_id ? this._hass?.devices?.[entry.device_id] : null;
    return device?.name_by_user || device?.name ||
      this._config.name || this._hass?.states?.[this._config.entity]?.attributes?.friendly_name ||
      "Thermostat";
  }
  async _setTemperature(value) {
    const state = this._hass?.states?.[this._config.entity];
    if (!state || ["unknown","unavailable"].includes(state.state)) return;
    const min = Number(state.attributes?.min_temp ?? 5);
    const max = Number(state.attributes?.max_temp ?? 30);
    const temp = Math.min(max,Math.max(min,Number(value)));
    if (!Number.isFinite(temp)) return;
    try {
      await this._hass.callService("climate","set_temperature",{entity_id:this._config.entity,temperature:temp});
    } catch(e) { console.error("Thermostat Temperatur",e); }
  }
  async _setHvacMode(mode) {
    const state = this._hass?.states?.[this._config.entity];
    if (!state?.attributes?.hvac_modes?.includes(mode)) return;
    try {
      await this._hass.callService("climate","set_hvac_mode",{entity_id:this._config.entity,hvac_mode:mode});
    } catch(e) { console.error("Thermostat Betriebsmodus",e); }
  }
  _escape(s) {
    return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  _popupHtml() {
    const state = this._hass?.states?.[this._config.entity];
    const attrs = state?.attributes || {};
    const unit = this._hass?.config?.unit_system?.temperature || "°C";
    const target = Number(attrs.temperature);
    const validTarget = attrs.temperature != null && Number.isFinite(target);
    const current = attrs.current_temperature;
    const format = n => Number(n).toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1});
    const hvacModes = attrs.hvac_modes || [];
    const hasPowerToggle = hvacModes.includes("off") && hvacModes.includes("heat");
    const modes = hvacModes.filter(mode => !hasPowerToggle || !["off","heat"].includes(mode)).map(mode => {
      const label = {off:"Aus",heat:"Heizen",auto:"Auto",heat_cool:"Heizen/Kühlen",cool:"Kühlen",dry:"Trocknen",fan_only:"Lüften"}[mode] || mode;
      return '<button type="button" data-hvac="' + this._escape(mode) + '" class="mode-button' + (state.state === mode ? ' is-active' : '') + '">' + this._escape(label) + '</button>';
    }).join("");
    const items = this._serviceItems();
    const calibrationButton = items.find(item => item.domain === "button" && /(?:^|_)calibrate$/.test(item.id));
    const calibrationState = items.find(item => item.domain === "binary_sensor" && /(?:^|_)calibrated$/.test(item.id));
    const batteryItem = this._batteryItem(items);
    const isChildLock = item => item.domain === "switch" && /(?:^|_)child_lock$/.test(item.id);
    const isWindowDetection = item => item.domain === "switch" && /(?:^|_)window_detection$/.test(item.id);
    const childLock = items.find(isChildLock);
    const windowDetection = items.find(isWindowDetection);
    const valveDetection = items.find(item => item.domain === "switch" && /(?:^|_)valve_detection$/.test(item.id));
    const rowItems = items.filter(item =>
      !(calibrationButton && calibrationState && item.id === calibrationState.id) &&
      item.id !== batteryItem?.id && !isChildLock(item) && !isWindowDetection(item) &&
      item.id !== valveDetection?.id && item.id !== calibrationButton?.id &&
      !(item.domain === "sensor" && item.state.attributes?.device_class === "temperature") &&
      !(item.domain === "number" && (/(?:^|_)temperature$/.test(item.id.split(".")[1]) || /^Temperatur$/i.test(item.label.trim()))) &&
      !((item.domain === "sensor" || item.domain === "binary_sensor") &&
        (/(?:^|_)(?:operating_state|operation_state|running_state|hvac_action|heating_state|betriebszustand)$/.test(item.id.split(".")[1]) ||
         /^(?:Betriebszustand|Operating state|Operation state|HVAC action)$/i.test(item.label.trim()) ||
         /(?:^|_)(?:window|fenster)(?:_open|_state|_status)?$/.test(item.id.split(".")[1]) ||
         /^(?:Fenster|Window|Fensterstatus|Window state)$/i.test(item.label.trim()))));
    const renderRow = ({id,domain,label,state:other}) => {
      const disabled = ["unknown","unavailable"].includes(other.state);
      let action = "";
      if (domain === "button" || domain === "switch") {
        const active = domain === "switch" && other.state === "on";
        const isCalibration = calibrationButton && calibrationState && id === calibrationButton.id;
        const calibrated = calibrationState?.state?.state;
        const calibrationClass = isCalibration ? (calibrated === "on" ? " is-calibrated" : calibrated === "off" ? " is-uncalibrated" : " is-unknown") : "";
        action = '<button type="button" class="service-toggle' + (active ? ' is-active' : '') + calibrationClass + '" data-service="' + this._escape(id) + '"' + (disabled ? " disabled" : "") + '><ha-icon icon="' + (domain === "button" ? "mdi:gesture-tap-button" : active ? "mdi:toggle-switch" : "mdi:toggle-switch-off-outline") + '"></ha-icon></button>';
      } else if (domain === "select") {
        action = '<select data-service="' + this._escape(id) + '"' + (disabled ? " disabled" : "") + '>' + (other.attributes.options || []).map(o => '<option value="' + this._escape(o) + '"' + (o === other.state ? " selected" : "") + '>' + this._escape(o) + '</option>').join("") + '</select>';
      } else if (domain === "number") {
        action = '<input type="number" data-service="' + this._escape(id) + '" value="' + this._escape(other.state) + '" min="' + this._escape(other.attributes.min ?? "") + '" max="' + this._escape(other.attributes.max ?? "") + '" step="' + this._escape(other.attributes.step ?? 1) + '"' + (disabled ? " disabled" : "") + '>';
      } else {
        action = '<span>' + this._escape(disabled ? "Nicht verfügbar" : other.state === "on" ? "Ja" : other.state === "off" ? "Nein" : other.state + (other.attributes.unit_of_measurement ? " " + other.attributes.unit_of_measurement : "")) + '</span>';
      }
      return '<div class="service-row"><span>' + this._escape(label) + '</span>' + action + '</div>';
    };
    const paired = [childLock,windowDetection].filter(Boolean);
    const pairedHtml = paired.length ? '<div class="service-pair">' + paired.map(renderRow).join("") + '</div>' : "";
    const valvePair = [valveDetection,calibrationButton].filter(Boolean);
    const valvePairHtml = valvePair.length ? '<div class="service-pair">' + valvePair.map(renderRow).join("") + '</div>' : "";
    const rows = pairedHtml + valvePairHtml + rowItems.map(renderRow).join("");
    return '<div class="service-backdrop"><section class="service-dialog" role="dialog" aria-modal="true">' +
      '<header><ha-icon icon="mdi:thermostat"></ha-icon><span class="service-title"></span>' + this._batteryMarkup(batteryItem) + '</header><div class="service-divider"></div>' +
      '<div class="thermostat-main">' + (hasPowerToggle ? '<button type="button" class="thermostat-power' + (state?.state !== "off" ? ' is-on' : '') + '" aria-label="Heizung umschalten"><ha-icon icon="mdi:power"></ha-icon></button>' : '') + '<div class="thermostat-temperatures"><div class="service-caption">Solltemperatur</div><div class="temperature-control"><button type="button" data-temp-step="-1" aria-label="Temperatur senken">−</button><strong data-target-value>' + (validTarget ? format(target) : "–") + ' ' + unit + '</strong><button type="button" data-temp-step="1" aria-label="Temperatur erhöhen">+</button></div>' +
      '<div class="service-caption">Isttemperatur: ' + this._escape(current == null ? "–" : format(current)) + ' ' + this._escape(unit) + '</div></div></div>' +
      '<div class="service-divider"></div><div class="service-caption">Temperatur-Voreinstellungen</div>' +
      '<div class="temperature-presets">' + [5,17,20,24].map(t => '<button type="button" data-temp-preset="' + t + '"' + (t < Number(attrs.min_temp ?? 5) || t > Number(attrs.max_temp ?? 30) ? ' disabled' : '') + '>' + t + '°</button>').join("") +
      '<button type="button" data-temp-preset="max" class="preset-max">Max</button></div>' +
      (modes ? '<div class="service-divider"></div><div class="service-caption">Betriebsmodus</div><div class="mode-options">' + modes + '</div>' : '') +
      '<div class="service-divider"></div><div class="service-caption">Weitere Funktionen</div>' + (rows || '<p class="service-empty">Keine zusätzlichen Gerätefunktionen verfügbar</p>') + '</section></div>';
  }
  async _serviceAction(id, option) {
    const item = this._serviceItems().find(x => x.id === id);
    if (!item || item.state.state === "unavailable" || (item.domain !== "button" && item.state.state === "unknown")) return;
    try {
      if (item.domain === "button") await this._hass.callService("button","press",{entity_id:id});
      if (item.domain === "switch") await this._hass.callService("switch",item.state.state === "on" ? "turn_off" : "turn_on",{entity_id:id});
      if (item.domain === "select") await this._hass.callService("select","select_option",{entity_id:id,option});
      if (item.domain === "number" && Number.isFinite(Number(option))) await this._hass.callService("number","set_value",{entity_id:id,value:Number(option)});
    } catch(e) { console.error("Thermostat Service",e); }
  }
  _refreshServicePopup() {
    const dialog = this.shadowRoot?.querySelector(".service-dialog");
    if (!dialog) return;
    const state = this._hass?.states?.[this._config.entity];
    const target = Number(state?.attributes?.temperature);
    const value = dialog.querySelector("[data-target-value]");
    if (value && state?.attributes?.temperature != null && Number.isFinite(target)) {
      const unit = this._hass?.config?.unit_system?.temperature || "°C";
      value.textContent = target.toLocaleString("de-DE",{minimumFractionDigits:1,maximumFractionDigits:1}) + " " + unit;
    }
    dialog.querySelectorAll("[data-hvac]").forEach(button => button.classList.toggle("is-active",button.dataset.hvac === state?.state));
    dialog.querySelector(".thermostat-power")?.classList.toggle("is-on",state?.state !== "off" && !["unknown","unavailable"].includes(state?.state));
    const battery = dialog.querySelector(".thermostat-battery");
    if (battery) {
      const fresh = this._batteryMarkup(this._batteryItem());
      if (fresh) {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = fresh;
        battery.replaceWith(wrapper.firstElementChild);
      }
    }
    const calibrationButton = this._serviceItems().find(item => item.domain === "button" && /(?:^|_)calibrate$/.test(item.id));
    const calibrationState = this._serviceItems().find(item => item.domain === "binary_sensor" && /(?:^|_)calibrated$/.test(item.id));
    if (calibrationButton && calibrationState) {
      const button = [...dialog.querySelectorAll("[data-service]")].find(el => el.dataset.service === calibrationButton.id);
      if (button) {
        button.classList.toggle("is-calibrated", calibrationState.state.state === "on");
        button.classList.toggle("is-uncalibrated", calibrationState.state.state === "off");
        button.classList.toggle("is-unknown", !["on","off"].includes(calibrationState.state.state));
      }
    }
    for (const item of this._serviceItems()) {
      const el = [...dialog.querySelectorAll("[data-service]")].find(node => node.dataset.service === item.id);
      const disabled = item.state.state === "unavailable" || (item.domain !== "button" && item.state.state === "unknown");
      if (el) {
        el.disabled = disabled;
        if (item.domain === "switch") {
          const active = item.state.state === "on";
          el.classList.toggle("is-active", active);
          el.title = active ? "Ausschalten" : "Einschalten";
          el.querySelector("ha-icon")?.setAttribute("icon", active ? "mdi:toggle-switch" : "mdi:toggle-switch-off-outline");
        }
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
          background:rgba(55,58,67,.30); backdrop-filter:blur(10px) saturate(1.2); -webkit-backdrop-filter:blur(10px) saturate(1.2); color:var(--primary-text-color);
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
        .service-dialog header { display:flex; align-items:center; gap:12px; font-size:18px; font-weight:600; margin-bottom:16px; }
        .service-dialog header ha-icon { color:#64d2ff; }
        .service-title { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .thermostat-battery { display:flex; flex:0 0 auto; align-items:center; gap:3px; font-size:12px; font-weight:600; white-space:nowrap; }
        .thermostat-battery ha-icon { --mdc-icon-size:21px; }
        .thermostat-battery.good { color:#30d158; }
        .thermostat-battery.medium { color:#ff9f0a; }
        .thermostat-battery.low { color:#ff453a; }
        .thermostat-battery.unknown { color:var(--secondary-text-color,#8e8e93); }
        .service-pair { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
        .service-pair .service-row { min-width:0; display:flex; flex-direction:row; align-items:center; justify-content:space-between; gap:6px; border:1px solid var(--divider-color); border-radius:12px; padding:6px 8px; text-align:left; }
        .service-pair .service-row span:first-child { font-size:12px; overflow-wrap:anywhere; }
        .service-pair .service-toggle { margin:0; flex:0 0 38px; width:38px; height:34px; }
        .service-divider { height:1px; background:rgba(255,255,255,.16); margin:18px 0; }
        .service-caption { font-size:13px; color:var(--secondary-text-color); margin:10px 0; }
        .thermostat-main { display:flex; align-items:center; gap:12px; }
        .thermostat-temperatures { flex:1; min-width:0; text-align:center; }
        .thermostat-power { flex:0 0 54px; width:54px; height:54px; display:grid; place-items:center; border-radius:15px; border:1px solid var(--divider-color); background:rgba(118,118,128,.2); color:#8e8e93; }
        .thermostat-power.is-on { color:#ff453a; border-color:rgba(255,69,58,.4); }
        .thermostat-power ha-icon { --mdc-icon-size:28px; }
        .temperature-control { display:flex; align-items:center; justify-content:space-between; gap:6px; margin:12px 0; }
        .temperature-control strong { white-space:nowrap; font-size:clamp(20px,5vw,30px); font-weight:600; font-variant-numeric:tabular-nums; }
        .temperature-control button { flex:0 0 36px; width:36px; height:36px; border-radius:50%; background:rgba(118,118,128,.20); border:1px solid var(--divider-color); font-size:25px; }
        .temperature-presets { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:6px; }
        .temperature-presets button { min-width:0; padding:10px 2px; border-radius:10px; border:1px solid var(--divider-color); background:rgba(118,118,128,.20); font-size:13px; }
        .temperature-presets button:disabled { opacity:.35; cursor:default; }
        .temperature-presets .preset-max { color:#ff9f0a; }
        .mode-options { display:flex; flex-wrap:wrap; gap:8px; }
        .mode-button { padding:10px 14px; border-radius:12px; border:1px solid var(--divider-color); background:rgba(118,118,128,.20); }
        .mode-button.is-active { border-color:#64d2ff; color:#64d2ff; }
        .service-empty { font-size:12px; color:var(--secondary-text-color); }
        .service-row { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:12px 8px; border-bottom:1px solid var(--divider-color); }
        .service-row span:first-child { font-size:13px; }
        .service-row button,.service-row select,.service-row input { padding:9px; border-radius:10px; background:rgba(118,118,128,.2); color:var(--primary-text-color); border:1px solid var(--divider-color); }
        .service-row .service-toggle { flex:0 0 42px; width:42px; height:38px; padding:0; display:grid; place-items:center; border-radius:12px; }
        .service-toggle ha-icon { --mdc-icon-size:26px; color:var(--secondary-text-color,#8e8e93); }
        .service-toggle.is-active ha-icon { color:var(--home-green,#30d158); }
        .service-toggle.is-calibrated ha-icon { color:#30d158; }
        .service-toggle.is-uncalibrated ha-icon { color:#ff453a; }
        .service-toggle.is-unknown ha-icon { color:var(--secondary-text-color,#8e8e93); }
        .service-toggle:disabled { opacity:.4; cursor:default; }
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
    const dialog = this.shadowRoot.querySelector(".service-dialog");
    if (dialog) {
      dialog.querySelector(".service-title").textContent = this._deviceTitle();
      const step = Number(this._hass?.states?.[this._config.entity]?.attributes?.target_temp_step) > 0
        ? Number(this._hass.states[this._config.entity].attributes.target_temp_step) : 0.5;
      const adjust = direction => {
        const state = this._hass?.states?.[this._config.entity];
        const current = Number(state?.attributes?.temperature);
        if (!Number.isFinite(current)) return;
        const min = Number(state.attributes.min_temp ?? 5), max = Number(state.attributes.max_temp ?? 30);
        this._setTemperature(Math.min(max,Math.max(min,Math.round((current + direction*step)/step)*step)));
      };
      dialog.querySelectorAll("[data-temp-step]").forEach(button =>
        button.addEventListener("click",() => adjust(Number(button.dataset.tempStep))));
      dialog.querySelectorAll("[data-temp-preset]").forEach(button => button.addEventListener("click",() => {
        const state = this._hass?.states?.[this._config.entity];
        if (!state || ["unknown","unavailable"].includes(state.state)) return;
        const isMax = button.dataset.tempPreset === "max";
        const max = Number(state.attributes?.max_temp ?? 30);
        const temperature = isMax ? max : Number(button.dataset.tempPreset);
        if (!Number.isFinite(temperature)) return;
        if (isMax && !window.confirm("Thermostat wirklich auf die maximale Solltemperatur von " + max + " °C stellen?")) return;
        this._setTemperature(temperature);
      }));
      dialog.querySelector(".thermostat-power")?.addEventListener("click",() => {
        const current = this._hass?.states?.[this._config.entity];
        if (current && !["unknown","unavailable"].includes(current.state)) this._setHvacMode(current.state === "off" ? "heat" : "off");
      });
      dialog.querySelectorAll("[data-hvac]").forEach(button =>
        button.addEventListener("click",() => this._setHvacMode(button.dataset.hvac)));
    }
    this.shadowRoot.querySelectorAll("[data-service]").forEach(el => {
      const id = el.dataset.service;
      el.addEventListener(["SELECT","INPUT"].includes(el.tagName) ? "change" : "click", () => this._serviceAction(id, el.value));
    });

  }
}
const atzeThermostatCardTag = ATZE_TESTING_BUILD ? "atze-thermostat-card-testing" : "atze-thermostat-card";
if (!customElements.get(atzeThermostatCardTag)) {
  customElements.define(atzeThermostatCardTag, AtzeThermostatCard);
}


class AtzeFanCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._busy = false;
    this._popupOpen = false;
  }
  setConfig(config) {
    if (!config?.entity?.startsWith("fan.")) throw new Error("Atze Fan Card benötigt eine fan-Entität");
    this._config = config;
    this._render();
  }
  set hass(value) {
    this._hass = value;
    if (this._popupOpen) this._refreshPopup();
    else this._render();
  }
  getCardSize() { return 1; }
  getGridOptions() { return { columns: 6, rows: 1, min_columns: 3 }; }
  _powerId() {
    const stem = this._config.entity?.slice(4)?.replace(/_(fan|filter)$/, "");
    const candidates = [stem?.startsWith("luftfilter_") ? "switch." + stem.slice("luftfilter_".length) + "_luftfilter" : null, "switch." + stem + "_luftfilter", "switch." + stem + "_power"].filter(Boolean);
    return candidates.find(id => this._hass?.states?.[id]) || null;
  }
  _moreInfo() {
    this.dispatchEvent(new CustomEvent("hass-more-info", {
      bubbles: true, composed: true, detail: { entityId: this._config.entity },
    }));
  }
  async _togglePower() {
    const id = this._powerId();
    const state = id && this._hass?.states?.[id];
    if (this._busy || !state || !["on", "off"].includes(state.state)) return;
    this._busy = true;
    try {
      await this._hass.callService("switch", state.state === "on" ? "turn_off" : "turn_on", { entity_id: id });
    } catch (error) {
      console.error("Atze Fan Card: Stromversorgung fehlgeschlagen", error);
    } finally {
      this._busy = false;
      this._refreshPopup();
    }
  }
  async _toggle() {
    if (this._busy || !this._hass) return;
    const id = this._config.entity;
    const state = this._hass.states[id];
    const powerId = this._powerId();
    if (this._hass.states[powerId]?.state === "off" || !state || !["on", "off"].includes(state.state)) return;
    this._busy = true;
    try {
      await this._hass.callService("fan", state.state === "on" ? "turn_off" : "turn_on", { entity_id: id });
    } catch (error) {
      console.error("Atze Fan Card: Steuerung fehlgeschlagen", error);
    } finally {
      this._busy = false;
    }
  }

  _related(domain, suffix) {
    const fanId = this._config.entity || "";
    const stem = fanId.replace(/^fan\./, "").replace(/_(fan|filter)$/, "");
    const id = domain + "." + stem + "_" + suffix;
    return this._hass?.states?.[id] ? id : null;
  }
  _field(domain, suffix) {
    const id = this._related(domain, suffix);
    return id ? this._hass.states[id] : null;
  }
  _displayNumber(value) {
    const raw = String(value ?? "").trim();
    if (!raw || !/^-?\d+(?:[.,]\d+)?$/.test(raw)) return raw || "–";
    const number = Number(raw.replace(",", "."));
    return Number.isFinite(number)
      ? number.toLocaleString("de-DE", {maximumFractionDigits: 1})
      : raw;
  }
  _format(domain, suffix, fallback = "–") {
    const state = this._field(domain, suffix);
    return state && !["unknown", "unavailable"].includes(state.state) ? this._displayNumber(state.state) : fallback;
  }
  async _set(domain, suffix, value) {
    const id = this._related(domain, suffix);
    if (!id || !this._hass) return;
    try {
      if (domain === "switch") await this._hass.callService("switch", value ? "turn_on" : "turn_off", {entity_id:id});
      if (domain === "select") await this._hass.callService("select", "select_option", {entity_id:id, option:value});
      if (domain === "number") await this._hass.callService("number", "set_value", {entity_id:id, value:Number(value)});
    } catch (error) { console.error("Atze Fan Popup: Aktion fehlgeschlagen", error); }
  }
  _operatingMode() {
    return this._field("select", "fan_operating_mode")?.state || "";
  }
  _modeOption(mode) {
    const options = this._field("select", "fan_operating_mode")?.attributes?.options || [];
    return options.find(option => String(option).toLowerCase() === mode.toLowerCase())
      || options.find(option => String(option).toLowerCase().includes(mode.toLowerCase()));
  }
  _remainingTimer() {
    const remaining = this._field("sensor", "timer_remaining")?.state;
    if (!remaining || ["unknown", "unavailable", "off", "none", "0", "00:00", "00:00:00"].includes(String(remaining).toLowerCase())) return "Aus";
    return remaining;
  }
  async _setMode(mode) {
    const option = this._modeOption(mode);
    if (option) await this._set("select", "fan_operating_mode", option);
  }
  async _setSpeed(level) {
    if (!this._hass) return;
    try {
      if (level === 0) {
        await this._hass.callService("fan", "turn_off", {entity_id:this._config.entity});
      } else {
        await this._setMode("Manual");
        await this._hass.callService("fan", "set_percentage", {
          entity_id:this._config.entity, percentage:[0,33,66,100][level],
        });
      }
    } catch(error) { console.error("Atze Fan Popup: Geschwindigkeit fehlgeschlagen",error); }
  }
  async _setTimer(minutes) {
    const timerId = this._related("number", "timer") || this._related("number", "timer_min");
    if (!timerId || !this._hass) {
      console.warn("Atze Fan Popup: Timer-Entität nicht gefunden");
      return;
    }
    try {
      await this._hass.callService("number", "set_value", {entity_id:timerId, value:minutes});
    } catch (error) { console.error("Atze Fan Popup: Timer fehlgeschlagen", error); }
  }
  _refreshPopup() {
    const dialog = this.shadowRoot?.querySelector(".fan-dialog");
    if (!dialog) return;
    const values = {
      pm25:this._format("sensor","aq_pm_2_5"),
      filter:this._format("sensor","filter") + " %",
      remaining:this._remainingTimer(),
    };
    for (const [key,value] of Object.entries(values)) {
      const el = dialog.querySelector('[data-value="' + key + '"]');
      if (el) el.textContent = value;
    }
    const fan = this._hass?.states?.[this._config.entity];
    const power = this._powerId() && this._hass?.states?.[this._powerId()];
    const powerButton = dialog.querySelector("[data-fan-power]");
    if (powerButton) {
      powerButton.classList.toggle("is-active", power?.state === "on");
      powerButton.disabled = !power || !["on","off"].includes(power.state);
    }
    const mode = this._operatingMode().toLowerCase();
    dialog.querySelectorAll("[data-mode]").forEach(el => {
      el.classList.toggle("is-active", mode.includes(el.dataset.mode.toLowerCase()));
    });
    const percent = Number(fan?.attributes?.percentage);
    const level = fan?.state === "off" ? 0 : percent > 0 ? (percent <= 34 ? 1 : percent <= 67 ? 2 : 3) : -1;
    dialog.querySelectorAll("[data-speed]").forEach(el => el.classList.toggle("is-active", Number(el.dataset.speed) === level && (level === 0 || mode.includes("manual"))));
    const autoRow = dialog.querySelector("[data-auto-row]");
    if (autoRow) autoRow.hidden = !mode.includes("auto");
    for (const suffix of ["child_lock","display"]) {
      const el = dialog.querySelector('[data-switch="' + suffix + '"]');
      if (el) el.checked = this._field("switch",suffix)?.state === "on";
    }
    const select = dialog.querySelector('[data-select="auto_mode"]');
    if (select && this.shadowRoot.activeElement !== select) {
      const value = this._field("select","auto_mode")?.state;
      if ([...select.options].some(option=>option.value===value)) select.value=value;
    }
  }
  _lockScroll() {
    if (this._scrollCleanup) return;
    const prevent = event => {
      if (this._popupOpen && !event.target.closest?.(".fan-dialog")) event.preventDefault();
    };
    document.addEventListener("touchmove", prevent, {passive:false});
    document.addEventListener("wheel", prevent, {passive:false});
    this._scrollCleanup = () => {
      document.removeEventListener("touchmove", prevent);
      document.removeEventListener("wheel", prevent);
    };
  }
  _openPopup() { this._popupOpen = true; this._lockScroll(); this._render(); }
  _closePopup() {
    this._popupOpen = false;
    this._scrollCleanup?.();
    this._scrollCleanup = null;
    this._render();
  }
  disconnectedCallback() {
    this._scrollCleanup?.();
    this._scrollCleanup = null;
  }
  _popupMarkup() {
    const fan = this._hass?.states?.[this._config.entity];
    const registryEntity = this._hass?.entities?.[this._config.entity];
    const device = registryEntity?.device_id ? this._hass?.devices?.[registryEntity.device_id] : null;
    const title = device?.name_by_user || device?.name || this._config.name || fan?.attributes?.friendly_name || "Luftreiniger";
    const esc = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    const tile = (icon,name,value,key) => `<div class="fan-tile"><ha-icon icon="${icon}"></ha-icon><div><small>${name}</small><strong data-value="${key}">${esc(value)}</strong></div></div>`;
    const mode = this._operatingMode().toLowerCase();
    const modes = [["Auto","mdi:autorenew"],["Manual","mdi:tune-vertical"],["Sleep","mdi:weather-night"]];
    const modeButtons = modes.map(([name,icon]) => this._modeOption(name)
      ? `<button class="fan-choice ${mode.includes(name.toLowerCase())?"is-active":""}" data-mode="${name}"><ha-icon icon="${icon}"></ha-icon><span>${name==="Manual"?"Manuell":name}</span></button>` : "").join("");
    const percent = Number(fan?.attributes?.percentage);
    const level = fan?.state==="off" ? 0 : percent>0 ? (percent<=34?1:percent<=67?2:3) : -1;
    const speedButtons = [["Aus","mdi:power"],["Niedrig","mdi:fan-speed-1"],["Mittel","mdi:fan-speed-2"],["Hoch","mdi:fan-speed-3"]]
      .map(([name,icon],index)=>`<button class="fan-choice ${level===index&&(index===0||mode.includes("manual"))?"is-active":""}" data-speed="${index}"><ha-icon icon="${icon}"></ha-icon><span>${name}</span></button>`).join("");
    const autoEntity = this._field("select","auto_mode");
    const autoSelect = autoEntity ? `<div class="fan-row" data-auto-row ${mode.includes("auto")?"":"hidden"}><span>Auto-Modus</span><select data-select="auto_mode">${(autoEntity.attributes.options||[]).map(option=>`<option value="${esc(option)}" ${option===autoEntity.state?"selected":""}>${esc(option)}</option>`).join("")}</select></div>` : "";
    const toggle = (suffix,label,icon) => {
      const entity = this._field("switch",suffix);
      return entity ? `<label class="fan-row"><span><ha-icon icon="${icon}"></ha-icon>${label}</span><input type="checkbox" data-switch="${suffix}" ${entity.state==="on"?"checked":""}></label>` : "";
    };
    const powerId = this._powerId();
    const powerState = powerId && this._hass?.states?.[powerId];
    const powerButton = `<button class="fan-popup-power ${powerState?.state==="on"?"is-active":""}" data-fan-power aria-label="Stromversorgung" title="Stromversorgung" ${!powerId?"disabled":""}><ha-icon icon="mdi:power"></ha-icon></button>`;
    const timerButtons = [[60,"1 h"],[120,"2 h"],[480,"8 h"],[720,"12 h"]].map(([minutes,label])=>
      `<button class="fan-choice" data-timer="${minutes}"><ha-icon icon="mdi:clock-outline"></ha-icon><span>${label}</span></button>`).join("");
    return `<div class="fan-overlay"><section class="fan-dialog" role="dialog" aria-modal="true" aria-label="Luftreiniger">
      <header><ha-icon icon="mdi:air-filter"></ha-icon><span>${esc(title)}</span>${powerButton}</header>\n      <div class="fan-header-divider" aria-hidden="true"></div>
      <div class="fan-grid">
        ${tile("mdi:blur","PM2.5",this._format("sensor","aq_pm_2_5"),"pm25")}
        ${tile("mdi:air-filter","Filter",this._format("sensor","filter")+" %","filter")}
      </div>
      <div class="fan-heading">Betriebsmodus</div><div class="fan-options fan-three">${modeButtons}</div>
      <div class="fan-heading">Lüftergeschwindigkeit</div><div class="fan-options fan-four">${speedButtons}</div>
      ${autoSelect}
      ${toggle("child_lock","Kindersicherung","mdi:lock-outline")}
      ${toggle("display","Display","mdi:monitor")}
      <div class="fan-heading fan-timer-heading">Timer</div><div class="fan-options fan-four">${timerButtons}</div>
      <div class="fan-row fan-remaining"><span><ha-icon icon="mdi:clock-outline"></ha-icon>Rest Timer</span><strong data-value="remaining">${esc(this._remainingTimer())}</strong></div>
    </section></div>`;
  }
  _bindPopup() {
    const overlay = this.shadowRoot.querySelector(".fan-overlay");
    if (!overlay) return;
    overlay.addEventListener("click",event=>{if(event.target===overlay)this._closePopup();});
    overlay.querySelector("[data-fan-power]")?.addEventListener("click",()=>{
      const id=this._powerId(),state=id&&this._hass?.states?.[id];
      if(!state||!["on","off"].includes(state.state))return;
      if(window.confirm(state.state==="on"?"Stromversorgung des Luftfilters wirklich ausschalten?":"Stromversorgung des Luftfilters wirklich einschalten?"))this._togglePower();
    });
    overlay.querySelectorAll("[data-mode]").forEach(el=>el.addEventListener("click",()=>this._setMode(el.dataset.mode)));
    overlay.querySelectorAll("[data-speed]").forEach(el=>el.addEventListener("click",()=>this._setSpeed(Number(el.dataset.speed))));
    overlay.querySelectorAll("[data-timer]").forEach(el=>el.addEventListener("click",()=>this._setTimer(Number(el.dataset.timer))));
    overlay.querySelectorAll("[data-switch]").forEach(el=>el.addEventListener("change",()=>this._set("switch",el.dataset.switch,el.checked)));
    overlay.querySelectorAll("[data-select]").forEach(el=>el.addEventListener("change",()=>this._set("select",el.dataset.select,el.value)));
  }
  _render() {
    if (!this._config.entity) return;
    const id = this._config.entity;
    const state = this._hass?.states[id];
    const powerId = this._powerId();
    const power = powerId && this._hass?.states?.[powerId];
    const powerOff = power?.state === "off";
    const unavailable = !state || !["on", "off"].includes(state.state);
    const active = state?.state === "on";
    const name = this._config.name || state?.attributes?.friendly_name || id;
    const percent = Number(state?.attributes?.percentage);
    const hasPercent = state?.attributes?.percentage != null && Number.isFinite(percent);
    const mode = state?.attributes?.preset_mode;
    const status = powerOff ? "Stromversorgung aus" : unavailable ? "Nicht verfügbar" : active
      ? (mode && !["manual", "normal"].includes(String(mode).trim().toLowerCase()) ? String(mode) : (hasPercent ? Math.round(percent) + " %" : "Ein"))
      : "Aus";
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; min-width:0; }
        ha-card { box-sizing:border-box; height:56px; min-width:0; display:flex; align-items:center; gap:10px;
          padding:10px 12px; border-radius:15px; border:1px solid var(--home-card-border, rgba(255,255,255,.10));
          background:rgba(55,58,67,.30); backdrop-filter:blur(10px) saturate(1.2); -webkit-backdrop-filter:blur(10px) saturate(1.2); color:var(--primary-text-color); overflow:hidden; box-shadow:none; }
        button { appearance:none; border:0; cursor:pointer; font:inherit; color:inherit; }
        .control,.settings,.power { width:38px; height:38px; flex:0 0 38px; display:grid; place-items:center;
          border:1px solid var(--home-card-border, rgba(255,255,255,.10)); border-radius:13px;
          background:rgba(118,118,128,.20); }
        .control ha-icon { --mdc-icon-size:23px; color:${active && !powerOff ? "#64D2FF" : "var(--secondary-text-color, #8e8e93)"}; }
        .power ha-icon { --mdc-icon-size:23px; color:${power?.state === "on" ? "#30D158" : "var(--secondary-text-color, #8e8e93)"}; }
        .settings ha-icon { --mdc-icon-size:23px; }
        .details { flex:1; min-width:0; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; font-size:14px; font-weight:500; text-align:left; padding:0; background:transparent; border:0; }
        .status { flex-shrink:0; color:var(--secondary-text-color); font-size:12px; padding:0; background:transparent; border:0; }
        button:disabled { opacity:.4; cursor:default; }
        .details,.status { cursor:pointer; }
        .fan-overlay { position:fixed; inset:0; z-index:1000; display:flex; align-items:center; justify-content:center; padding:18px; box-sizing:border-box; background:rgba(0,0,0,.65); }
        .fan-dialog { box-sizing:border-box; width:min(430px,100%); max-height:85vh; overflow:auto; padding:22px; border-radius:22px; border:1px solid rgba(255,255,255,.17); background:rgba(38,40,46,.94); backdrop-filter:blur(22px); color:#fff; box-shadow:0 18px 55px rgba(0,0,0,.4); }
        .fan-dialog header { display:flex; align-items:center; gap:12px; font-weight:600; font-size:18px; margin-bottom:16px; }\n        .fan-header-divider { height:1px; background:rgba(255,255,255,.16); margin-bottom:20px; }
        .fan-popup-power { margin-left:auto; flex:0 0 46px; height:46px; border-radius:50%; border:1px solid rgba(255,255,255,.2); background:rgba(255,255,255,.08); color:#aaa; }
        .fan-popup-power.is-active { background:rgba(100,210,255,.16); color:#64d2ff; border-color:#64d2ff; }
        .fan-heading { font-size:14px; font-weight:600; margin:16px 0 9px; }
        .fan-options { display:grid; gap:8px; }
        .fan-three { grid-template-columns:repeat(3,minmax(0,1fr)); }
        .fan-four { grid-template-columns:repeat(4,minmax(0,1fr)); }
        .fan-choice { min-width:0; min-height:66px; padding:6px 3px; border-radius:14px; border:1px solid rgba(255,255,255,.17); background:rgba(255,255,255,.07); color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; font-size:11px; }
        .fan-choice ha-icon { --mdc-icon-size:26px; color:#bec2cc; }
        .fan-choice.is-active { border-color:#64d2ff; background:rgba(20,107,153,.35); }
        .fan-choice.is-active ha-icon { color:#64d2ff; }
        .fan-row[hidden] { display:none; }
        .fan-row > span:first-child { display:flex; align-items:center; gap:10px; }
        .fan-timer-heading { margin-top:0; padding-top:0; }
        .fan-remaining strong { font-size:14px; font-weight:500; }
        .fan-dialog header ha-icon { color:#64d2ff; }
        .fan-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-bottom:16px; }
        .fan-tile { display:flex; gap:10px; align-items:center; min-width:0; padding:13px 10px; border-radius:14px; background:rgba(255,255,255,.07); }
        .fan-tile ha-icon { color:#64d2ff; flex-shrink:0; }
        .fan-tile small { display:block; opacity:.7; font-size:11px; }
        .fan-tile strong { display:block; font-size:15px; overflow-wrap:anywhere; }
        .fan-row { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 0; font-size:14px; }
        .fan-row select,.fan-row input[type=number] { max-width:55%; min-width:0; border-radius:10px; padding:8px; color:inherit; background:#35373e; border:1px solid rgba(255,255,255,.18); }
        .fan-row input[type=checkbox] { width:20px; height:20px; accent-color:#64d2ff; }
      </style>
      <ha-card>
        <button class="control" type="button" aria-label="Luftreiniger ein- oder ausschalten" ${unavailable || powerOff ? "disabled" : ""}><ha-icon icon="mdi:air-filter"></ha-icon></button>
        <button class="details" type="button" aria-label="Luftreiniger-Details öffnen" title="Luftreiniger-Details öffnen"></button>
        <button class="status" type="button" aria-label="Luftreiniger-Details öffnen" title="Luftreiniger-Details öffnen"></button>
        <button class="settings" type="button" aria-label="Luftreiniger-Einstellungen" title="Luftreiniger-Einstellungen"><ha-icon icon="mdi:tune"></ha-icon></button>
      </ha-card>${this._popupOpen ? this._popupMarkup() : ""}`;
    const details = this.shadowRoot.querySelector(".details");
    details.textContent = name;
    details.title = name;
    this.shadowRoot.querySelector(".status").textContent = status;
    this.shadowRoot.querySelector(".control").addEventListener("click", () => this._toggle());
    this.shadowRoot.querySelector(".settings").addEventListener("click", () => this._moreInfo());
    this.shadowRoot.querySelector(".details").addEventListener("click", () => this._openPopup());
    this.shadowRoot.querySelector(".status").addEventListener("click", () => this._openPopup());
    this._bindPopup();
  }
}
const atzeFanCardTag = ATZE_TESTING_BUILD ? "atze-fan-card-testing" : "atze-fan-card";
if (!customElements.get(atzeFanCardTag)) {
  customElements.define(atzeFanCardTag, AtzeFanCard);
}

class AtzeMediaCard extends HTMLElement {
  constructor() { super(); this.attachShadow({mode:"open"}); this._config={}; this._busy=false; }
  setConfig(config) { if (!config?.entity?.startsWith("media_player.")) throw new Error("media_player benötigt"); this._config=config; this._render(); }
  set hass(value) { this._hass=value; this._render(); }
  getCardSize() { return 1; }
  getGridOptions() { return {columns:12,rows:1,min_columns:6}; }
  _moreInfo() { this.dispatchEvent(new CustomEvent("hass-more-info",{bubbles:true,composed:true,detail:{entityId:this._config.entity}})); }
  async _toggle() {
    if(this._busy||!this._hass)return;
    const state=this._hass.states[this._config.entity];
    if(!state||["unknown","unavailable"].includes(state.state))return;
    const playing=state.state==="playing",features=Number(state.attributes?.supported_features||0);
    if(!(features & (playing?1:16384))) { this._moreInfo(); return; }
    this._busy=true;
    try { await this._hass.callService("media_player",playing?"media_pause":"media_play",{entity_id:this._config.entity}); }
    catch(e) { console.error("Atze Media Card",e); }
    finally { this._busy=false; }
  }
  _render() {
    if(!this._config.entity)return;
    const state=this._hass?.states[this._config.entity],playing=state?.state==="playing";
    const features=Number(state?.attributes?.supported_features||0);
    const canToggle=state&&!["unavailable","unknown"].includes(state.state)&&Boolean(features&(playing?1:16384));
    const name=this._config.name||state?.attributes?.friendly_name||this._config.entity;
    const status=playing&&state?.attributes?.media_title?[state.attributes.media_title,state.attributes.media_artist].filter(Boolean).join(" · "):
      ({playing:"Wiedergabe",paused:"Pausiert",idle:"Bereit",off:"Aus",standby:"Standby"})[state?.state]||(state?.state||"Nicht verfügbar");
    this.shadowRoot.innerHTML=`
      <style>
        :host{display:block;min-width:0}
        ha-card{box-sizing:border-box;height:56px;min-width:0;display:flex;align-items:center;gap:10px;padding:7px 12px;border-radius:15px;border:1px solid var(--home-card-border,rgba(255,255,255,.10));background:rgba(55,58,67,.30);backdrop-filter:blur(10px) saturate(1.2);-webkit-backdrop-filter:blur(10px) saturate(1.2);color:var(--primary-text-color);overflow:hidden;box-shadow:none}
        button{appearance:none;border:0;cursor:pointer;font:inherit;color:inherit}
        .control,.settings{width:38px;height:38px;flex:0 0 38px;display:grid;place-items:center;border:1px solid var(--home-card-border,rgba(255,255,255,.10));border-radius:13px;background:rgba(118,118,128,.20)}
        .control ha-icon{--mdc-icon-size:23px;color:${playing?"#BF5AF2":"var(--secondary-text-color,#8e8e93)"}}
        .settings ha-icon{--mdc-icon-size:23px}
        .details{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;text-align:left;padding:0;background:transparent}
        .name{font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .status{font-size:11px;color:var(--secondary-text-color);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      </style>
      <ha-card><button class="control" type="button" aria-label="Wiedergabe"><ha-icon icon="${playing?"mdi:pause":"mdi:play"}"></ha-icon></button><button class="details" type="button" aria-label="Medien-Details"><span class="name"></span><span class="status"></span></button><button class="settings" type="button" aria-label="Medien-Einstellungen"><ha-icon icon="mdi:tune"></ha-icon></button></ha-card>`;
    this.shadowRoot.querySelector(".name").textContent=name;
    this.shadowRoot.querySelector(".status").textContent=status;
    const control=this.shadowRoot.querySelector(".control");
    control.disabled=!canToggle;
    if(!canToggle)control.style.opacity=".45";
    control.addEventListener("click",()=>this._toggle());
    this.shadowRoot.querySelector(".details").addEventListener("click",()=>this._moreInfo());
    this.shadowRoot.querySelector(".settings").addEventListener("click",()=>this._moreInfo());
  }
}
const atzeMediaCardTag=ATZE_TESTING_BUILD?"atze-media-card-testing":"atze-media-card";
if(!customElements.get(atzeMediaCardTag))customElements.define(atzeMediaCardTag,AtzeMediaCard);

class AtzeSwitchCard extends HTMLElement {
  constructor() { super(); this.attachShadow({mode:"open"}); this._config={}; this._busy=false; }
  setConfig(config) {
    if (!config?.entity || !/^(switch|input_boolean)\./.test(config.entity)) throw new Error("Atze Switch Card benötigt eine Schalter-Entität");
    this._config=config; this._render();
  }
  set hass(value) { this._hass=value; this._render(); }
  getCardSize() { return 1; }
  getGridOptions() { return {columns:6,rows:1,min_columns:3}; }
  _moreInfo() {
    this.dispatchEvent(new CustomEvent("hass-more-info",{bubbles:true,composed:true,detail:{entityId:this._config.entity}}));
  }
  async _toggle() {
    if(this._busy||!this._hass)return;
    const id=this._config.entity,entity=this._hass.states[id];
    if(!entity||!["on","off"].includes(entity.state))return;
    this._busy=true;
    try { await this._hass.callService(id.split(".")[0],"toggle",{entity_id:id}); }
    catch(e) { console.error("Atze Switch Card: Schalten fehlgeschlagen",e); }
    finally { this._busy=false; }
  }
  _render() {
    if(!this._config.entity)return;
    const id=this._config.entity,entity=this._hass?.states[id];
    const active=entity?.state==="on",available=entity&&["on","off"].includes(entity.state);
    const name=this._config.name||entity?.attributes?.friendly_name||id;
    const icon=active?"mdi:toggle-switch":"mdi:toggle-switch-off-outline";
    this.shadowRoot.innerHTML=`
      <style>
        :host{display:block;min-width:0}
        ha-card{box-sizing:border-box;height:56px;min-width:0;display:flex;align-items:center;gap:10px;padding:7px 12px;border-radius:15px;border:1px solid var(--home-card-border,rgba(255,255,255,.10));background:rgba(55,58,67,.30);backdrop-filter:blur(10px) saturate(1.2);-webkit-backdrop-filter:blur(10px) saturate(1.2);color:var(--primary-text-color);overflow:hidden;box-shadow:none}
        button{appearance:none;border:0;cursor:pointer;font:inherit;color:inherit}
        .control,.settings{width:38px;height:38px;flex:0 0 38px;display:grid;place-items:center;border:1px solid var(--home-card-border,rgba(255,255,255,.10));border-radius:13px;background:rgba(118,118,128,.20)}
        .control ha-icon{--mdc-icon-size:23px;color:${active?"#0A84FF":"var(--secondary-text-color,#8e8e93)"}}
        .settings ha-icon{--mdc-icon-size:23px}
        .details{flex:1;min-width:0;overflow:hidden;display:flex;flex-direction:column;gap:2px;text-align:left;padding:0;background:transparent}
        .name{font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .status{font-size:11px;color:var(--secondary-text-color);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        button:disabled{opacity:.4;cursor:default}
      </style>
      <ha-card>
        <button class="control" type="button" aria-label="Schalter umschalten"><ha-icon></ha-icon></button>
        <button class="details" type="button" aria-label="Schalter-Details"><span class="name"></span><span class="status"></span></button>
        <button class="settings" type="button" aria-label="Schalter-Einstellungen"><ha-icon icon="mdi:tune"></ha-icon></button>
      </ha-card>`;
    this.shadowRoot.querySelector(".control ha-icon").setAttribute("icon",icon);
    this.shadowRoot.querySelector(".name").textContent=name;
    this.shadowRoot.querySelector(".status").textContent=!available?"Nicht verfügbar":active?"Ein":"Aus";
    const control=this.shadowRoot.querySelector(".control");
    control.disabled=!available;
    control.addEventListener("click",()=>this._toggle());
    this.shadowRoot.querySelector(".details").addEventListener("click",()=>this._moreInfo());
    this.shadowRoot.querySelector(".settings").addEventListener("click",()=>this._moreInfo());
  }
}
const atzeSwitchCardTag=ATZE_TESTING_BUILD?"atze-switch-card-testing":"atze-switch-card";
if(!customElements.get(atzeSwitchCardTag))customElements.define(atzeSwitchCardTag,AtzeSwitchCard);

class AtzeActionCard extends HTMLElement {
  constructor(){super();this.attachShadow({mode:"open"});this._config={};this._busy=false;}
  setConfig(config){
    if(!config?.entity||!/^(automation|scene|script)\./.test(config.entity))throw new Error("Atze Action Card benötigt automation, scene oder script");
    this._config=config;this._render();
  }
  set hass(value){this._hass=value;this._render();}
  getCardSize(){return 1;}
  getGridOptions(){return {columns:6,rows:1,min_columns:3};}
  _moreInfo(){this.dispatchEvent(new CustomEvent("hass-more-info",{bubbles:true,composed:true,detail:{entityId:this._config.entity}}));}
  async _activate(){
    if(this._busy||!this._hass)return;
    const id=this._config.entity,domain=id.split(".")[0],entity=this._hass.states[id];
    if(!entity||["unknown","unavailable"].includes(entity.state))return;
    const service=domain==="automation"?"toggle":domain==="scene"?"turn_on":"turn_on";
    this._busy=true;
    try{await this._hass.callService(domain,service,{entity_id:id});}
    catch(e){console.error("Atze Action Card: Aktion fehlgeschlagen",e);}
    finally{this._busy=false;}
  }
  _render(){
    if(!this._config.entity)return;
    const id=this._config.entity,domain=id.split(".")[0],entity=this._hass?.states[id];
    const available=Boolean(entity)&&!["unknown","unavailable"].includes(entity.state);
    const active=entity?.state==="on";
    const name=this._config.name||entity?.attributes?.friendly_name||id;
    const icon=this._config.icon||entity?.attributes?.icon||({automation:"mdi:robot",scene:"mdi:palette",script:"mdi:script-text"})[domain];
    const status=!available?"Nicht verfügbar":domain==="automation"?(active?"Aktiv":"Deaktiviert"):domain==="script"?(active?"Läuft":"Bereit"):"Aktivieren";
    const controlIcon=domain==="automation"?(active?"mdi:toggle-switch":"mdi:toggle-switch-off-outline"):domain==="scene"?"mdi:play":"mdi:play";
    this.shadowRoot.innerHTML=`
      <style>
        :host{display:block;min-width:0}
        ha-card{box-sizing:border-box;height:56px;min-width:0;display:flex;align-items:center;gap:10px;padding:7px 12px;border-radius:15px;border:1px solid var(--home-card-border,rgba(255,255,255,.10));background:rgba(55,58,67,.30);backdrop-filter:blur(10px) saturate(1.2);-webkit-backdrop-filter:blur(10px) saturate(1.2);color:var(--primary-text-color);overflow:hidden;box-shadow:none}
        button{appearance:none;border:0;cursor:pointer;font:inherit;color:inherit}
        .control,.settings{width:38px;height:38px;flex:0 0 38px;display:grid;place-items:center;border:1px solid var(--home-card-border,rgba(255,255,255,.10));border-radius:13px;background:rgba(118,118,128,.20)}
        .control ha-icon{--mdc-icon-size:23px;color:${domain==="automation"&&active?"#30D158":domain==="scene"?"#BF5AF2":"#0A84FF"}}
        .settings ha-icon{--mdc-icon-size:23px}
        .details{flex:1;min-width:0;overflow:hidden;display:flex;flex-direction:column;gap:2px;text-align:left;padding:0;background:transparent}
        .name{font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .status{font-size:11px;color:var(--secondary-text-color);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        button:disabled{opacity:.4;cursor:default}
      </style>
      <ha-card>
        <button class="control" type="button" aria-label="${domain==="automation"?"Automation umschalten":"Aktion ausführen"}"><ha-icon icon="${controlIcon}"></ha-icon></button>
        <button class="details" type="button" aria-label="Details öffnen"><span class="name"></span><span class="status"></span></button>
        <button class="settings" type="button" aria-label="Einstellungen öffnen"><ha-icon icon="mdi:tune"></ha-icon></button>
      </ha-card>`;
    this.shadowRoot.querySelector(".name").textContent=name;
    this.shadowRoot.querySelector(".status").textContent=status;
    const control=this.shadowRoot.querySelector(".control");control.disabled=!available;
    control.addEventListener("click",()=>this._activate());
    this.shadowRoot.querySelector(".details").addEventListener("click",()=>this._moreInfo());
    this.shadowRoot.querySelector(".settings").addEventListener("click",()=>this._moreInfo());
  }
}
const atzeActionCardTag=ATZE_TESTING_BUILD?"atze-action-card-testing":"atze-action-card";
if(!customElements.get(atzeActionCardTag))customElements.define(atzeActionCardTag,AtzeActionCard);

class AtzeLockCard extends HTMLElement {
  constructor(){super();this.attachShadow({mode:"open"});this._config={};this._busy=false;}
  setConfig(config){if(!config?.entity?.startsWith("lock."))throw new Error("Atze Lock Card benötigt eine lock-Entität");this._config=config;this._render();}
  set hass(value){this._hass=value;this._render();}
  getCardSize(){return 1;}
  getGridOptions(){return {columns:12,rows:1,min_columns:6};}
  _moreInfo(){this.dispatchEvent(new CustomEvent("hass-more-info",{bubbles:true,composed:true,detail:{entityId:this._config.entity}}));}
  async _toggle(){
    if(this._busy||!this._hass)return;
    const id=this._config.entity,state=this._hass.states[id]?.state;
    if(!["locked","unlocked"].includes(state))return;
    const unlocking=state==="locked";
    if(unlocking&&!window.confirm("Tür wirklich entriegeln?"))return;
    this._busy=true;
    try{await this._hass.callService("lock",unlocking?"unlock":"lock",{entity_id:id});}
    catch(e){console.error("Atze Lock Card: Schaltvorgang fehlgeschlagen",e);}
    finally{this._busy=false;}
  }
  _render(){
    if(!this._config.entity)return;
    const id=this._config.entity,entity=this._hass?.states[id],state=entity?.state||"unavailable";
    const name=this._config.name||entity?.attributes?.friendly_name||id;
    const statuses={locked:"Verriegelt",unlocked:"Entriegelt",locking:"Verriegelt …",unlocking:"Entriegelt …",jammed:"Blockiert",opening:"Öffnet …",open:"Offen",unavailable:"Nicht verfügbar",unknown:"Unbekannt"};
    const icon=this._config.icon||entity?.attributes?.icon||(state==="locked"?"mdi:lock":"mdi:lock-open-variant");
    const enabled=["locked","unlocked"].includes(state);
    const iconColor=state==="locked"?"#30D158":state==="unlocked"?"#FF9F0A":"var(--secondary-text-color)";
    this.shadowRoot.innerHTML=`
      <style>
        :host{display:block;min-width:0}
        ha-card{box-sizing:border-box;height:56px;min-width:0;display:flex;align-items:center;gap:10px;padding:7px 12px;border-radius:15px;border:1px solid var(--home-card-border,rgba(255,255,255,.10));background:rgba(55,58,67,.30);backdrop-filter:blur(10px) saturate(1.2);-webkit-backdrop-filter:blur(10px) saturate(1.2);color:var(--primary-text-color);overflow:hidden;box-shadow:none}
        button{appearance:none;border:0;cursor:pointer;font:inherit;color:inherit}
        .control,.settings{width:38px;height:38px;flex:0 0 38px;display:grid;place-items:center;border:1px solid var(--home-card-border,rgba(255,255,255,.10));border-radius:13px;background:rgba(118,118,128,.20)}
        .control ha-icon{--mdc-icon-size:23px;color:${iconColor}}
        .settings ha-icon{--mdc-icon-size:23px}
        .details{flex:1;min-width:0;overflow:hidden;display:flex;flex-direction:column;gap:2px;text-align:left;padding:0;background:transparent;cursor:default;pointer-events:none}
        .name{font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .status{font-size:11px;color:var(--secondary-text-color);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        button:disabled{opacity:.5;cursor:default}
      </style>
      <ha-card>
        <button class="control" type="button" aria-label="${state==="locked"?"Tür entriegeln":"Tür verriegeln"}"><ha-icon></ha-icon></button>
        <div class="details"><span class="name"></span><span class="status"></span></div>
        <button class="settings" type="button" aria-label="Schlosseinstellungen"><ha-icon icon="mdi:tune"></ha-icon></button>
      </ha-card>`;
    this.shadowRoot.querySelector(".control ha-icon").setAttribute("icon",icon);
    this.shadowRoot.querySelector(".name").textContent=name;
    this.shadowRoot.querySelector(".status").textContent=statuses[state]||state;
    const control=this.shadowRoot.querySelector(".control");control.disabled=!enabled;
    control.addEventListener("click",()=>this._toggle());
    this.shadowRoot.querySelector(".settings").addEventListener("click",()=>this._moreInfo());
  }
}
const atzeLockCardTag=ATZE_TESTING_BUILD?"atze-lock-card-testing":"atze-lock-card";
if(!customElements.get(atzeLockCardTag))customElements.define(atzeLockCardTag,AtzeLockCard);

class AtzePopupCard extends HTMLElement {
  constructor(){
    super();this.attachShadow({mode:"open"});
    this._config={};this._hass=null;
    this._onNavigation=()=>this._syncOpen();
  }
  setConfig(config){
    if(!config?.hash)throw new Error("Atze Popup benötigt hash");
    this._config=config;this._render();
  }
  set hass(value){
    this._hass=value;
    for(const card of this.shadowRoot?.querySelectorAll("hui-card"))card.hass=value;
  }
  getCardSize(){return 0;}
  connectedCallback(){
    window.addEventListener("hashchange",this._onNavigation);
    window.addEventListener("popstate",this._onNavigation);
    this._syncOpen();
  }
  disconnectedCallback(){
    window.removeEventListener("hashchange",this._onNavigation);
    window.removeEventListener("popstate",this._onNavigation);
  }
  _syncOpen(){
    const overlay=this.shadowRoot?.querySelector(".atze-popup-overlay");
    if(!overlay)return;
    const open=window.location.hash===this._config.hash;
    overlay.hidden=!open;
    if(open)overlay.querySelector(".atze-popup-dialog")?.focus({preventScroll:true});
  }
  _close(){
    if(window.location.hash!==this._config.hash)return;
    const url=window.location.pathname+window.location.search;
    window.history.replaceState(window.history.state,"",url);
    this._syncOpen();
    window.dispatchEvent(new Event("hashchange"));
  }
  _render(){
    if(!this._config.hash)return;
    this.shadowRoot.innerHTML=`
      <style>
        :host{display:block;height:0;min-height:0;overflow:visible}
        .atze-popup-overlay[hidden]{display:none!important}
        .atze-popup-overlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}
        .atze-popup-dialog{box-sizing:border-box;width:min(460px,100%);max-height:min(85vh,850px);overflow:auto;overscroll-behavior:contain;padding:20px;border-radius:22px;border:1px solid rgba(255,255,255,.16);background:var(--card-background-color,#24252b);box-shadow:0 18px 55px rgba(0,0,0,.45);outline:none}
        .atze-popup-title{display:flex;align-items:center;gap:10px;font-size:18px;font-weight:600;margin:0 0 18px}
        .atze-popup-title ha-icon{--mdc-icon-size:23px;color:var(--primary-color)}
        .atze-popup-cards{display:grid;gap:12px}
      </style>
      <div class="atze-popup-overlay" hidden>
        <section class="atze-popup-dialog" role="dialog" aria-modal="true" tabindex="-1" aria-label="Geräteeinstellungen">
          <div class="atze-popup-title"><ha-icon></ha-icon><span></span></div>
          <div class="atze-popup-cards"></div>
        </section>
      </div>`;
    this.shadowRoot.querySelector(".atze-popup-title ha-icon").setAttribute("icon",this._config.icon||"mdi:tune");
    this.shadowRoot.querySelector(".atze-popup-title span").textContent=this._config.name||"Einstellungen";
    const cards=this.shadowRoot.querySelector(".atze-popup-cards");
    for(const cardConfig of this._config.cards||[]){
      const card=document.createElement("hui-card");
      card.hass=this._hass;
      card.config=cardConfig;
      cards.appendChild(card);
    }
    const overlay=this.shadowRoot.querySelector(".atze-popup-overlay");
    overlay.addEventListener("click",event=>{if(event.target===overlay)this._close();});
    this._syncOpen();
  }
}
const atzePopupCardTag=ATZE_TESTING_BUILD?"atze-popup-card-testing":"atze-popup-card";
if(!customElements.get(atzePopupCardTag))customElements.define(atzePopupCardTag,AtzePopupCard);
