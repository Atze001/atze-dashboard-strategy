
class AtzeSecurityOverviewCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
  }

  setConfig(config) {
    this._config = {
      title: "Sicherheit",
      home_path: "home",
      groups: [],
      entity_ids: [],
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
    this._render();
  }

  getCardSize() {
    return 12;
  }

  _state(entityId) {
    return entityId
      ? this._hass?.states?.[entityId] || null
      : null;
  }

  _formatted(entityId) {
    const stateObj = this._state(entityId);
    if (!stateObj) return "Nicht verfügbar";

    if (
      typeof this._hass?.formatEntityState === "function"
    ) {
      return this._hass.formatEntityState(stateObj);
    }

    const unit =
      stateObj.attributes?.unit_of_measurement || "";

    return `${stateObj.state}${
      unit ? ` ${unit}` : ""
    }`;
  }

  _severity(entityId) {
    return securityEntitySeverity(
      this._hass,
      entityId
    );
  }

  _icon(entityId) {
    const stateObj = this._state(entityId);
    const customIcon = stateObj?.attributes?.icon;

    if (customIcon) return customIcon;

    const domain = domainOf(entityId);
    const deviceClass = String(
      stateObj?.attributes?.device_class || ""
    ).toLowerCase();

    if (domain === "lock") {
      return String(stateObj?.state || "").toLowerCase() ===
        "locked"
        ? "mdi:lock"
        : "mdi:lock-open-variant";
    }

    if (domain === "alarm_control_panel") {
      return "mdi:shield-home";
    }

    if (domain === "cover") {
      return "mdi:window-shutter";
    }

    if (domain === "binary_sensor") {
      const map = {
        smoke: "mdi:smoke-detector",
        moisture: "mdi:water-alert",
        gas: "mdi:gas-cylinder",
        carbon_monoxide: "mdi:molecule-co",
        door: "mdi:door",
        window: "mdi:window-closed-variant",
        opening: "mdi:door-open",
        motion: "mdi:motion-sensor",
        occupancy: "mdi:motion-sensor",
        problem: "mdi:alert-circle-outline",
        safety: "mdi:shield-alert-outline",
        tamper: "mdi:shield-alert-outline",
      };

      return map[deviceClass] || "mdi:shield-outline";
    }

    if (domain === "sensor") return "mdi:gauge";
    if (domain === "switch") return "mdi:toggle-switch";
    if (domain === "siren") return "mdi:bullhorn";

    return "mdi:shield-outline";
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

  _navigateHome() {
    const requested = String(
      this._config.home_path || "home"
    ).trim();

    let target;

    if (requested.startsWith("/")) {
      target = requested;
    } else {
      const cleanTarget =
        requested.replace(/^\/+|\/+$/g, "") ||
        "home";

      const parts =
        window.location.pathname
          .split("/")
          .filter(Boolean);

      if (parts.length) {
        parts[parts.length - 1] = cleanTarget;
      } else {
        parts.push(cleanTarget);
      }

      target = `/${parts.join("/")}`;
    }

    const nextUrl =
      `${target}${window.location.search || ""}`;

    window.history.pushState(null, "", nextUrl);
    window.dispatchEvent(
      new Event("location-changed")
    );
  }

  _render() {
    if (
      !this.shadowRoot ||
      !this._config ||
      !this._hass
    ) {
      return;
    }

    const entityIds =
      this._config.entity_ids || [];

    const issueCount = entityIds.filter(
      (entityId) =>
        securityEntityIsIssue(
          this._hass,
          entityId
        )
    ).length;

    const unavailableCount = entityIds.filter(
      (entityId) =>
        this._severity(entityId) === "unavailable"
    ).length;

    const summaryText =
      issueCount > 0
        ? `${issueCount} ${
            issueCount === 1
              ? "Warnung"
              : "Warnungen"
          }`
        : entityIds.length
          ? "Alles ok"
          : "Keine Sensoren";

    const summaryClass =
      issueCount > 0 ? "warning" : "safe";

    const groupsHtml = (
      this._config.groups || []
    )
      .map((group) => {
        const cards = (group.entities || [])
          .map((entry) => {
            const entityId = entry.entity_id;
            const severity =
              this._severity(entityId);

            return `
              <button
                class="entity-card ${severity}"
                data-entity-id="${entityId}"
              >
                <span class="entity-icon">
                  <ha-icon
                    icon="${this._icon(entityId)}"
                  ></ha-icon>
                </span>

                <span class="entity-copy">
                  <span class="entity-name">
                    ${entry.name || entityId}
                  </span>
                  <span class="entity-state">
                    ${this._formatted(entityId)}
                  </span>
                </span>

                <ha-icon
                  class="more"
                  icon="mdi:chevron-right"
                ></ha-icon>
              </button>
            `;
          })
          .join("");

        return `
          <section class="area-section">
            <div class="area-heading">
              <ha-icon
                icon="${group.icon || "mdi:home-outline"}"
              ></ha-icon>
              <span>${group.name || "Ohne Bereich"}</span>
            </div>

            <div class="entity-grid">
              ${cards}
            </div>
          </section>
        `;
      })
      .join("");

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          min-height: 100vh;
          background: #111111;
          color: var(--primary-text-color);
          scrollbar-width: none !important;
        }

        :host::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }

        * {
          box-sizing: border-box;
        }

        ha-card {
          min-height: 100vh;
          margin: 0;
          padding: 0;
          border: 0;
          border-radius: 0;
          box-shadow: none;
          background: #111111;
          color: var(--primary-text-color);
        }

        .page {
          width: min(1180px, 100%);
          margin: 0 auto;
          padding: 28px 24px 48px;
        }

        .nav-row {
          width: fit-content;
          min-height: 42px;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 22px;
          border: 0;
          padding: 0;
          background: transparent;
          color: var(--primary-text-color);
          font: inherit;
          cursor: pointer;
        }

        .home-icon {
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #0A84FF;
        }

        .home-icon ha-icon {
          --mdc-icon-size: 18px;
          width: 18px;
          height: 18px;
          color: white;
          transform: translateY(-2px);
        }

        .nav-title {
          font-size: 24px;
          line-height: 1;
          font-weight: 650;
          letter-spacing: -0.35px;
        }

        .summary {
          min-height: 104px;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 30px;
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,0.11);
          background: rgba(27,29,33,0.84);
        }

        .summary-icon {
          width: 54px;
          height: 54px;
          flex: 0 0 54px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(48,209,88,0.16);
        }

        .summary.warning .summary-icon {
          background: rgba(255,69,58,0.17);
        }

        .summary-icon ha-icon {
          --mdc-icon-size: 28px;
          width: 28px;
          height: 28px;
          color: #30D158;
        }

        .summary.warning .summary-icon ha-icon {
          color: #FF453A;
        }

        .summary-main {
          font-size: 25px;
          font-weight: 700;
          line-height: 1.1;
        }

        .summary-sub {
          margin-top: 5px;
          color: rgba(235,235,245,0.62);
          font-size: 14px;
        }

        .area-section {
          margin-top: 30px;
        }

        .area-heading {
          display: flex;
          align-items: center;
          gap: 9px;
          margin: 0 2px 13px;
          font-size: 22px;
          font-weight: 700;
        }

        .area-heading ha-icon {
          --mdc-icon-size: 23px;
          width: 23px;
          height: 23px;
          color: rgba(235,235,245,0.78);
        }

        .entity-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .entity-card {
          min-width: 0;
          min-height: 78px;
          padding: 13px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid rgba(255,255,255,0.11);
          border-radius: 22px;
          background: rgba(27,29,33,0.84);
          color: var(--primary-text-color);
          font: inherit;
          text-align: left;
          cursor: pointer;
        }

        .entity-card:active {
          transform: scale(0.99);
        }

        .entity-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(118,118,128,0.18);
        }

        .entity-icon ha-icon {
          --mdc-icon-size: 22px;
          width: 22px;
          height: 22px;
          color: rgba(235,235,245,0.82);
        }

        .entity-card.safe .entity-icon {
          background: rgba(48,209,88,0.15);
        }

        .entity-card.safe .entity-icon ha-icon {
          color: #30D158;
        }

        .entity-card.warning .entity-icon {
          background: rgba(255,69,58,0.16);
        }

        .entity-card.warning .entity-icon ha-icon {
          color: #FF453A;
        }

        .entity-card.unavailable .entity-icon {
          background: rgba(255,159,10,0.16);
        }

        .entity-card.unavailable .entity-icon ha-icon {
          color: #FF9F0A;
        }

        .entity-copy {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .entity-name {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 16px;
          font-weight: 650;
        }

        .entity-state {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: rgba(235,235,245,0.62);
          font-size: 13px;
        }

        .more {
          --mdc-icon-size: 18px;
          width: 18px;
          height: 18px;
          flex: 0 0 18px;
          color: rgba(235,235,245,0.38);
        }

        .empty {
          padding: 28px 20px;
          border: 1px solid rgba(255,255,255,0.11);
          border-radius: 24px;
          background: rgba(27,29,33,0.84);
          color: rgba(235,235,245,0.68);
          text-align: center;
        }

        @media (max-width: 650px) {
          .page {
            padding: 22px 14px 36px;
          }

          .nav-row {
            margin-bottom: 18px;
          }

          .home-icon {
            width: 31px;
            height: 31px;
            flex-basis: 31px;
          }

          .nav-title {
            font-size: 21px;
          }

          .summary {
            min-height: 92px;
            margin-bottom: 24px;
            border-radius: 24px;
          }

          .summary-main {
            font-size: 22px;
          }

          .entity-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .entity-card {
            min-height: 72px;
            padding: 11px 10px;
            gap: 9px;
            border-radius: 20px;
          }

          .entity-icon {
            width: 38px;
            height: 38px;
            flex-basis: 38px;
          }

          .entity-icon ha-icon {
            --mdc-icon-size: 20px;
            width: 20px;
            height: 20px;
          }

          .entity-name {
            font-size: 14px;
          }

          .entity-state {
            font-size: 12px;
          }

          .more {
            display: none;
          }

          .area-heading {
            font-size: 20px;
          }
        }
      </style>

      <ha-card>
        <div class="page">
          <button class="nav-row" id="security-home">
            <span class="home-icon">
              <ha-icon icon="mdi:home"></ha-icon>
            </span>
            <span class="nav-title">
              ${this._config.title || "Sicherheit"}
            </span>
          </button>

          <div class="summary ${summaryClass}">
            <span class="summary-icon">
              <ha-icon
                icon="${
                  issueCount > 0
                    ? "mdi:shield-alert"
                    : "mdi:shield-check"
                }"
              ></ha-icon>
            </span>

            <div>
              <div class="summary-main">
                ${summaryText}
              </div>
              <div class="summary-sub">
                ${entityIds.length} ${
                  entityIds.length === 1
                    ? "Entity"
                    : "Entities"
                }${
                  unavailableCount
                    ? ` · ${unavailableCount} nicht verfügbar`
                    : ""
                }
              </div>
            </div>
          </div>

          ${
            groupsHtml ||
            `
              <div class="empty">
                Noch keine Entity trägt direkt das Label
                „Sicherheit“.
              </div>
            `
          }
        </div>
      </ha-card>
    `;

    this.shadowRoot
      .querySelector("#security-home")
      ?.addEventListener(
        "click",
        () => this._navigateHome()
      );

    this.shadowRoot
      .querySelectorAll(".entity-card")
      .forEach((element) => {
        element.addEventListener(
          "click",
          () =>
            this._moreInfo(
              element.dataset.entityId
            )
        );
      });
  }
}

if (!customElements.get("atze-security-overview-card")) {
  customElements.define(
    "atze-security-overview-card",
    AtzeSecurityOverviewCard
  );
}

window.customCards = window.customCards || [];

if (
  !window.customCards.some(
    (card) =>
      card.type === "atze-security-overview-card"
  )
) {
  window.customCards.push({
    type: "atze-security-overview-card",
    name: "Atze Sicherheit",
    description:
      "Label-basierte Sicherheitsübersicht nach Bereichen",
  });
}


