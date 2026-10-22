// Native ATZE energy overview card for standalone Lovelace dashboards.
// Uses the same translucent card surfaces and spacing as ATZE device cards.
class AtzeEnergyOverviewCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
  }

  setConfig(config) {
    this._config = {
      total: "sensor.gesamt_strom",
      power: "sensor.gesamt_leistung",
      year: "sensor.gesamt_strom_virtuell_jahr",
      month: "sensor.gesamt_strom_virtuell_monat",
      day: "sensor.gesamt_strom_virtuell_tag",
      year_reset: "input_datetime.gesamt_strom_reset_jahr",
      month_reset: "input_datetime.gesamt_strom_reset_monat",
      day_reset: "input_datetime.gesamt_strom_reset_tag",
      month_script: "script.gesamt_strom_reset_monat",
      day_script: "script.gesamt_strom_reset_tag",
      ...config,
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._update();
  }

  getCardSize() { return 4; }

  _value(entityId) {
    const state = this._hass?.states?.[entityId];
    if (!state || ["unknown", "unavailable"].includes(state.state)) return "–";
    const number = Number(state.state);
    if (!Number.isFinite(number)) return "–";
    return new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: 0, maximumFractionDigits: 2,
    }).format(number);
  }

  _resetLabel(entityId) {
    const value = this._hass?.states?.[entityId]?.state;
    if (!value || ["unknown", "unavailable"].includes(value)) return "Noch nicht erfasst";
    const date = new Date(value.replace(" ", "T"));
    if (!Number.isFinite(date.getTime())) return "Noch nicht erfasst";
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric",
    }).format(date);
  }

  _details(entityId) {
    if (!entityId) return;
    this.dispatchEvent(new CustomEvent("hass-more-info", {
      bubbles: true, composed: true, detail: { entityId },
    }));
  }

  async _reset(period) {
    const scriptId = this._config[period + "_script"];
    if (!scriptId) return;
    const title = period === "month" ? "Monats" : "Tages";
    if (!window.confirm(title + "verbrauch wirklich auf 0 kWh zurücksetzen?")) return;
    const button = this.shadowRoot.querySelector('[data-reset="' + period + '"]');
    if (button) button.disabled = true;
    try {
      await this._hass.callService("script", "turn_on", { entity_id: scriptId });
    } catch (error) {
      console.error("ATZE Strom: Reset fehlgeschlagen", error);
      window.alert("Zurücksetzen fehlgeschlagen. Bitte Home Assistant prüfen.");
    } finally {
      if (button) button.disabled = false;
    }
  }

  _render() {
    const cards = [
      { key: "total", title: "Gesamtstrom", icon: "mdi:lightning-bolt", tone: "#ffb900", subtitle: "Gesamter Zählerstand" },
      { key: "year", title: "Jahr", icon: "mdi:calendar", tone: "#64b5f6", reset: "year_reset" },
      { key: "month", title: "Monat", icon: "mdi:calendar-month", tone: "#30d158", reset: "month_reset", action: true },
      { key: "day", title: "Tag", icon: "mdi:calendar-today", tone: "#ff9f0a", reset: "day_reset", action: true },
    ];
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; min-width:0 }
        .grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px }
        .tile { box-sizing:border-box; min-width:0; min-height:132px; padding:13px;
          border:1px solid var(--home-card-border,rgba(255,255,255,.10));
          border-radius:16px; background:rgba(55,58,67,.30);
          backdrop-filter:blur(10px) saturate(1.2); -webkit-backdrop-filter:blur(10px) saturate(1.2);
          color:var(--primary-text-color); display:flex; flex-direction:column; gap:10px }
        .head { display:flex; align-items:center; gap:7px; min-width:0 }
        .head ha-icon { --mdc-icon-size:20px; flex:none; color:var(--accent) }
        .title { font-size:13px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
        .value { font-size:clamp(30px,8vw,40px); font-weight:700; line-height:1.15;
          font-variant-numeric:tabular-nums; overflow-wrap:anywhere; text-align:center; width:100% }
        .unit { font-size:12px; font-weight:400; color:var(--secondary-text-color) }
        .power { display:flex; align-items:baseline; justify-content:center; gap:5px;
          font-size:18px; font-weight:600; line-height:1.15; font-variant-numeric:tabular-nums;
          overflow-wrap:anywhere; text-align:center }
        .power .unit { font-size:12px }
        .power[hidden] { display:none }
        .foot { margin-top:auto; min-height:24px; display:flex; align-items:center;
          justify-content:space-between; gap:4px; min-width:0 }
        .caption { font-size:10px; color:var(--secondary-text-color); line-height:1.3;
          overflow-wrap:anywhere; min-width:0 }
        .reset { appearance:none; display:grid; place-items:center; flex:0 0 28px;
          width:28px; height:28px; border-radius:9px; border:1px solid var(--home-card-border,rgba(255,255,255,.12));
          background:rgba(118,118,128,.20); color:var(--primary-text-color); cursor:pointer }
        .reset ha-icon { --mdc-icon-size:17px }
        .reset:disabled { opacity:.45; cursor:wait }
        .reset:focus-visible { outline:2px solid var(--primary-color); outline-offset:2px }
        @media(max-width:350px) { .grid{gap:7px} .tile{padding:10px} .title{font-size:12px} }
      </style>
      <div class="grid"></div>`;
    const grid = this.shadowRoot.querySelector(".grid");
    for (const card of cards) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.style.setProperty("--accent", card.tone);
      tile.innerHTML = `<div class="head"><ha-icon></ha-icon><span class="title"></span></div>
        <div class="value"><span class="number"></span> <span class="unit">kWh</span></div>
        ${card.key === "total" ? '<div class="power" hidden><span class="power-number"></span><span class="unit">W aktuell</span></div>' : ""}
        <div class="foot"><span class="caption"></span></div>`;
      tile.dataset.period = card.key;
      tile.querySelector("ha-icon").setAttribute("icon", card.icon);
      tile.querySelector(".title").textContent = card.title;
      if (card.action) {
        const button = document.createElement("button");
        button.className = "reset";
        button.type = "button";
        button.dataset.reset = card.key;
        button.setAttribute("aria-label", card.title + " zurücksetzen");
        const icon = document.createElement("ha-icon");
        icon.setAttribute("icon", "mdi:restart");
        button.appendChild(icon);
        button.addEventListener("click", () => this._reset(card.key));
        tile.querySelector(".foot").appendChild(button);
      }
      tile.querySelector(".head").addEventListener("click", () => this._details(this._config[card.key]));
      grid.appendChild(tile);
    }
    this._update();
  }

  _update() {
    if (!this.shadowRoot?.querySelector(".grid")) return;
    for (const period of ["total", "year", "month", "day"]) {
      const tile = this.shadowRoot.querySelector('[data-period="' + period + '"]');
      if (!tile) continue;
      tile.querySelector(".number").textContent = this._value(this._config[period]);
      if (period === "total") {
        const power = tile.querySelector(".power");
        const powerEntity = this._config.power;
        power.hidden = !powerEntity;
        if (powerEntity) power.querySelector(".power-number").textContent = this._value(powerEntity);
      }
      const caption = period === "total"
        ? "Gesamter Zählerstand"
        : this._resetLabel(this._config[period + "_reset"]);
      tile.querySelector(".caption").textContent = caption;
    }
  }
}

const atzeEnergyOverviewTag = ATZE_TESTING_BUILD
  ? "atze-energy-overview-card-testing"
  : "atze-energy-overview-card";
if (!customElements.get(atzeEnergyOverviewTag)) {
  customElements.define(atzeEnergyOverviewTag, AtzeEnergyOverviewCard);
}
