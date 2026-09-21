
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
    const reactiveImage =
      lightsOn
        ? this._config.light_image
        : this._config.dark_image;
    const backgroundImage =
      reactiveImage || this._config.background_image || "";

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
          min-height: 170px;
          padding: 0;
          border-radius: var(--ha-card-border-radius, 12px);
          overflow: hidden;
          border: 1px solid var(--divider-color, rgba(160,160,160,0.45));
          background:
            linear-gradient(180deg, rgba(0,0,0,0.02) 45%, rgba(0,0,0,0.62) 100%),
            var(--atze-room-header-image) center / cover no-repeat;
        }

        ha-card.has-background .nav-row {
          min-height: 170px;
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

      <ha-card class="${backgroundImage ? "has-background" : ""}" style="${backgroundImage ? `--atze-room-header-image: url('${backgroundImage}')` : ""}">
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
              : "var(--ha-card-background, var(--card-background-color, rgba(44,44,46,0.92)))"};
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
          backdrop-filter: var(--ha-card-backdrop-filter, none);
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
          background:
            var(
              --ha-card-background,
              var(--card-background-color, rgba(44,44,46,0.92))
            );
          border:
            var(--ha-card-border-width, 1px)
            solid
            var(
              --ha-card-border-color,
              var(--divider-color, rgba(255,255,255,0.10))
            );
          color: var(--primary-text-color);
          box-shadow: var(--ha-card-box-shadow, none);
          backdrop-filter: var(--ha-card-backdrop-filter, none);
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

