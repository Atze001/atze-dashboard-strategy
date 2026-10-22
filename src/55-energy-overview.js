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
      kitchen_energy: "sensor.kuche_stromzahler_energy",
      kitchen_power: "sensor.kuche_stromzahler_power",
      bedroom_energy: "sensor.schlafzimmer_stromzahler_energy",
      bedroom_power: "sensor.schlafzimmer_stromzahler_power",
      living_energy: "sensor.wohnzimmer_stromzahler_energy",
      living_power: "sensor.wohnzimmer_stromzahler_power",
      // Room utility meters, reset timestamps and manual reset scripts.
      living_month: "sensor.wohnzimmer_strom_monat",
      living_day: "sensor.wohnzimmer_strom_tag",
      living_month_reset: "input_datetime.wohnzimmer_strom_reset_monat",
      living_day_reset: "input_datetime.wohnzimmer_strom_reset_tag",
      living_month_script: "script.wohnzimmer_strom_reset_monat",
      living_day_script: "script.wohnzimmer_strom_reset_tag",
      bedroom_month: "sensor.schlafzimmer_strom_monat",
      bedroom_day: "sensor.schlafzimmer_strom_tag",
      bedroom_month_reset: "input_datetime.schlafzimmer_strom_reset_monat",
      bedroom_day_reset: "input_datetime.schlafzimmer_strom_reset_tag",
      bedroom_month_script: "script.schlafzimmer_strom_reset_monat",
      bedroom_day_script: "script.schlafzimmer_strom_reset_tag",
      kitchen_month: "sensor.kueche_strom_monat",
      kitchen_day: "sensor.kueche_strom_tag",
      kitchen_month_reset: "input_datetime.kueche_strom_reset_monat",
      kitchen_day_reset: "input_datetime.kueche_strom_reset_tag",
      kitchen_month_script: "script.kueche_strom_reset_monat",
      kitchen_day_script: "script.kueche_strom_reset_tag",
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
    const title = period.endsWith("month") ? "Monats" : "Tages";
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

  _openPeriod(period) {
    const dialog = this.shadowRoot.querySelector(".period-dialog");
    const valid = ["month", "day", "living_month", "living_day",
      "bedroom_month", "bedroom_day", "kitchen_month", "kitchen_day"];
    if (!dialog || !valid.includes(period)) return;
    dialog.dataset.period = period;
    const roomLabels = { living: "Wohnzimmer", bedroom: "Schlafzimmer", kitchen: "Küche" };
    const [room, span] = period.includes("_") ? period.split("_") : [null, period];
    dialog.querySelector(".dialog-title").textContent =
      (room ? roomLabels[room] + " · " : "") + (span === "month" ? "Monat" : "Tag");
    this._updatePeriodDialog();
    if (!dialog.open) dialog.showModal();
  }

  _updatePeriodDialog() {
    const dialog = this.shadowRoot?.querySelector(".period-dialog");
    if (!dialog?.dataset.period) return;
    const period = dialog.dataset.period;
    const resetEntity = this._config[period + "_reset"];
    dialog.querySelector(".dialog-date").textContent = resetEntity
      ? this._resetLabel(resetEntity) : "Nicht eingerichtet";
    dialog.querySelector(".dialog-value").textContent = this._value(this._config[period]);
    const resetButton = dialog.querySelector(".dialog-reset");
    resetButton.dataset.reset = period;
    resetButton.hidden = !this._config[period + "_script"];
    dialog.querySelector(".dialog-date").parentElement.hidden = !resetEntity;
  }

  _render() {
    const cards = [
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
        .tile.total { grid-column:1 / -1; --accent:#ffb900 }
        .tile.period { min-height:105px; cursor:pointer }
        .room-heading { grid-column:1/-1; margin:12px 0 0; display:flex; align-items:center;
          gap:8px; font-size:15px; font-weight:650; color:var(--primary-text-color) }
        .room-heading ha-icon { --mdc-icon-size:20px; color:var(--secondary-text-color) }
        .tile.room { min-height:115px; gap:12px }
        .room-section { grid-column:1/-1; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-top:12px }
        .room-section .room-heading { grid-column:1/-1; margin:0 0 1px }
        .room-section .tile.room-total { grid-column:1/-1; min-height:120px }
        .room-section .tile.period { min-height:100px }
        .room-section .room-power { display:flex; justify-content:center; align-items:baseline; gap:5px;
          border-top:1px solid var(--home-card-border,rgba(255,255,255,.1)); padding-top:10px }
        .dialog-reset[hidden] { display:none }
        .tile.room:focus-visible { outline:2px solid var(--primary-color); outline-offset:2px }
        .room-power { text-align:center; font-size:15px; font-weight:600;
          font-variant-numeric:tabular-nums }
        .room-power .unit { font-size:11px }
        .room-wide { grid-column:1/-1 }
        .tile.period:focus-visible { outline:2px solid var(--primary-color); outline-offset:2px }
        .head { display:flex; align-items:center; gap:7px; min-width:0 }
        .head ha-icon { --mdc-icon-size:20px; flex:none; color:var(--accent) }
        .title { font-size:13px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
        .value { font-size:clamp(30px,8vw,40px); font-weight:700; line-height:1.15;
          font-variant-numeric:tabular-nums; overflow-wrap:anywhere; text-align:center; width:100% }
        .unit { font-size:12px; font-weight:400; color:var(--secondary-text-color) }
        .summary { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; padding:5px 0 }
        .summary-item { min-width:0; display:flex; flex-direction:column; align-items:center; gap:7px }
        .summary-label { color:var(--secondary-text-color); font-size:11px }
        .summary-value { font-size:clamp(28px,7vw,40px); font-weight:700; line-height:1.15;
          font-variant-numeric:tabular-nums; text-align:center; overflow-wrap:anywhere }
        .live-power { display:flex; align-items:baseline; justify-content:center; gap:5px;
          border-top:1px solid var(--home-card-border,rgba(255,255,255,.10)); padding-top:12px;
          font-size:18px; font-weight:600; font-variant-numeric:tabular-nums }
        .live-power .unit { font-size:12px }
        .live-power[hidden] { display:none }
        .period-dialog { box-sizing:border-box; width:min(340px,calc(100vw - 36px));
          max-height:calc(100dvh - 60px); overflow:auto; margin:auto; padding:22px;
          border:1px solid var(--home-card-border,rgba(255,255,255,.16)); border-radius:20px;
          background:var(--card-background-color,#202126); color:var(--primary-text-color);
          box-shadow:0 18px 50px rgba(0,0,0,.45) }
        .period-dialog::backdrop { background:rgba(0,0,0,.62); backdrop-filter:blur(4px) }
        .dialog-title { font-size:18px; font-weight:650; margin-bottom:18px }
        .dialog-value-line { text-align:center; margin-bottom:20px; font-weight:700; font-size:32px }
        .dialog-meta { display:flex; align-items:center; justify-content:space-between; gap:10px;
          font-size:12px; color:var(--secondary-text-color) }
        .dialog-date { margin-top:5px; color:var(--primary-text-color); font-size:14px }
        .dialog-reset { appearance:none; display:flex; align-items:center; gap:7px;
          padding:9px 12px; border-radius:10px; cursor:pointer;
          border:1px solid var(--home-card-border,rgba(255,255,255,.16));
          background:rgba(118,118,128,.22); color:var(--primary-text-color); font:inherit }
        .dialog-reset ha-icon { --mdc-icon-size:18px }
        .dialog-reset:disabled { opacity:.45; cursor:wait }
        @media(max-width:350px) { .grid{gap:7px} .tile{padding:10px} .title{font-size:12px} .summary{gap:5px} }
      </style>
      <div class="grid">
        <div class="tile total" data-period="total">
          <div class="head"><ha-icon icon="mdi:lightning-bolt"></ha-icon><span class="title">Gesamtstrom</span></div>
          <div class="summary">
            <div class="summary-item" data-detail="total" role="button" tabindex="0" aria-label="Gesamtzähler Details">
              <span class="summary-label">Gesamtverbrauch</span>
              <div class="summary-value"><span class="total-number"></span> <span class="unit">kWh</span></div>
            </div>
            <div class="summary-item" data-detail="year" role="button" tabindex="0" aria-label="Jahresverbrauch Details">
              <span class="summary-label">Dieses Jahr</span>
              <div class="summary-value"><span class="year-number"></span> <span class="unit">kWh</span></div>
            </div>
          </div>
          <div class="live-power" hidden><span class="power-number"></span><span class="unit">W aktuell</span></div>
        </div>
      </div>
      <dialog class="period-dialog" aria-labelledby="energy-period-dialog-title">
        <div class="dialog-title" id="energy-period-dialog-title"></div>
        <div class="dialog-value-line"><span class="dialog-value"></span> <span class="unit">kWh</span></div>
        <div class="dialog-meta">
          <div><div>Zurückgesetzt am</div><div class="dialog-date"></div></div>
          <button class="dialog-reset" type="button"><ha-icon icon="mdi:restart"></ha-icon>Zurücksetzen</button>
        </div>
      </dialog>`;
    const dialog = this.shadowRoot.querySelector(".period-dialog");
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        const bounds = dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
      }
    });
    dialog.querySelector(".dialog-reset").addEventListener("click", () => this._reset(dialog.dataset.period));
    const grid = this.shadowRoot.querySelector(".grid");
    for (const period of ["total", "year"]) {
      const detail = this.shadowRoot.querySelector('[data-detail="' + period + '"]');
      const open = () => this._details(this._config[period]);
      detail.addEventListener("click", open);
      detail.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });
    }
    for (const card of cards) {
      const tile = document.createElement("div");
      tile.className = "tile period";
      tile.tabIndex = 0;
      tile.setAttribute("role", "button");
      tile.setAttribute("aria-label", card.title + " – Optionen öffnen");
      tile.style.setProperty("--accent", card.tone);
      tile.innerHTML = `<div class="head"><ha-icon></ha-icon><span class="title"></span></div>
        <div class="value"><span class="number"></span> <span class="unit">kWh</span></div>`;
      tile.dataset.period = card.key;
      tile.querySelector("ha-icon").setAttribute("icon", card.icon);
      tile.querySelector(".title").textContent = card.title;
      tile.addEventListener("click", () => this._openPeriod(card.key));
      tile.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this._openPeriod(card.key);
        }
      });
      grid.appendChild(tile);
    }
    const rooms = [
      { key: "living", name: "Wohnzimmer", icon: "mdi:sofa-outline", tone: "#64b5f6" },
      { key: "bedroom", name: "Schlafzimmer", icon: "mdi:bed-outline", tone: "#ae86ed" },
      { key: "kitchen", name: "Küche", icon: "mdi:stove", tone: "#30d158" },
    ];
    for (const room of rooms) {
      const section = document.createElement("section");
      section.className = "room-section";
      section.dataset.roomSection = room.key;
      section.innerHTML = `<div class="room-heading"><ha-icon></ha-icon><span></span></div>
        <div class="tile room room-total" data-room="${room.key}">
          <div class="head"><ha-icon></ha-icon><span class="title">Gesamtverbrauch</span></div>
          <div class="value"><span class="room-energy"></span> <span class="unit">kWh</span></div>
          <div class="room-power"><span class="room-watts"></span> <span class="unit">W aktuell</span></div>
        </div>`;
      section.querySelector(".room-heading ha-icon").setAttribute("icon", room.icon);
      section.querySelector(".room-heading span").textContent = room.name;
      section.querySelector(".room-total").style.setProperty("--accent", room.tone);
      section.querySelector(".room-total .head ha-icon").setAttribute("icon", "mdi:lightning-bolt");
      const total = section.querySelector(".room-total");
      total.tabIndex = 0;
      total.setAttribute("role", "button");
      total.setAttribute("aria-label", room.name + " – Stromzähler Details");
      const openTotal = () => this._details(this._config[room.key + "_energy"]);
      total.addEventListener("click", openTotal);
      total.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openTotal();
        }
      });
      for (const period of ["month", "day"]) {
        const periodKey = room.key + "_" + period;
        const tile = document.createElement("div");
        tile.className = "tile period";
        tile.dataset.roomPeriod = periodKey;
        tile.tabIndex = 0;
        tile.setAttribute("role", "button");
        tile.setAttribute("aria-label", room.name + " " +
          (period === "month" ? "Monat" : "Tag") + " – Optionen öffnen");
        tile.style.setProperty("--accent", period === "month" ? "#30d158" : "#ff9f0a");
        tile.innerHTML = `<div class="head"><ha-icon></ha-icon><span class="title"></span></div>
          <div class="value"><span class="number"></span> <span class="unit">kWh</span></div>`;
        tile.querySelector("ha-icon").setAttribute("icon",
          period === "month" ? "mdi:calendar-month" : "mdi:calendar-today");
        tile.querySelector(".title").textContent = period === "month" ? "Monat" : "Tag";
        tile.addEventListener("click", () => this._openPeriod(periodKey));
        tile.addEventListener("keydown", event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            this._openPeriod(periodKey);
          }
        });
        section.appendChild(tile);
      }
      grid.appendChild(section);
    }
    this._update();
  }

  _update() {
    if (!this.shadowRoot?.querySelector(".grid")) return;
    const total = this.shadowRoot.querySelector('[data-period="total"]');
    total.querySelector(".total-number").textContent = this._value(this._config.total);
    total.querySelector(".year-number").textContent = this._value(this._config.year);
    const power = total.querySelector(".live-power");
    power.hidden = !this._config.power;
    if (this._config.power) power.querySelector(".power-number").textContent = this._value(this._config.power);
    for (const period of ["month", "day"]) {
      const tile = this.shadowRoot.querySelector('[data-period="' + period + '"]');
      tile.querySelector(".number").textContent = this._value(this._config[period]);
    }
    this._updatePeriodDialog();
    for (const room of ["living", "bedroom", "kitchen"]) {
      const tile = this.shadowRoot.querySelector('[data-room="' + room + '"]');
      if (!tile) continue;
      tile.querySelector(".room-energy").textContent = this._value(this._config[room + "_energy"]);
      tile.querySelector(".room-watts").textContent = this._value(this._config[room + "_power"]);
      for (const period of ["month", "day"]) {
        const key = room + "_" + period;
        const periodTile = this.shadowRoot.querySelector('[data-room-period="' + key + '"]');
        periodTile.querySelector(".number").textContent =
          this._config[key] ? this._value(this._config[key]) : "–";
      }
    }
  }
}

const atzeEnergyOverviewTag = ATZE_TESTING_BUILD
  ? "atze-energy-overview-card-testing"
  : "atze-energy-overview-card";
if (!customElements.get(atzeEnergyOverviewTag)) {
  customElements.define(atzeEnergyOverviewTag, AtzeEnergyOverviewCard);
}
