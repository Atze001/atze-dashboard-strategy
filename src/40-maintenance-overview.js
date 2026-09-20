
class AtzeMaintenanceOverviewCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
  }

  setConfig(config) {
    this._config = {
      title: "Wartung",
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
    return batterySeverity(this._hass, entityId);
  }

  _icon(entityId) {
    const stateObj = this._state(entityId);
    const severity = this._severity(entityId);
    const domain = domainOf(entityId);

    if (domain === "binary_sensor") {
      return severity === "critical"
        ? "mdi:battery-alert"
        : "mdi:battery-check";
    }

    const value = Number.parseFloat(
      stateObj?.state
    );

    if (!Number.isFinite(value)) {
      return "mdi:battery-unknown";
    }

    if (value >= 95) return "mdi:battery";
    if (value >= 85) return "mdi:battery-90";
    if (value >= 75) return "mdi:battery-80";
    if (value >= 65) return "mdi:battery-70";
    if (value >= 55) return "mdi:battery-60";
    if (value >= 45) return "mdi:battery-50";
    if (value >= 35) return "mdi:battery-40";
    if (value >= 25) return "mdi:battery-30";
    if (value >= 15) return "mdi:battery-20";
    return "mdi:battery-10";
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

    const entryMap = new Map();

    for (const group of this._config.groups || []) {
      for (const entry of group.entities || []) {
        entryMap.set(entry.entity_id, entry);
      }
    }

    const allEntries = [...entryMap.values()];

    const batteryGroups = [
      {
        name: "Kritisch · 0–20 %",
        icon: "mdi:battery-alert",
        severity: "critical",
        entities: allEntries.filter((entry) =>
          [
            "critical",
            "unavailable",
            "neutral",
          ].includes(this._severity(entry.entity_id))
        ),
      },
      {
        name: "Niedrig · 21–40 %",
        icon: "mdi:battery-low",
        severity: "warning",
        entities: allEntries.filter(
          (entry) =>
            this._severity(entry.entity_id) === "warning"
        ),
      },
      {
        name: "Gut · 41–100 %",
        icon: "mdi:battery-check",
        severity: "good",
        entities: allEntries.filter(
          (entry) =>
            this._severity(entry.entity_id) === "good"
        ),
      },
    ].filter((group) => group.entities.length);

    const groupsHtml = batteryGroups
      .map((group) => {
        const cards = [...group.entities]
          .sort((a, b) => {
            const aValue = batterySortValue(
              this._hass,
              a.entity_id
            );
            const bValue = batterySortValue(
              this._hass,
              b.entity_id
            );

            if (aValue !== bValue) {
              return aValue < bValue ? -1 : 1;
            }

            return String(a.name || "").localeCompare(
              String(b.name || ""),
              "de",
              {
                numeric: true,
                sensitivity: "base",
              }
            );
          })
          .map((entry) => {
            const entityId = entry.entity_id;
            const severity =
              this._severity(entityId);

            return `
              <button
                class="battery-card ${severity}"
                data-entity-id="${entityId}"
              >
                <span class="battery-icon">
                  <ha-icon
                    icon="${this._icon(entityId)}"
                  ></ha-icon>
                </span>

                <span class="battery-copy">
                  <span class="battery-name">
                    ${entry.name || entityId}
                  </span>
                  <span class="battery-state">
                    ${this._formatted(entityId)}${
                      entry.area_name
                        ? ` · ${entry.area_name}`
                        : ""
                    }
                  </span>
                </span>
              </button>
            `;
          })
          .join("");

        return `
          <section class="area-section ${group.severity}">
            <div class="area-heading">
              <ha-icon
                icon="${group.icon || "mdi:home-outline"}"
              ></ha-icon>
              <span>${group.name || "Ohne Bereich"}</span>
            </div>

            <div class="battery-grid">
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
          margin-bottom: 30px;
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

        .area-section {
          margin-top: 30px;
        }

        .area-section:first-of-type {
          margin-top: 0;
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

        .area-section.good .area-heading ha-icon {
          color: #30D158;
        }

        .area-section.warning .area-heading ha-icon {
          color: #FF9F0A;
        }

        .area-section.critical .area-heading ha-icon {
          color: #FF453A;
        }

        .battery-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .battery-card {
          min-width: 0;
          min-height: 82px;
          padding: 13px 15px;
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
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.025);
        }

        .battery-card:active {
          transform: scale(0.99);
        }

        .battery-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(48,209,88,0.15);
        }

        .battery-icon ha-icon {
          --mdc-icon-size: 24px;
          width: 24px;
          height: 24px;
          color: #30D158;
        }

        .battery-card.warning .battery-icon {
          background: rgba(255,159,10,0.16);
        }

        .battery-card.warning .battery-icon ha-icon {
          color: #FF9F0A;
        }

        .battery-card.critical .battery-icon {
          background: rgba(255,69,58,0.17);
        }

        .battery-card.critical .battery-icon ha-icon {
          color: #FF453A;
        }

        .battery-card.unavailable .battery-icon,
        .battery-card.neutral .battery-icon {
          background: rgba(118,118,128,0.18);
        }

        .battery-card.unavailable .battery-icon ha-icon,
        .battery-card.neutral .battery-icon ha-icon {
          color: rgba(235,235,245,0.55);
        }

        .battery-copy {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .battery-name {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 16px;
          font-weight: 650;
        }

        .battery-state {
          color: var(--primary-text-color);
          font-size: 14px;
          white-space: nowrap;
        }

        .empty {
          padding: 30px 20px;
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
            margin-bottom: 25px;
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
          }

          .nav-title {
            font-size: 21px;
          }

          .area-section {
            margin-top: 26px;
          }

          .area-heading {
            font-size: 20px;
          }

          .battery-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .battery-card {
            min-height: 72px;
            padding: 10px;
            gap: 9px;
            border-radius: 20px;
          }

          .battery-icon {
            width: 38px;
            height: 38px;
            flex-basis: 38px;
          }

          .battery-icon ha-icon {
            --mdc-icon-size: 21px;
            width: 21px;
            height: 21px;
          }

          .battery-name {
            font-size: 14px;
          }

          .battery-state {
            font-size: 12px;
          }
        }
      </style>

      <ha-card>
        <div class="page">
          <button class="nav-row" id="maintenance-home">
            <span class="home-icon">
              <ha-icon icon="mdi:home"></ha-icon>
            </span>
            <span class="nav-title">
              ${this._config.title || "Wartung"}
            </span>
          </button>

          ${
            groupsHtml ||
            `
              <div class="empty">
                Keine Batteriesensoren gefunden.
              </div>
            `
          }
        </div>
      </ha-card>
    `;

    this.shadowRoot
      .querySelector("#maintenance-home")
      ?.addEventListener(
        "click",
        () => this._navigateHome()
      );

    this.shadowRoot
      .querySelectorAll(".battery-card")
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

if (
  !customElements.get(
    "atze-maintenance-overview-card"
  )
) {
  customElements.define(
    "atze-maintenance-overview-card",
    AtzeMaintenanceOverviewCard
  );
}

window.customCards = window.customCards || [];

if (
  !window.customCards.some(
    (card) =>
      card.type ===
      "atze-maintenance-overview-card"
  )
) {
  window.customCards.push({
    type: "atze-maintenance-overview-card",
    name: "Atze Wartung",
    description:
      "Apple-Home-inspirierte Batterieübersicht nach Bereichen",
  });
}

