// Native ATZE energy overview card for standalone Lovelace dashboards.
// Uses the same translucent card surfaces and spacing as ATZE device cards.
class AtzeEnergyOverviewCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._backGesture = null;
    this._heroPinCleanup = null;
  }

  connectedCallback() {
    this._pinHero();
    if (this._backGesture) return;
    const gesture = { id: null, x: 0, y: 0, started: 0, active: false,
      indicator: null, blur: null, fade: null, fadeTimer: null };
    const cleanupVisuals = () => {
      gesture.indicator?.remove();
      gesture.blur?.remove();
      gesture.indicator = null;
      gesture.blur = null;
    };
    const reset = () => {
      gesture.id = null;
      gesture.active = false;
      cleanupVisuals();
    };
    const show = (progress) => {
      if (!gesture.indicator) {
        const indicator = document.createElement("div");
        indicator.setAttribute("aria-hidden", "true");
        indicator.innerHTML = '<ha-icon icon="mdi:arrow-left"></ha-icon>';
        indicator.style.cssText = [
          "position:fixed", "left:18px", "top:50%", "width:48px", "height:48px",
          "border-radius:50%", "display:flex", "align-items:center", "justify-content:center",
          "background:color-mix(in srgb, var(--primary-color, #03a9f4) 60%, transparent)",
          "color:var(--text-primary-color, #fff)", "box-shadow:0 6px 20px rgba(0,0,0,.28)",
          "pointer-events:none", "z-index:2147483646", "opacity:0",
          "transform:translate(-28px,-50%) scale(.85)",
          "transition:opacity 100ms ease, transform 100ms ease",
        ].join(";");
        document.body.appendChild(indicator);
        gesture.indicator = indicator;
        const blur = document.createElement("div");
        blur.setAttribute("aria-hidden", "true");
        blur.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483645;backdrop-filter:blur(0px);-webkit-backdrop-filter:blur(0px);transition:backdrop-filter 80ms linear,-webkit-backdrop-filter 80ms linear";
        document.body.appendChild(blur);
        gesture.blur = blur;
      }
      const p = Math.max(0, Math.min(1, progress));
      gesture.blur.style.backdropFilter = `blur(${(p * 6).toFixed(1)}px)`;
      gesture.blur.style.webkitBackdropFilter = `blur(${(p * 6).toFixed(1)}px)`;
      gesture.indicator.style.opacity = String(Math.min(1, p * 1.5));
      gesture.indicator.style.transform =
        `translate(${-28 + 28 * p}px,-50%) scale(${0.85 + 0.15 * p})`;
    };
    const goBack = () => {
      const target = String(this._config?.return_path || "").trim();
      if (target) {
        const current = window.location.pathname.split("/").filter(Boolean);
        const prefix = current.slice(0, -1).join("/");
        const url = target.startsWith("/") ? target
          : "/" + (prefix ? prefix + "/" : "") + target;
        window.history.pushState(null, "", url);
        window.dispatchEvent(new Event("location-changed"));
      } else if (window.history.length > 1) {
        window.history.back();
      } else {
        // Fallback for direct launches of the standalone energy dashboard.
        window.history.pushState(null, "", "/atze-test/home");
        window.dispatchEvent(new Event("location-changed"));
      }
    };
    const onStart = (event) => {
      if (gesture.id !== null || event.touches.length !== 1) return;
      if (this.shadowRoot?.querySelector(".period-dialog")?.open) return;
      const touch = event.touches[0];
      if (touch.clientX <= 28) return;
      if ((event.composedPath?.() || []).some(node =>
        node instanceof HTMLElement &&
        (["BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes(node.tagName) ||
          node.getAttribute("role") === "slider")
      )) return;
      gesture.id = touch.identifier;
      gesture.x = touch.clientX;
      gesture.y = touch.clientY;
      gesture.started = performance.now();
    };
    const onMove = (event) => {
      if (gesture.id === null) return;
      const touch = [...event.touches].find(t => t.identifier === gesture.id);
      if (!touch) return;
      const dx = touch.clientX - gesture.x;
      const dy = touch.clientY - gesture.y;
      if (!gesture.active) {
        if (Math.abs(dy) > 20 && Math.abs(dy) > Math.abs(dx) * 1.15) {
          reset();
          return;
        }
        if (dx <= 14 || dx < Math.abs(dy) * 1.05) return;
        gesture.active = true;
      }
      show(dx / 140);
    };
    const onEnd = (event) => {
      if (gesture.id === null) return;
      const touch = [...event.changedTouches].find(t => t.identifier === gesture.id);
      if (!touch) return;
      const dx = touch.clientX - gesture.x;
      const dy = touch.clientY - gesture.y;
      const done = gesture.active && dx >= 140 && Math.abs(dy) <= 110 &&
        dx >= Math.abs(dy) * 1.1 && performance.now() - gesture.started <= 1800;
      reset();
      if (done) {
        gesture.fade?.remove();
        const fade = document.createElement("div");
        fade.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none;background:var(--primary-background-color,#111827);opacity:0;transition:opacity 300ms ease-in-out";
        document.body.appendChild(fade);
        gesture.fade = fade;
        requestAnimationFrame(() => { fade.style.opacity = "1"; });
        gesture.fadeTimer = window.setTimeout(() => {
          goBack();
          fade.style.opacity = "0";
          gesture.fadeTimer = window.setTimeout(() => {
            fade.remove();
            if (gesture.fade === fade) gesture.fade = null;
          }, 420);
        }, 320);
      }
    };
    this.addEventListener("touchstart", onStart, { passive: true });
    this.addEventListener("touchmove", onMove, { passive: true });
    this.addEventListener("touchend", onEnd, { passive: true });
    this.addEventListener("touchcancel", reset, { passive: true });
    this._backGesture = () => {
      this.removeEventListener("touchstart", onStart);
      this.removeEventListener("touchmove", onMove);
      this.removeEventListener("touchend", onEnd);
      this.removeEventListener("touchcancel", reset);
      window.clearTimeout(gesture.fadeTimer);
      gesture.fade?.remove();
      reset();
    };
  }

  disconnectedCallback() {
    this._backGesture?.();
    this._backGesture = null;
    this._heroPinCleanup?.();
    this._heroPinCleanup = null;
  }

  setConfig(config) {
    this._config = {
      hero_image: "/local/stromverbrauch-titelbild.webp",
      // Optional absolute Home Assistant route, e.g. /atze-test/home.
      return_path: "",
      total: "",
      power: "",
      year: "",
      month: "",
      day: "",
      individual_meters: [],
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
      minimumFractionDigits: 0, maximumFractionDigits: 0,
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

  _roomDefinitions() {
    const configured = Array.isArray(this._config.individual_meters)
      ? this._config.individual_meters.filter(item => item?.total) : [];
    return configured.map((item, index) => ({
        key: "meter" + index,
        name: item.name ||
          this._hass?.states?.[item.total]?.attributes?.friendly_name ||
          item.total.replace(/^sensor\./, "").replaceAll("_", " "),
        icon: item.icon || "mdi:lightning-bolt",
        tone: ["#64b5f6", "#ae86ed", "#30d158", "#26b9cc"][index % 4],
        energy: item.total, year: item.year, month: item.month,
        day: item.day, power: item.power || "",
      }));
  }

  _roomEntity(room, key) {
    return room.energy !== undefined
      ? (room[key] || "")
      : this._config[room.key + "_" + key];
  }

  _details(entityId) {
    if (!entityId) return;
    this.dispatchEvent(new CustomEvent("hass-more-info", {
      bubbles: true, composed: true, detail: { entityId },
    }));
  }

  async _calibrate(period, rawValue) {
    const native = this._config.native_utility_meters &&
      (["year", "month", "day"].includes(period) || /^meter\d+_(year|month|day)$/.test(period));
    const entityId = this._config[period];
    const scriptId = this._config[period + "_script"];
    const value = Number(String(rawValue).replace(",", "."));
    const status = this.shadowRoot.querySelector(".dialog-status");
    if (String(rawValue).trim() === "" || !Number.isFinite(value) || value < 0) {
      status.textContent = "Bitte einen gültigen kWh-Wert ab 0 eingeben.";
      return;
    }
    if (native && (!entityId || !this._hass?.states?.[entityId])) {
      window.alert("Utility-Meter-Entität nicht verfügbar.");
      return;
    }
    if (!native && !(scriptId && value === 0)) return;
    const name = this.shadowRoot.querySelector(".dialog-title").textContent;
    if (!window.confirm(name + " wirklich auf " + value + " kWh setzen?")) return;
    const buttons = [...this.shadowRoot.querySelectorAll(".dialog-reset, .dialog-set")];
    buttons.forEach(button => { button.disabled = true; });
    status.textContent = "Wert wird übertragen …";
    try {
      if (native) {
        await this._hass.callService("utility_meter", "calibrate",
          { value }, { entity_id: entityId });
      } else {
        await this._hass.callService("script", "turn_on", { entity_id: scriptId });
      }
      status.textContent = "Wert erfolgreich auf " + value + " kWh gesetzt.";
    } catch (error) {
      console.error("ATZE Strom: Kalibrierung fehlgeschlagen", error);
      status.textContent = "Änderung fehlgeschlagen. Bitte Home Assistant prüfen.";
    } finally {
      buttons.forEach(button => { button.disabled = false; });
    }
  }

  _openPeriod(period) {
    const dialog = this.shadowRoot.querySelector(".period-dialog");
    const valid = ["year", "month", "day", "living_year", "living_month", "living_day",
      "bedroom_year", "kitchen_year", "washer_year",
      "bedroom_month", "bedroom_day", "kitchen_month", "kitchen_day",
      "washer_month", "washer_day"];
    if (!dialog || !(valid.includes(period) || /^meter\d+_(year|month|day)$/.test(period))) return;
    dialog.dataset.period = period;
    const roomLabels = { living: "Wohnzimmer", bedroom: "Schlafzimmer", kitchen: "Küche", washer: "Waschmaschine" };
    for (const definition of this._roomDefinitions()) roomLabels[definition.key] = definition.name;
    const [room, span] = period.includes("_") ? period.split("_") : [null, period];
    dialog.querySelector(".dialog-title").textContent =
      (room ? roomLabels[room] + " · " : "") +
      (span === "year" ? "Jahr" : span === "month" ? "Monat" : "Tag");
    dialog.querySelector(".dialog-status").textContent = "";
    const display = dialog.querySelector(".dialog-input");
    display.dataset.value = "";
    display.textContent = "Wert in kWh";
    display.classList.remove("has-value");
    this._updatePeriodDialog();
    if (!dialog.open) {
      // The in-dialog keypad never focuses an editable field, so iOS has no
      // reason to open its keyboard and pan the Home Assistant viewport.
      dialog.showModal();
      dialog.querySelector(".dialog-close")?.focus({ preventScroll: true });
    }
  }

  _updatePeriodDialog() {
    const dialog = this.shadowRoot?.querySelector(".period-dialog");
    if (!dialog?.dataset.period) return;
    const period = dialog.dataset.period;
    const resetEntity = this._config[period + "_reset"];
    dialog.querySelector(".dialog-date").textContent = resetEntity
      ? this._resetLabel(resetEntity) : "Nicht eingerichtet";
    dialog.querySelector(".dialog-value").textContent = this._value(this._config[period]);
    const nativeMeter = Boolean(this._config.native_utility_meters &&
        (["year", "month", "day"].includes(period) ||
          /^meter\d+_(year|month|day)$/.test(period)) && this._config[period]);
    dialog.querySelector(".dialog-reset").hidden =
      !(nativeMeter || this._config[period + "_script"]);
    dialog.querySelector(".dialog-set").hidden = !nativeMeter;
    dialog.querySelector(".dialog-input").hidden = !nativeMeter;
    dialog.querySelector(".dialog-keypad").hidden = !nativeMeter;
    dialog.querySelector(".dialog-date").parentElement.hidden = !resetEntity;
  }

  _pinHero() {
    this._heroPinCleanup?.();
    this._heroPinCleanup = null;
    const hero = this.shadowRoot?.querySelector(".energy-hero");
    const grid = this.shadowRoot?.querySelector(".grid");
    if (!hero || !grid || hero.hidden || !this.isConnected) return;
    // Retain the full image's space in the grid while its visual sits at
    // the very top of the screen. Never derive a sticky offset from a
    // scrolling element: that caused the image to float across data cards.
    const placeholder = document.createElement("div");
    placeholder.className = "energy-hero-placeholder";
    placeholder.setAttribute("aria-hidden", "true");
    grid.insertBefore(placeholder, hero);
    // The ATZE iOS app runs edge-to-edge. WKWebView can report a zero
    // safe-area inset despite the Dynamic Island, so provide an iPhone floor.
    const safeProbe = document.createElement("div");
    safeProbe.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top, 0px)";
    document.body.appendChild(safeProbe);
    const safeInset = parseFloat(getComputedStyle(safeProbe).paddingTop) || 0;
    safeProbe.remove();
    const isIPhone = /iPhone/i.test(navigator.userAgent);
    const pinnedTop = Math.max(safeInset, isIPhone ? 62 : 0);
    const topMask = document.createElement("div");
    topMask.setAttribute("aria-hidden", "true");
    topMask.style.cssText = [
      "position:fixed", "inset:0 0 auto 0",
      `height:${(pinnedTop + 2).toFixed(1)}px`, "pointer-events:none",
      "background:#000", "z-index:2147483600"
    ].join(";");
    document.body.appendChild(topMask);
    // A full-width band behind the image also covers the narrow left/right
    // gutters. The image itself remains above the band.
    const heroBandMask = document.createElement("div");
    heroBandMask.setAttribute("aria-hidden", "true");
    heroBandMask.style.cssText = [
      "position:fixed", "left:0", "right:0",
      `top:${pinnedTop.toFixed(1)}px`,
      "height:0", "pointer-events:none",
      "background:#000", "z-index:2147483600"
    ].join(";");
    document.body.appendChild(heroBandMask);
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!this.isConnected || !hero.isConnected) return;
      const rect = placeholder.getBoundingClientRect();
      const width = rect.width;
      if (width <= 0) return;
      const height = width * 860 / 1672;
      placeholder.style.height = height.toFixed(1) + "px";
      heroBandMask.style.height = (height + 2).toFixed(1) + "px";
      hero.style.position = "fixed";
      hero.style.top = pinnedTop.toFixed(1) + "px";
      hero.style.left = rect.left.toFixed(1) + "px";
      hero.style.width = width.toFixed(1) + "px";
      hero.style.height = height.toFixed(1) + "px";
      hero.style.margin = "0";
      hero.style.zIndex = "2147483601";
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("resize", schedule, { passive:true });
    window.addEventListener("scroll", schedule, true);
    schedule();
    this._heroPinCleanup = () => {
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      if (frame) cancelAnimationFrame(frame);
      placeholder.remove();
      topMask.remove();
      heroBandMask.remove();
      hero.style.removeProperty("position");
      hero.style.removeProperty("top");
      hero.style.removeProperty("left");
      hero.style.removeProperty("width");
      hero.style.removeProperty("height");
      hero.style.removeProperty("margin");
      hero.style.removeProperty("z-index");
    };
  }


  async _buildReport() {
    const ui=this.shadowRoot, btn=ui.querySelector(".report-run"), status=ui.querySelector(".report-status");
    const ym=ui.querySelector(".report-month").value;
    if(!/^\d{4}-\d{2}$/.test(ym)) { status.textContent="Bitte einen gültigen Monat auswählen."; return; }
    if(!this._config.day) { status.textContent="Gesamtstrom-Tageszähler ist nicht konfiguriert."; return; }
    const [y,m]=ym.split("-").map(Number), from=new Date(y,m-1,1), to=new Date(y,m,1);
    const rooms=this._roomDefinitions(), ids=[...new Set([this._config.day,...rooms.map(r=>r.day)].filter(Boolean))];
    btn.disabled=true;status.textContent="Lese Tagesstatistiken …";
    try {
      const result=await this._hass.callWS({type:"recorder/statistics_during_period",
        start_time:from.toISOString(),end_time:to.toISOString(),period:"day",statistic_ids:ids,types:["change"]});
      const valid=id=>(result[id]||[]).filter(v=>typeof v.change==="number"&&Number.isFinite(v.change));
      const days=valid(this._config.day);
      if(!days.length){status.textContent="Keine auswertbaren Tagesdaten vorhanden.";return;}
      const sum=a=>a.reduce((n,v)=>n+v.change,0);
      const fmt=n=>new Intl.NumberFormat("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)+" kWh";
      const esc=x=>String(x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
      const label=new Intl.DateTimeFormat("de-DE",{month:"long",year:"numeric"}).format(from);
      const incomplete=days.length<new Date(y,m,0).getDate()||to>Date.now();
      const dayHTML=days.map(d=>"<tr><td>"+new Date(d.start).toLocaleDateString("de-DE",{timeZone:"Europe/Berlin"})+"</td><td>"+fmt(d.change)+"</td></tr>").join("");
      const deviceHTML=rooms.map(r=>{const d=valid(r.day);return "<tr><td>"+esc(r.name)+"</td><td>"+(d.length?fmt(sum(d)):"Keine Daten")+"</td></tr>";}).join("");
      this._reportMarkup=`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>ATZE Strombericht</title>
<style>@page{size:A4;margin:17mm}body{font:14px system-ui;color:#192a40}
h1{font-size:28px}header{color:#1675c5;font-weight:bold}.amount{font-size:30px;font-weight:700}
.summary{background:#eaf2fa;padding:18px;border-radius:12px}table{width:100%;border-collapse:collapse}
td,th{text-align:left;padding:9px;border-bottom:1px solid #ddd}td:last-child,th:last-child{text-align:right}
p{color:#536478;line-height:1.5}h2{margin-top:24px}</style></head><body>
<header>ATZE HOME · STROMBERICHT</header><h1>${esc(label)}</h1>
<div class="summary">Gesamtverbrauch<div class="amount">${fmt(sum(days))}</div></div>
<p>${incomplete?"Teilmonat / unvollständige Statistik. ":""}${days.length} erfasste Tagesperioden.
Keine Hochrechnung. Datenquelle: Home Assistant Langzeitstatistik.</p>
<h2>Tagesverbrauch</h2><table><tr><th>Datum</th><th>Verbrauch</th></tr>${dayHTML}</table>
<h2>Einzelverbraucher (informativ)</h2><p>Diese Werte werden nicht zum Gesamtstrom hinzuaddiert.
Fehlende Messwerte bedeuten nicht Nullverbrauch.</p>
<table><tr><th>Verbraucher</th><th>Verbrauch</th></tr>${deviceHTML}</table>
<p>Keine Kostenberechnung ohne verifizierten Stromtarif. Erstellt: ${new Date().toLocaleString("de-DE")}.</p>
</body></html>`;
      ui.querySelector(".report-print").hidden=false;
      status.textContent=label+": "+fmt(sum(days))+(incomplete?" (Teilmonat)":"")+" · PDF bereit";
    }catch(e){status.textContent="Statistikabfrage fehlgeschlagen: "+(e?.message||String(e));}
    finally{btn.disabled=false;}
  }
  _printReport() {
    if (!this._reportMarkup) return;
    // Show a real, visible report. Printing an invisible iframe is unreliable
    // in the ATZE Home WKWebView and must not be reported as success.
    this.shadowRoot.querySelector(".report-viewer")?.remove();
    const viewer = document.createElement("div");
    viewer.className = "report-viewer";
    viewer.setAttribute("role", "dialog");
    viewer.setAttribute("aria-modal", "true");
    viewer.setAttribute("aria-label", "Strom-Monatsbericht");
    viewer.style.cssText = "position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.86);display:flex;flex-direction:column;padding:env(safe-area-inset-top,12px) 10px env(safe-area-inset-bottom,12px);box-sizing:border-box;gap:10px";
    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:10px;color:white;padding:10px";
    const heading = document.createElement("strong");
    heading.textContent = "Strom-Monatsbericht";
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "Schließen";
    close.style.cssText = "padding:10px 14px;border:0;border-radius:10px;background:#334155;color:white;font:inherit";
    close.addEventListener("click", () => viewer.remove());
    actions.append(heading, close);
    const frame = document.createElement("iframe");
    frame.title = "Strom-Monatsbericht";
    frame.style.cssText = "display:block;flex:1;min-height:0;width:100%;background:white;border:0;border-radius:12px";
    frame.srcdoc = this._reportMarkup;
    viewer.append(actions, frame);
    this.shadowRoot.appendChild(viewer);
    this.shadowRoot.querySelector(".report-status").textContent =
      "Bericht angezeigt. Der direkte PDF-Export in der App ist noch nicht verfügbar.";
  }

  _render() {
    this._heroPinCleanup?.();
    this._heroPinCleanup = null;
    const cards = [
      { key: "month", title: "Monat", icon: "mdi:calendar-month", tone: "#30d158", reset: "month_reset", action: true },
      { key: "day", title: "Tag", icon: "mdi:calendar-today", tone: "#ff9f0a", reset: "day_reset", action: true },
    ];
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; min-width:0 }
        .grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px }
        .tile[hidden] { display:none }
        .energy-hero-placeholder { grid-column:1/-1; width:100%; min-width:0 }
        .energy-hero { grid-column:1/-1;
          width:100%; min-width:0; overflow:hidden; border-radius:16px;
          margin:0 0 6px; background:rgba(55,58,67,.30);
          border:1px solid var(--home-card-border,rgba(255,255,255,.10));
          box-sizing:border-box }
        .energy-hero img { display:block; width:100%; aspect-ratio:1672/860;
          object-fit:cover; object-position:center top }
        .energy-hero[hidden] { display:none }
        .energy-hero-error { display:none; padding:12px; font-size:12px; line-height:1.5;
          color:var(--secondary-text-color); overflow-wrap:anywhere }
        .energy-hero.failed img { display:none }
        .energy-hero.failed .energy-hero-error { display:block }
        .tile { box-sizing:border-box; min-width:0; min-height:132px; padding:13px;
          border:1px solid var(--home-card-border,rgba(255,255,255,.10));
          border-radius:16px; background:rgba(55,58,67,.30);
          backdrop-filter:blur(10px) saturate(1.2); -webkit-backdrop-filter:blur(10px) saturate(1.2);
          color:var(--primary-text-color); display:flex; flex-direction:column; gap:10px }
        .tile.total { grid-column:1 / -1; --accent:#ffb900; min-height:108px; padding-top:10px; padding-bottom:10px; gap:6px }
        .tile.period { min-height:54px; padding-top:8px; padding-bottom:8px; cursor:pointer; justify-content:center; gap:0 }
        .tile.period .head { width:100% }
        .period-value { margin-left:auto; min-width:0; display:flex; align-items:baseline;
          justify-content:flex-end; gap:4px; font-size:clamp(16px,4.5vw,22px);
          line-height:1.2; font-weight:700; font-variant-numeric:tabular-nums;
          text-align:right; overflow-wrap:anywhere }
        .period-value .unit { font-size:11px; white-space:nowrap }
        .room-heading { grid-column:1/-1; margin:12px 0 0; display:flex; align-items:center;
          gap:8px; font-size:15px; font-weight:650; color:var(--primary-text-color) }
        .room-heading ha-icon { --mdc-icon-size:20px; color:var(--secondary-text-color) }
        .tile.room { min-height:108px; gap:6px; padding-top:10px; padding-bottom:10px }
        .room-section { grid-column:1/-1; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-top:12px }
        .room-section .room-heading { grid-column:1/-1; margin:0 0 1px }
        .room-section .tile.room-total { grid-column:1/-1; min-height:108px }
        .room-section .tile.period { min-height:54px }
        .room-section .room-power { display:flex; }
        .dialog-reset[hidden], .dialog-set[hidden], .dialog-input[hidden],
        .dialog-keypad[hidden] { display:none }
        .tile.room:focus-visible { outline:2px solid var(--primary-color); outline-offset:2px }
        .room-power { font-size:14px; font-weight:600; font-variant-numeric:tabular-nums }
        .room-power .unit { font-size:11px }
        .room-wide { grid-column:1/-1 }
        .tile.period:focus-visible { outline:2px solid var(--primary-color); outline-offset:2px }
        .head { display:flex; align-items:center; gap:7px; min-width:0 }
        .head .live-power, .head .room-power { display:flex; align-items:baseline; justify-content:flex-end;
          gap:4px; margin-left:auto; min-width:0; white-space:nowrap; text-align:right;
          font-size:14px; font-weight:600; font-variant-numeric:tabular-nums }
        .head .live-power .unit, .head .room-power .unit { font-size:11px }
        .head .live-power[hidden] { display:none }
        .head ha-icon { --mdc-icon-size:20px; flex:none; color:var(--accent) }
        .title { font-size:13px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
        .value { font-size:clamp(30px,8vw,40px); font-weight:700; line-height:1.15;
          font-variant-numeric:tabular-nums; overflow-wrap:anywhere; text-align:center; width:100% }
        .unit { font-size:12px; font-weight:400; color:var(--secondary-text-color) }
        .summary { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; padding:1px 0 }
        .summary-item { min-width:0; display:flex; flex-direction:column; align-items:center; gap:4px }
        .summary-label { color:var(--secondary-text-color); font-size:11px }
        .summary-value { font-size:clamp(28px,7vw,40px); font-weight:700; line-height:1.15;
          font-variant-numeric:tabular-nums; text-align:center; overflow-wrap:anywhere }
        .period-dialog { box-sizing:border-box; width:min(340px,calc(100vw - 36px));
          position:fixed; inset:auto; left:50%; top:50%; transform:translate(-50%,-50%);
          max-height:calc(100dvh - 44px); overflow:auto; margin:0; padding:18px;
          border:1px solid var(--home-card-border,rgba(255,255,255,.16)); border-radius:20px;
          background:var(--card-background-color,#202126); color:var(--primary-text-color);
          box-shadow:0 18px 50px rgba(0,0,0,.45) }
        .period-dialog::backdrop { background:rgba(0,0,0,.62); backdrop-filter:blur(4px) }
        .dialog-title { font-size:18px; font-weight:650; margin-bottom:12px }
        .dialog-close { position:absolute; top:14px; right:14px; width:32px; height:32px;
          display:flex; align-items:center; justify-content:center; border:0;
          border-radius:50%; background:rgba(118,118,128,.22);
          color:var(--primary-text-color); cursor:pointer }
        .dialog-close ha-icon { --mdc-icon-size:19px }
        .dialog-value-line { text-align:center; margin-bottom:12px; font-weight:700; font-size:32px }
        .dialog-meta { display:flex; align-items:center; justify-content:space-between; gap:10px;
          font-size:12px; color:var(--secondary-text-color) }
        .dialog-date { margin-top:5px; color:var(--primary-text-color); font-size:14px }
        .dialog-reset { appearance:none; display:flex; align-items:center; gap:7px;
          padding:9px 12px; border-radius:10px; cursor:pointer;
          border:1px solid var(--home-card-border,rgba(255,255,255,.16));
          background:rgba(118,118,128,.22); color:var(--primary-text-color); font:inherit }
        .dialog-reset ha-icon { --mdc-icon-size:18px }
        .dialog-reset:disabled { opacity:.45; cursor:wait }
        .dialog-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px }
        .dialog-input { box-sizing:border-box; width:100%; padding:10px 12px;
          border:1px solid var(--primary-color,#1683ff); border-radius:10px;
          background:rgba(118,118,128,.18); color:var(--secondary-text-color); font:inherit;
          font-size:20px; font-variant-numeric:tabular-nums; text-align:right }
        .dialog-input.has-value { color:var(--primary-text-color) }
        .dialog-keypad { display:grid; grid-template-columns:repeat(3,minmax(0,1fr));
          gap:7px; margin-top:10px }
        .dialog-key { min-height:46px; border:1px solid rgba(255,255,255,.07);
          border-radius:11px; background:rgba(118,118,128,.22); color:var(--primary-text-color);
          font:inherit; font-size:23px; font-weight:550; cursor:pointer; touch-action:manipulation }
        .dialog-key:active { background:rgba(118,118,128,.48) }
        .dialog-key[aria-label="Letztes Zeichen löschen"] { font-size:20px }
        .dialog-set { padding:9px 12px; border-radius:10px; cursor:pointer;
          border:1px solid var(--home-card-border,rgba(255,255,255,.16));
          background:rgba(118,118,128,.22); color:var(--primary-text-color); font:inherit }
        .dialog-set:disabled { opacity:.45; cursor:wait }
        .dialog-status { min-height:16px; margin-top:10px; font-size:12px; color:var(--secondary-text-color) }
        .report-panel{margin-top:12px;padding:14px;border-radius:14px;background:rgba(55,58,67,.3);color:var(--primary-text-color)}
        .report-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
        .report-actions button,.report-actions input{font:inherit;border-radius:9px;padding:9px;border:1px solid rgba(255,255,255,.2);background:rgba(118,118,128,.22);color:inherit}
        .report-actions button:disabled{opacity:.5}.report-print[hidden]{display:none}
        .report-status{font-size:12px;margin-top:8px;color:var(--secondary-text-color)}
        @media(max-width:350px) { .grid{gap:7px} .tile{padding:10px} .title{font-size:12px} .summary{gap:5px} }
      </style>
      <div class="grid">
        <div class="energy-hero"><img alt="Stromverbrauch – Smart-Home-Energieübersicht" loading="eager"><div class="energy-hero-error" role="status"></div></div>
        <div class="tile total" data-period="total">
          <div class="head"><ha-icon icon="mdi:lightning-bolt"></ha-icon><span class="title">Gesamtstrom</span><div class="live-power" hidden><span class="power-number"></span><span class="unit">W aktuell</span></div></div>
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
        </div>
      </div>
      <div class="report-panel"><strong>Monatsbericht</strong>
        <div class="report-actions"><input type="month" class="report-month" aria-label="Monat">
        <button type="button" class="report-run">Bericht erstellen</button>
        <button type="button" class="report-print" hidden>Bericht ansehen</button></div>
        <div class="report-status" role="status">Datenabruf nur auf Knopfdruck.</div></div>
      <dialog class="period-dialog" aria-labelledby="energy-period-dialog-title">
        <button class="dialog-close" type="button" autofocus aria-label="Popup schließen" title="Schließen"><ha-icon icon="mdi:close"></ha-icon></button>
        <div class="dialog-title" id="energy-period-dialog-title"></div>
        <div class="dialog-value-line"><span class="dialog-value"></span> <span class="unit">kWh</span></div>
        <div class="dialog-meta">
          <div><div>Zurückgesetzt am</div><div class="dialog-date"></div></div>
        </div>
        <div class="dialog-entry">
          <div class="dialog-input" role="textbox" aria-label="Neuer Zählerstand in kWh"
            aria-readonly="true">Wert in kWh</div>
          <div class="dialog-keypad" role="group" aria-label="Zahlentastatur">
            <button class="dialog-key" type="button" data-key="1">1</button>
            <button class="dialog-key" type="button" data-key="2">2</button>
            <button class="dialog-key" type="button" data-key="3">3</button>
            <button class="dialog-key" type="button" data-key="4">4</button>
            <button class="dialog-key" type="button" data-key="5">5</button>
            <button class="dialog-key" type="button" data-key="6">6</button>
            <button class="dialog-key" type="button" data-key="7">7</button>
            <button class="dialog-key" type="button" data-key="8">8</button>
            <button class="dialog-key" type="button" data-key="9">9</button>
            <button class="dialog-key" type="button" data-key=",">,</button>
            <button class="dialog-key" type="button" data-key="0">0</button>
            <button class="dialog-key" type="button" data-key="backspace" aria-label="Letztes Zeichen löschen">⌫</button>
          </div>
        </div>
        <div class="dialog-actions">
          <button class="dialog-set" type="button">Wert setzen</button>
          <button class="dialog-reset" type="button"><ha-icon icon="mdi:restart"></ha-icon>Zurücksetzen</button>
        </div>
        <div class="dialog-status" role="status" aria-live="polite"></div>
      </dialog>`;
    const dialog = this.shadowRoot.querySelector(".period-dialog");
    dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        const bounds = dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
      }
    });
    dialog.querySelector(".dialog-reset").addEventListener("click", () => this._calibrate(dialog.dataset.period, "0"));
    dialog.querySelector(".dialog-set").addEventListener("click", () =>
      this._calibrate(dialog.dataset.period, dialog.querySelector(".dialog-input").dataset.value));
    const display = dialog.querySelector(".dialog-input");
    for (const key of dialog.querySelectorAll(".dialog-key")) {
      key.addEventListener("click", () => {
        const digit = key.dataset.key;
        const current = display.dataset.value || "";
        let next = current;
        if (digit === "backspace") next = current.slice(0, -1);
        else if (digit === ",") {
          if (!current.includes(",")) next = (current || "0") + ",";
        } else if (current.length < 14) {
          next = current === "0" ? digit : current + digit;
        }
        display.dataset.value = next;
        display.textContent = next ? next + " kWh" : "Wert in kWh";
        display.classList.toggle("has-value", Boolean(next));
        dialog.querySelector(".dialog-status").textContent = "";
      });
    }
    const reportMonth=this.shadowRoot.querySelector(".report-month");
    const today=new Date();
    reportMonth.value=today.getFullYear()+"-"+String(today.getMonth()+1).padStart(2,"0");
    reportMonth.addEventListener("change",()=>{this._reportMarkup=null;this.shadowRoot.querySelector(".report-print").hidden=true;});
    this.shadowRoot.querySelector(".report-run").addEventListener("click",()=>this._buildReport());
    this.shadowRoot.querySelector(".report-print").addEventListener("click",()=>this._printReport());
    const hero = this.shadowRoot.querySelector(".energy-hero");
    const heroImage = hero.querySelector("img");
    if (this._config.hero_image) {
      heroImage.onload = () => { hero.classList.remove("failed"); };
      heroImage.onerror = () => {
        hero.classList.add("failed");
        hero.querySelector(".energy-hero-error").textContent =
          "Titelbild konnte nicht geladen werden: " + heroImage.src;
      };
      const separator = this._config.hero_image.includes("?") ? "&" : "?";
      heroImage.src = this._config.hero_image + separator + "atze_image=2";
    } else {
      hero.hidden = true;
    }
    const grid = this.shadowRoot.querySelector(".grid");
    const hasTotal = Boolean(this._config.total);
    grid.querySelector(".tile.total").hidden = !hasTotal;
    if (!hasTotal && !this._roomDefinitions().length) {
      const empty = document.createElement("div");
      empty.className = "energy-empty";
      empty.style.cssText = "grid-column:1/-1;padding:24px 16px;text-align:center;color:var(--secondary-text-color);";
      empty.textContent = "Noch keine Stromsensoren eingerichtet. Wähle einen Gesamtstromsensor oder Energie-Hauptsensor in den Einstellungen.";
      grid.appendChild(empty);
    }
    for (const period of ["total", "year"]) {
      const detail = this.shadowRoot.querySelector('[data-detail="' + period + '"]');
      const open = () => period === "year"
        ? this._openPeriod("year") : this._details(this._config[period]);
      detail.addEventListener("click", open);
      detail.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });
    }
    for (const card of cards) {
      if (!hasTotal) continue;
      const tile = document.createElement("div");
      tile.className = "tile period";
      tile.tabIndex = 0;
      tile.setAttribute("role", "button");
      tile.setAttribute("aria-label", card.title + " – Optionen öffnen");
      tile.style.setProperty("--accent", card.tone);
      tile.innerHTML = `<div class="head"><ha-icon></ha-icon><span class="title"></span>
          <span class="period-value"><span class="number"></span> <span class="unit">kWh</span></span></div>`;
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
    const rooms = this._roomDefinitions();
    for (const room of rooms) {
      if (room.energy !== undefined) {
        for (const metric of ["energy", "year", "month", "day", "power"]) {
          this._config[room.key + "_" + metric] = room[metric] || "";
        }
      }
      const section = document.createElement("section");
      section.className = "room-section";
      section.dataset.roomSection = room.key;
      section.innerHTML = `<div class="room-heading"><ha-icon></ha-icon><span></span></div>
        <div class="tile room room-total" data-room="${room.key}">
          <div class="head"><ha-icon></ha-icon><span class="title">Stromverbrauch</span><div class="room-power"><span class="room-watts"></span><span class="unit">W aktuell</span></div></div>
          <div class="summary">
            <div class="summary-item" data-room-detail="energy" tabindex="0" role="button" aria-label="Gesamtverbrauch Details">
              <span class="summary-label">Gesamtverbrauch</span>
              <div class="summary-value"><span class="room-energy"></span> <span class="unit">kWh</span></div>
            </div>
            <div class="summary-item" data-room-detail="year" tabindex="0" role="button" aria-label="Jahresverbrauch Details">
              <span class="summary-label">Dieses Jahr</span>
              <div class="summary-value"><span class="room-year"></span> <span class="unit">kWh</span></div>
            </div>
          </div>
        </div>`;
      section.querySelector(".room-heading ha-icon").setAttribute("icon", room.icon);
      section.querySelector(".room-heading span").textContent = room.name;
      section.querySelector(".room-total").style.setProperty("--accent", room.tone);
      section.querySelector(".room-total .head ha-icon").setAttribute("icon", "mdi:lightning-bolt");
      const total = section.querySelector(".room-total");
      for (const metric of ["energy", "year"]) {
        const detail = total.querySelector('[data-room-detail="' + metric + '"]');
        const open = () => metric === "year"
          ? this._openPeriod(room.key + "_year")
          : this._details(this._config[room.key + "_" + metric]);
        detail.addEventListener("click", open);
        detail.addEventListener("keydown", event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            open();
          }
        });
      }
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
        tile.innerHTML = `<div class="head"><ha-icon></ha-icon><span class="title"></span>
          <span class="period-value"><span class="number"></span> <span class="unit">kWh</span></span></div>`;
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
    this._pinHero();
  }

  _update() {
    if (!this.shadowRoot?.querySelector(".grid")) return;
    const total = this.shadowRoot.querySelector('[data-period="total"]');
    if (this._config.total) {
      total.querySelector(".total-number").textContent = this._value(this._config.total);
      total.querySelector(".year-number").textContent = this._value(this._config.year);
      const power = total.querySelector(".live-power");
      power.hidden = !this._config.power;
      if (this._config.power) power.querySelector(".power-number").textContent = this._value(this._config.power);
    }
    for (const period of ["month", "day"]) {
      const tile = this.shadowRoot.querySelector('[data-period="' + period + '"]');
      if (!tile) continue;
      tile.querySelector(".number").textContent = this._value(this._config[period]);
    }
    this._updatePeriodDialog();
    for (const room of this._roomDefinitions()) {
      const tile = this.shadowRoot.querySelector('[data-room="' + room.key + '"]');
      if (!tile) continue;
      tile.closest(".room-section").querySelector(".room-heading span").textContent = room.name;
      tile.querySelector(".room-energy").textContent = this._value(this._roomEntity(room, "energy"));
      tile.querySelector(".room-year").textContent = this._value(this._roomEntity(room, "year"));
      const watts = tile.querySelector(".room-power");
      watts.hidden = !this._roomEntity(room, "power");
      tile.querySelector(".room-watts").textContent = this._value(this._roomEntity(room, "power"));
      for (const period of ["month", "day"]) {
        const key = room.key + "_" + period;
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
