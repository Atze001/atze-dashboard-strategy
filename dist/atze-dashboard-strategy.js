/**
 * Atze Dashboard Strategy
 * Version source: ATZE_VERSION below
 *
 * v0.159 focus:
 * - Split the source into maintainable build modules
 *
 * License: MIT
 */

const ATZE_VERSION = "0.191.0";
const STRATEGY_TYPE = "atze-dashboard";

const ATZE_LIGHT_HELPER_CATEGORY =
  "Atze Dashboard Strategy - Licht";

const ATZE_DS_LIGHT_BLUEPRINT_PATH =
  "atze dashboard strategy/atze-ds-lichtsteuerung.yaml";

const ATZE_DS_LIGHT_BLUEPRINT_VERSION = "0.191.0";

const ATZE_DS_LIGHT_BLUEPRINT_YAML = String.raw`blueprint:
  author: Atze
  name: Atze DS - Lichtsteuerung
  description: >
    Version 0.191.0. Kombiniert die Atze Motion Licht Logik mit der direkten
    Morgen-/Abend-/Nacht-Lichtsteuerung. Motion Sensoren, Schalter,
    Helligkeitssensor, Rollladen, Unterbrecher und Helligkeitsregler sind optional.
  domain: automation

  input:
    target_light:
      name: Auswahl Licht
      description: Wähle ein oder mehrere Lichter aus.
      selector:
        entity:
          multiple: true
          filter:
            - domain: light

    motion_sensor:
      name: Auswahl Motion Sensor (Optional)
      description: Wähle optional einen oder mehrere Motion-/Anwesenheitssensoren aus.
      default: []
      selector:
        entity:
          multiple: true
          filter:
            - domain: binary_sensor
              device_class:
                - motion
                - occupancy

    target_switch:
      name: Schalter (Optional)
      description: Wähle optional einen oder mehrere Schalter aus.
      default: []
      selector:
        entity:
          multiple: true
          filter:
            - domain: switch

    light_sensor:
      name: Helligkeitssensor (Optional)
      description: Wähle optional einen Helligkeitssensor aus.
      default: []
      selector:
        entity:
          filter:
            - domain: sensor
              device_class: illuminance

    cover_sensor:
      name: Rollladen (Optional)
      description: Wähle optional einen Rollladen aus.
      default: []
      selector:
        entity:
          filter:
            - domain: cover
              device_class: shutter

    break_sensor:
      name: Unterbrecher (Optional)
      description: >
        Optionaler Unterbrecher. Ist dieser ausgeschaltet, wird das Einschalten
        durch Motion blockiert. Manuelles Einschalten und Ausschalten bleiben möglich.
      default: []
      selector:
        entity: {}

    light_regler:
      name: Helligkeitsregler (Optional)
      description: Wähle optional einen Input-Number-Helfer als Helligkeitsgrenze aus.
      default: []
      selector:
        entity:
          filter:
            - domain: input_number

    nachlaufzeit:
      name: Nachlaufzeit
      description: Zeit nach Ende der Anwesenheit bis Licht und Schalter ausgeschaltet werden.
      default: 0
      selector:
        number:
          min: 0
          max: 3600
          step: 1
          unit_of_measurement: s
          mode: box

    morgen_zeit:
      name: Morgen Startzeit
      default: "05:30:00"
      selector:
        time: {}

    helligkeit_morgen:
      name: Helligkeit Morgen
      default: 80
      selector:
        number:
          min: 0
          max: 100
          step: 5
          unit_of_measurement: "%"
          mode: slider

    farbe_morgen:
      name: Farbtemperatur Morgen
      default: 4500
      selector:
        number:
          min: 2000
          max: 6500
          step: 100
          unit_of_measurement: K
          mode: slider

    abend_zeit:
      name: Abend Startzeit
      default: "21:00:00"
      selector:
        time: {}

    helligkeit_abend:
      name: Helligkeit Abend
      default: 50
      selector:
        number:
          min: 0
          max: 100
          step: 5
          unit_of_measurement: "%"
          mode: slider

    farbe_abend:
      name: Farbtemperatur Abend
      default: 3300
      selector:
        number:
          min: 2000
          max: 6500
          step: 100
          unit_of_measurement: K
          mode: slider

    nacht_zeit:
      name: Nacht Startzeit
      default: "23:00:00"
      selector:
        time: {}

    helligkeit_nacht:
      name: Helligkeit Nacht
      default: 5
      selector:
        number:
          min: 0
          max: 100
          step: 5
          unit_of_measurement: "%"
          mode: slider

    farbe_nacht:
      name: Farbtemperatur Nacht
      default: 2700
      selector:
        number:
          min: 2000
          max: 6500
          step: 100
          unit_of_measurement: K
          mode: slider

mode: parallel
max: 10
max_exceeded: silent

trigger_variables:
  motion_sensor_trigger: !input motion_sensor

triggers:
  - trigger: state
    entity_id: !input target_light
    from: "off"
    to: "on"
    id: Licht Eingeschaltet

  - trigger: template
    value_template: >-
      {{
        motion_sensor_trigger | count > 0
        and expand(motion_sensor_trigger)
          | selectattr('state', 'eq', 'on')
          | list | count > 0
      }}
    id: Presence Erkannt

  - trigger: template
    value_template: >-
      {{
        motion_sensor_trigger | count > 0
        and expand(motion_sensor_trigger)
          | selectattr('state', 'eq', 'on')
          | list | count == 0
      }}
    id: Presence Frei

conditions: []

variables:
  motion_sensor: !input motion_sensor
  target_light: !input target_light
  target_switch: !input target_switch
  cover_sensor: !input cover_sensor
  break_sensor: !input break_sensor
  light_sensor: !input light_sensor
  light_regler: !input light_regler
  nachlaufzeit_wert: !input nachlaufzeit
  morgen_zeit_wert: !input morgen_zeit
  helligkeit_morgen_wert: !input helligkeit_morgen
  farbe_morgen_wert: !input farbe_morgen
  abend_zeit_wert: !input abend_zeit
  helligkeit_abend_wert: !input helligkeit_abend
  farbe_abend_wert: !input farbe_abend
  nacht_zeit_wert: !input nacht_zeit
  helligkeit_nacht_wert: !input helligkeit_nacht
  farbe_nacht_wert: !input farbe_nacht

  morgen_start_sekunden: >-
    {% set t = morgen_zeit_wert.split(':') %}
    {{ (t[0] | int * 3600) + (t[1] | int * 60) + (t[2] | int) }}
  abend_start_sekunden: >-
    {% set t = abend_zeit_wert.split(':') %}
    {{ (t[0] | int * 3600) + (t[1] | int * 60) + (t[2] | int) }}
  nacht_start_sekunden: >-
    {% set t = nacht_zeit_wert.split(':') %}
    {{ (t[0] | int * 3600) + (t[1] | int * 60) + (t[2] | int) }}

  aktuelle_helligkeit: >-
    {% set jetzt = now().hour * 3600 + now().minute * 60 + now().second %}
    {% set morgen = morgen_start_sekunden | int %}
    {% set abend = abend_start_sekunden | int %}
    {% set nacht = nacht_start_sekunden | int %}
    {% if (morgen <= abend and morgen <= jetzt < abend) or (morgen > abend and (jetzt >= morgen or jetzt < abend)) %}
      {{ helligkeit_morgen_wert | int }}
    {% elif (abend <= nacht and abend <= jetzt < nacht) or (abend > nacht and (jetzt >= abend or jetzt < nacht)) %}
      {{ helligkeit_abend_wert | int }}
    {% else %}
      {{ helligkeit_nacht_wert | int }}
    {% endif %}

  aktuelle_farbtemperatur: >-
    {% set jetzt = now().hour * 3600 + now().minute * 60 + now().second %}
    {% set morgen = morgen_start_sekunden | int %}
    {% set abend = abend_start_sekunden | int %}
    {% set nacht = nacht_start_sekunden | int %}
    {% if (morgen <= abend and morgen <= jetzt < abend) or (morgen > abend and (jetzt >= morgen or jetzt < abend)) %}
      {{ farbe_morgen_wert | int }}
    {% elif (abend <= nacht and abend <= jetzt < nacht) or (abend > nacht and (jetzt >= abend or jetzt < nacht)) %}
      {{ farbe_abend_wert | int }}
    {% else %}
      {{ farbe_nacht_wert | int }}
    {% endif %}

actions:
  - choose:
      - alias: Licht eingeschaltet
        conditions:
          - condition: trigger
            id: Licht Eingeschaltet
        sequence:
          - action: light.turn_on
            target:
              entity_id: "{{ trigger.entity_id }}"
            data:
              brightness_pct: "{{ aktuelle_helligkeit | int }}"
              color_temp_kelvin: "{{ aktuelle_farbtemperatur | int }}"

      - alias: Presence Erkannt
        conditions:
          - condition: trigger
            id: Presence Erkannt
          - condition: template
            value_template: >-
              {{
                break_sensor == none
                or break_sensor == ''
                or break_sensor == []
                or is_state(break_sensor, 'on')
              }}
          - condition: template
            value_template: >-
              {% set helligkeit_aktiv = light_sensor != none and light_sensor != '' and light_sensor != [] and light_regler != none and light_regler != '' and light_regler != [] %}
              {% set rollladen_aktiv = cover_sensor != none and cover_sensor != '' and cover_sensor != [] %}
              {{
                (not helligkeit_aktiv and not rollladen_aktiv)
                or (helligkeit_aktiv and states(light_sensor) | float(0) < states(light_regler) | float(0))
                or (rollladen_aktiv and is_state(cover_sensor, 'closed'))
              }}
        sequence:
          - action: light.turn_on
            target:
              entity_id: !input target_light
            data:
              brightness_pct: "{{ aktuelle_helligkeit | int }}"
              color_temp_kelvin: "{{ aktuelle_farbtemperatur | int }}"
          - if:
              - condition: template
                value_template: "{{ target_switch != none and target_switch != '' and target_switch != [] }}"
            then:
              - action: homeassistant.turn_on
                target:
                  entity_id: !input target_switch

      - alias: Presence Frei
        conditions:
          - condition: trigger
            id: Presence Frei
        sequence:
          - delay:
              seconds: "{{ nachlaufzeit_wert | int(0) }}"
          - condition: template
            value_template: >-
              {{
                motion_sensor | count > 0
                and expand(motion_sensor)
                  | selectattr('state', 'eq', 'on')
                  | list | count == 0
              }}
          - action: homeassistant.turn_off
            target:
              entity_id: !input target_light
          - if:
              - condition: template
                value_template: "{{ target_switch != none and target_switch != '' and target_switch != [] }}"
            then:
              - action: homeassistant.turn_off
                target:
                  entity_id: !input target_switch
`;

async function ensureAtzeLightBlueprint(hass) {
  if (!hass) {
    throw new Error("Home Assistant ist noch nicht verfügbar.");
  }

  const listBlueprints = () =>
    hass.callWS({
      type: "blueprint/list",
      domain: "automation",
    });

  const ensureBlueprint = async (path, yaml, version) => {
    let blueprints = await listBlueprints();
    const existing = blueprints?.[path];
    const versionMarker = "Version " + version + ".";
    const existingDescription = String(
      existing?.metadata?.description || ""
    );

    if (
      existing &&
      !existing.error &&
      existingDescription.includes(versionMarker)
    ) {
      return {
        created: false,
        updated: false,
        verified: true,
      };
    }

    const hadExistingEntry = Boolean(existing);

    await hass.callWS({
      type: "blueprint/save",
      domain: "automation",
      path,
      yaml,
      allow_override: hadExistingEntry,
    });

    blueprints = await listBlueprints();
    const saved = blueprints?.[path];
    const savedDescription = String(
      saved?.metadata?.description || ""
    );

    if (
      !saved ||
      saved.error ||
      !savedDescription.includes(versionMarker)
    ) {
      throw new Error(
        "Der Blueprint " + path +
        " wurde gespeichert, konnte danach aber nicht in der aktuellen Version verifiziert werden."
      );
    }

    return {
      created: !hadExistingEntry,
      updated: hadExistingEntry,
      verified: true,
    };
  };

  const ds = await ensureBlueprint(
    ATZE_DS_LIGHT_BLUEPRINT_PATH,
    ATZE_DS_LIGHT_BLUEPRINT_YAML,
    ATZE_DS_LIGHT_BLUEPRINT_VERSION
  );

  return {
    created: ds.created,
    updated: ds.updated,
    verified: ds.verified,
    ds,
  };
}

const ATZE_LIGHT_HELPERS = [
  {
    domain: "input_boolean",
    id: "lichtsteuerung",
    values: {
      name: "Lichtsteuerung",
      icon: "mdi:lightbulb-auto",
      initial: false,
    },
  },
  {
    domain: "input_boolean",
    id: "motion_unterbrecher",
    values: {
      name: "Motion Unterbrecher",
      icon: "mdi:motion-sensor-off",
      initial: false,
    },
  },
  {
    domain: "input_datetime",
    id: "morgen",
    values: {
      name: "Morgen",
      icon: "mdi:clock-start",
      initial: "05:30:00",
      has_date: false,
      has_time: true,
    },
  },
  {
    domain: "input_number",
    id: "helligkeit_morgen",
    values: {
      name: "Helligkeit Morgen",
      icon: "mdi:white-balance-sunny",
      initial: 80,
      min: 0,
      max: 100,
      step: 5,
      mode: "slider",
      unit_of_measurement: "%",
    },
  },
  {
    domain: "input_number",
    id: "farbe_morgen",
    values: {
      name: "Farbe Morgen",
      icon: "mdi:white-balance-sunny",
      initial: 4500,
      min: 2000,
      max: 6500,
      step: 100,
      mode: "slider",
      unit_of_measurement: "K",
    },
  },
  {
    domain: "input_datetime",
    id: "abend",
    values: {
      name: "Abend",
      icon: "mdi:weather-night",
      initial: "21:00:00",
      has_date: false,
      has_time: true,
    },
  },
  {
    domain: "input_number",
    id: "helligkeit_abend",
    values: {
      name: "Helligkeit Abend",
      icon: "mdi:weather-night",
      initial: 50,
      min: 0,
      max: 100,
      step: 5,
      mode: "slider",
      unit_of_measurement: "%",
    },
  },
  {
    domain: "input_number",
    id: "farbe_abend",
    values: {
      name: "Farbe Abend",
      icon: "mdi:weather-night",
      initial: 3300,
      min: 2000,
      max: 6500,
      step: 100,
      mode: "slider",
      unit_of_measurement: "K",
    },
  },
  {
    domain: "input_datetime",
    id: "nacht",
    values: {
      name: "Nacht",
      icon: "mdi:weather-night",
      initial: "23:00:00",
      has_date: false,
      has_time: true,
    },
  },
  {
    domain: "input_number",
    id: "helligkeit_nacht",
    values: {
      name: "Helligkeit Nacht",
      icon: "mdi:weather-night",
      initial: 5,
      min: 0,
      max: 100,
      step: 5,
      mode: "slider",
      unit_of_measurement: "%",
    },
  },
  {
    domain: "input_number",
    id: "farbe_nacht",
    values: {
      name: "Farbe Nacht",
      icon: "mdi:weather-night",
      initial: 2700,
      min: 2000,
      max: 6500,
      step: 100,
      mode: "slider",
      unit_of_measurement: "K",
    },
  },
];


const ATZE_SCROLL_TOP_THRESHOLD = 250;
const ATZE_SCROLL_TOP_STATE_KEY =
  "__atzeDashboardScrollTopState";

function atzeComposedParent(node) {
  if (!node) return null;

  const parent = node.parentNode;
  if (parent instanceof ShadowRoot) {
    return parent.host;
  }
  if (parent) return parent;

  const root = node.getRootNode?.();
  return root instanceof ShadowRoot
    ? root.host
    : null;
}

function atzeFindScrollContainer(anchor) {
  let current = anchor;

  while (current) {
    current = atzeComposedParent(current);

    if (!(current instanceof HTMLElement)) {
      continue;
    }

    const style = window.getComputedStyle(current);
    const overflowY = String(style.overflowY || "");
    const canScroll =
      current.scrollHeight > current.clientHeight + 8;

    if (
      canScroll &&
      /(auto|scroll|overlay)/.test(overflowY)
    ) {
      return current;
    }
  }

  return (
    document.scrollingElement ||
    document.documentElement
  );
}

function setupAtzeScrollTopButton(anchor) {
  if (!anchor) return () => {};

  let state = window[ATZE_SCROLL_TOP_STATE_KEY];

  if (!state) {
    const button = document.createElement("button");
    button.type = "button";
    button.id = "atze-dashboard-scroll-top";
    button.setAttribute(
      "aria-label",
      "Zum Seitenanfang"
    );
    button.setAttribute(
      "title",
      "Zum Seitenanfang"
    );
    button.innerHTML =
      '<ha-icon icon="mdi:arrow-up"></ha-icon>';

    button.style.cssText = [
      "position:fixed",
      "left:50%",
      "bottom:calc(20px + env(safe-area-inset-bottom, 0px))",
      "width:48px",
      "height:48px",
      "padding:0",
      "border:0",
      "border-radius:50%",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "background:color-mix(in srgb, var(--primary-color, #03a9f4) 50%, transparent)",
      "color:var(--text-primary-color, #fff)",
      "box-shadow:0 6px 20px rgba(0,0,0,.28)",
      "cursor:pointer",
      "z-index:5",
      "opacity:0",
      "pointer-events:none",
      "transform:translate(-50%, 12px) scale(.94)",
      "transition:opacity 160ms ease, transform 160ms ease",
      "-webkit-tap-highlight-color:transparent"
    ].join(";");

    const icon = button.querySelector("ha-icon");
    if (icon) {
      icon.style.setProperty("--mdc-icon-size", "26px");
      icon.style.width = "26px";
      icon.style.height = "26px";
    }

    document.body.appendChild(button);

    state = {
      button,
      anchors: new Set(),
      anchor: null,
      scrollTarget: null,
      scrollEventTarget: null,
      onScroll: null,
      retryTimers: [],
    };

    window[ATZE_SCROLL_TOP_STATE_KEY] = state;

    button.addEventListener("click", () => {
      const target = state.scrollTarget;

      if (
        !target ||
        target === document.scrollingElement ||
        target === document.documentElement ||
        target === document.body
      ) {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
        return;
      }

      if (typeof target.scrollTo === "function") {
        target.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      } else {
        target.scrollTop = 0;
      }
    });
  }

  state.anchors.add(anchor);
  state.anchor = anchor;

  const clearRetryTimers = () => {
    for (const timer of state.retryTimers) {
      window.clearTimeout(timer);
    }
    state.retryTimers = [];
  };

  const unbindScrollTarget = () => {
    if (
      state.scrollEventTarget &&
      state.onScroll
    ) {
      state.scrollEventTarget.removeEventListener(
        "scroll",
        state.onScroll
      );
    }

    state.scrollTarget = null;
    state.scrollEventTarget = null;
    state.onScroll = null;
  };

  const updateVisibility = () => {
    const target = state.scrollTarget;
    const button = state.button;

    if (!target || !button) return;

    const scrollTop =
      target === document.scrollingElement ||
      target === document.documentElement ||
      target === document.body
        ? (
            window.scrollY ||
            document.scrollingElement?.scrollTop ||
            0
          )
        : target.scrollTop;

    const visible =
      Number(scrollTop) >=
      ATZE_SCROLL_TOP_THRESHOLD;

    button.style.opacity = visible ? "1" : "0";
    button.style.pointerEvents =
      visible ? "auto" : "none";
    button.style.transform = visible
      ? "translate(-50%, 0) scale(1)"
      : "translate(-50%, 12px) scale(.94)";
  };

  const bindScrollTarget = () => {
    if (!anchor.isConnected) return;

    const target =
      atzeFindScrollContainer(anchor);

    const eventTarget =
      target === document.scrollingElement ||
      target === document.documentElement ||
      target === document.body
        ? window
        : target;

    if (
      state.scrollTarget !== target ||
      state.scrollEventTarget !== eventTarget
    ) {
      unbindScrollTarget();

      state.scrollTarget = target;
      state.scrollEventTarget = eventTarget;
      state.onScroll = updateVisibility;

      eventTarget.addEventListener(
        "scroll",
        state.onScroll,
        { passive: true }
      );
    }

    updateVisibility();
  };

  clearRetryTimers();

  requestAnimationFrame(bindScrollTarget);
  state.retryTimers.push(
    window.setTimeout(bindScrollTarget, 250),
    window.setTimeout(bindScrollTarget, 1000)
  );

  return () => {
    state.anchors.delete(anchor);

    if (state.anchors.size > 0) {
      if (state.anchor === anchor) {
        state.anchor =
          [...state.anchors].at(-1) || null;
      }
      return;
    }

    clearRetryTimers();
    unbindScrollTarget();
    state.button?.remove();
    delete window[ATZE_SCROLL_TOP_STATE_KEY];
  };
}


const ATZE_HOME_SWIPE_NATIVE_EDGE = 28;
const ATZE_HOME_SWIPE_MIN_DISTANCE = 140;
const ATZE_HOME_SWIPE_MAX_VERTICAL = 110;
const ATZE_HOME_SWIPE_STATE_KEY =
  "__atzeDashboardHomeSwipeState";

function atzeGestureHitsInteractiveControl(event) {
  const interactiveTags = new Set([
    "A",
    "BUTTON",
    "INPUT",
    "SELECT",
    "TEXTAREA",
    "HA-SLIDER",
    "HA-CONTROL-SLIDER",
    "HA-CONTROL-CIRCULAR-SLIDER",
    "MWC-SLIDER",
    "HA-TEXTFIELD",
    "HA-SELECT",
    "HA-COMBO-BOX",
  ]);

  return (event.composedPath?.() || []).some((node) => {
    if (!(node instanceof HTMLElement)) {
      return false;
    }

    if (interactiveTags.has(node.tagName)) {
      return true;
    }

    if (
      node.isContentEditable ||
      node.getAttribute("role") === "slider"
    ) {
      return true;
    }

    return false;
  });
}

function atzeDashboardNavigationTarget(path) {
  const requested = String(path || "home").trim();

  if (requested.startsWith("/")) {
    return requested;
  }

  const cleanTarget =
    requested.replace(/^\/+|\/+$/g, "") || "home";

  const parts =
    window.location.pathname
      .split("/")
      .filter(Boolean);

  if (parts.length) {
    parts[parts.length - 1] = cleanTarget;
  } else {
    parts.push(cleanTarget);
  }

  return `/${parts.join("/")}`;
}

function atzeNavigateToDashboardPath(path) {
  const target =
    atzeDashboardNavigationTarget(path);

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

function atzeFindSwipeSurface(anchor) {
  let current = anchor;

  while (current) {
    if (current instanceof HTMLElement) {
      const tag = current.tagName;

      if (
        tag === "HUI-VIEW" ||
        tag === "HUI-SECTIONS-VIEW" ||
        tag === "HUI-PANEL-VIEW" ||
        tag === "HUI-MASONRY-VIEW"
      ) {
        return current;
      }
    }

    current = atzeComposedParent(current);
  }

  return atzeFindScrollContainer(anchor) || anchor;
}

function atzeSwipeSurfaceFromEvent(event) {
  for (const node of event?.composedPath?.() || []) {
    if (!(node instanceof HTMLElement)) {
      continue;
    }

    if (
      node.tagName === "HUI-VIEW" ||
      node.tagName === "HUI-SECTIONS-VIEW" ||
      node.tagName === "HUI-PANEL-VIEW" ||
      node.tagName === "HUI-MASONRY-VIEW"
    ) {
      return node;
    }
  }

  return null;
}

function setupAtzeHomeSwipe(anchor, homePathProvider) {
  if (!anchor) return () => {};

  let state = window[ATZE_HOME_SWIPE_STATE_KEY];

  const resolvedHomePath =
    typeof homePathProvider === "function"
      ? homePathProvider()
      : homePathProvider;

  const homeTarget =
    atzeDashboardNavigationTarget(
      resolvedHomePath || "home"
    );

  const lastSlash = homeTarget.lastIndexOf("/");
  const dashboardBase =
    lastSlash > 0
      ? homeTarget.slice(0, lastSlash)
      : "/";

  if (state) {
    state.homeTarget = homeTarget;
    state.dashboardBase = dashboardBase;
    return () => {};
  }

  state = {
    homeTarget,
    dashboardBase,
    touchIdentifier: null,
    startX: 0,
    startY: 0,
    startedAt: 0,
    suppressClickUntil: 0,
    horizontalLocked: false,
    swipeSurface: null,
    surfaceSnapshot: null,
    animationTimer: null,
  };

  const clearAnimationTimer = () => {
    if (state.animationTimer) {
      window.clearTimeout(state.animationTimer);
      state.animationTimer = null;
    }
  };

  const restoreSurface = (surface, snapshot) => {
    if (!surface || !snapshot) return;

    surface.style.transition = snapshot.transition;
    surface.style.transform = snapshot.transform;
    surface.style.willChange = snapshot.willChange;
    surface.style.boxShadow = snapshot.boxShadow;
  };

  const resetGesture = ({ restore = true } = {}) => {
    if (
      restore &&
      state.swipeSurface &&
      state.surfaceSnapshot
    ) {
      restoreSurface(
        state.swipeSurface,
        state.surfaceSnapshot
      );
    }

    state.touchIdentifier = null;
    state.startX = 0;
    state.startY = 0;
    state.startedAt = 0;
    state.horizontalLocked = false;
    state.swipeSurface = null;
    state.surfaceSnapshot = null;
  };

  const isCurrentDashboardSubview = () => {
    const pathname =
      String(window.location.pathname || "");

    const insideDashboard =
      state.dashboardBase === "/"
        ? pathname.startsWith("/")
        : (
            pathname === state.dashboardBase ||
            pathname.startsWith(
              `${state.dashboardBase}/`
            )
          );

    if (!insideDashboard) {
      return false;
    }

    return pathname !== state.homeTarget;
  };

  const prepareSurface = (event) => {
    if (state.swipeSurface) {
      return state.swipeSurface;
    }

    const surface =
      atzeSwipeSurfaceFromEvent(event);

    if (!(surface instanceof HTMLElement)) {
      return null;
    }

    state.swipeSurface = surface;
    state.surfaceSnapshot = {
      transition: surface.style.transition,
      transform: surface.style.transform,
      willChange: surface.style.willChange,
      boxShadow: surface.style.boxShadow,
    };

    surface.style.transition = "none";
    surface.style.willChange = "transform";
    surface.style.boxShadow =
      "-18px 0 34px rgba(0,0,0,.16)";

    return surface;
  };

  const animateBack = (surface, snapshot) => {
    if (!surface || !snapshot) {
      resetGesture();
      return;
    }

    clearAnimationTimer();

    surface.style.transition =
      "transform 180ms cubic-bezier(.2,.8,.2,1), box-shadow 180ms ease";
    surface.style.transform =
      "translate3d(0,0,0)";
    surface.style.boxShadow =
      "0 0 0 rgba(0,0,0,0)";

    state.animationTimer = window.setTimeout(() => {
      restoreSurface(surface, snapshot);
      state.animationTimer = null;
    }, 210);

    resetGesture({ restore: false });
  };

  const animateOutAndNavigate = (
    surface,
    snapshot
  ) => {
    clearAnimationTimer();

    state.suppressClickUntil =
      performance.now() + 500;

    if (!surface || !snapshot) {
      resetGesture({ restore: false });
      atzeNavigateToDashboardPath(
        state.homeTarget
      );
      return;
    }

    surface.style.transition =
      "transform 190ms cubic-bezier(.2,.8,.2,1), box-shadow 190ms ease";
    surface.style.transform =
      "translate3d(calc(100vw + 24px),0,0)";
    surface.style.boxShadow =
      "-24px 0 42px rgba(0,0,0,.20)";

    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;

      clearAnimationTimer();

      atzeNavigateToDashboardPath(
        state.homeTarget
      );

      window.setTimeout(() => {
        restoreSurface(surface, snapshot);
      }, 80);
    };

    surface.addEventListener(
      "transitionend",
      finish,
      { once: true }
    );

    state.animationTimer =
      window.setTimeout(finish, 240);

    resetGesture({ restore: false });
  };

  state.onTouchStart = (event) => {
    if (
      state.touchIdentifier !== null ||
      event.touches.length !== 1 ||
      !isCurrentDashboardSubview()
    ) {
      return;
    }

    const touch = event.touches[0];
    const startX = Number(touch.clientX);
    const startY = Number(touch.clientY);

    // Keep Home Assistant's own sidebar gesture untouched.
    if (startX <= ATZE_HOME_SWIPE_NATIVE_EDGE) {
      return;
    }

    if (atzeGestureHitsInteractiveControl(event)) {
      return;
    }

    if (!atzeSwipeSurfaceFromEvent(event)) {
      return;
    }

    state.touchIdentifier = touch.identifier;
    state.startX = startX;
    state.startY = startY;
    state.startedAt = performance.now();
    state.horizontalLocked = false;
  };

  state.onTouchMove = (event) => {
    if (state.touchIdentifier === null) {
      return;
    }

    const touch =
      [...event.touches].find(
        (item) =>
          item.identifier ===
          state.touchIdentifier
      );

    if (!touch) return;

    const dx =
      Number(touch.clientX) - state.startX;
    const dy =
      Number(touch.clientY) - state.startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (!state.horizontalLocked) {
      if (
        absDy > 20 &&
        absDy > absDx * 1.15
      ) {
        resetGesture();
        return;
      }

      if (
        dx > 14 &&
        dx >= absDy * 1.05
      ) {
        state.horizontalLocked = true;
      } else {
        return;
      }
    }

    const surface =
      prepareSurface(event);

    if (!surface) {
      resetGesture();
      return;
    }

    event.preventDefault();

    const distance = Math.max(0, dx);
    const viewportWidth =
      Math.max(window.innerWidth || 0, 320);
    const cappedDistance =
      Math.min(distance, viewportWidth * 0.92);

    surface.style.transform =
      `translate3d(${cappedDistance}px,0,0)`;
  };

  state.onTouchEnd = (event) => {
    if (state.touchIdentifier === null) {
      return;
    }

    const touch =
      [...event.changedTouches].find(
        (item) =>
          item.identifier ===
          state.touchIdentifier
      );

    if (!touch) return;

    const dx =
      Number(touch.clientX) - state.startX;
    const dy =
      Number(touch.clientY) - state.startY;
    const elapsed =
      performance.now() - state.startedAt;
    const surface = state.swipeSurface;
    const snapshot = state.surfaceSnapshot;
    const wasHorizontal =
      state.horizontalLocked;

    const isRightSwipe =
      wasHorizontal &&
      dx >= ATZE_HOME_SWIPE_MIN_DISTANCE &&
      Math.abs(dy) <=
        ATZE_HOME_SWIPE_MAX_VERTICAL &&
      dx >= Math.abs(dy) * 1.1 &&
      elapsed <= 1800;

    if (wasHorizontal) {
      state.suppressClickUntil =
        performance.now() + 350;
    }

    if (isRightSwipe) {
      animateOutAndNavigate(
        surface,
        snapshot
      );
      return;
    }

    animateBack(surface, snapshot);
  };

  state.onTouchCancel = () => {
    animateBack(
      state.swipeSurface,
      state.surfaceSnapshot
    );
  };

  state.onClick = (event) => {
    if (
      performance.now() <
      state.suppressClickUntil
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  window.addEventListener(
    "touchstart",
    state.onTouchStart,
    { passive: true, capture: true }
  );
  window.addEventListener(
    "touchmove",
    state.onTouchMove,
    { passive: false, capture: true }
  );
  window.addEventListener(
    "touchend",
    state.onTouchEnd,
    { passive: true, capture: true }
  );
  window.addEventListener(
    "touchcancel",
    state.onTouchCancel,
    { passive: true, capture: true }
  );
  window.addEventListener(
    "click",
    state.onClick,
    { capture: true }
  );

  window[ATZE_HOME_SWIPE_STATE_KEY] = state;

  // Deliberately keep the global gesture listeners alive. Home Assistant
  // caches/reuses views, so disconnecting one card must not disable the
  // gesture for later visits to that same subview.
  return () => {};
}

const DOMAIN_META = {
  light:         { title: "Licht",      icon: "mdi:lightbulb-group", order: 10 },
  switch:        { title: "Schalter",   icon: "mdi:toggle-switch",   order: 75 },
  cover:         { title: "Rollläden",  icon: "mdi:window-shutter",  order: 30 },
  climate:       { title: "Klima",      icon: "mdi:thermostat",      order: 40 },
  fan:           { title: "Lüfter",     icon: "mdi:fan",             order: 50 },
  lock:          { title: "Schlösser",  icon: "mdi:lock",            order: 60 },
  media_player:  { title: "Medien",     icon: "mdi:play-circle",     order: 70 },
  input_boolean: { title: "Helfer",     icon: "mdi:toggle-switch-outline", order: 80 },
  input_number:  { title: "Regler",     icon: "mdi:tune-variant",    order: 90 },
  number:        { title: "Regler",     icon: "mdi:tune-variant",    order: 91 },
  select:        { title: "Auswahl",     icon: "mdi:form-dropdown",   order: 100 },
  sensor:        { title: "Sensoren",    icon: "mdi:gauge",           order: 110 },
  binary_sensor: { title: "Sicherheit",  icon: "mdi:shield-home-outline", order: 120 },
};

const SPECIAL_GROUP_META = {
  raumverbrauch: { title: "Raumverbrauch", icon: "mdi:flash", order: 105 },
  technik: { title: "Technik", icon: "mdi:cog-outline", order: 900 },
};

const DEFAULT_DOMAINS = Object.keys(DOMAIN_META);
const DEFAULT_POPUP_CHILD_DOMAINS = [
  "switch",
  "button",
  "select",
  "number",
  "sensor",
  "binary_sensor",
];

const DEFAULT_GENERIC_POPUP_PARENT_DOMAINS = ["switch", "light"];
const DEFAULT_GENERIC_POPUP_CHILD_DOMAINS = [
  "sensor",
  "binary_sensor",
  "number",
  "select",
  "button",
];

const GENERIC_SENSOR_DEVICE_CLASSES = new Set([
  "power",
  "energy",
  "current",
  "voltage",
  "signal_strength",
]);

const GENERIC_BINARY_DEVICE_CLASSES = new Set([
  "problem",
  "safety",
  "connectivity",
  "battery",
]);

const DEFAULT_POPUP_ORPHAN_KEYWORDS = [
  "neustart",
  "restart",
  "reboot",
  "reset",
];

const POPUP_GERMAN_NAMES = [
  { match: ["child lock", "child_lock"], name: "Kindersicherung" },
  { match: ["schedule"], name: "Zeitplan" },
  { match: ["valve detection", "valve_detection"], name: "Ventilerkennung" },
  { match: ["window detection", "window_detection"], name: "Fenstererkennung" },
  { match: ["calibrate", "calibration"], name: "Kalibrieren" },
  { match: ["identify", "identifizieren"], name: "Identifizieren" },
  { match: ["sensor"], name: "Sensorquelle" },
  { match: ["day preset temperature", "day_preset_temperature"], name: "Tagestemperatur" },
  { match: ["restart", "reboot", "neustart"], name: "Neustart" },
  { match: ["power on behavior", "power_on_behavior"], name: "Startverhalten" },
  { match: ["led mode", "led_mode"], name: "LED-Modus" },
  { match: ["led brightness", "led_brightness"], name: "LED-Helligkeit" },
];

const BUILT_IN_HIDDEN_ENTITIES = new Set([
  "binary_sensor.appletv_tastaturfokus",
  "sensor.bad_motionsensor_humidity",
  "sensor.bad_motionsensor_temperature",
  "sensor.flur_haustur_letzte_aktivitat",
]);

const KEYPAD_VISION_VISIBLE_ENTITIES = new Set([
  "binary_sensor.keypad_vision_725e_manipulation",
]);

function isBuiltInHiddenEntity(entityId) {
  const id = String(entityId || "").toLowerCase();

  if (KEYPAD_VISION_VISIBLE_ENTITIES.has(id)) {
    return false;
  }

  if (
    id.includes("keypad_vision") ||
    id.includes("keypadvision")
  ) {
    return true;
  }

  return BUILT_IN_HIDDEN_ENTITIES.has(entityId);
}

function shouldHideExactEntity(config, entityId) {
  const customHidden = new Set(
    asArray(config.hide_entities).map(String)
  );

  return (
    isBuiltInHiddenEntity(entityId) ||
    RUNTIME_HIDDEN_ENTITY_IDS.has(entityId) ||
    customHidden.has(entityId)
  );
}

const AUTO_ROOM_PRIMARY_DOMAINS = new Set([
  "light",
  "switch",
  "cover",
  "climate",
  "fan",
  "lock",
  "media_player",
  "input_boolean",
]);

const AUTO_ROOM_SECURITY_DEVICE_CLASSES = new Set([
  "door",
  "window",
  "opening",
  "smoke",
  "moisture",
  "gas",
  "carbon_monoxide",
  "tamper",
]);

function roomEntityVisibilityMode(config, entityId) {
  const override = getOverride(
    config.entity_overrides,
    entityId
  );

  const raw = String(
    override.visibility || ""
  ).toLowerCase();

  if (
    ["show", "visible", "anzeigen"].includes(raw) ||
    override.visible === true
  ) {
    return "show";
  }

  if (
    ["hide", "hidden", "ausblenden"].includes(raw) ||
    override.visible === false ||
    override.hidden === true ||
    override.card === "hidden"
  ) {
    return "hide";
  }

  return "auto";
}

function shouldAutoShowRoomEntity(
  hass,
  entity,
  config
) {
  if (config.strict_room_entity_auto === false) {
    return true;
  }

  const domain = domainOf(entity.entity_id);

  if (AUTO_ROOM_PRIMARY_DOMAINS.has(domain)) {
    return true;
  }

  if (domain === "binary_sensor") {
    const deviceClass =
      entityDeviceClass(hass, entity);

    if (
      AUTO_ROOM_SECURITY_DEVICE_CLASSES.has(
        deviceClass
      )
    ) {
      return true;
    }

    const text = normalizedText(
      `${entity.entity_id} ${rawFriendlyName(
        hass,
        entity.entity_id,
        entity
      )}`
    );

    return (
      entity.entity_id ===
        "binary_sensor.keypad_vision_725e_manipulation" ||
      text.includes("manipulation") ||
      text.includes("tamper") ||
      text.includes("rauch") ||
      text.includes("smoke")
    );
  }

  // Sensors, selectors, numbers and similar technical helpers are
  // intentionally not rendered as standalone room cards in Auto mode.
  // They remain available to badges, device popups and maintenance views.
  return false;
}

const AGGREGATE_DEVICE_PARENTS = {
  "binary_sensor.bad_motionsensor_presence": {
    name: "Präsenzsensor",
    icon: "mdi:radar",
    popup: true,
    popup_name: "Präsenzsensor",
    popup_icon: "mdi:radar",
    popup_columns: 2,
    child_domains: [
      "switch",
      "sensor",
      "binary_sensor",
      "number",
      "select",
      "button",
    ],
    exclude_child_device_classes: [
      "temperature",
      "humidity",
    ],
  },

  "switch.schlafzimmer_camera_enabled": {
    name: "Kamera",
    icon: "mdi:cctv",
    popup: false,
    popup_name: "Kamera",
    popup_icon: "mdi:cctv",
    popup_columns: 2,
    child_domains: [
      "switch",
      "sensor",
      "binary_sensor",
      "number",
      "select",
      "button",
    ],
  },
};

function aggregateDisplayName(config, entityId) {
  const aggregate = aggregateDeviceParentConfig(config, entityId);
  return aggregate?.name || null;
}

function aggregateDeviceParentConfig(config, entityId) {
  const builtIn = AGGREGATE_DEVICE_PARENTS[entityId] || {};
  const runtime =
    RUNTIME_AGGREGATE_DEVICE_PARENTS.get(entityId) || {};
  const custom =
    config.aggregate_device_parents &&
    typeof config.aggregate_device_parents === "object"
      ? (config.aggregate_device_parents[entityId] || {})
      : {};

  if (
    !Object.keys(builtIn).length &&
    !Object.keys(runtime).length &&
    !Object.keys(custom).length
  ) {
    return null;
  }

  return {
    ...builtIn,
    ...runtime,
    ...custom,
  };
}


function normalizedDeviceText(device) {
  if (!device) return "";

  return normalizedText(
    [
      device.name,
      device.name_by_user,
      device.manufacturer,
      device.model,
      device.model_id,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function areaIdsMatching(areaById, targetName) {
  const target = normalizedText(targetName);

  return new Set(
    [...areaById.values()]
      .filter((area) => {
        const text = normalizedText(
          `${area.area_id} ${area.name || ""}`
        );

        return (
          text === target ||
          text.includes(` ${target}`) ||
          text.startsWith(`${target} `)
        );
      })
      .map((area) => area.area_id)
  );
}

function flurAreaIds(areaById) {
  return areaIdsMatching(areaById, "flur");
}

function wohnzimmerAreaIds(areaById) {
  return areaIdsMatching(areaById, "wohnzimmer");
}

function discoverRuntimeAggregateParents(
  hass,
  entities,
  config,
  deviceById,
  areaById
) {
  const discovered = new Map();
  const flurIds = flurAreaIds(areaById);

  const flurEntities = entities.filter((entity) =>
    flurIds.has(effectiveAreaId(entity, deviceById))
  );

  // ---------------------------------------------------------------
  // Flur camera
  // ---------------------------------------------------------------
  // Different camera integrations use different object ids, but the main
  // enable switch is commonly exposed as "Camera enabled".
  const cameraCandidates = flurEntities
    .filter((entity) => domainOf(entity.entity_id) === "switch")
    .map((entity) => {
      const name = normalizedFriendlyName(hass, entity);
      const id = normalizedText(entity.entity_id);
      const device = deviceById.get(entity.device_id);
      const deviceText = normalizedDeviceText(device);

      let score = 0;

      if (name === "camera enabled") score += 300;
      if (name.includes("camera enabled")) score += 220;
      if (id.includes("camera enabled")) score += 220;
      if (id.includes("camera_enabled")) score += 220;
      if (name.includes("kamera aktiviert")) score += 180;
      if (deviceText.includes("camera")) score += 40;
      if (deviceText.includes("kamera")) score += 40;

      return { entity, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const cameraParent = cameraCandidates[0]?.entity || null;

  if (cameraParent) {
    discovered.set(cameraParent.entity_id, {
      name: "Kamera",
      icon: "mdi:cctv",
      popup: false,
      popup_name: "Kamera",
      popup_icon: "mdi:cctv",
      popup_columns: 2,
      child_domains: [
        "switch",
        "sensor",
        "binary_sensor",
        "number",
        "select",
        "button",
      ],
    });
  }

  // ---------------------------------------------------------------
  // Flur presence / radar device
  // ---------------------------------------------------------------
  // Prefer an actual Presence/Präsenz/Anwesenheit binary sensor and avoid
  // accidentally choosing a camera motion-detection entity.
  const byDevice = new Map();

  for (const entity of flurEntities) {
    if (!entity.device_id) continue;
    if (!byDevice.has(entity.device_id)) {
      byDevice.set(entity.device_id, []);
    }
    byDevice.get(entity.device_id).push(entity);
  }

  const presenceCandidates = flurEntities
    .filter((entity) => {
      if (domainOf(entity.entity_id) !== "binary_sensor") return false;
      if (!entity.device_id) return false;
      if (cameraParent?.device_id === entity.device_id) return false;

      const deviceClass = entityDeviceClass(hass, entity);
      return ["occupancy", "motion"].includes(deviceClass);
    })
    .map((entity) => {
      const name = normalizedFriendlyName(hass, entity);
      const id = normalizedText(entity.entity_id);
      const device = deviceById.get(entity.device_id);
      const deviceText = normalizedDeviceText(device);
      const siblings = byDevice.get(entity.device_id) || [];

      let score = 0;

      if (name === "presence") score += 350;
      if (name.includes("presence")) score += 250;
      if (name.includes("prasenz")) score += 250;
      if (name.includes("anwesenheit")) score += 250;

      if (id.includes("presence")) score += 220;
      if (id.includes("prasenz")) score += 220;
      if (id.includes("anwesenheit")) score += 220;

      if (id.includes("flur motion")) score += 160;
      if (id.includes("flur_motion")) score += 160;
      if (deviceText.includes("flur motion")) score += 180;
      if (deviceText.includes("ld2410")) score += 180;
      if (deviceText.includes("radar")) score += 160;

      // Technical radar devices usually expose several configuration controls.
      const technicalCount = siblings.filter((sibling) =>
        ["number", "select", "switch", "button"].includes(
          domainOf(sibling.entity_id)
        )
      ).length;

      score += Math.min(technicalCount, 12) * 12;

      return { entity, score };
    })
    .filter((entry) => entry.score >= 120)
    .sort((a, b) => b.score - a.score);

  const presenceParent = presenceCandidates[0]?.entity || null;

  if (presenceParent) {
    discovered.set(presenceParent.entity_id, {
      name: "Präsenzsensor",
      icon: "mdi:radar",
      popup: true,
      popup_name: "Präsenzsensor",
      popup_icon: "mdi:radar",
      popup_columns: 2,
      badge: true,
      badge_icon: "mdi:radar",
      badge_color: "green",
      child_domains: [
        "switch",
        "sensor",
        "binary_sensor",
        "number",
        "select",
        "button",
      ],
    });
  }

  // ---------------------------------------------------------------
  // Flur SwitchBot Lock Ultra
  // ---------------------------------------------------------------
  // Keep the primary lock card visible as "Tür" and collect only the
  // same-device binary sensors behind it. This deliberately leaves normal
  // configuration entities alone and targets the safety/status entries that
  // would otherwise clutter the Sicherheit section.
  const lockCandidates = flurEntities
    .filter((entity) => domainOf(entity.entity_id) === "lock")
    .map((entity) => {
      const name = normalizedFriendlyName(hass, entity);
      const id = normalizedText(entity.entity_id);
      const device = deviceById.get(entity.device_id);
      const deviceText = normalizedDeviceText(device);

      let score = 0;

      if (name === "tur" || name === "tür") score += 260;
      if (name.includes("tur") || name.includes("tür")) score += 160;
      if (id.includes("lock ultra")) score += 260;
      if (id.includes("lock_ultra")) score += 260;
      if (deviceText.includes("lock ultra")) score += 320;
      if (deviceText.includes("switchbot")) score += 80;

      return { entity, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const lockParent = lockCandidates[0]?.entity || null;

  if (lockParent) {
    discovered.set(lockParent.entity_id, {
      name: "Tür",
      icon: "mdi:lock-smart",
      popup: true,
      popup_name: "Tür",
      popup_icon: "mdi:shield-lock-outline",
      popup_columns: 2,
      child_domains: [
        "binary_sensor",
      ],
    });
  }

  // ---------------------------------------------------------------
  // Wohnzimmer camera
  // ---------------------------------------------------------------
  const wohnzimmerIds = wohnzimmerAreaIds(areaById);
  const wohnzimmerEntities = entities.filter((entity) =>
    wohnzimmerIds.has(effectiveAreaId(entity, deviceById))
  );

  const wohnzimmerCameraCandidates = wohnzimmerEntities
    .filter((entity) => domainOf(entity.entity_id) === "switch")
    .map((entity) => {
      const name = normalizedFriendlyName(hass, entity);
      const id = normalizedText(entity.entity_id);
      const device = deviceById.get(entity.device_id);
      const deviceText = normalizedDeviceText(device);

      let score = 0;

      if (name === "camera enabled") score += 320;
      if (name.includes("camera enabled")) score += 240;
      if (id.includes("camera_enabled")) score += 240;
      if (name.includes("kamera aktiviert")) score += 180;
      if (deviceText.includes("camera")) score += 40;
      if (deviceText.includes("kamera")) score += 40;

      return { entity, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const wohnzimmerCameraParent =
    wohnzimmerCameraCandidates[0]?.entity || null;

  if (wohnzimmerCameraParent) {
    discovered.set(wohnzimmerCameraParent.entity_id, {
      name: "Kamera",
      icon: "mdi:cctv",
      popup: false,
      popup_name: "Kamera",
      popup_icon: "mdi:cctv",
      popup_columns: 2,
      child_domains: [
        "switch",
        "sensor",
        "binary_sensor",
        "number",
        "select",
        "button",
      ],
    });
  }

  // ---------------------------------------------------------------
  // Wohnzimmer presence / radar
  // ---------------------------------------------------------------
  const wohnzimmerByDevice = new Map();

  for (const entity of wohnzimmerEntities) {
    if (!entity.device_id) continue;

    if (!wohnzimmerByDevice.has(entity.device_id)) {
      wohnzimmerByDevice.set(entity.device_id, []);
    }

    wohnzimmerByDevice.get(entity.device_id).push(entity);
  }

  const wohnzimmerPresenceCandidates = wohnzimmerEntities
    .filter((entity) => {
      if (domainOf(entity.entity_id) !== "binary_sensor") return false;
      if (!entity.device_id) return false;

      if (
        wohnzimmerCameraParent?.device_id === entity.device_id
      ) {
        return false;
      }

      const deviceClass = entityDeviceClass(hass, entity);

      return ["occupancy", "motion"].includes(deviceClass);
    })
    .map((entity) => {
      const name = normalizedFriendlyName(hass, entity);
      const id = normalizedText(entity.entity_id);
      const device = deviceById.get(entity.device_id);
      const deviceText = normalizedDeviceText(device);
      const siblings =
        wohnzimmerByDevice.get(entity.device_id) || [];

      let score = 0;

      if (name === "presence") score += 380;
      if (name.includes("presence")) score += 280;
      if (name.includes("prasenz")) score += 280;
      if (name.includes("anwesenheit")) score += 280;

      if (id.includes("presence")) score += 240;
      if (id.includes("prasenz")) score += 240;
      if (id.includes("anwesenheit")) score += 240;

      if (id.includes("wohnzimmer motion")) score += 160;
      if (id.includes("wohnzimmer_motion")) score += 160;
      if (deviceText.includes("wohnzimmer motion")) score += 180;
      if (deviceText.includes("ld2410")) score += 180;
      if (deviceText.includes("radar")) score += 160;

      const technicalCount = siblings.filter((sibling) =>
        ["number", "select", "switch", "button"].includes(
          domainOf(sibling.entity_id)
        )
      ).length;

      score += Math.min(technicalCount, 12) * 12;

      return { entity, score };
    })
    .filter((entry) => entry.score >= 120)
    .sort((a, b) => b.score - a.score);

  const wohnzimmerPresenceParent =
    wohnzimmerPresenceCandidates[0]?.entity || null;

  if (wohnzimmerPresenceParent) {
    discovered.set(wohnzimmerPresenceParent.entity_id, {
      name: "Präsenzsensor",
      icon: "mdi:radar",
      popup: true,
      popup_name: "Präsenzsensor",
      popup_icon: "mdi:radar",
      popup_columns: 2,
      badge: true,
      badge_icon: "mdi:radar",
      badge_color: "green",
      child_domains: [
        "switch",
        "sensor",
        "binary_sensor",
        "number",
        "select",
        "button",
      ],
      exclude_child_device_classes: [
        "temperature",
        "humidity",
      ],
    });
  }

  return discovered;
}


function discoverRuntimeHiddenEntities(
  hass,
  entities,
  deviceById,
  areaById
) {
  const hidden = new Set();
  const wohnzimmerIds = wohnzimmerAreaIds(areaById);

  if (!wohnzimmerIds.size) return hidden;

  const wohnzimmerEntities = entities.filter((entity) =>
    wohnzimmerIds.has(effectiveAreaId(entity, deviceById))
  );

  const homeBaseCandidates = wohnzimmerEntities
    .map((entity) => {
      const name = normalizedFriendlyName(hass, entity);
      const id = normalizedText(entity.entity_id);
      const device = deviceById.get(entity.device_id);
      const deviceText = normalizedDeviceText(device);

      let score = 0;

      if (name === "atzehomebase") score += 400;
      if (name.includes("atzehomebase")) score += 300;
      if (id.includes("atzehomebase")) score += 280;
      if (deviceText.includes("atzehomebase")) score += 260;
      if (deviceText.includes("homebase")) score += 120;

      if (domainOf(entity.entity_id) === "select") score += 80;

      return { entity, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const homeBaseParent =
    homeBaseCandidates[0]?.entity || null;

  if (!homeBaseParent?.device_id) return hidden;

  for (const entity of wohnzimmerEntities) {
    if (entity.device_id === homeBaseParent.device_id) {
      hidden.add(entity.entity_id);
    }
  }

  return hidden;
}

const POPUP_EXACT_NAMES = {
  "sensor.kuche_thermostat_battery": "Batterie",
  "binary_sensor.kuche_thermostat_valve_alarm": "Ventilalarm",
  "select.kuche_thermostat_sensor": "Tempsensor",
  "sensor.kuche_thermostat_device_temperature": "Gerätetemperatur",
  "sensor.kuche_thermostat_local_temperature": "Lokale Temperatur",
  "sensor.kuche_thermostat_voltage": "Batteriespannung",
};

// Filled during generate(); used only while the strategy builds its config.
let RUNTIME_DEVICE_BY_ID = new Map();
let RUNTIME_AGGREGATE_DEVICE_PARENTS = new Map();
let RUNTIME_HIDDEN_ENTITY_IDS = new Set();

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function domainOf(entityId) {
  return entityId?.split(".")[0] || "";
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function getOverride(map, key) {
  return map && typeof map === "object" ? (map[key] || {}) : {};
}

function rawFriendlyName(hass, entityId, registryEntry) {
  const stateObj = hass.states[entityId];
  return (
    registryEntry?.name ||
    registryEntry?.original_name ||
    stateObj?.attributes?.friendly_name ||
    entityId
  );
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanupEntityName(name, domain, areaName, config) {
  let result = String(name || "").trim();

  if (config.strip_area_name !== false && areaName) {
    const area = escapeRegExp(areaName.trim());
    result = result
      .replace(new RegExp(`^${area}\\s*[-–—_:|]?\\s*`, "i"), "")
      .trim();
  }

  // Home Assistant template helpers often leave "Template" in the friendly name.
  if (config.strip_template_suffix !== false) {
    result = result.replace(/\s+template$/i, "").trim();
  }

  if (config.strip_generic_suffixes !== false) {
    const suffixes = {
      light: ["lampe", "licht", "leuchte"],
      cover: ["rollladen", "jalousie", "raffstore"],
      switch: ["schalter"],
      climate: ["thermostat"],
      fan: ["lüfter", "ventilator"],
    };

    const list = suffixes[domain] || [];
    if (list.length) {
      const before = result;
      const pattern = list.map(escapeRegExp).join("|");
      const cleaned = result
        .replace(new RegExp(`\\s+(?:${pattern})$`, "i"), "")
        .trim();

      // Never turn a useful one-word name such as "Rollladen" into an empty string.
      if (cleaned) result = cleaned;
      else result = before;
    }
  }

  return result || name;
}

function deviceForEntity(entity) {
  if (!entity?.device_id) return null;
  return RUNTIME_DEVICE_BY_ID.get(entity.device_id) || null;
}

function isAppleHomePod(entity) {
  if (domainOf(entity.entity_id) !== "media_player") return false;

  const device = deviceForEntity(entity);
  if (!device) return false;

  const text = [
    device.manufacturer,
    device.model,
    device.model_id,
    device.name,
    device.name_by_user,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    text.includes("homepod") ||
    (text.includes("apple") && text.includes("audioaccessory"))
  );
}

function displayName(hass, entity, config, area) {
  const override = getOverride(config.entity_overrides, entity.entity_id);
  if (override.name) return override.name;

  if (config.auto_homepod_name !== false && isAppleHomePod(entity)) {
    return "HomePod";
  }

  return cleanupEntityName(
    rawFriendlyName(hass, entity.entity_id, entity),
    domainOf(entity.entity_id),
    area?.name || "",
    config
  );
}

function popupDisplayName(hass, entity, config, area) {
  const override = getOverride(config.entity_overrides, entity.entity_id);
  if (override.name) return override.name;

  const exactName = POPUP_EXACT_NAMES[entity.entity_id];
  if (exactName) return exactName;

  const base = displayName(hass, entity, config, area);
  if (config.popup_german_names === false) return base;

  const haystack = `${base} ${entity.entity_id}`
    .toLowerCase()
    .replace(/[-.]/g, "_");

  for (const item of POPUP_GERMAN_NAMES) {
    if (
      item.match.some((term) =>
        haystack.includes(String(term).toLowerCase().replace(/[-.]/g, "_"))
      )
    ) {
      return item.name;
    }
  }

  return base;
}

function compactDisplayName(hass, entity, config, area) {
  let name = displayName(hass, entity, config, area);

  if (config.smart_compact_names === false) return name;

  // Keep channel numbers internally for matching, but do not show them
  // in the compact dashboard card.
  if (config.strip_channel_number !== false) {
    name = name
      .replace(/^\s*\d+\s*[-–—_:|.]\s*/i, "")
      .trim();
  }

  if (name.includes("|")) {
    const parts = name
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length > 1) {
      const left = parts[0].toLowerCase();

      if (
        left.includes("steckdose") ||
        left.includes("plug") ||
        left.includes("schalter")
      ) {
        name = parts.slice(1).join(" | ");
      } else {
        // Some integrations use reversed forms such as
        // "Waschmaschine | Steckdose".
        const right = parts[parts.length - 1].toLowerCase();

        if (
          right.includes("steckdose") ||
          right.includes("plug") ||
          right.includes("schalter")
        ) {
          name = parts.slice(0, -1).join(" | ");
        }
      }
    }
  }

  name = name
    .replace(/^steckdose\s*[-–—_:]?\s*/i, "")
    .replace(/\s+steckdose$/i, "")
    .trim();

  return name || displayName(hass, entity, config, area);
}


function entityDeviceClass(hass, entity) {
  return (
    hass.states[entity.entity_id]?.attributes?.device_class ||
    entity.device_class ||
    null
  );
}

function channelNumber(hass, entity) {
  const raw = rawFriendlyName(hass, entity.entity_id, entity);
  const values = [raw, entity.entity_id];

  for (const value of values) {
    const text = String(value || "");

    let match = text.match(/^\s*(\d+)\s*[-_.:|]/);
    if (match) return match[1];

    match = text.match(/(?:^|[\s_.:-])(\d+)\s*$/);
    if (match) return match[1];
  }

  return null;
}

function normalizedText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parentChildNameAffinity(hass, parent, child) {
  const parentText = normalizedText(
    `${rawFriendlyName(hass, parent.entity_id, parent)} ${parent.entity_id}`
  );
  const childText = normalizedText(
    `${rawFriendlyName(hass, child.entity_id, child)} ${child.entity_id}`
  );

  const roots = [
    "anwesenheit",
    "presence",
    "motion",
    "radar",
    "bluetooth",
    "proxy",
    "ld2410",
    "homepod",
    "anrichte",
    "mikrowelle",
    "kuhlschrank",
    "waschmaschine",
  ];

  let score = 0;
  for (const root of roots) {
    if (parentText.includes(root) && childText.includes(root)) score += 10;
  }

  const parentWords = parentText
    .split(/\s+/)
    .filter((word) => word.length >= 5 && !/^\d+$/.test(word));

  const childWords = childText
    .split(/\s+/)
    .filter((word) => word.length >= 5 && !/^\d+$/.test(word));

  for (const p of parentWords) {
    for (const c of childWords) {
      if (p === c) score += 4;
      else if (p.startsWith(c) || c.startsWith(p)) score += 2;
    }
  }

  return score;
}

function genericPopupChildEligible(hass, entity) {
  const domain = domainOf(entity.entity_id);
  const category = entity.entity_category || null;
  const deviceClass = entityDeviceClass(hass, entity);

  if (["number", "select", "button"].includes(domain)) return true;

  if (domain === "sensor") {
    return (
      category === "config" ||
      category === "diagnostic" ||
      GENERIC_SENSOR_DEVICE_CLASSES.has(deviceClass)
    );
  }

  if (domain === "binary_sensor") {
    return (
      category === "config" ||
      category === "diagnostic" ||
      GENERIC_BINARY_DEVICE_CLASSES.has(deviceClass)
    );
  }

  return false;
}

function genericPopupDisplayName(hass, child, parent, config, area) {
  const override = getOverride(config.entity_overrides, child.entity_id);
  if (override.name) return override.name;

  const exactName = POPUP_EXACT_NAMES[child.entity_id];
  if (exactName) return exactName;

  let name = displayName(hass, child, config, area);
  const childChannel = channelNumber(hass, child);

  if (childChannel) {
    name = name
      .replace(new RegExp(`^\\s*${escapeRegExp(childChannel)}\\s*[-–—_:|]?\\s*`, "i"), "")
      .replace(new RegExp(`\\s*[-–—_:|]?\\s*${escapeRegExp(childChannel)}\\s*$`, "i"), "")
      .trim();
  }

  const parentName = compactDisplayName(hass, parent, config, area);
  const parentWords = normalizedText(parentName)
    .split(/\s+/)
    .filter((word) => word.length >= 4);

  for (const word of parentWords) {
    name = name
      .replace(new RegExp(`\\b${escapeRegExp(word)}\\b`, "ig"), "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  const translated = popupDisplayName(
    hass,
    { ...child, name: null },
    config,
    area
  );

  // popupDisplayName works from the registry name; apply explicit generic
  // translations to our already shortened text as well.
  const haystack = `${name} ${child.entity_id}`
    .toLowerCase()
    .replace(/[-.]/g, "_");

  for (const item of POPUP_GERMAN_NAMES) {
    if (
      item.match.some((term) =>
        haystack.includes(String(term).toLowerCase().replace(/[-.]/g, "_"))
      )
    ) {
      name = item.name;
      break;
    }
  }

  return name || translated || displayName(hass, child, config, area);
}

function firstParentForGlobalConfig(hass, parents, config, area) {
  return [...parents].sort(compareEntities(hass, config, area))[0] || null;
}

function entityIcon(hass, entityId, registryEntry) {
  return (
    registryEntry?.icon ||
    hass.states[entityId]?.attributes?.icon ||
    undefined
  );
}

function isDimmableLight(hass, entityId) {
  const modes = hass.states[entityId]?.attributes?.supported_color_modes;
  if (!Array.isArray(modes) || modes.length === 0) return false;
  return !(modes.length === 1 && modes[0] === "onoff");
}

function deepMerge(base, extra) {
  if (!extra || typeof extra !== "object" || Array.isArray(extra)) return base;
  const out = { ...base };

  for (const [key, value] of Object.entries(extra)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      out[key] &&
      typeof out[key] === "object" &&
      !Array.isArray(out[key])
    ) {
      out[key] = deepMerge(out[key], value);
    } else {
      out[key] = value;
    }
  }

  return out;
}


function appendBubbleStyle(card, css) {
  if (!css) return card;

  const existing = Array.isArray(card.styles)
    ? card.styles.join("\n")
    : (card.styles || "");

  card.styles = `${existing}\n${css}`.trim();
  return card;
}

function appleHomeAccent(domain) {
  switch (domain) {
    case "light":
      return "#FFD60A"; // Apple yellow
    case "switch":
    case "input_boolean":
    case "number":
    case "input_number":
    case "select":
      return "#0A84FF"; // Apple blue
    case "cover":
      return "#0A84FF";
    case "climate":
      return "#FF9F0A"; // Apple orange
    case "media_player":
      return "#BF5AF2"; // Apple purple
    case "lock":
      return "#30D158"; // Apple green
    case "binary_sensor":
      return "#FF453A"; // Apple red for active alerts/open states
    case "fan":
      return "#64D2FF";
    default:
      return "#8E8E93";
  }
}

function appleHomeActiveExpression(domain) {
  switch (domain) {
    case "light":
    case "switch":
    case "input_boolean":
    case "fan":
    case "binary_sensor":
      return "state === 'on'";
    case "cover":
      return "state === 'open'";
    case "climate":
      return "state !== 'off' && state !== 'unavailable'";
    case "media_player":
      return "state === 'playing' || state === 'paused'";
    case "lock":
      return "state === 'unlocked'";
    default:
      return "false";
  }
}

function appleHomeTint(domain) {
  switch (domain) {
    case "light":
    case "cover":
      // Apple Home: active lights and open covers use a white accessory tile.
      return "rgba(255, 255, 255, 0.96)";
    case "climate":
      return "rgba(255, 159, 10, 0.18)";
    case "media_player":
      return "rgba(191, 90, 242, 0.18)";
    case "lock":
      return "rgba(48, 209, 88, 0.18)";
    case "binary_sensor":
      return "rgba(255, 69, 58, 0.18)";
    case "fan":
      return "rgba(100, 210, 255, 0.18)";
    case "switch":
    case "input_boolean":
    case "number":
    case "input_number":
    case "select":
    case "cover":
      return "rgba(10, 132, 255, 0.18)";
    default:
      return "rgba(142, 142, 147, 0.14)";
  }
}

function appleHomeCardStyle(entityId, domain, compact = false, config = {}) {
  const accent = appleHomeAccent(domain);
  const active = appleHomeActiveExpression(domain);
  const activeTint = appleHomeTint(domain);
  const radius = compact ? "22px" : "24px";
  const whiteSurface = domain === "light" || domain === "cover";
  const appleAccessoryIcon =
    domain === "light" ||
    domain === "cover" ||
    domain === "switch";

  return `
    ha-card {
      --bubble-border-radius: ${radius} !important;
      --bubble-main-background-color: rgba(44,44,46,0.92) !important;
      --bubble-secondary-background-color: rgba(58,58,60,0.72) !important;
      --bubble-accent-color: ${accent} !important;
      --bubble-icon-background-color: rgba(118,118,128,0.18) !important;
      --bubble-sub-button-background-color: rgba(118,118,128,0.18) !important;
      --bubble-border: 1px solid rgba(255,255,255,0.055) !important;
      --bubble-box-shadow: none !important;
      border: 1px solid rgba(255,255,255,0.055) !important;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.025),
        0 1px 2px rgba(0,0,0,0.16) !important;
      overflow: hidden !important;
    }

    .bubble-button-card-container {
      background:
        \${${active} ? '${activeTint}' : 'rgba(44,44,46,0.92)'} !important;
    }

    .bubble-media-player-container,
    .bubble-climate-container,
    .bubble-select-card-container {
      background-color: rgba(44,44,46,0.92) !important;
    }

    .bubble-cover-card-container,
    .bubble-cover-container {
      background-color:
        \${${domain === "cover" ? active : "false"}
          ? 'rgba(255,255,255,0.96)'
          : 'rgba(44,44,46,0.92)'} !important;
    }

    .bubble-cover-button {
      background-color: rgba(58,58,60,0.92) !important;
    }

    .bubble-cover-button-icon {
      color: rgba(255,255,255,0.92) !important;
    }

    .bubble-cover-button.disabled {
      opacity: 1 !important;
    }

    .bubble-cover-button.disabled .bubble-cover-button-icon {
      opacity: 0.28 !important;
    }

    /* Bubble Card has its own ON-state layer. Override it so active
       accessories use an Apple-Home-like tint instead of a solid blue tile. */
    .bubble-button-background {
      opacity: 1 !important;
      background-color:
        \${${active} ? '${activeTint}' : 'transparent'} !important;
    }

    .bubble-range-fill {
      background: ${accent} !important;
      opacity: 0.30 !important;
    }

    .bubble-icon-container {
      width: ${compact ? "42px" : "44px"} !important;
      min-width: ${compact ? "42px" : "44px"} !important;
      height: ${compact ? "42px" : "44px"} !important;
      min-height: ${compact ? "42px" : "44px"} !important;
      border-radius: 50% !important;
      background:
        \${${appleAccessoryIcon ? active : "false"}
          ? '${accent}'
          : (${appleAccessoryIcon ? "true" : active}
              ? 'rgba(118,118,128,0.16)'
              : '${accent}26')} !important;
      transition:
        background 180ms ease,
        transform 180ms ease !important;
    }

    .bubble-icon {
      color:
        \${${appleAccessoryIcon ? active : "false"}
          ? 'rgba(255,255,255,0.98)'
          : (${appleAccessoryIcon ? "true" : active}
              ? '${accent}'
              : 'rgba(235,235,245,0.72)')} !important;
      transition: color 180ms ease !important;
    }

    ${whiteSurface ? `
    .bubble-icon-container {
      border:
        1px solid
        \${${active}
          ? 'transparent'
          : 'rgba(255,255,255,0.035)'} !important;
    }
    ` : ""}

    .bubble-name {
      font-size:
        ${compact
          ? (config.apple_compact_name_font_size || "15px")
          : (config.apple_name_font_size || "16px")} !important;
      line-height: 1.15 !important;
      font-weight: 600 !important;
      letter-spacing: -0.25px !important;
      color:
        \${${whiteSurface ? active : "false"}
          ? 'rgba(28,28,30,0.96)'
          : 'rgba(255,255,255,0.96)'} !important;
    }

    .bubble-state {
      font-size:
        ${config.apple_state_font_size || "13px"} !important;
      line-height: 1.15 !important;
      color:
        \${${whiteSurface ? active : "false"}
          ? 'rgba(60,60,67,0.72)'
          : (${active}
              ? 'rgba(255,255,255,0.72)'
              : 'rgba(235,235,245,0.56)')} !important;
      font-weight: 450 !important;
    }

    .bubble-sub-button {
      width: ${compact ? "40px" : "42px"} !important;
      min-width: ${compact ? "40px" : "42px"} !important;
      height: ${compact ? "40px" : "42px"} !important;
      min-height: ${compact ? "40px" : "42px"} !important;
      border-radius: 50% !important;
      background:
        \${${whiteSurface ? active : "false"}
          ? 'rgba(118,118,128,0.14)'
          : 'rgba(118,118,128,0.18)'} !important;
      border:
        1px solid
        \${${whiteSurface ? active : "false"}
          ? 'rgba(60,60,67,0.10)'
          : 'rgba(255,255,255,0.045)'} !important;
      box-shadow: none !important;
    }

    .bubble-sub-button-icon {
      color:
        \${${whiteSurface ? active : "false"}
          ? 'rgba(28,28,30,0.86)'
          : 'rgba(255,255,255,0.90)'} !important;
    }
  `;
}



function switchPowerSubtextStyle(powerEntityId) {
  if (!powerEntityId) return "";

  const safePowerEntityId =
    String(powerEntityId).replace(/'/g, "\\'");

  return `
    \${(() => {
      const powerEntity =
        hass.states['${safePowerEntityId}'];

      if (!powerEntity) return '';

      const rawState =
        String(powerEntity.state ?? '').toLowerCase();

      if (
        rawState === '' ||
        rawState === 'unknown' ||
        rawState === 'unavailable' ||
        rawState === 'none'
      ) {
        return '';
      }

      const stateElement =
        card.querySelector('.bubble-state');

      if (!stateElement) return '';

      const formatted =
        typeof hass.formatEntityState === 'function'
          ? hass.formatEntityState(powerEntity)
          : (
              powerEntity.attributes?.unit_of_measurement
                ? powerEntity.state + ' ' +
                  powerEntity.attributes.unit_of_measurement
                : powerEntity.state
            );

      stateElement.innerText = formatted;
      return '';
    })()}
  `;
}

function appleHomeCoverControlStyle(entityId) {
  const safeEntityId = String(entityId).replace(/'/g, "\\'");

  return `
    \${(() => {
      const entityId = '${safeEntityId}';
      const entity = hass.states[entityId];
      if (!entity || !icon) return '';

      // Keep the last real travel direction per cover. Home Assistant usually
      // reports a stopped, partly open cover simply as "open"; without this
      // memory we cannot know whether the next command should reverse upward
      // or downward.
      window.__atzeCoverLastDirection =
        window.__atzeCoverLastDirection || {};
      const directionMemory =
        window.__atzeCoverLastDirection;

      const coverState = entity.state;
      const positionRaw = entity.attributes?.current_position;
      const position = Number.isFinite(Number(positionRaw))
        ? Number(positionRaw)
        : null;

      const moving =
        coverState === 'opening' ||
        coverState === 'closing';

      if (moving) {
        directionMemory[entityId] = coverState;
      }

      const isClosed =
        coverState === 'closed' ||
        position === 0;

      const isFullyOpen =
        position === 100;

      const lastDirection =
        directionMemory[entityId] || null;

      let nextDirection;

      if (isClosed) {
        nextDirection = 'opening';
      } else if (isFullyOpen) {
        nextDirection = 'closing';
      } else if (lastDirection === 'closing') {
        // Was travelling down, then stopped -> reverse upward next.
        nextDirection = 'opening';
      } else if (lastDirection === 'opening') {
        // Was travelling up, then stopped -> reverse downward next.
        nextDirection = 'closing';
      } else {
        // Safe fallback for a partly open cover after a fresh page load.
        nextDirection = 'closing';
      }

      const actionIcon = moving
        ? 'mdi:stop'
        : nextDirection === 'opening'
          ? 'mdi:arrow-up-bold'
          : 'mdi:arrow-down-bold';

      icon.setAttribute('icon', actionIcon);

      const iconContainer = icon.parentElement;
      if (!iconContainer) return '';

      // Bubble Card's own icon action is disabled. This one control owns
      // Up / Stop / Down and always reverses after a manual stop.
      iconContainer.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();

        const current = hass.states[entityId];
        if (!current) return;

        const currentState = current.state;
        const currentPositionRaw =
          current.attributes?.current_position;
        const currentPosition =
          Number.isFinite(Number(currentPositionRaw))
            ? Number(currentPositionRaw)
            : null;

        if (
          currentState === 'opening' ||
          currentState === 'closing'
        ) {
          // Store the direction before sending stop, because HA can immediately
          // collapse the state back to "open".
          directionMemory[entityId] = currentState;

          hass.callService(
            'cover',
            'stop_cover',
            { entity_id: entityId }
          );
          return;
        }

        const currentClosed =
          currentState === 'closed' ||
          currentPosition === 0;

        const currentFullyOpen =
          currentPosition === 100;

        const rememberedDirection =
          directionMemory[entityId] || null;

        let desiredDirection;

        if (currentClosed) {
          desiredDirection = 'opening';
        } else if (currentFullyOpen) {
          desiredDirection = 'closing';
        } else if (rememberedDirection === 'closing') {
          desiredDirection = 'opening';
        } else if (rememberedDirection === 'opening') {
          desiredDirection = 'closing';
        } else {
          desiredDirection = 'closing';
        }

        if (desiredDirection === 'opening') {
          directionMemory[entityId] = 'opening';
          hass.callService(
            'cover',
            'open_cover',
            { entity_id: entityId }
          );
        } else {
          directionMemory[entityId] = 'closing';
          hass.callService(
            'cover',
            'close_cover',
            { entity_id: entityId }
          );
        }
      };

      return '';
    })()}
  `;
}

function popupHashFor(parentEntityId) {
  return `#atze-${slugify(parentEntityId)}-settings`;
}

function defaultBubbleCard(hass, entity, config, area) {
  const entityId = entity.entity_id;
  const domain = domainOf(entityId);
  const name = displayName(hass, entity, config, area);
  const icon = entityIcon(hass, entityId, entity);

  const base = {
    type: "custom:bubble-card",
    entity: entityId,
    name,
    ...(icon ? { icon } : {}),
  };

  switch (domain) {
    case "cover":
      return {
        type: "custom:bubble-card",
        card_type: "cover",
        entity: entityId,
        name: "Rollladen",
        icon_open: "mdi:window-shutter-open",
        icon_close: "mdi:window-shutter",
        state_content: [
          "state",
          "current_position",
        ],
        tap_action: {
          action: "toggle",
        },
        button_action: {
          tap_action: {
            action: "more-info",
          },
        },
        main_buttons_position: "default",
      };

    case "climate":
      return {
        type: "custom:bubble-card",
        card_type: "climate",
        entity: entityId,
        sub_button: {
          main: [
            {
              name: "HVAC-Modi-Menü",
              select_attribute: "hvac_modes",
              state_background: false,
              show_arrow: false,
              sub_button_type: "select",
            },
          ],
        },
        name: "Thermostat",
        state_content: [
          "state",
          "current_temperature",
        ],
        hide_temperature: false,
        state_color: true,
        card_layout: "normal",
      };

    case "media_player":
      return { ...base, card_type: "media-player" };

    case "select":
      return { ...base, card_type: "select" };

    case "light":
      return {
        ...base,
        card_type: "button",
        button_type: "state",

        // Use Home Assistant's native attribute formatter so brightness is
        // shown as the secondary line (normally as a percentage).
        show_state: false,
        show_attribute: true,
        attribute: "brightness",

        // Bubble Card applies actions placed on the card config to the
        // icon container, while button_action controls the tile background.
        // This gives the Apple Home interaction: icon toggles, tile opens
        // Home Assistant's More Info dialog.
        tap_action: {
          action: "toggle",
        },
        double_tap_action: {
          action: "none",
        },
        hold_action: {
          action: "none",
        },
        button_action: {
          tap_action: {
            action: "more-info",
          },
          double_tap_action: {
            action: "none",
          },
          hold_action: {
            action: "more-info",
          },
        },
      };

    case "switch":
      return {
        ...base,
        ...(aggregateDisplayName(config, entityId)
          ? { name: aggregateDisplayName(config, entityId) }
          : {}),
        card_type: "button",
        button_type: "state",
        show_state: true,

        // Apple Home interaction:
        // icon toggles the switch, the remaining tile opens More Info.
        tap_action: {
          action: "toggle",
        },
        double_tap_action: {
          action: "none",
        },
        hold_action: {
          action: "none",
        },
        button_action: {
          tap_action: {
            action: "more-info",
          },
          double_tap_action: {
            action: "none",
          },
          hold_action: {
            action: "more-info",
          },
        },
      };

    case "input_boolean":
    case "fan":
      return {
        ...base,
        card_type: "button",
        button_type: "switch",
        show_state: true,
      };

    case "input_number":
    case "number":
      return {
        ...base,
        card_type: "button",
        button_type: "slider",
        show_state: true,
      };

    case "button":
      return {
        ...base,
        card_type: "button",
        button_type: "state",
        show_state: false,

        // Apple-style interaction, same idea as lights/switches:
        // icon performs the actual button action,
        // the remaining tile opens Home Assistant More Info.
        tap_action: {
          action: "perform-action",
          perform_action: "button.press",
          target: { entity_id: entityId },
        },
        double_tap_action: {
          action: "none",
        },
        hold_action: {
          action: "none",
        },
        button_action: {
          tap_action: {
            action: "more-info",
          },
          double_tap_action: {
            action: "none",
          },
          hold_action: {
            action: "more-info",
          },
        },
      };

    case "lock":
    case "sensor":
    case "binary_sensor":
    default:
      return {
        ...base,
        card_type: "button",
        button_type: "state",
        show_state: true,
      };
  }
}

function defaultTileCard(hass, entity, config, area) {
  const entityId = entity.entity_id;
  const icon = entityIcon(hass, entityId, entity);

  return {
    type: "tile",
    entity: entityId,
    name: displayName(hass, entity, config, area),
    ...(icon ? { icon } : {}),
  };
}

function buildEntityCard(
  hass,
  entity,
  config,
  areaOverride,
  area,
  options = {}
) {
  const entityId = entity.entity_id;
  const override = getOverride(config.entity_overrides, entityId);

  if (override.hidden === true || override.card === "hidden") return null;

  const cardMode =
    override.card ||
    areaOverride.card ||
    config.default_card ||
    "bubble";

  let card =
    cardMode === "tile"
      ? defaultTileCard(hass, entity, config, area)
      : defaultBubbleCard(hass, entity, config, area);

  const aggregateParent =
    aggregateDeviceParentConfig(config, entityId);

  const aggregateName =
    aggregateDisplayName(config, entityId);

  if (!override.name && aggregateName) {
    card.name = aggregateName;
  }

  if (!override.icon && aggregateParent?.icon) {
    card.icon = aggregateParent.icon;
  }

  if (override.name) card.name = override.name;
  if (override.icon) card.icon = override.icon;

  if (override.button_type && card.type === "custom:bubble-card") {
    card.button_type = override.button_type;
  }

  if (override.card_type && card.type === "custom:bubble-card") {
    card.card_type = override.card_type;
  }

  if (config.bubble_options && card.type === "custom:bubble-card") {
    card = deepMerge(card, config.bubble_options);
  }

  if (areaOverride.bubble_options && card.type === "custom:bubble-card") {
    card = deepMerge(card, areaOverride.bubble_options);
  }

  if (options.compact && card.type === "custom:bubble-card") {
    // Preserve an explicit aggregate-device display name (for example
    // "Kamera"). Previously compactDisplayName() ran afterwards and replaced
    // it again with the original HA friendly name such as "Camera enabled".
    if (!override.name && !aggregateName) {
      card.name = compactDisplayName(hass, entity, config, area);
    } else if (!override.name && aggregateName) {
      card.name = aggregateName;
    }

    // Fixed text is easier to scan in a 2-column mobile layout than
    // horizontally scrolling names.
    card.scrolling_effect =
      override.scrolling_effect ??
      config.compact_scrolling ??
      false;

    const compactNameStyle = `
      .bubble-name {
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
    `;

    appendBubbleStyle(card, compactNameStyle);
  }

  if (options.displayName) {
    card.name = options.displayName;
  }

  if (
    config.apple_home_style !== false &&
    card.type === "custom:bubble-card"
  ) {
    // Use Bubble Card's own Sections sizing model. Its native defaults
    // differ by card type (notably cover defaults to two rows), so Apple
    // Home mode normalizes every entity tile to one row.
    const isNativeCover =
      domainOf(entityId) === "cover" &&
      card.card_type === "cover";

    const nativeRows = Number(
      isNativeCover
        ? (override.rows ?? config.cover_card_rows ?? 1)
        : options.compact
          ? (override.rows ?? config.apple_compact_rows ?? 1)
          : (override.rows ?? config.apple_card_rows ?? 1)
    );

    const normalizedRows =
      Number.isFinite(nativeRows) && nativeRows > 0
        ? nativeRows
        : 1;

    card.card_layout =
      override.card_layout ||
      (
        domainOf(entityId) === "climate"
          ? (config.climate_card_layout || "normal")
          : (config.apple_card_layout || "large")
      );

    card.rows = normalizedRows;
    card.grid_options = {
      ...(card.grid_options || {}),
      rows: normalizedRows,
    };

    appendBubbleStyle(
      card,
      appleHomeCardStyle(
        entityId,
        domainOf(entityId),
        options.compact === true,
        config
      )
    );

    if (
      domainOf(entityId) === "switch" &&
      options.powerEntityId
    ) {
      appendBubbleStyle(
        card,
        switchPowerSubtextStyle(options.powerEntityId)
      );
    }
  }

  if (options.popupHash && card.type === "custom:bubble-card") {
    if (domainOf(entityId) === "climate") {
      card.button_action = deepMerge(
        card.button_action || {},
        {
          hold_action: {
            action: "navigate",
            navigation_path: options.popupHash,
          },
        }
      );

    } else {
      const settingsButton = {
      name: "Einstellungen",
      icon: "mdi:dots-horizontal-circle-outline",
      show_name: false,
      show_state: false,
      show_background: true,
      tap_action: {
        action: "navigate",
        navigation_path: options.popupHash,
      },
      };

      if (Array.isArray(card.sub_button)) {
        card.sub_button = [...card.sub_button, settingsButton];
      } else if (
        card.sub_button &&
        typeof card.sub_button === "object"
      ) {
        card.sub_button = {
          ...card.sub_button,
          main: [
            ...asArray(card.sub_button.main),
            settingsButton,
          ],
        };
      } else {
        card.sub_button = [settingsButton];
      }
    }
  }

  if (override.config && typeof override.config === "object") {
    card = deepMerge(card, override.config);
  }

  return card;
}

function entityOrder(hass, entity, config, area) {
  const override = getOverride(config.entity_overrides, entity.entity_id);
  const order = Number.isFinite(Number(override.order))
    ? Number(override.order)
    : 1000;

  const name = displayName(hass, entity, config, area).toLowerCase();
  return { order, name };
}

function compareEntities(hass, config, area) {
  return (a, b) => {
    const aa = entityOrder(hass, a, config, area);
    const bb = entityOrder(hass, b, config, area);

    if (aa.order !== bb.order) return aa.order - bb.order;
    return aa.name.localeCompare(bb.name, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  };
}

function compareAreas(config) {
  return (a, b) => {
    const ao = getOverride(config.area_overrides, a.area_id);
    const bo = getOverride(config.area_overrides, b.area_id);

    const aOrder = Number.isFinite(Number(ao.order)) ? Number(ao.order) : 1000;
    const bOrder = Number.isFinite(Number(bo.order)) ? Number(bo.order) : 1000;

    if (aOrder !== bOrder) return aOrder - bOrder;

    const an = (ao.name || a.name || a.area_id).toLowerCase();
    const bn = (bo.name || b.name || b.area_id).toLowerCase();

    return an.localeCompare(bn, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  };
}

function effectiveAreaId(entity, deviceById) {
  if (entity.area_id) return entity.area_id;

  if (entity.device_id && deviceById.has(entity.device_id)) {
    return deviceById.get(entity.device_id)?.area_id || null;
  }

  return null;
}

function isUnavailable(hass, entityId) {
  return hass.states[entityId]?.state === "unavailable";
}


function normalizedFriendlyName(hass, entity) {
  return normalizedText(
    rawFriendlyName(hass, entity.entity_id, entity)
  );
}

function isRoomMeterEntity(hass, entity, config) {
  if (config.room_meter_group === false) return false;
  if (domainOf(entity.entity_id) !== "sensor") return false;

  const deviceClass = entityDeviceClass(hass, entity);
  if (!["energy", "power", "current"].includes(deviceClass)) return false;

  const name = normalizedFriendlyName(hass, entity);

  // Room meters in Atze's setup use generic names such as
  // Energie / Leistung / Stromstärke. Appliance-specific values
  // contain names such as HomePod, Kühlschrank etc. and already
  // move into their device popup.
  const genericNames = new Set([
    "energie",
    "energy",
    "leistung",
    "power",
    "stromstarke",
    "stromstaerke",
    "current",
  ]);

  if (genericNames.has(name)) return true;

  const configuredNames = asArray(config.room_meter_names)
    .map((value) => normalizedText(value))
    .filter(Boolean);

  return configuredNames.includes(name);
}


function hideRoomMeterEntityFromSections(hass, entity, config) {
  if (config.room_meter_hide_non_power === false) return false;
  if (!isRoomMeterEntity(hass, entity, config)) return false;

  const deviceClass = entityDeviceClass(hass, entity);

  // The current Power value is promoted to a badge.
  // Energy and Current stay available in Home Assistant, but are not
  // rendered in the room dashboard.
  return deviceClass === "energy" || deviceClass === "current";
}

function validBadgeState(hass, entityId) {
  const state = hass.states[entityId]?.state;
  return state != null && !["unknown", "unavailable", "none", ""].includes(state);
}

function environmentBadgeScore(hass, entity, area, deviceClass) {
  let score = 0;

  const rawName = normalizedFriendlyName(hass, entity);
  const areaName = normalizedText(area?.name || "");
  const entityId = normalizedText(entity.entity_id);

  const targetWords =
    deviceClass === "temperature"
      ? ["temperatur", "temperature"]
      : deviceClass === "humidity"
        ? ["luftfeuchtigkeit", "humidity"]
        : deviceClass === "power"
          ? ["leistung", "power"]
          : [];

  if (targetWords.includes(rawName)) score += 100;

  if (
    deviceClass === "power" &&
    rawName === "leistung"
  ) {
    score += 200;
  }

  if (areaName && rawName.includes(areaName)) score += 20;
  if (areaName && entityId.includes(areaName)) score += 10;

  if (entity.entity_category === "diagnostic") score -= 100;
  if (entity.entity_category === "config") score -= 100;

  // Prefer shorter, room-like names over verbose device-internal sensors.
  score -= Math.min(rawName.length, 50) / 10;

  return score;
}


function binaryBadgeScore(hass, entity, area, kind) {
  const rawName = normalizedFriendlyName(hass, entity);
  const areaName = normalizedText(area?.name || "");
  const deviceClass = entityDeviceClass(hass, entity);
  const entityId = normalizedText(entity.entity_id);

  let score = 0;

  if (kind === "occupancy") {
    if (deviceClass === "occupancy") score += 120;
    if (deviceClass === "motion") score += 80;

    const occupancyNames = [
      "anwesenheit",
      "raumbelegung",
      "belegung",
      "occupancy",
      "presence",
    ];

    if (occupancyNames.includes(rawName)) score += 150;
    if (
      rawName.includes("anwesenheit") ||
      rawName.includes("belegung") ||
      rawName.includes("occupancy") ||
      rawName.includes("presence")
    ) {
      score += 60;
    }
  }

  if (kind === "window") {
    if (deviceClass === "window") score += 150;
    if (deviceClass === "door") score += 150;
    if (deviceClass === "opening") score += 80;

    if (
      rawName === "fenstersensor" ||
      rawName === "fenster" ||
      rawName === "tursensor" ||
      rawName === "türsensor" ||
      rawName === "tur sensor" ||
      rawName === "tür sensor"
    ) {
      score += 180;
    }

    if (
      rawName.includes("fenster") ||
      entityId.includes("fenster") ||
      rawName.includes("tursensor") ||
      rawName.includes("türsensor") ||
      rawName.includes("tur sensor") ||
      rawName.includes("tür sensor") ||
      rawName.includes("door") ||
      entityId.includes("tursensor") ||
      entityId.includes("door")
    ) {
      score += 100;
    }
  }

  if (kind === "roller_shutter") {
    if (deviceClass === "opening") score += 100;
    if (deviceClass === "window") score += 40;

    if (
      rawName === "rollladensensor" ||
      rawName === "rollladen sensor"
    ) {
      score += 220;
    }

    if (
      rawName.includes("rollladen") ||
      rawName.includes("rollladen") ||
      entityId.includes("rollladen") ||
      entityId.includes("rollladen")
    ) {
      score += 140;
    }

    // Avoid accidentally picking the ordinary window sensor.
    if (rawName.includes("fenster") || entityId.includes("fenster")) {
      score -= 120;
    }
  }

  if (kind === "smoke") {
    if (deviceClass === "smoke") score += 240;

    if (
      rawName === "rauch" ||
      rawName === "rauchmelder" ||
      rawName === "smoke"
    ) {
      score += 220;
    }

    if (
      rawName.includes("rauch") ||
      rawName.includes("smoke") ||
      entityId.includes("rauch") ||
      entityId.includes("smoke")
    ) {
      score += 140;
    }
  }

  if (areaName && rawName.includes(areaName)) score += 20;
  if (areaName && entityId.includes(areaName)) score += 10;

  if (entity.entity_category === "diagnostic") score -= 150;
  if (entity.entity_category === "config") score -= 150;

  score -= Math.min(rawName.length, 50) / 10;

  return score;
}

function selectBinaryBadge(
  hass,
  entities,
  config,
  area,
  popupMap,
  kind
) {
  const candidates = entities
    .filter((entity) => {
      if (shouldHideExactEntity(config, entity.entity_id)) return false;
      if (domainOf(entity.entity_id) !== "binary_sensor") return false;
      if (popupMap.childToParent.has(entity.entity_id)) return false;
      if (!validBadgeState(hass, entity.entity_id)) return false;
      if (entity.entity_category === "diagnostic") return false;
      if (entity.entity_category === "config") return false;

      const deviceClass = entityDeviceClass(hass, entity);

      if (kind === "occupancy") {
        return ["occupancy", "motion"].includes(deviceClass);
      }

      if (kind === "window") {
        const name = normalizedFriendlyName(hass, entity);
        const entityId = normalizedText(entity.entity_id);

        return (
          deviceClass === "window" ||
          deviceClass === "door" ||
          (
            deviceClass === "opening" &&
            (
              name.includes("fenster") ||
              entityId.includes("fenster") ||
              name.includes("tursensor") ||
              name.includes("türsensor") ||
              name.includes("tur sensor") ||
              name.includes("tür sensor") ||
              name.includes("door") ||
              entityId.includes("tursensor") ||
              entityId.includes("door")
            )
          )
        );
      }

      if (kind === "roller_shutter") {
        const name = normalizedFriendlyName(hass, entity);
        const entityId = normalizedText(entity.entity_id);

        return (
          (
            deviceClass === "opening" ||
            deviceClass === "window"
          ) &&
          (
            name.includes("rollladen") ||
            name.includes("rollladen") ||
            entityId.includes("rollladen") ||
            entityId.includes("rollladen")
          )
        );
      }

      if (kind === "smoke") {
        const name = normalizedFriendlyName(hass, entity);
        const entityId = normalizedText(entity.entity_id);

        return (
          deviceClass === "smoke" ||
          name.includes("rauch") ||
          name.includes("smoke") ||
          entityId.includes("rauch") ||
          entityId.includes("smoke")
        );
      }

      return false;
    })
    .sort(
      (a, b) =>
        binaryBadgeScore(hass, b, area, kind) -
        binaryBadgeScore(hass, a, area, kind)
    );

  if (!candidates.length) return null;

  const selected = candidates[0];
  const override = getOverride(
    config.entity_overrides,
    selected.entity_id
  );

  let badge;

  if (
    kind === "window" ||
    kind === "roller_shutter"
  ) {
    badge = {
      type: "custom:atze-warning-badge-v2",
      entity: selected.entity_id,
      hide_inactive: true,
      ...(kind === "roller_shutter"
        ? { active_text: "Unsicher" }
        : {}),
    };
  } else if (kind === "smoke") {
    badge = {
      type: "custom:atze-status-badge-v1",
      entity: selected.entity_id,
      inactive_icon_color: "#30D158",
      active_icon_color: "#FF453A",
    };
  } else {
    badge = {
      type: "entity",
      entity: selected.entity_id,
      color: "state",
    };
  }

  if (override.badge_name) badge.name = override.badge_name;
  if (override.badge_icon) badge.icon = override.badge_icon;

  return {
    badge,
    entityId: selected.entity_id,
  };
}

function selectEnvironmentBadges(
  hass,
  entities,
  config,
  area,
  popupMap,
  areaOverride
) {
  if (config.environment_badges === false) {
    return { badges: [], entityIds: new Set() };
  }

  const badges = [];
  const entityIds = new Set();
  let occupancyEntityId = null;
  let occupancyBadge = null;

  const requestedClasses = asArray(areaOverride.environment_badges).length
    ? asArray(areaOverride.environment_badges)
    : asArray(config.environment_badges_classes).length
      ? asArray(config.environment_badges_classes)
      : ["temperature", "humidity", "power"];

  for (const deviceClass of requestedClasses) {
    const candidates = entities
      .filter((entity) => {
        if (shouldHideExactEntity(config, entity.entity_id)) return false;
        if (domainOf(entity.entity_id) !== "sensor") return false;
        if (popupMap.childToParent.has(entity.entity_id)) return false;
        if (!validBadgeState(hass, entity.entity_id)) return false;
        if (entity.entity_category === "diagnostic") return false;
        if (entity.entity_category === "config") return false;

        return entityDeviceClass(hass, entity) === deviceClass;
      })
      .sort(
        (a, b) =>
          environmentBadgeScore(hass, b, area, deviceClass) -
          environmentBadgeScore(hass, a, area, deviceClass)
      );

    if (!candidates.length) continue;

    const selected = candidates[0];
    const entityId = selected.entity_id;

    const badge = {
      type: "entity",
      entity: entityId,
      color:
        deviceClass === "temperature"
          ? "red"
          : deviceClass === "humidity"
            ? "blue"
            : deviceClass === "power"
              ? "yellow"
              : undefined,
    };

    if (badge.color === undefined) {
      delete badge.color;
    }

    const override = getOverride(config.entity_overrides, entityId);
    if (override.badge_name) badge.name = override.badge_name;
    if (override.badge_icon) badge.icon = override.badge_icon;

    badges.push(badge);
    entityIds.add(entityId);
  }

  if (config.occupancy_badge !== false) {
    const occupancy = selectBinaryBadge(
      hass,
      entities,
      config,
      area,
      popupMap,
      "occupancy"
    );

    if (occupancy) {
      const manualOccupancyBadge =
        Array.isArray(areaOverride.badges)
          ? areaOverride.badges.find(
              (badge) => badge?.entity === occupancy.entityId
            )
          : null;

      const selectedOccupancyBadge =
        manualOccupancyBadge
          ? { ...manualOccupancyBadge }
          : occupancy.badge;

      badges.push(selectedOccupancyBadge);
      entityIds.add(occupancy.entityId);
      occupancyEntityId = occupancy.entityId;
      occupancyBadge = selectedOccupancyBadge;
    }
  }

  // Runtime aggregate parents can ask to be promoted to a badge.
  // This is used for the Flur radar/presence sensor.
  for (const entity of entities) {
    const aggregate =
      aggregateDeviceParentConfig(config, entity.entity_id);

    if (!aggregate?.badge) continue;
    if (entityIds.has(entity.entity_id)) continue;

    const manualAggregateBadge =
      Array.isArray(areaOverride.badges)
        ? areaOverride.badges.find(
            (badge) => badge?.entity === entity.entity_id
          )
        : null;

    if (manualAggregateBadge) {
      badges.push({ ...manualAggregateBadge });
    } else {
      badges.push({
        type: "entity",
        entity: entity.entity_id,
        icon: aggregate.badge_icon || aggregate.icon,
        color: aggregate.badge_color || "green",
      });
    }

    entityIds.add(entity.entity_id);
  }

  if (
    config.smoke_badge !== false &&
    areaOverride.smoke_badge !== false
  ) {
    const smokeState = selectBinaryBadge(
      hass,
      entities,
      config,
      area,
      popupMap,
      "smoke"
    );

    if (smokeState) {
      badges.push(smokeState.badge);
      entityIds.add(smokeState.entityId);
    }
  }

  if (config.window_badge !== false) {
    const windowState = selectBinaryBadge(
      hass,
      entities,
      config,
      area,
      popupMap,
      "window"
    );

    if (windowState) {
      badges.push(windowState.badge);
      entityIds.add(windowState.entityId);
    }
  }

  if (
    config.roller_shutter_badge !== false &&
    areaOverride.roller_shutter_badge !== false
  ) {
    const rollerShutterState = selectBinaryBadge(
      hass,
      entities,
      config,
      area,
      popupMap,
      "roller_shutter"
    );

    if (rollerShutterState) {
      badges.push(rollerShutterState.badge);
      entityIds.add(rollerShutterState.entityId);
    }
  }

  // Optional manually authored badges per area.
  if (Array.isArray(areaOverride.badges)) {
    for (const manualBadge of areaOverride.badges) {
      const manualEntityId = manualBadge?.entity;

      if (manualEntityId && entityIds.has(manualEntityId)) {
        continue;
      }

      badges.push(manualBadge);

      if (manualEntityId) {
        entityIds.add(manualEntityId);
      }
    }
  }

  return {
    badges,
    entityIds,
    occupancyEntityId,
    occupancyBadge,
  };
}

function autoTechnicalGroup(hass, entity, config) {
  if (config.auto_tech_group === false) return false;

  const domain = domainOf(entity.entity_id);
  if (!["switch", "input_boolean"].includes(domain)) return false;

  const text = `${entity.entity_id} ${rawFriendlyName(hass, entity.entity_id, entity)}`
    .toLowerCase();

  const keywords = asArray(config.tech_keywords).length
    ? asArray(config.tech_keywords)
    : [
        "bluetooth",
        "proxy",
        "ld2410",
        "anwesenheitserkennung",
        "presence",
        "radar",
      ];

  return keywords.some((keyword) =>
    text.includes(String(keyword).toLowerCase())
  );
}

function groupKeyForEntity(hass, entity, config) {
  const override = getOverride(config.entity_overrides, entity.entity_id);

  if (override.group) return String(override.group);
  if (isRoomMeterEntity(hass, entity, config)) return "raumverbrauch";
  if (autoTechnicalGroup(hass, entity, config)) return "technik";

  return domainOf(entity.entity_id);
}

function groupMeta(groupKey, config) {
  const base =
    SPECIAL_GROUP_META[groupKey] ||
    DOMAIN_META[groupKey] ||
    { title: groupKey, icon: "mdi:shape-outline", order: 800 };

  const override = getOverride(config.group_overrides, groupKey);

  return {
    title: override.title || base.title,
    icon: override.icon || base.icon,
    order: Number.isFinite(Number(override.order))
      ? Number(override.order)
      : base.order,
    compact:
      override.compact === true
        ? true
        : override.compact === false
          ? false
          : null,
    columns:
      Number.isFinite(Number(override.columns))
        ? Number(override.columns)
        : null,
  };
}

function isCompactGroup(groupKey, entities, config) {
  const meta = groupMeta(groupKey, config);
  if (meta.compact !== null) return meta.compact;

  const compactGroups = new Set(
    asArray(config.compact_groups).length
      ? asArray(config.compact_groups)
      : ["technik"]
  );

  if (compactGroups.has(groupKey)) return true;

  const compactDomains = new Set(
    asArray(config.compact_domains).length
      ? asArray(config.compact_domains)
      : ["switch"]
  );

  const domains = new Set(entities.map((entity) => domainOf(entity.entity_id)));
  return [...domains].every((domain) => compactDomains.has(domain));
}

function addPopupChild(parentToChildren, childToParent, parentId, child) {
  const oldParent = childToParent.get(child.entity_id);

  if (oldParent && parentToChildren.has(oldParent)) {
    parentToChildren.set(
      oldParent,
      parentToChildren
        .get(oldParent)
        .filter((item) => item.entity_id !== child.entity_id)
    );
  }

  childToParent.set(child.entity_id, parentId);

  if (!parentToChildren.has(parentId)) {
    parentToChildren.set(parentId, []);
  }

  if (
    !parentToChildren
      .get(parentId)
      .some((item) => item.entity_id === child.entity_id)
  ) {
    parentToChildren.get(parentId).push(child);
  }
}

function buildDevicePopupMap(hass, entities, config, deviceById, areaById) {
  const parentToChildren = new Map();
  const childToParent = new Map();

  if (config.device_popups === false) {
    return { parentToChildren, childToParent };
  }

  const byDevice = new Map();

  for (const entity of entities) {
    if (!entity.device_id) continue;
    if (!byDevice.has(entity.device_id)) byDevice.set(entity.device_id, []);
    byDevice.get(entity.device_id).push(entity);
  }

  const childDomains = new Set(
    asArray(config.popup_child_domains).length
      ? asArray(config.popup_child_domains)
      : DEFAULT_POPUP_CHILD_DOMAINS
  );

  // ---------------------------------------------------------------
  // 1) Climate device popup (existing behavior)
  // ---------------------------------------------------------------
  for (const deviceEntities of byDevice.values()) {
    const climateParents = deviceEntities.filter(
      (entity) => domainOf(entity.entity_id) === "climate"
    );

    if (climateParents.length !== 1) continue;
    const parent = climateParents[0];

    for (const child of deviceEntities) {
      if (child.entity_id === parent.entity_id) continue;

      const childOverride = getOverride(
        config.entity_overrides,
        child.entity_id
      );

      if (childOverride.popup === false) continue;
      if (!childDomains.has(domainOf(child.entity_id))) continue;

      addPopupChild(
        parentToChildren,
        childToParent,
        parent.entity_id,
        child
      );
    }
  }

  // ---------------------------------------------------------------
  // 1b) Climate prefix fallback
  // ---------------------------------------------------------------
  // Some integrations expose climate telemetry/status entities without
  // linking them to exactly the same HA device. If their object id clearly
  // belongs to a climate parent, keep them behind that thermostat popup.
  const climateParents = entities.filter(
    (entity) => domainOf(entity.entity_id) === "climate"
  );

  for (const child of entities) {
    if (childToParent.has(child.entity_id)) continue;
    if (!childDomains.has(domainOf(child.entity_id))) continue;
    if (domainOf(child.entity_id) === "climate") continue;

    const childOverride = getOverride(
      config.entity_overrides,
      child.entity_id
    );

    if (childOverride.popup === false) continue;

    const childAreaId =
      effectiveAreaId(child, deviceById);

    const childObjectId =
      child.entity_id.split(".").slice(1).join(".");

    if (!childObjectId) continue;

    const matches = climateParents
      .filter((parent) => {
        const parentAreaId =
          effectiveAreaId(parent, deviceById);

        if (
          childAreaId &&
          parentAreaId &&
          childAreaId !== parentAreaId
        ) {
          return false;
        }

        const parentObjectId =
          parent.entity_id
            .split(".")
            .slice(1)
            .join(".");

        if (!parentObjectId) return false;

        return (
          childObjectId === parentObjectId ||
          childObjectId.startsWith(
            `${parentObjectId}_`
          ) ||
          childObjectId.endsWith(
            `_${parentObjectId}`
          )
        );
      })
      .sort((a, b) => {
        const aId =
          a.entity_id.split(".").slice(1).join(".");
        const bId =
          b.entity_id.split(".").slice(1).join(".");

        return bId.length - aId.length;
      });

    if (!matches.length) continue;

    addPopupChild(
      parentToChildren,
      childToParent,
      matches[0].entity_id,
      child
    );
  }

  // ---------------------------------------------------------------
  // 2) Climate orphan controls, e.g. separate Restart entity
  // ---------------------------------------------------------------
  if (config.popup_orphan_controls !== false) {
    const climatesByArea = new Map();

    for (const entity of entities) {
      if (domainOf(entity.entity_id) !== "climate") continue;

      const areaId = effectiveAreaId(entity, deviceById);
      if (!areaId) continue;

      if (!climatesByArea.has(areaId)) climatesByArea.set(areaId, []);
      climatesByArea.get(areaId).push(entity);
    }

    const orphanKeywords = asArray(config.popup_orphan_keywords).length
      ? asArray(config.popup_orphan_keywords)
      : DEFAULT_POPUP_ORPHAN_KEYWORDS;

    for (const child of entities) {
      if (childToParent.has(child.entity_id)) continue;
      if (!childDomains.has(domainOf(child.entity_id))) continue;

      const childOverride = getOverride(
        config.entity_overrides,
        child.entity_id
      );
      if (childOverride.popup === false) continue;

      const areaId = effectiveAreaId(child, deviceById);
      if (!areaId) continue;

      const climateParents = climatesByArea.get(areaId) || [];
      if (climateParents.length !== 1) continue;

      const haystack =
        `${rawFriendlyName(hass, child.entity_id, child)} ${child.entity_id}`
          .toLowerCase();

      if (
        !orphanKeywords.some((keyword) =>
          haystack.includes(String(keyword).toLowerCase())
        )
      ) {
        continue;
      }

      addPopupChild(
        parentToChildren,
        childToParent,
        climateParents[0].entity_id,
        child
      );
    }
  }

  // ---------------------------------------------------------------
  // 3) Explicit aggregate-device popups
  // ---------------------------------------------------------------
  // Some integrations expose a large device (for example a camera) as
  // many separate switches/sensors. One selected entity becomes the
  // visible parent tile; all matching siblings on the same HA device
  // are moved behind it.
  for (const parent of entities) {
    const aggregate =
      aggregateDeviceParentConfig(config, parent.entity_id);

    if (!aggregate || !parent.device_id) continue;

    const siblings = byDevice.get(parent.device_id) || [];
    const allowedChildDomains = new Set(
      asArray(aggregate.child_domains).length
        ? asArray(aggregate.child_domains)
        : [
            "switch",
            "sensor",
            "binary_sensor",
            "number",
            "select",
            "button",
          ]
    );

    const excludedChildDeviceClasses = new Set(
      asArray(aggregate.exclude_child_device_classes)
    );

    for (const child of siblings) {
      if (child.entity_id === parent.entity_id) continue;
      if (!allowedChildDomains.has(domainOf(child.entity_id))) continue;
      if (
        excludedChildDeviceClasses.has(
          entityDeviceClass(hass, child)
        )
      ) {
        continue;
      }

      const childOverride = getOverride(
        config.entity_overrides,
        child.entity_id
      );

      if (childOverride.popup === false) continue;

      addPopupChild(
        parentToChildren,
        childToParent,
        parent.entity_id,
        child
      );
    }
  }

  // ---------------------------------------------------------------
  // 4) Generic smart-device popups
  // ---------------------------------------------------------------
  if (config.generic_device_popups !== false) {
    const genericParentDomains = new Set(
      asArray(config.generic_popup_parent_domains).length
        ? asArray(config.generic_popup_parent_domains)
        : DEFAULT_GENERIC_POPUP_PARENT_DOMAINS
    );

    const genericChildDomains = new Set(
      asArray(config.generic_popup_child_domains).length
        ? asArray(config.generic_popup_child_domains)
        : DEFAULT_GENERIC_POPUP_CHILD_DOMAINS
    );

    for (const deviceEntities of byDevice.values()) {
      const parents = deviceEntities.filter((entity) => {
        if (!genericParentDomains.has(domainOf(entity.entity_id))) return false;
        if (childToParent.has(entity.entity_id)) return false;

        const override = getOverride(
          config.entity_overrides,
          entity.entity_id
        );
        return override.device_popup !== false;
      });

      if (!parents.length) continue;

      const parentAreaId = effectiveAreaId(parents[0], deviceById);
      const parentArea = parentAreaId ? areaById.get(parentAreaId) : null;

      const children = deviceEntities.filter((entity) => {
        if (parents.some((parent) => parent.entity_id === entity.entity_id)) {
          return false;
        }
        if (childToParent.has(entity.entity_id)) return false;
        if (!genericChildDomains.has(domainOf(entity.entity_id))) return false;
        if (!genericPopupChildEligible(hass, entity)) return false;

        const override = getOverride(
          config.entity_overrides,
          entity.entity_id
        );
        return override.popup !== false;
      });

      for (const child of children) {
        let parent = null;

        // A single switch on a smart plug is unambiguous.
        if (parents.length === 1) {
          parent = parents[0];
        } else {
          // Multi-outlet strips: 1-HomePod <-> 1-Energie HomePod,
          // Power on behavior 1, etc.
          const childChannel = channelNumber(hass, child);

          if (childChannel) {
            const matches = parents.filter(
              (candidate) =>
                channelNumber(hass, candidate) === childChannel
            );

            if (matches.length === 1) parent = matches[0];
          }

          // Technical devices: "Anwesenheit Timeout" can be matched to
          // "Anwesenheitserkennung" through name affinity.
          if (!parent) {
            const scored = parents
              .map((candidate) => ({
                candidate,
                score: parentChildNameAffinity(hass, candidate, child),
              }))
              .sort((a, b) => b.score - a.score);

            if (
              scored.length &&
              scored[0].score >= 8 &&
              (scored.length === 1 || scored[0].score > scored[1].score)
            ) {
              parent = scored[0].candidate;
            }
          }

          // Device-wide configuration with no channel match:
          // keep it behind the first channel instead of cluttering the room.
          if (
            !parent &&
            config.generic_global_config_to_first !== false &&
            child.entity_category === "config"
          ) {
            parent = firstParentForGlobalConfig(
              hass,
              parents,
              config,
              parentArea
            );
          }
        }

        if (parent) {
          addPopupChild(
            parentToChildren,
            childToParent,
            parent.entity_id,
            child
          );
        }
      }
    }
  }

  // ---------------------------------------------------------------
  // 5) Cross-device entity-id prefix matching
  // ---------------------------------------------------------------
  // Some integrations expose a config entity as a separate HA device.
  // Example:
  //   light.kuche_decke_licht
  //   select.kuche_decke_licht_power_on_behavior
  // The object-id prefix is still unambiguous, so attach it automatically.
  if (config.entity_id_prefix_popups !== false) {
    const genericParentDomains = new Set(
      asArray(config.generic_popup_parent_domains).length
        ? asArray(config.generic_popup_parent_domains)
        : DEFAULT_GENERIC_POPUP_PARENT_DOMAINS
    );

    const genericChildDomains = new Set(
      asArray(config.generic_popup_child_domains).length
        ? asArray(config.generic_popup_child_domains)
        : DEFAULT_GENERIC_POPUP_CHILD_DOMAINS
    );

    const prefixParents = entities.filter((entity) =>
      genericParentDomains.has(domainOf(entity.entity_id))
    );

    for (const child of entities) {
      if (childToParent.has(child.entity_id)) continue;
      if (!genericChildDomains.has(domainOf(child.entity_id))) continue;

      const childOverride = getOverride(
        config.entity_overrides,
        child.entity_id
      );
      if (childOverride.popup === false) continue;

      const childObjectId = child.entity_id.split(".").slice(1).join(".");
      if (!childObjectId) continue;

      const matches = prefixParents
        .map((parent) => {
          const parentObjectId =
            parent.entity_id.split(".").slice(1).join(".");

          return {
            parent,
            parentObjectId,
            matches:
              childObjectId === parentObjectId ||
              childObjectId.startsWith(`${parentObjectId}_`),
          };
        })
        .filter((entry) => entry.matches)
        .sort(
          (a, b) =>
            b.parentObjectId.length - a.parentObjectId.length
        );

      if (matches.length) {
        addPopupChild(
          parentToChildren,
          childToParent,
          matches[0].parent.entity_id,
          child
        );
      }
    }
  }

  // ---------------------------------------------------------------
  // 6) Explicit popup_parent always wins
  // ---------------------------------------------------------------
  for (const entity of entities) {
    const override = getOverride(config.entity_overrides, entity.entity_id);
    if (!override.popup_parent) continue;

    addPopupChild(
      parentToChildren,
      childToParent,
      String(override.popup_parent),
      entity
    );
  }

  return { parentToChildren, childToParent };
}

function visiblePopupChildren(hass, children, config) {
  return (children || []).filter((child) => {
    const state = hass.states[child.entity_id]?.state;
    const domain = domainOf(child.entity_id);

    // Home Assistant button entities can legitimately stay "unknown" until
    // they have been pressed for the first time. They are still fully usable,
    // so hiding them here would remove actions such as Aqara Identify.
    if (
      config.popup_hide_unknown !== false &&
      state === "unknown" &&
      domain !== "button"
    ) {
      return false;
    }

    if (config.popup_hide_unavailable !== false && state === "unavailable") {
      return false;
    }

    return true;
  });
}

function buildPopupCard(
  hass,
  parentEntity,
  children,
  config,
  areaOverride,
  area
) {
  const visibleChildren = visiblePopupChildren(hass, children, config);
  if (!visibleChildren.length) return null;

  const parentOverride = getOverride(
    config.entity_overrides,
    parentEntity.entity_id
  );

  const hash =
    parentOverride.popup_hash ||
    popupHashFor(parentEntity.entity_id);

  const aggregateParent =
    aggregateDeviceParentConfig(config, parentEntity.entity_id);

  const parentName =
    parentOverride.popup_name ||
    aggregateParent?.popup_name ||
    aggregateParent?.name ||
    displayName(hass, parentEntity, config, area);

  const isClimatePopup = domainOf(parentEntity.entity_id) === "climate";
  const isAggregatePopup = Boolean(aggregateParent);

  const popupColumns = Number(
    parentOverride.popup_columns ||
    aggregateParent?.popup_columns ||
    (isClimatePopup
      ? areaOverride.popup_columns ||
        config.climate_popup_columns ||
        config.popup_columns ||
        2
      : areaOverride.device_popup_columns ||
        config.device_popup_columns ||
        1)
  );

  const childCards = [...visibleChildren]
    .sort(compareEntities(hass, config, area))
    .map((child) =>
      buildEntityCard(
        hass,
        child,
        config,
        areaOverride,
        area,
        {
          compact: true,
          displayName: isClimatePopup
            ? popupDisplayName(hass, child, config, area)
            : genericPopupDisplayName(
                hass,
                child,
                parentEntity,
                config,
                area
              ),
        }
      )
    )
    .filter(Boolean);

  return {
    type: "custom:bubble-card",
    card_type: "pop-up",
    hash,
    name:
      isClimatePopup || isAggregatePopup
        ? `${parentName} Einstellungen`
        : `${parentName} Details`,
    icon:
      parentOverride.popup_icon ||
      aggregateParent?.popup_icon ||
      (isClimatePopup ? "mdi:cog-outline" : "mdi:tune-variant"),
    entity: parentEntity.entity_id,
    cards: [
      {
        type: "grid",
        columns: popupColumns,
        square: false,
        cards: childCards,
      },
    ],
  };
}

function buildGroupSection(
  hass,
  groupKey,
  entities,
  config,
  areaOverride,
  area,
  popupMap,
  registryByEntityId
) {
  const meta = groupMeta(groupKey, config);
  const compact = isCompactGroup(groupKey, entities, config);

  const cards = [];

  for (const entity of [...entities].sort(compareEntities(hass, config, area))) {
    const children = popupMap.parentToChildren.get(entity.entity_id) || [];
    const visibleChildren = visiblePopupChildren(hass, children, config);

    const isSwitch =
      domainOf(entity.entity_id) === "switch";

    const aggregateParent =
      aggregateDeviceParentConfig(config, entity.entity_id);
    const allowSwitchPopup =
      Boolean(aggregateParent) &&
      aggregateParent.popup !== false;

    const powerChild = isSwitch
      ? visibleChildren.find(
          (child) =>
            domainOf(child.entity_id) === "sensor" &&
            entityDeviceClass(hass, child) === "power" &&
            validBadgeState(hass, child.entity_id)
        ) || null
      : null;

    // Switches are intentionally kept clean: no device-popup menu/dots.
    // Their associated children remain mapped internally so the power sensor
    // can be used as subtext without appearing as a separate room card.
    const popupHash =
      (!isSwitch || allowSwitchPopup) && visibleChildren.length
        ? popupHashFor(entity.entity_id)
        : null;

    const card = buildEntityCard(
      hass,
      entity,
      config,
      areaOverride,
      area,
      {
        compact,
        popupHash,
        powerEntityId: powerChild?.entity_id || null,
      }
    );

    if (card) cards.push(card);

    if ((!isSwitch || allowSwitchPopup) && visibleChildren.length) {
      const popup = buildPopupCard(
        hass,
        entity,
        visibleChildren,
        config,
        areaOverride,
        area
      );

      if (popup) cards.push(popup);
    }
  }

  if (cards.length === 0) return null;

  const columns =
    meta.columns ||
    Number(areaOverride.compact_columns) ||
    Number(config.compact_columns) ||
    2;

  // Never wrap pop-up cards inside an additional grid.
  // Bubble standalone pop-ups are safest as direct section cards.
  if (compact) {
    const visibleCards = cards.filter(
      (card) => !(card.type === "custom:bubble-card" && card.card_type === "pop-up")
    );
    const popupCards = cards.filter(
      (card) => card.type === "custom:bubble-card" && card.card_type === "pop-up"
    );

    return {
      type: "grid",
      cards: [
        {
          type: "heading",
          heading: meta.title,
          icon: meta.icon,
        },
        {
          type: "grid",
          columns,
          square: false,
          cards: visibleCards,
        },
        ...popupCards,
      ],
    };
  }

  return {
    type: "grid",
    cards: [
      {
        type: "heading",
        heading: meta.title,
        icon: meta.icon,
      },
      ...cards,
    ],
  };
}


function techPopupHash(area) {
  return `#atze-technik-${slugify(area?.area_id || area?.name || "raum")}`;
}

function buildTechPopupCard(
  hass,
  techEntities,
  config,
  areaOverride,
  area,
  popupMap
) {
  if (!techEntities?.length) return null;

  const cards = [];

  for (const entity of [...techEntities].sort(compareEntities(hass, config, area))) {
    const children = popupMap.parentToChildren.get(entity.entity_id) || [];
    const visibleChildren = visiblePopupChildren(hass, children, config);
    const nestedPopupHash = visibleChildren.length
      ? popupHashFor(entity.entity_id)
      : null;

    const card = buildEntityCard(
      hass,
      entity,
      config,
      areaOverride,
      area,
      {
        compact: true,
        popupHash: nestedPopupHash,
      }
    );

    if (card) cards.push(card);

    // Preserve the existing detail popup for technical devices such as
    // the presence switch with its timeout/config entities.
    if (visibleChildren.length) {
      const nestedPopup = buildPopupCard(
        hass,
        entity,
        visibleChildren,
        config,
        areaOverride,
        area
      );

      if (nestedPopup) cards.push(nestedPopup);
    }
  }

  const visibleCards = cards.filter(
    (card) =>
      !(
        card.type === "custom:bubble-card" &&
        card.card_type === "pop-up"
      )
  );

  const nestedPopups = cards.filter(
    (card) =>
      card.type === "custom:bubble-card" &&
      card.card_type === "pop-up"
  );

  const columns = Number(
    areaOverride.tech_popup_columns ||
    config.tech_popup_columns ||
    1
  );

  return {
    type: "custom:bubble-card",
    card_type: "pop-up",
    hash: techPopupHash(area),
    name: areaOverride.tech_popup_name || config.tech_popup_name || "Technik",
    icon: areaOverride.tech_popup_icon || config.tech_popup_icon || "mdi:cog-outline",
    cards: [
      {
        type: "grid",
        columns,
        square: false,
        cards: visibleCards,
      },
      ...nestedPopups,
    ],
  };
}


function shouldHideSensorFromRoom(hass, entity, config) {
  if (domainOf(entity.entity_id) !== "sensor") return false;

  const deviceClass = entityDeviceClass(hass, entity);
  const friendly = normalizedFriendlyName(hass, entity);

  if (
    config.hide_battery_sensors_in_rooms !== false &&
    (
      deviceClass === "battery" ||
      ["batterie", "battery", "akku"].includes(friendly)
    )
  ) {
    return true;
  }

  const entityId = String(
    entity.entity_id || ""
  ).toLowerCase();

  if (
    config.hide_technical_sensors_in_rooms !== false &&
    (
      deviceClass === "voltage" ||
      entityId.includes("device_temperature") ||
      entityId.includes("_voltage")
    )
  ) {
    return true;
  }

  const hiddenDeviceClasses = new Set(
    asArray(config.hide_sensor_device_classes).length
      ? asArray(config.hide_sensor_device_classes)
      : ["atmospheric_pressure"]
  );

  const hiddenNames = new Set(
    asArray(config.hide_sensor_names).length
      ? asArray(config.hide_sensor_names).map(normalizedText)
      : ["atmospharischer druck"]
  );

  return (
    hiddenDeviceClasses.has(deviceClass) ||
    hiddenNames.has(friendly)
  );
}


const ATZE_ASSET_BASE_URL = new URL(
  "./assets/",
  import.meta.url
).href;

window.__atzeHomeRoomImageCache =
  window.__atzeHomeRoomImageCache || new Map();

const ATZE_HOME_ROOM_IMAGE_CACHE =
  window.__atzeHomeRoomImageCache;

const DEFAULT_HOME_ROOM_IMAGE_FILES = {
  kuche: "kueche.jpg",
  schlafzimmer: "schlafzimmer.jpg",
  bad: "bad.jpg",
  flur: "flur.jpg",
  wohnzimmer: "wohnzimmer.jpg",
  buro: "buro.jpg",
  arbeitszimmer: "buro.jpg",
  kinderzimmer: "kinderzimmer.webp",
  hausflur: "hausflur.webp",
  balkon: "balkon.jpg",
  "3d_drucker": "3d-drucker.webp",
  "3d-drucker": "3d-drucker.webp",
  zentrale: "zentrale.webp",
};

const DEFAULT_HOME_ROOM_IMAGES = Object.fromEntries(
  Object.entries(DEFAULT_HOME_ROOM_IMAGE_FILES).map(
    ([areaId, fileName]) => [
      areaId,
      new URL(fileName, ATZE_ASSET_BASE_URL).href,
    ]
  )
);

const DEFAULT_HOME_ROOM_LIGHT_IMAGE_FILES = {
  kuche: "kueche-light.webp",
  schlafzimmer: "schlafzimmer-light.webp",
  bad: "bad-light.webp",
  flur: "flur-light.webp",
  wohnzimmer: "wohnzimmer-light.webp",
  buro: "buro-light.webp",
  arbeitszimmer: "buro-light.webp",
  kinderzimmer: "kinderzimmer-light.webp",
  hausflur: "hausflur-light.webp",
  balkon: "balkon-light.webp",
  "3d_drucker": "3d-drucker-light.webp",
  "3d-drucker": "3d-drucker-light.webp",
  zentrale: "zentrale-light.webp",
};

const DEFAULT_HOME_ROOM_LIGHT_IMAGES = Object.fromEntries(
  Object.entries(DEFAULT_HOME_ROOM_LIGHT_IMAGE_FILES).map(
    ([areaId, fileName]) => [
      areaId,
      new URL(fileName, ATZE_ASSET_BASE_URL).href,
    ]
  )
);

const DEFAULT_HOME_ROOM_IMAGE_ALIASES = {
  treppenhaus: "hausflur",
  treppenflur: "hausflur",
};

function defaultHomeRoomImageKey(area, imageMap) {
  const rawAreaId = String(area?.area_id || "").trim().toLowerCase();
  const areaId = slugify(area?.area_id || "");
  const areaName = slugify(area?.name || "");
  const candidates = [
    rawAreaId,
    areaId,
    areaName,
  ].filter(Boolean);

  // Prefer exact ids/names so existing special keys keep working.
  for (const candidate of candidates) {
    if (imageMap[candidate]) return candidate;

    const alias = DEFAULT_HOME_ROOM_IMAGE_ALIASES[candidate];
    if (alias && imageMap[alias]) return alias;
  }

  // Also match descriptive ids/names such as hausflur-eg,
  // hausflur-1-og, mein-hausflur or treppenhaus-eg.
  const knownKeys = Object.keys(imageMap)
    .sort((a, b) => b.length - a.length);

  const containsWholeSlug = (candidate, value) =>
    candidate === value ||
    candidate.startsWith(`${value}-`) ||
    candidate.endsWith(`-${value}`) ||
    candidate.includes(`-${value}-`);

  for (const candidate of candidates.map(slugify)) {
    const aliasMatch = Object.entries(
      DEFAULT_HOME_ROOM_IMAGE_ALIASES
    ).find(([alias]) =>
      containsWholeSlug(candidate, alias)
    );

    if (aliasMatch && imageMap[aliasMatch[1]]) {
      return aliasMatch[1];
    }

    const key = knownKeys.find((knownKey) =>
      containsWholeSlug(candidate, slugify(knownKey))
    );

    if (key) return key;
  }

  return null;
}

const DEFAULT_HOME_HERO_DAY_IMAGE = new URL(
  "home-hero-day.webp",
  ATZE_ASSET_BASE_URL
).href;

const DEFAULT_HOME_HERO_NIGHT_IMAGE = new URL(
  "home-hero-night.webp",
  ATZE_ASSET_BASE_URL
).href;

const DEFAULT_HOME_CONTROL_CENTER_IMAGE = new URL(
  "home-control-center-clear.webp",
  ATZE_ASSET_BASE_URL
).href;

function bestEnvironmentEntity(
  hass,
  entities,
  config,
  area,
  popupMap,
  deviceClass
) {
  const candidates = entities
    .filter((entity) => {
      if (shouldHideExactEntity(config, entity.entity_id)) return false;
      if (domainOf(entity.entity_id) !== "sensor") return false;
      if (popupMap.childToParent.has(entity.entity_id)) return false;
      if (!validBadgeState(hass, entity.entity_id)) return false;
      if (entity.entity_category === "diagnostic") return false;
      if (entity.entity_category === "config") return false;

      return entityDeviceClass(hass, entity) === deviceClass;
    })
    .sort(
      (a, b) =>
        environmentBadgeScore(hass, b, area, deviceClass) -
        environmentBadgeScore(hass, a, area, deviceClass)
    );

  return candidates[0]?.entity_id || null;
}

function bestBinaryEntity(
  hass,
  entities,
  config,
  area,
  popupMap,
  kind
) {
  return selectBinaryBadge(
    hass,
    entities,
    config,
    area,
    popupMap,
    kind
  )?.entityId || null;
}

function roomMotionInterrupterEntity(
  hass,
  entities,
  config,
  area,
  override
) {
  const configured =
    override.motion_interrupter_entity ||
    config.home_motion_interrupter_entities?.[area.area_id] ||
    config.motion_interrupter_entity;

  if (configured && hass.states[configured]) {
    return configured;
  }

  const areaCandidate = entities.find((entity) => {
    if (domainOf(entity.entity_id) !== "input_boolean") return false;
    if (!hass.states[entity.entity_id]) return false;

    const searchText = normalizedText([
      entity.entity_id,
      normalizedFriendlyName(hass, entity),
    ].join(" "));

    return (
      searchText.includes("motion_unterbrecher") ||
      searchText.includes("motion unterbrecher")
    );
  });

  if (areaCandidate) return areaCandidate.entity_id;

  return hass.states["input_boolean.motion_unterbrecher"]
    ? "input_boolean.motion_unterbrecher"
    : null;
}

function selectHomeWeatherEntity(hass, config) {
  if (
    config.home_weather_entity &&
    hass.states[config.home_weather_entity]
  ) {
    return config.home_weather_entity;
  }

  const preferred = [
    "weather.berlin_tempelhof",
    "weather.home",
    "weather.forecast_home",
  ];

  for (const entityId of preferred) {
    if (hass.states[entityId]) return entityId;
  }

  return Object.keys(hass.states).find(
    (entityId) => entityId.startsWith("weather.")
  ) || null;
}

function selectGlobalPowerEntity(
  hass,
  entities,
  config
) {
  if (
    config.home_power_entity &&
    hass.states[config.home_power_entity]
  ) {
    return config.home_power_entity;
  }

  const candidates = entities
    .filter((entity) => {
      if (shouldHideExactEntity(config, entity.entity_id)) return false;
      if (domainOf(entity.entity_id) !== "sensor") return false;
      if (!validBadgeState(hass, entity.entity_id)) return false;
      if (entityDeviceClass(hass, entity) !== "power") return false;
      if (entity.entity_category === "diagnostic") return false;
      if (entity.entity_category === "config") return false;
      return true;
    })
    .map((entity) => {
      const name = normalizedFriendlyName(hass, entity);
      const id = normalizedText(entity.entity_id);

      let score = 0;

      if (name.includes("gesamt")) score += 220;
      if (name.includes("total")) score += 220;
      if (name.includes("haus")) score += 150;
      if (name.includes("home")) score += 120;
      if (name.includes("netz")) score += 100;
      if (name.includes("verbrauch")) score += 80;

      if (id.includes("gesamt")) score += 160;
      if (id.includes("total")) score += 160;
      if (id.includes("house")) score += 120;
      if (id.includes("home")) score += 100;

      return { entity, score };
    })
    .filter((entry) => entry.score >= 100)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.entity.entity_id || null;
}


function bestCoverEntity(
  hass,
  entities,
  config,
  popupMap
) {
  const candidates = entities
    .filter((entity) => {
      if (shouldHideExactEntity(config, entity.entity_id)) return false;
      if (popupMap.childToParent.has(entity.entity_id)) return false;
      if (domainOf(entity.entity_id) !== "cover") return false;
      if (!hass.states[entity.entity_id]) return false;
      return true;
    })
    .sort((a, b) => {
      const aName = normalizedFriendlyName(hass, a);
      const bName = normalizedFriendlyName(hass, b);

      const score = (name) => {
        let value = 0;
        if (name === "rollladen") value += 200;
        if (name.includes("rollladen")) value += 120;
        if (name.includes("jalousie")) value += 80;
        return value;
      };

      return score(bName) - score(aName);
    });

  return candidates[0]?.entity_id || null;
}

function uniqueEntityIds(values) {
  return [...new Set(values.filter(Boolean))];
}


function selectHacsUpdateEntities(hass, entities) {
  return entities
    .filter((entity) => {
      const entityId = entity?.entity_id;
      if (!entityId || domainOf(entityId) !== "update") {
        return false;
      }

      if (!hass.states[entityId]) return false;
      if (entity.disabled_by) return false;

      const platform = String(
        entity.platform || ""
      ).toLowerCase();

      return (
        platform === "hacs" ||
        entityId === "update.hacs_update"
      );
    })
    .map((entity) => entity.entity_id);
}


function selectHomePersonEntity(hass, config) {
  if (
    config.home_person_entity &&
    hass.states[config.home_person_entity]
  ) {
    return config.home_person_entity;
  }

  if (hass.states["person.alexander"]) {
    return "person.alexander";
  }

  return Object.keys(hass.states).find(
    (entityId) => entityId.startsWith("person.")
  ) || null;
}


function selectHomeAlarmEntity(hass, usableEntities, config) {
  if (
    config.home_alarm_entity &&
    hass.states[config.home_alarm_entity]
  ) {
    return config.home_alarm_entity;
  }

  const alarms = usableEntities
    .filter(
      (entity) =>
        domainOf(entity.entity_id) === "alarm_control_panel" &&
        hass.states[entity.entity_id]
    )
    .map((entity) => {
      const name = normalizedFriendlyName(hass, entity);
      const entityId = normalizedText(entity.entity_id);

      let score = 0;

      if (name === "alarmo") score += 400;
      if (name.includes("alarmo")) score += 300;
      if (entityId.includes("alarmo")) score += 300;

      return { entity, score };
    })
    .sort((a, b) => b.score - a.score);

  return alarms[0]?.entity.entity_id || null;
}

function selectHomeBaseStatusEntities(
  hass,
  usableEntities,
  config
) {
  const ordered = [];

  const add = (entityId) => {
    if (
      entityId &&
      !ordered.includes(entityId)
    ) {
      ordered.push(entityId);
    }
  };

  // Keep an explicitly configured HomeBase entity even when its state
  // has not arrived yet. The custom card can then pick it up live later.
  add(config.home_homebase_entity);

  // Known legacy/default entity from this dashboard setup.
  add("select.atzehomebase_guard_mode");

  const candidates = usableEntities
    .map((entity) => {
      const name = normalizedFriendlyName(hass, entity);
      const entityId = normalizedText(entity.entity_id);
      const device = RUNTIME_DEVICE_BY_ID.get(entity.device_id);
      const deviceText = normalizedDeviceText(device);
      const domain = domainOf(entity.entity_id);

      let score = 0;

      if (name === "current mode") score += 360;
      if (name.includes("current mode")) score += 300;
      if (entityId.includes("current_mode")) score += 280;

      if (name === "atzehomebase") score += 260;
      if (name.includes("atzehomebase")) score += 220;
      if (entityId.includes("atzehomebase")) score += 220;

      if (deviceText.includes("atzehomebase")) score += 260;
      if (deviceText.includes("homebase")) score += 180;

      if (domain === "sensor") score += 100;
      if (domain === "select") score += 40;

      return { entity, score };
    })
    .filter((entry) => entry.score >= 180)
    .sort((a, b) => b.score - a.score);

  for (const entry of candidates) {
    add(entry.entity.entity_id);
  }

  // Last-resort live-state discovery. This catches matching entities that
  // were not part of usableEntities while the strategy was generated.
  for (const entityId of Object.keys(hass.states || {})) {
    const stateObj = hass.states[entityId];
    const text = normalizedText(
      `${entityId} ${stateObj?.attributes?.friendly_name || ""}`
    );

    if (
      text.includes("atzehomebase") ||
      text.includes("homebase")
    ) {
      add(entityId);
    }
  }

  return ordered;
}

function selectHomeBaseStatusEntity(
  hass,
  usableEntities,
  config
) {
  return (
    selectHomeBaseStatusEntities(
      hass,
      usableEntities,
      config
    )[0] || null
  );
}


function matchingNoStrategyLabelIds(labels, config) {
  const needles = new Set(
    [
      config.no_strategy_label,
      "no-strategy",
      "no-dboard",
    ]
      .map((value) => normalizedText(value || ""))
      .filter(Boolean)
  );

  return new Set(
    (labels || [])
      .filter((label) => {
        const labelId = String(
          label?.label_id || label?.id || ""
        );

        const name = normalizedText(
          label?.name || ""
        );

        const id = normalizedText(labelId);

        return needles.has(name) || needles.has(id);
      })
      .map((label) =>
        String(label?.label_id || label?.id || "")
      )
      .filter(Boolean)
  );
}

function areaHasNoStrategyLabel(
  area,
  noStrategyLabelIds,
  config
) {
  const needles = new Set(
    [
      config.no_strategy_label,
      "no-strategy",
      "no-dboard",
    ]
      .map((value) => normalizedText(value || ""))
      .filter(Boolean)
  );

  const assignedLabels = [
    ...asArray(area?.labels),
    ...asArray(area?.label_ids),
  ];

  return assignedLabels.some((labelId) => {
    const raw = String(labelId || "");

    return (
      noStrategyLabelIds.has(raw) ||
      needles.has(normalizedText(raw))
    );
  });
}

function entityHasNoStrategyLabel(
  entity,
  noStrategyLabelIds,
  config
) {
  const needles = new Set(
    [
      config.no_strategy_label,
      "no-strategy",
      "no-dboard",
    ]
      .map((value) => normalizedText(value || ""))
      .filter(Boolean)
  );

  const assignedLabels = [
    ...asArray(entity?.labels),
    ...asArray(entity?.label_ids),
  ];

  return assignedLabels.some((labelId) => {
    const raw = String(labelId || "");

    return (
      noStrategyLabelIds.has(raw) ||
      needles.has(normalizedText(raw))
    );
  });
}


function matchingSecurityLabelIds(labels, config) {
  const needle = normalizedText(
    config.security_label || "Sicherheit"
  );

  if (!needle) return new Set();

  return new Set(
    (labels || [])
      .filter((label) => {
        const labelId = String(
          label?.label_id || label?.id || ""
        );

        const haystack = normalizedText(
          `${label?.name || ""} ${labelId}`
        );

        return haystack.includes(needle);
      })
      .map((label) =>
        String(label?.label_id || label?.id || "")
      )
      .filter(Boolean)
  );
}

function entityHasDirectSecurityLabel(
  entity,
  securityLabelIds,
  config
) {
  const needle = normalizedText(
    config.security_label || "Sicherheit"
  );

  return asArray(entity?.labels).some((labelId) => {
    const raw = String(labelId || "");

    return (
      securityLabelIds.has(raw) ||
      normalizedText(raw).includes(needle)
    );
  });
}

function securityEntitySeverity(hass, entityId) {
  const stateObj = hass?.states?.[entityId];

  if (!stateObj) return "unavailable";

  const state = String(stateObj.state || "").toLowerCase();
  const domain = domainOf(entityId);

  if (
    !state ||
    state === "unknown" ||
    state === "unavailable"
  ) {
    return "unavailable";
  }

  if (domain === "binary_sensor") {
    return state === "on" ? "warning" : "safe";
  }

  if (domain === "lock") {
    return state === "locked" ? "safe" : "warning";
  }

  if (domain === "cover") {
    if (state === "closed") return "safe";
    if (
      ["open", "opening", "closing"].includes(state)
    ) {
      return "warning";
    }
  }

  if (domain === "alarm_control_panel") {
    return state === "triggered" ? "warning" : "safe";
  }

  if (
    ["switch", "input_boolean", "siren"].includes(domain)
  ) {
    return state === "on" ? "warning" : "safe";
  }

  if (
    [
      "open",
      "opening",
      "detected",
      "problem",
      "unsafe",
      "unlocked",
      "alarm",
      "triggered",
      "wet",
      "smoke",
    ].includes(state)
  ) {
    return "warning";
  }

  if (
    [
      "off",
      "closed",
      "locked",
      "clear",
      "safe",
      "dry",
    ].includes(state)
  ) {
    return "safe";
  }

  return "neutral";
}

function securityEntityIsIssue(hass, entityId) {
  return ["warning", "unavailable"].includes(
    securityEntitySeverity(hass, entityId)
  );
}

function buildSecurityView(
  hass,
  securityEntities,
  areaById,
  deviceById,
  config
) {
  const groups = new Map();

  for (const entity of securityEntities) {
    const areaId = effectiveAreaId(entity, deviceById);
    const area = areaId ? areaById.get(areaId) : null;
    const override = areaId
      ? getOverride(config.area_overrides, areaId)
      : {};

    const key = areaId || "__no_area__";
    const name =
      override.name ||
      area?.name ||
      (areaId ? areaId : "Ohne Bereich");

    const icon =
      override.icon ||
      area?.icon ||
      (areaId ? "mdi:home-outline" : "mdi:help-circle-outline");

    if (!groups.has(key)) {
      groups.set(key, {
        area_id: areaId,
        name,
        icon,
        order: Number.isFinite(Number(override.order))
          ? Number(override.order)
          : areaId
            ? 1000
            : 9999,
        entities: [],
      });
    }

    const rawName =
      hass.states[entity.entity_id]?.attributes?.friendly_name ||
      entity.name ||
      entity.original_name ||
      entity.entity_id;

    groups.get(key).entities.push({
      entity_id: entity.entity_id,
      name: cleanupEntityName(
        rawName,
        domainOf(entity.entity_id),
        name,
        {
          ...config,
          strip_generic_suffixes: false,
        }
      ),
    });
  }

  const securityGroups = [...groups.values()]
    .map((group) => ({
      ...group,
      entities: [...group.entities].sort((a, b) =>
        String(a.name || "").localeCompare(
          String(b.name || ""),
          "de",
          {
            numeric: true,
            sensitivity: "base",
          }
        )
      ),
    }))
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;

      return String(a.name || "").localeCompare(
        String(b.name || ""),
        "de",
        {
          numeric: true,
          sensitivity: "base",
        }
      );
    });

  return {
    title: config.security_title || "Sicherheit",
    path: config.security_path || "sicherheit",
    icon: config.security_icon || "mdi:shield-home",
    subview: true,
    panel: true,
    cards: [
      {
        type: "custom:atze-security-overview-card",
        title: config.security_title || "Sicherheit",
        home_path: config.home_path || "home",
        groups: securityGroups,
        entity_ids: securityEntities.map(
          (entity) => entity.entity_id
        ),
      },
    ],
  };
}



function isBatteryEntity(hass, entity) {
  const entityId = entity?.entity_id || "";
  const stateObj = hass?.states?.[entityId];

  if (!stateObj) return false;

  const domain = domainOf(entityId);
  if (!["sensor", "binary_sensor"].includes(domain)) {
    return false;
  }

  const deviceClass = String(
    stateObj.attributes?.device_class || ""
  ).toLowerCase();

  if (deviceClass === "battery") return true;

  if (
    [
      "voltage",
      "current",
      "power",
      "energy",
    ].includes(deviceClass)
  ) {
    return false;
  }

  const name = normalizedText(
    `${stateObj.attributes?.friendly_name || ""} ${
      entity.name || ""
    } ${entity.original_name || ""} ${entityId}`
  );

  const batteryWord =
    name.includes("battery") ||
    name.includes("batterie") ||
    name.includes("akkustand") ||
    name.includes("akku stand");

  if (!batteryWord) return false;

  if (domain === "binary_sensor") return true;

  const unit = String(
    stateObj.attributes?.unit_of_measurement || ""
  ).trim();

  return unit === "%";
}

function cleanupBatteryName(rawName, areaName, config) {
  let result = cleanupEntityName(
    rawName,
    "sensor",
    areaName,
    {
      ...config,
      strip_generic_suffixes: false,
    }
  );

  result = result
    .replace(
      /\s+(?:batterie(?:stand|zustand)?|battery(?:\s+level)?|akkustand|akku)$/i,
      ""
    )
    .replace(
      /^(?:batterie(?:stand|zustand)?|battery(?:\s+level)?|akkustand|akku)\s+/i,
      ""
    )
    .trim();

  return result || rawName;
}

function batterySeverity(hass, entityId) {
  const stateObj = hass?.states?.[entityId];

  if (!stateObj) return "unavailable";

  const state = String(stateObj.state || "").toLowerCase();
  const domain = domainOf(entityId);

  if (
    !state ||
    state === "unknown" ||
    state === "unavailable"
  ) {
    return "unavailable";
  }

  if (domain === "binary_sensor") {
    return state === "on" ? "critical" : "good";
  }

  const value = Number.parseFloat(stateObj.state);
  if (!Number.isFinite(value)) return "neutral";

  if (value >= 41) return "good";
  if (value >= 21) return "warning";
  return "critical";
}

function batterySortValue(hass, entityId) {
  const stateObj = hass?.states?.[entityId];

  if (!stateObj) return Number.POSITIVE_INFINITY;

  const state = String(stateObj.state || "").toLowerCase();

  if (
    !state ||
    state === "unknown" ||
    state === "unavailable"
  ) {
    return Number.POSITIVE_INFINITY;
  }

  if (domainOf(entityId) === "binary_sensor") {
    return state === "on" ? -1 : 101;
  }

  const value = Number.parseFloat(stateObj.state);
  return Number.isFinite(value)
    ? value
    : Number.POSITIVE_INFINITY;
}

function buildMaintenanceView(
  hass,
  batteryEntities,
  areaById,
  deviceById,
  config
) {
  const groups = new Map();

  for (const entity of batteryEntities) {
    const areaId = effectiveAreaId(entity, deviceById);
    const area = areaId ? areaById.get(areaId) : null;
    const override = areaId
      ? getOverride(config.area_overrides, areaId)
      : {};

    const key = areaId || "__no_area__";
    const areaName =
      override.name ||
      area?.name ||
      (areaId ? areaId : "Ohne Bereich");

    const areaIcon =
      override.icon ||
      area?.icon ||
      (areaId
        ? "mdi:home-outline"
        : "mdi:help-circle-outline");

    if (!groups.has(key)) {
      groups.set(key, {
        area_id: areaId,
        name: areaName,
        icon: areaIcon,
        order: Number.isFinite(Number(override.order))
          ? Number(override.order)
          : areaId
            ? 1000
            : 9999,
        entities: [],
      });
    }

    const rawName =
      hass.states[entity.entity_id]?.attributes?.friendly_name ||
      entity.name ||
      entity.original_name ||
      entity.entity_id;

    groups.get(key).entities.push({
      entity_id: entity.entity_id,
      name: cleanupBatteryName(
        rawName,
        areaName,
        config
      ),
    });
  }

  const sortedBatteries = [...groups.values()]
    .flatMap((group) =>
      group.entities.map((entry) => ({
        ...entry,
        area_name: group.name,
      }))
    )
    .sort((a, b) => {
      const aValue = batterySortValue(
        hass,
        a.entity_id
      );
      const bValue = batterySortValue(
        hass,
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
    });

  const maintenanceGroups = sortedBatteries.length
    ? [
        {
          area_id: null,
          name: "Nach Ladestand",
          icon: "mdi:battery-arrow-down-outline",
          order: 0,
          entities: sortedBatteries,
        },
      ]
    : [];

  return {
    title: config.maintenance_title || "Batterie",
    path: config.maintenance_path || "wartung",
    icon:
      config.maintenance_icon ||
      "mdi:battery-heart-variant",
    subview: true,
    panel: true,
    cards: [
      {
        type: "custom:atze-maintenance-overview-card",
        title: config.maintenance_title || "Batterie",
        home_path: config.home_path || "home",
        groups: maintenanceGroups,
        entity_ids: batteryEntities.map(
          (entity) => entity.entity_id
        ),
      },
    ],
  };
}


function buildHomeOverviewView(
  hass,
  filteredAreas,
  entitiesByArea,
  usableEntities,
  config,
  popupMap,
  areaById,
  securityEntityIds = [],
  batteryEntityIds = []
) {
  const roomTiles = [];
  const roomPowerEntities = [];
  const occupancyEntities = [];
  const warningEntities = [];
  const smokeEntities = [];
  const lightEntities = [];
  const coverEntities = [];

  for (const area of filteredAreas) {
    const areaEntities = entitiesByArea.get(area.area_id) || [];
    const override = getOverride(config.area_overrides, area.area_id);
    const name = override.name || area.name || area.area_id;
    const path = override.path || slugify(name);
    const icon = override.icon || area.icon || "mdi:home-outline";

    const temperature = bestEnvironmentEntity(
      hass,
      areaEntities,
      config,
      area,
      popupMap,
      "temperature"
    );

    const humidity = bestEnvironmentEntity(
      hass,
      areaEntities,
      config,
      area,
      popupMap,
      "humidity"
    );

    const power = bestEnvironmentEntity(
      hass,
      areaEntities,
      config,
      area,
      popupMap,
      "power"
    );

    const illuminance = bestEnvironmentEntity(
      hass,
      areaEntities,
      config,
      area,
      popupMap,
      "illuminance"
    );

    const occupancy = bestBinaryEntity(
      hass,
      areaEntities,
      config,
      area,
      popupMap,
      "occupancy"
    );

    const motionInterrupter = occupancy
      ? roomMotionInterrupterEntity(
          hass,
          areaEntities,
          config,
          area,
          override
        )
      : null;

    const windowEntity = bestBinaryEntity(
      hass,
      areaEntities,
      config,
      area,
      popupMap,
      "window"
    );

    const rollerEntity = bestBinaryEntity(
      hass,
      areaEntities,
      config,
      area,
      popupMap,
      "roller_shutter"
    );

    const smokeEntity = bestBinaryEntity(
      hass,
      areaEntities,
      config,
      area,
      popupMap,
      "smoke"
    );

    const coverEntity = bestCoverEntity(
      hass,
      areaEntities,
      config,
      popupMap
    );

    const lockEntity =
      areaEntities
        .filter(
          (entity) =>
            domainOf(entity.entity_id) === "lock" &&
            hass.states[entity.entity_id]
        )
        .map((entity) => {
          const name = normalizedFriendlyName(hass, entity);
          const id = normalizedText(entity.entity_id);
          const device = RUNTIME_DEVICE_BY_ID.get(entity.device_id);
          const deviceText = normalizedDeviceText(device);

          let score = 0;

          if (name === "tur" || name === "tür") score += 300;
          if (name.includes("tur") || name.includes("tür")) score += 180;
          if (id.includes("lock_ultra")) score += 300;
          if (id.includes("lock ultra")) score += 300;
          if (id.includes("lock")) score += 80;
          if (deviceText.includes("lock ultra")) score += 320;
          if (deviceText.includes("switchbot")) score += 100;

          return { entity, score };
        })
        .sort((a, b) => b.score - a.score)[0]?.entity.entity_id ||
      null;

    const roomLightEntities = areaEntities
      .filter(
        (entity) =>
          domainOf(entity.entity_id) === "light" &&
          hass.states[entity.entity_id] &&
          !popupMap.childToParent.has(entity.entity_id) &&
          !shouldHideExactEntity(config, entity.entity_id)
      )
      .map((entity) => entity.entity_id);

    lightEntities.push(...roomLightEntities);

    if (power) roomPowerEntities.push(power);
    if (occupancy) occupancyEntities.push(occupancy);
    if (windowEntity) warningEntities.push(windowEntity);
    if (rollerEntity) warningEntities.push(rollerEntity);
    if (smokeEntity) smokeEntities.push(smokeEntity);

    const configuredImage =
      override.home_image ||
      config.home_room_images?.[area.area_id];

    const imageKey = defaultHomeRoomImageKey(
      area,
      DEFAULT_HOME_ROOM_IMAGES
    );

    const defaultImage =
      DEFAULT_HOME_ROOM_IMAGES[imageKey] ||
      null;

    const configuredLightImage =
      override.home_light_image ||
      config.home_room_light_images?.[area.area_id];

    const lightImageKey = defaultHomeRoomImageKey(
      area,
      DEFAULT_HOME_ROOM_LIGHT_IMAGES
    );

    const defaultLightImage =
      DEFAULT_HOME_ROOM_LIGHT_IMAGES[lightImageKey] ||
      null;

    roomTiles.push({
      area_id: area.area_id,
      name,
      path,
      icon,
      image: configuredImage || defaultImage,
      image_file:
        DEFAULT_HOME_ROOM_IMAGE_FILES[imageKey] ||
        null,
      light_image: configuredLightImage || defaultLightImage,
      light_image_file:
        DEFAULT_HOME_ROOM_LIGHT_IMAGE_FILES[lightImageKey] ||
        null,
      temperature,
      humidity,
      power,
      illuminance,
      occupancy,
      motion_interrupter: motionInterrupter,
      window_entity: windowEntity,
      roller_sensor_entity: rollerEntity,
      cover_entity: coverEntity,
      lock_entity: lockEntity,
      light_entities: roomLightEntities,
    });

    for (const entity of areaEntities) {
      if (popupMap.childToParent.has(entity.entity_id)) continue;
      if (shouldHideExactEntity(config, entity.entity_id)) continue;

      const domain = domainOf(entity.entity_id);

      if (domain === "cover") {
        coverEntities.push(entity.entity_id);
      }
    }
  }

  const lockEntity =
    usableEntities.find(
      (entity) =>
        domainOf(entity.entity_id) === "lock" &&
        (
          normalizedText(entity.entity_id).includes("lock_ultra") ||
          normalizedFriendlyName(hass, entity) === "tur" ||
          normalizedFriendlyName(hass, entity) === "tür"
        )
    )?.entity_id || null;

  const showSchedulerPopup = schedulerPopupEnabled(config);
  const showLightControlPopup = lightControlPopupEnabled(config);
  const lightControlPopup = lightControlPopupConfig(config);
  const customPageLinks = buildCustomPageViews(config).map(
    (view) => ({
      title: view.title,
      path: view.path,
      icon: view.icon || "mdi:view-dashboard-outline",
    })
  );

  const homeCard = {
    type: "custom:atze-home-overview-card",
    title: config.home_title || "Zuhause",
    subtitle:
      config.home_subtitle === false
        ? ""
        : (
            config.home_subtitle ||
            "Schön, dass du da bist!"
          ),
    person_entity: selectHomePersonEntity(hass, config),
    people_entities: asArray(config.home_people_entities)
      .map(String)
      .filter(
        (entityId) =>
          entityId.startsWith("person.") &&
          hass.states[entityId]
      )
      .slice(0, 3),
    hacs_update_entities:
      selectHacsUpdateEntities(hass, usableEntities),
    weather_entity: selectHomeWeatherEntity(hass, config),
    power_entity: selectGlobalPowerEntity(
      hass,
      usableEntities,
      config
    ),
    power_entities: uniqueEntityIds(roomPowerEntities),
    alarm_entity: selectHomeAlarmEntity(
      hass,
      usableEntities,
      config
    ),
    homebase_entity: selectHomeBaseStatusEntity(
      hass,
      usableEntities,
      config
    ),
    homebase_entities: selectHomeBaseStatusEntities(
      hass,
      usableEntities,
      config
    ),
    warning_entities: uniqueEntityIds(warningEntities),
    smoke_entities: uniqueEntityIds(smokeEntities),
    security_entities: uniqueEntityIds(securityEntityIds),
    security_path: config.security_path || "sicherheit",
    battery_entities: uniqueEntityIds(batteryEntityIds),
    maintenance_path: config.maintenance_path || "wartung",
    favorite_entities: asArray(config.favorite_entities)
      .map(String)
      .filter((entityId) =>
        usableEntities.some(
          (entity) => entity.entity_id === entityId
        )
      ),
    custom_pages: [
      ...(showSchedulerPopup
        ? [{
            title: "Zeitpläne",
            popup_hash: "#zeitplaene",
            icon: "mdi:calendar-clock",
          }]
        : []),
      ...(showLightControlPopup
        ? [{
            title: lightControlPopup.title,
            popup_hash: "#lichtsteuerung",
            icon: lightControlPopup.icon,
          }]
        : []),
      ...customPageLinks,
    ],
    scheduler_popup: showSchedulerPopup,
    light_control_popup: showLightControlPopup,
    room_tiles: roomTiles,
    asset_base: config.home_asset_base || null,
    hero_day_image:
      config.home_hero_day_image ||
      DEFAULT_HOME_HERO_DAY_IMAGE,
    hero_night_image:
      config.home_hero_night_image ||
      DEFAULT_HOME_HERO_NIGHT_IMAGE,
    control_center_image:
      config.home_control_center_image ||
      DEFAULT_HOME_CONTROL_CENTER_IMAGE,
    light_entities: uniqueEntityIds(lightEntities),
    cover_entities: uniqueEntityIds(coverEntities),
    lock_entity: lockEntity,
    night_entity: config.home_night_entity || null,
    force_kiosk: config.force_kiosk === true,
    clock_kiosk_toggle:
      config.clock_kiosk_toggle !== false,
  };

  return {
    title: config.home_title || "Zuhause",
    path: config.home_path || "home",
    icon: config.home_icon || "mdi:home",
    subview: false,
    panel: true,
    cards: showSchedulerPopup || showLightControlPopup
      ? [
          {
            type: "vertical-stack",
            cards: [
              ...(showSchedulerPopup
                ? [{
                    type: "custom:bubble-card",
                    card_type: "pop-up",
                    hash: "#zeitplaene",
                    name: "Zeitpläne",
                    icon: "mdi:calendar-clock",
                    popup_mode: "adaptive-dialog",
                    width_desktop: "900px",
                    cards: [
                      {
                        type: "custom:scheduler-card",
                      },
                    ],
                  }]
                : []),
              ...(showLightControlPopup
                ? [{
                    type: "custom:bubble-card",
                    card_type: "pop-up",
                    hash: "#lichtsteuerung",
                    name: lightControlPopup.title,
                    icon: lightControlPopup.icon,
                    popup_mode: "adaptive-dialog",
                    width_desktop: "900px",
                    cards: lightControlPopup.cards,
                  }]
                : []),
              homeCard,
            ],
          },
        ]
      : [homeCard],
  };
}

function customPageSource(page) {
  if (!page || typeof page !== "object") return null;

  return page.view && typeof page.view === "object"
    ? page.view
    : page;
}

function isSchedulerCustomPage(page) {
  const source = customPageSource(page);
  if (!source) return false;

  const cards = Array.isArray(source.cards)
    ? source.cards
    : source.card && typeof source.card === "object"
      ? [source.card]
      : [];

  return cards.some(
    (card) => card?.type === "custom:scheduler-card"
  );
}

function schedulerPopupEnabled(config) {
  if (config.scheduler_popup != null) {
    return config.scheduler_popup === true;
  }

  return asArray(config.custom_pages).some(isSchedulerCustomPage);
}

function isLightControlCustomPage(page) {
  const source = customPageSource(page);
  if (!source) return false;

  const identifiers = [source.title, source.path]
    .filter(Boolean)
    .map(slugify);

  return identifiers.some((value) =>
    [
      "lichtsteuerung",
      "licht-steuerung",
      "light-control",
      "light-control-panel",
    ].includes(value)
  );
}

function lightControlPopupEnabled(config) {
  if (config.light_control_popup != null) {
    return config.light_control_popup === true;
  }

  return asArray(config.custom_pages).some(
    isLightControlCustomPage
  );
}

function lightControlPopupConfig(config) {
  const page = asArray(config.custom_pages).find(
    isLightControlCustomPage
  );
  const source = customPageSource(page);
  let cards = [];

  if (Array.isArray(source?.cards)) {
    cards = source.cards;
  } else if (source?.card && typeof source.card === "object") {
    cards = [{ ...source.card }];
  } else if (Array.isArray(source?.sections)) {
    cards = source.sections
      .filter(
        (section) =>
          section &&
          typeof section === "object" &&
          Array.isArray(section.cards)
      )
      .map((section) => ({
        type: "grid",
        columns: Number(section.columns || 1),
        square: false,
        cards: section.cards,
      }));
  }

  if (cards.length === 0) {
    cards = [
      {
        type: "entities",
        entities: [
          { entity: "input_boolean.lichtsteuerung" },
          { entity: "input_boolean.motion_unterbrecher" },
          { type: "section", label: "☀️ Morgen-Einstellungen" },
          { entity: "input_datetime.morgen", name: "Startzeit Morgen" },
          { entity: "input_number.helligkeit_morgen", name: "Helligkeit Morgen" },
          { entity: "input_number.farbe_morgen", name: "Farbe Morgen" },
          { type: "section", label: "🌙 Abend-Einstellungen" },
          { entity: "input_datetime.abend", name: "Startzeit Abend" },
          { entity: "input_number.helligkeit_abend", name: "Helligkeit Abend" },
          { entity: "input_number.farbe_abend", name: "Farbe Abend" },
          { type: "section", label: "💤 Nacht-Einstellungen" },
          { entity: "input_datetime.nacht", name: "Startzeit Nacht" },
          { entity: "input_number.helligkeit_nacht", name: "Helligkeit Nacht" },
          { entity: "input_number.farbe_nacht", name: "Farbe Nacht" },
        ],
      },
    ];
  }

  return {
    title: String(source?.title || "Lichtsteuerung"),
    icon: source?.icon || "mdi:lightbulb-group-outline",
    cards,
  };
}

function buildCustomPageViews(config) {
  const usedPaths = new Set([
    config.home_path || "home",
    config.security_path || "sicherheit",
    config.maintenance_path || "wartung",
  ]);

  return asArray(config.custom_pages)
    .filter(
      (page) =>
        !isSchedulerCustomPage(page) &&
        !isLightControlCustomPage(page)
    )
    .map((page, index) => {
      if (!page || typeof page !== "object") return null;

      const source = customPageSource(page);
      const title = String(source.title || `Eigene Seite ${index + 1}`).trim();
      const requestedPath = String(source.path || slugify(title)).trim();

      if (!title || !requestedPath) {
        return null;
      }

      let path = requestedPath;
      let suffix = 2;
      while (usedPaths.has(path)) {
        path = `${requestedPath}-${suffix}`;
        suffix += 1;
      }
      usedPaths.add(path);

      const { card, view, ...viewConfig } = source;
      const hasNativeContent =
        Array.isArray(viewConfig.cards) ||
        Array.isArray(viewConfig.sections) ||
        viewConfig.strategy;
      const generatedView = {
        ...viewConfig,
        title,
        path,
        icon: source.icon || "mdi:view-dashboard-outline",
        subview: source.subview === true,
        ...(!hasNativeContent && card && typeof card === "object"
          ? { cards: [{ ...card }] }
          : {}),
      };

      const homeButton = {
        type: "custom:atze-room-nav-header",
        icon: "mdi:home",
        area_name: title,
        navigation_path: config.home_path || "home",
      };

      if (Array.isArray(generatedView.sections)) {
        generatedView.sections = [
          {
            type: "grid",
            cards: [homeButton],
          },
          ...generatedView.sections,
        ];
      } else {
        const pageCards = Array.isArray(generatedView.cards)
          ? generatedView.cards
          : [];

        generatedView.cards = generatedView.panel === true
          ? [
              {
                type: "vertical-stack",
                cards: [homeButton, ...pageCards],
              },
            ]
          : [homeButton, ...pageCards];
      }

      return generatedView;
    })
    .filter(Boolean);
}

function buildAreaView(
  hass,
  area,
  entities,
  config,
  popupMap,
  registryByEntityId
) {
  const areaOverride = getOverride(config.area_overrides, area.area_id);
  const areaName = areaOverride.name || area.name || area.area_id;
  const areaIcon = areaOverride.icon || area.icon || "mdi:home-outline";

  const allowedDomains = new Set(
    asArray(areaOverride.include_domains).length
      ? asArray(areaOverride.include_domains)
      : asArray(config.include_domains).length
        ? asArray(config.include_domains)
        : DEFAULT_DOMAINS
  );

  const excludedDomains = new Set([
    ...asArray(config.exclude_domains),
    ...asArray(areaOverride.exclude_domains),
  ]);

  const badgeSelection = selectEnvironmentBadges(
    hass,
    entities,
    config,
    area,
    popupMap,
    areaOverride
  );

  const grouped = new Map();

  for (const entity of entities) {
    if (shouldHideExactEntity(config, entity.entity_id)) {
      continue;
    }

    const visibility =
      roomEntityVisibilityMode(
        config,
        entity.entity_id
      );

    if (visibility === "hide") continue;

    const forceShow = visibility === "show";

    // Popup children normally stay behind their parent. An explicit
    // "Anzeigen" override intentionally pulls the entity back out.
    if (
      !forceShow &&
      popupMap.childToParent.has(entity.entity_id)
    ) {
      continue;
    }

    if (
      !forceShow &&
      config.badge_entities_hide_from_sections !== false &&
      badgeSelection.entityIds.has(entity.entity_id)
    ) {
      continue;
    }

    if (
      !forceShow &&
      hideRoomMeterEntityFromSections(
        hass,
        entity,
        config
      )
    ) {
      continue;
    }

    if (
      !forceShow &&
      shouldHideSensorFromRoom(
        hass,
        entity,
        config
      )
    ) {
      continue;
    }

    if (
      !forceShow &&
      config.hide_diagnostic_entities === true &&
      entity.entity_category === "diagnostic"
    ) {
      continue;
    }

    if (
      !forceShow &&
      config.hide_unknown_config_entities !== false &&
      entity.entity_category === "config" &&
      hass.states[entity.entity_id]?.state === "unknown"
    ) {
      continue;
    }

    if (
      !forceShow &&
      !shouldAutoShowRoomEntity(
        hass,
        entity,
        config
      )
    ) {
      continue;
    }

    const domain = domainOf(entity.entity_id);

    if (excludedDomains.has(domain)) continue;

    if (
      !forceShow &&
      !allowedDomains.has(domain)
    ) {
      continue;
    }

    const groupKey = groupKeyForEntity(hass, entity, config);

    if (!grouped.has(groupKey)) grouped.set(groupKey, []);
    grouped.get(groupKey).push(entity);
  }

  const occupancyAggregate =
    badgeSelection.occupancyEntityId
      ? aggregateDeviceParentConfig(
          config,
          badgeSelection.occupancyEntityId
        )
      : null;

  const occupancyAggregateChildren =
    badgeSelection.occupancyEntityId
      ? visiblePopupChildren(
          hass,
          popupMap.parentToChildren.get(
            badgeSelection.occupancyEntityId
          ) || [],
          config
        )
      : [];

  const occupancyAggregatePopupEnabled =
    Boolean(occupancyAggregate) &&
    occupancyAggregate.popup !== false &&
    Boolean(badgeSelection.occupancyBadge) &&
    occupancyAggregateChildren.length > 0;

  const extraBadgeAggregatePopups = [];

  for (const badge of badgeSelection.badges || []) {
    const entityId = badge?.entity;

    if (!entityId) continue;
    if (entityId === badgeSelection.occupancyEntityId) continue;

    const aggregate =
      aggregateDeviceParentConfig(config, entityId);

    if (!aggregate || aggregate.popup === false) continue;

    const children = visiblePopupChildren(
      hass,
      popupMap.parentToChildren.get(entityId) || [],
      config
    );

    if (!children.length) continue;

    badge.tap_action = {
      action: "navigate",
      navigation_path: popupHashFor(entityId),
    };

    badge.hold_action = {
      action: "more-info",
    };

    extraBadgeAggregatePopups.push({
      entityId,
      aggregate,
      children,
    });
  }

  if (occupancyAggregatePopupEnabled) {
    badgeSelection.occupancyBadge.tap_action = {
      action: "navigate",
      navigation_path: popupHashFor(
        badgeSelection.occupancyEntityId
      ),
    };

    badgeSelection.occupancyBadge.hold_action = {
      action: "more-info",
    };
  }

  const techPopupEnabled =
    !occupancyAggregatePopupEnabled &&
    config.tech_popup_from_occupancy !== false &&
    areaOverride.tech_popup_from_occupancy !== false &&
    badgeSelection.occupancyBadge;

  const techEntities = techPopupEnabled
    ? (grouped.get("technik") || [])
    : [];

  if (techPopupEnabled && techEntities.length) {
    grouped.delete("technik");

    badgeSelection.occupancyBadge.tap_action = {
      action: "navigate",
      navigation_path: techPopupHash(area),
    };

    badgeSelection.occupancyBadge.hold_action = {
      action: "more-info",
    };
  }

  const sections = [...grouped.entries()]
    .sort(([a], [b]) => groupMeta(a, config).order - groupMeta(b, config).order)
    .map(([groupKey, groupEntities]) =>
      buildGroupSection(
        hass,
        groupKey,
        groupEntities,
        config,
        areaOverride,
        area,
        popupMap,
        registryByEntityId
      )
    )
    .filter(Boolean);

  if (occupancyAggregatePopupEnabled) {
    const occupancyParent = entities.find(
      (entity) =>
        entity.entity_id === badgeSelection.occupancyEntityId
    );

    if (occupancyParent) {
      const occupancyPopup = buildPopupCard(
        hass,
        occupancyParent,
        occupancyAggregateChildren,
        config,
        areaOverride,
        area
      );

      if (occupancyPopup) {
        if (sections.length) {
          sections[0].cards.push(occupancyPopup);
        } else {
          sections.push({
            type: "grid",
            cards: [occupancyPopup],
          });
        }
      }
    }
  }

  for (const aggregatePopup of extraBadgeAggregatePopups) {
    const parent = entities.find(
      (entity) => entity.entity_id === aggregatePopup.entityId
    );

    if (!parent) continue;

    const popup = buildPopupCard(
      hass,
      parent,
      aggregatePopup.children,
      config,
      areaOverride,
      area
    );

    if (!popup) continue;

    if (sections.length) {
      sections[0].cards.push(popup);
    } else {
      sections.push({
        type: "grid",
        cards: [popup],
      });
    }
  }

  if (techPopupEnabled && techEntities.length) {
    const techPopup = buildTechPopupCard(
      hass,
      techEntities,
      config,
      areaOverride,
      area,
      popupMap
    );

    if (techPopup) {
      // Bubble pop-ups can live as standalone cards in an existing section
      // without occupying visible dashboard space.
      if (sections.length) {
        sections[0].cards.push(techPopup);
      } else {
        sections.push({
          type: "grid",
          cards: [techPopup],
        });
      }
    }
  }

  if (Array.isArray(areaOverride.sections)) {
    sections.push(...areaOverride.sections);
  }

  const roomHomePath =
    areaOverride.back_path ||
    config.room_back_path ||
    config.home_path ||
    "home";

  const roomHeaderCard =
    config.room_home_button === false
      ? undefined
      : {
          type: "custom:atze-room-nav-header",
          icon: "mdi:home",
          area_name: areaName,
          navigation_path: roomHomePath,
        };

  return {
    title: areaName,
    path: areaOverride.path || slugify(areaName),
    icon: areaIcon,
    type: "sections",
    max_columns: Number(areaOverride.max_columns || config.max_columns || 4),
    subview:
      areaOverride.subview != null
        ? areaOverride.subview === true
        : config.single_room_navigation !== false,
    ...(
      areaOverride.back_path || config.room_back_path
        ? {
            back_path:
              areaOverride.back_path ||
              config.room_back_path,
          }
        : {}
    ),
    header: {
      layout: areaOverride.header_layout || config.header_layout || "center",
      badges_position: "bottom",
      ...(roomHeaderCard ? { card: roomHeaderCard } : {}),
    },
    badges: badgeSelection.badges,
    sections,
  };
}


const ATZE_SCROLLBAR_STYLE_ID = "atze-dashboard-hide-scrollbars";

function installAtzeScrollbarStyle(root) {
  if (!root || typeof root.querySelector !== "function") return;

  if (!root.querySelector(`#${ATZE_SCROLLBAR_STYLE_ID}`)) {
    const style = document.createElement("style");
    style.id = ATZE_SCROLLBAR_STYLE_ID;
    style.textContent = `
      :host,
      html,
      body,
      * {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }

      ::-webkit-scrollbar {
        width: 0 !important;
        height: 0 !important;
        display: none !important;
        background: transparent !important;
      }

      ::-webkit-scrollbar-track,
      ::-webkit-scrollbar-thumb,
      ::-webkit-scrollbar-corner {
        background: transparent !important;
        display: none !important;
      }
    `;

    const target =
      root instanceof Document
        ? (root.head || root.documentElement)
        : root;

    target?.appendChild(style);
  }

  const elements = root.querySelectorAll("*");

  for (const element of elements) {
    if (element.shadowRoot) {
      installAtzeScrollbarStyle(element.shadowRoot);
    }
  }
}

function hideAtzeDashboardScrollbars(enabled = true) {
  if (!enabled) return;

  // The HA view and its nested shadow roots do not all exist at the same
  // moment. Run a few lightweight passes so newly created Lovelace roots
  // receive the same scrollbar rule.
  const apply = () => {
    try {
      installAtzeScrollbarStyle(document);
    } catch (_error) {
      // Cosmetic enhancement only; never block dashboard generation.
    }
  };

  apply();
  requestAnimationFrame(apply);
  setTimeout(apply, 250);
  setTimeout(apply, 1000);
  setTimeout(apply, 2500);
}


function applyAtzeKioskQueryFallback(config) {
  if (config.kiosk_query_fallback === false) return;

  const kioskConfig =
    config?.kiosk_mode &&
    typeof config.kiosk_mode === "object"
      ? config.kiosk_mode
      : {};

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
    const before = parts.length;

    parts = parts.filter(
      (part) => keyOf(part) !== key
    );

    return parts.length !== before;
  };

  if (hasKey("disable_km")) return;

  const desired = [];

  // On this dashboard installation the full ?kiosk switch is the
  // confirmed working kiosk-mode entry point. Use that same switch
  // whenever the strategy requests the header to be hidden.
  if (kioskConfig.kiosk === true) {
    desired.push("kiosk");
  } else {
    if (
      config.force_kiosk === true ||
      kioskConfig.hide_header === true
    ) {
      desired.push("hide_header");
    }

    if (kioskConfig.hide_sidebar === true) {
      desired.push("hide_sidebar");
    }
  }

  const markerKey = "atze_km_auto";
  const autoManaged = hasKey(markerKey);

  const managedKeys = [
    "kiosk",
    "hide_header",
    "hide_sidebar",
  ];

  let changed = false;

  if (desired.length) {
    if (autoManaged) {
      for (const key of managedKeys) {
        if (
          !desired.includes(key) &&
          removeKey(key)
        ) {
          changed = true;
        }
      }
    }

    for (const key of desired) {
      if (!hasKey(key)) {
        parts.push(key);
        changed = true;
      }
    }

    if (!autoManaged) {
      parts.push(`${markerKey}=1`);
      changed = true;
    }
  } else if (autoManaged) {
    for (const key of managedKeys) {
      if (removeKey(key)) changed = true;
    }

    if (removeKey(markerKey)) changed = true;
  }

  if (!changed) return;

  const query = parts.length
    ? `?${parts.join("&")}`
    : "";

  const target =
    `${window.location.pathname}${query}${window.location.hash || ""}`;

  window.location.replace(target);
}

const ATZE_SIDEBAR_BUTTON_ID =
  "atze-dashboard-sidebar-button";

function openAtzeHomeAssistantSidebar() {
  const homeAssistant =
    document.querySelector("home-assistant");

  const main =
    homeAssistant?.shadowRoot?.querySelector(
      "home-assistant-main"
    );

  const target =
    main || homeAssistant || document.body;

  target.dispatchEvent(
    new CustomEvent("hass-toggle-menu", {
      bubbles: true,
      composed: true,
      detail: { open: true },
    })
  );
}

function syncAtzeSidebarAccessButton(enabled) {
  const existing =
    document.getElementById(
      ATZE_SIDEBAR_BUTTON_ID
    );

  if (!enabled) {
    existing?.remove();
    return;
  }

  if (existing) return;

  const button =
    document.createElement("button");

  button.id = ATZE_SIDEBAR_BUTTON_ID;
  button.type = "button";
  button.setAttribute(
    "aria-label",
    "Home Assistant Menü öffnen"
  );
  button.title = "Menü";

  button.innerHTML = `
    <ha-icon icon="mdi:menu"></ha-icon>
  `;

  Object.assign(button.style, {
    position: "fixed",
    top: "10px",
    left: "10px",
    width: "40px",
    height: "40px",
    borderRadius: "0",
    border: "none",
    background: "transparent",
    color: "rgba(255,255,255,0.78)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0",
    margin: "0",
    cursor: "pointer",
    zIndex: "2147483000",
    boxShadow: "none",
    backdropFilter: "none",
    WebkitBackdropFilter: "none",
    opacity: "1",
    WebkitTapHighlightColor: "transparent",
  });

  const icon = button.querySelector("ha-icon");

  if (icon) {
    Object.assign(icon.style, {
      width: "22px",
      height: "22px",
      color: "inherit",
    });
  }

  button.addEventListener(
    "click",
    openAtzeHomeAssistantSidebar
  );

  document.body.appendChild(button);
}

function applyAtzeSidebarAccess(config) {
  const params =
    new URLSearchParams(
      window.location.search || ""
    );

  const clockKioskAccess =
    config.home_view !== false &&
    config.clock_kiosk_toggle !== false;

  const enabled =
    config.force_kiosk === true &&
    !clockKioskAccess &&
    !params.has("disable_km");

  const apply = () => {
    try {
      syncAtzeSidebarAccessButton(enabled);
    } catch (_error) {
      // Keep dashboard generation independent
      // from the optional sidebar access button.
    }
  };

  apply();
  requestAnimationFrame(apply);
  setTimeout(apply, 250);
  setTimeout(apply, 1000);
}


class AtzeDashboardStrategy extends HTMLElement {
  static getCreateSuggestions(_hass) {
    return {
      title: "Atze Dashboard",
      icon: "mdi:view-dashboard-variant",
    };
  }

  static async getConfigElement() {
    await customElements.whenDefined(
      "atze-dashboard-strategy-editor"
    );

    return document.createElement(
      "atze-dashboard-strategy-editor"
    );
  }

  static async generate(config, hass) {
    applyAtzeSidebarAccess(config);

    hideAtzeDashboardScrollbars(
      config.hide_scrollbar !== false
    );

    const [areas, devices, entities, labels] = await Promise.all([
      hass.callWS({ type: "config/area_registry/list" }),
      hass.callWS({ type: "config/device_registry/list" }),
      hass.callWS({ type: "config/entity_registry/list" }),
      hass
        .callWS({ type: "config/label_registry/list" })
        .catch(() => []),
    ]);

    const deviceById = new Map(devices.map((device) => [device.id, device]));
    RUNTIME_DEVICE_BY_ID = deviceById;

    const areaById = new Map(areas.map((area) => [area.area_id, area]));
    const registryByEntityId = new Map(
      entities.map((entity) => [entity.entity_id, entity])
    );

    const noStrategyLabelIds = matchingNoStrategyLabelIds(
      labels,
      config
    );

    const noStrategyAreaIds = new Set(
      areas
        .filter((area) =>
          areaHasNoStrategyLabel(
            area,
            noStrategyLabelIds,
            config
          )
        )
        .map((area) => area.area_id)
    );

    const includeAreasConfigured =
      Array.isArray(config.include_areas);

    const includeAreas = new Set(asArray(config.include_areas));
    const excludeAreas = new Set(asArray(config.exclude_areas));
    const excludeEntities = new Set(asArray(config.exclude_entities));

    const securityLabelIds = matchingSecurityLabelIds(
      labels,
      config
    );

    const securityEntities = entities.filter((entity) => {
      const entityId = entity.entity_id;

      if (!hass.states[entityId]) return false;
      if (entity.disabled_by) return false;
      if (
        entityHasNoStrategyLabel(
          entity,
          noStrategyLabelIds,
          config
        )
      ) {
        return false;
      }
      if (shouldHideExactEntity(config, entityId)) return false;
      if (
        noStrategyAreaIds.has(
          effectiveAreaId(entity, deviceById)
        )
      ) {
        return false;
      }
      if (config.include_hidden !== true && entity.hidden_by) {
        return false;
      }
      if (excludeEntities.has(entityId)) return false;

      const override = getOverride(
        config.entity_overrides,
        entityId
      );

      if (
        override.hidden === true ||
        override.card === "hidden"
      ) {
        return false;
      }

      return (
        domainOf(entityId) === "cover" ||
        entityHasDirectSecurityLabel(
          entity,
          securityLabelIds,
          config
        )
      );
    });

    const securityEntityIds = securityEntities.map(
      (entity) => entity.entity_id
    );

    const batteryEntities = entities.filter((entity) => {
      const entityId = entity.entity_id;

      if (!hass.states[entityId]) return false;
      if (entity.disabled_by) return false;
      if (
        entityHasNoStrategyLabel(
          entity,
          noStrategyLabelIds,
          config
        )
      ) {
        return false;
      }
      if (shouldHideExactEntity(config, entityId)) return false;
      if (
        noStrategyAreaIds.has(
          effectiveAreaId(entity, deviceById)
        )
      ) {
        return false;
      }
      if (
        config.include_hidden !== true &&
        entity.hidden_by
      ) {
        return false;
      }
      if (excludeEntities.has(entityId)) return false;

      const override = getOverride(
        config.entity_overrides,
        entityId
      );

      if (
        override.hidden === true ||
        override.card === "hidden"
      ) {
        return false;
      }

      return isBatteryEntity(hass, entity);
    });

    const usableEntities = entities.filter((entity) => {
      const entityId = entity.entity_id;

      if (!hass.states[entityId]) return false;
      if (entity.disabled_by) return false;
      if (
        entityHasNoStrategyLabel(
          entity,
          noStrategyLabelIds,
          config
        )
      ) {
        return false;
      }
      if (shouldHideExactEntity(config, entityId)) return false;
      if (
        noStrategyAreaIds.has(
          effectiveAreaId(entity, deviceById)
        )
      ) {
        return false;
      }
      if (config.include_hidden !== true && entity.hidden_by) return false;
      if (excludeEntities.has(entityId)) return false;
      if (config.hide_unavailable === true && isUnavailable(hass, entityId)) {
        return false;
      }

      if (
        config.hide_unknown === true &&
        hass.states[entityId]?.state === "unknown"
      ) {
        return false;
      }

      const override = getOverride(config.entity_overrides, entityId);
      if (override.hidden === true || override.card === "hidden") return false;

      return true;
    });

    RUNTIME_AGGREGATE_DEVICE_PARENTS =
      discoverRuntimeAggregateParents(
        hass,
        usableEntities,
        config,
        deviceById,
        areaById
      );

    RUNTIME_HIDDEN_ENTITY_IDS =
      discoverRuntimeHiddenEntities(
        hass,
        usableEntities,
        deviceById,
        areaById
      );

    const popupMap = buildDevicePopupMap(
      hass,
      usableEntities,
      config,
      deviceById,
      areaById
    );
    const entitiesByArea = new Map();

    for (const entity of usableEntities) {
      const areaId = effectiveAreaId(entity, deviceById);
      if (!areaId || !areaById.has(areaId)) continue;

      if (!entitiesByArea.has(areaId)) entitiesByArea.set(areaId, []);
      entitiesByArea.get(areaId).push(entity);
    }

    const filteredAreas = areas
      .filter((area) => {
        const override = getOverride(config.area_overrides, area.area_id);

        if (override.hidden === true) return false;
        if (noStrategyAreaIds.has(area.area_id)) return false;
        if (excludeAreas.has(area.area_id)) return false;
        if (
          includeAreasConfigured &&
          !includeAreas.has(area.area_id)
        ) {
          return false;
        }

        const count = entitiesByArea.get(area.area_id)?.length || 0;
        return config.show_empty_areas === true || count > 0;
      })
      .sort(compareAreas(config));

    const roomViews = filteredAreas.map((area) =>
      buildAreaView(
        hass,
        area,
        entitiesByArea.get(area.area_id) || [],
        config,
        popupMap,
        registryByEntityId
      )
    );

    const securityView =
      config.security_view === false
        ? null
        : buildSecurityView(
            hass,
            securityEntities,
            areaById,
            deviceById,
            config
          );

    const maintenanceView =
      config.maintenance_view === false
        ? null
        : buildMaintenanceView(
            hass,
            batteryEntities,
            areaById,
            deviceById,
            config
          );

    const customPageViews = buildCustomPageViews(config);

    const views =
      config.home_view === false
        ? [
            ...(securityView ? [securityView] : []),
            ...(maintenanceView
              ? [maintenanceView]
              : []),
            ...customPageViews,
            ...roomViews,
          ]
        : [
            buildHomeOverviewView(
              hass,
              filteredAreas,
              entitiesByArea,
              usableEntities,
              config,
              popupMap,
              areaById,
              securityEntityIds,
              batteryEntities.map(
                (entity) => entity.entity_id
              )
            ),
            ...(securityView ? [securityView] : []),
            ...(maintenanceView
              ? [maintenanceView]
              : []),
            ...customPageViews,
            ...roomViews,
          ];

    if (views.length === 0) {
      views.push({
        title: "Atze Dashboard",
        path: "atze-dashboard",
        icon: "mdi:view-dashboard-alert-outline",
        type: "sections",
        sections: [
          {
            type: "grid",
            cards: [
              {
                type: "heading",
                heading: "Keine Bereiche gefunden",
                icon: "mdi:alert-circle-outline",
              },
              {
                type: "markdown",
                content:
                  "Die Strategy hat keine passenden Bereiche/Entitäten gefunden. " +
                  "Prüfe `include_areas`, `exclude_areas` und die Bereichszuordnung deiner Geräte.",
              },
            ],
          },
        ],
      });
    }

    return {
      title: config.title || "Atze Dashboard",
      ...(config.kiosk_mode != null
        ? { kiosk_mode: config.kiosk_mode }
        : {}),
      views,
    };
  }
}



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
    if (this._config?.clock_kiosk_toggle === false) {
      return;
    }

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
      .slice(0, 3)
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



class AtzeSecurityOverviewCard extends HTMLElement {
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
    if (!this._scrollTopCleanup) {
      this._scrollTopCleanup =
        setupAtzeScrollTopButton(this);
    }

    if (!this._homeSwipeCleanup) {
      this._homeSwipeCleanup =
        setupAtzeHomeSwipe(
          this,
          () => this._config?.home_path || "home"
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



class AtzeMaintenanceOverviewCard extends HTMLElement {
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
    if (!this._scrollTopCleanup) {
      this._scrollTopCleanup =
        setupAtzeScrollTopButton(this);
    }

    if (!this._homeSwipeCleanup) {
      this._homeSwipeCleanup =
        setupAtzeHomeSwipe(
          this,
          () => this._config?.home_path || "home"
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


class AtzeRoomNavHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
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

      <ha-card>
        <div
          class="nav-row"
          role="button"
          tabindex="0"
          title="Zurück zu Zuhause"
          aria-label="Zurück zu Zuhause – ${areaName}"
        >
          <span class="home-icon">
            <ha-icon icon="${this._config.icon || "mdi:home"}"></ha-icon>
          </span>
          <span class="area-name">${areaName}</span>
        </div>
      </ha-card>
    `;

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


class AtzeDashboardStrategyEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._config = {};
    this._areas = [];
    this._labels = [];
    this._devices = [];
    this._entities = [];
    this._loading = false;
    this._draggedAreaId = null;
    this._entityVisibilityActive = false;
    this._pendingHassRender = false;
    this._entityFilter = "";
    this._favoriteFilter = "";
    this._pendingCustomPageValues = new Map();
    this._openEntityAreaIds = new Set();
    this._openEditorSections = new Set();
    this._lightHelpersEnsured = false;
    this._lightHelperSetupState = "";
    this._lightHelperSetupMessage = "";
  }

  set hass(value) {
    const first = !this._hass;
    this._hass = value;
    if (first || this._areas.length === 0) {
      this._loadRegistries();
    } else if (this._entityVisibilityActive) {
      this._pendingHassRender = true;
    } else {
      this._render();
    }

    this._maybeEnsureLightControlHelpers();
  }

  get hass() {
    return this._hass;
  }

  setConfig(config) {
    this._config = { ...(config || {}) };
    this._render();
    this._maybeEnsureLightControlHelpers();
  }

  connectedCallback() {
    // Reset only on opening the editor, not on config or state updates.
    this._openEditorSections.clear();
    this._openEntityAreaIds.clear();
    this._entityFilter = "";
    this._favoriteFilter = "";
    this._pendingCustomPageValues.clear();
    this._entityVisibilityActive = false;
    this._pendingHassRender = false;
    this._loadRegistries();
    this._render();
    this._maybeEnsureLightControlHelpers();
  }

  async _loadRegistries() {
    if (!this._hass || this._loading) return;
    this._loading = true;

    try {
      const [areas, labels, devices, entities] =
        await Promise.all([
          this._hass.callWS({
            type: "config/area_registry/list",
          }),
          this._hass
            .callWS({
              type: "config/label_registry/list",
            })
            .catch(() => []),
          this._hass.callWS({
            type: "config/device_registry/list",
          }),
          this._hass.callWS({
            type: "config/entity_registry/list",
          }),
        ]);

      this._areas = [...(areas || [])].sort((a, b) =>
        String(a?.name || a?.area_id || "")
          .localeCompare(
            String(b?.name || b?.area_id || ""),
            "de"
          )
      );
      this._labels = labels || [];
      this._devices = devices || [];
      this._entities = entities || [];
    } catch (_error) {
      this._areas = [];
      this._labels = [];
      this._devices = [];
      this._entities = [];
    } finally {
      this._loading = false;
      this._render();
    }
  }

  _escape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  _blockedAreaIds() {
    const labelIds = matchingNoStrategyLabelIds(
      this._labels,
      this._config
    );

    return new Set(
      this._areas
        .filter((area) =>
          areaHasNoStrategyLabel(
            area,
            labelIds,
            this._config
          )
        )
        .map((area) => area.area_id)
    );
  }

  _orderedAreas() {
    return [...this._areas].sort(
      compareAreas(this._config)
    );
  }

  _eligibleAreas() {
    const blocked = this._blockedAreaIds();

    return this._orderedAreas().filter(
      (area) => !blocked.has(area.area_id)
    );
  }

  _selectedAreaIds() {
    const blocked = this._blockedAreaIds();

    if (Array.isArray(this._config.include_areas)) {
      return new Set(
        this._config.include_areas.filter(
          (areaId) => !blocked.has(areaId)
        )
      );
    }

    return new Set(
      this._eligibleAreas().map(
        (area) => area.area_id
      )
    );
  }

  _fireConfigChanged(nextConfig) {
    this._config = nextConfig;
    this._render();

    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: nextConfig },
        bubbles: true,
        composed: true,
      })
    );
  }

  _setArea(areaId, checked) {
    const selected = this._selectedAreaIds();

    if (checked) selected.add(areaId);
    else selected.delete(areaId);

    this._fireConfigChanged({
      ...this._config,
      include_areas: this._eligibleAreas()
        .filter((area) =>
          selected.has(area.area_id)
        )
        .map((area) => area.area_id),
    });
  }

  _selectAllAreas() {
    const next = { ...this._config };
    delete next.include_areas;
    this._fireConfigChanged(next);
  }

  _selectNoAreas() {
    this._fireConfigChanged({
      ...this._config,
      include_areas: [],
    });
  }

  _setAreaOrder(areaIds) {
    const areaOverrides = {
      ...(this._config.area_overrides || {}),
    };

    areaIds.forEach((areaId, index) => {
      areaOverrides[areaId] = {
        ...(areaOverrides[areaId] || {}),
        order: (index + 1) * 10,
      };
    });

    this._fireConfigChanged({
      ...this._config,
      area_overrides: areaOverrides,
    });
  }

  _moveArea(draggedAreaId, targetAreaId) {
    if (
      !draggedAreaId ||
      !targetAreaId ||
      draggedAreaId === targetAreaId
    ) {
      return;
    }

    const areaIds = this._eligibleAreas().map(
      (area) => area.area_id
    );

    const from = areaIds.indexOf(draggedAreaId);
    const to = areaIds.indexOf(targetAreaId);

    if (from < 0 || to < 0) return;

    const [moved] = areaIds.splice(from, 1);
    areaIds.splice(to, 0, moved);

    this._setAreaOrder(areaIds);
  }

  _resetAreaOrder() {
    const current = {
      ...(this._config.area_overrides || {}),
    };

    const nextOverrides = {};

    for (const [areaId, value] of Object.entries(current)) {
      const cleaned = {
        ...(value || {}),
      };

      delete cleaned.order;

      if (Object.keys(cleaned).length > 0) {
        nextOverrides[areaId] = cleaned;
      }
    }

    const next = {
      ...this._config,
    };

    if (Object.keys(nextOverrides).length > 0) {
      next.area_overrides = nextOverrides;
    } else {
      delete next.area_overrides;
    }

    this._fireConfigChanged(next);
  }

  _deviceById() {
    return new Map(
      (this._devices || []).map(
        (device) => [device.id, device]
      )
    );
  }

  _availableEntities() {
    return (this._entities || []).filter((entity) => {
      if (!entity?.entity_id) return false;
      if (entity.disabled_by) return false;
      if (isBuiltInHiddenEntity(entity.entity_id)) {
        return false;
      }

      return Boolean(
        this._hass?.states?.[entity.entity_id]
      );
    });
  }

  _entitiesForArea(areaId) {
    if (!areaId) return [];

    const deviceById = this._deviceById();

    return this._availableEntities()
      .filter((entity) => {
        return (
          effectiveAreaId(
            entity,
            deviceById
          ) === areaId
        );
      })
      .sort((a, b) => {
        const an = rawFriendlyName(
          this._hass,
          a.entity_id,
          a
        );
        const bn = rawFriendlyName(
          this._hass,
          b.entity_id,
          b
        );

        return String(an).localeCompare(
          String(bn),
          "de",
          {
            numeric: true,
            sensitivity: "base",
          }
        );
      });
  }

  _entitiesWithoutArea() {
    const deviceById = this._deviceById();
    const knownAreaIds = new Set(
      this._areas.map((area) => area.area_id)
    );

    return this._availableEntities()
      .filter((entity) => {
        const areaId = effectiveAreaId(
          entity,
          deviceById
        );

        return !areaId || !knownAreaIds.has(areaId);
      })
      .sort((a, b) => {
        const an = rawFriendlyName(
          this._hass,
          a.entity_id,
          a
        );
        const bn = rawFriendlyName(
          this._hass,
          b.entity_id,
          b
        );

        return String(an).localeCompare(
          String(bn),
          "de",
          {
            numeric: true,
            sensitivity: "base",
          }
        );
      });
  }

  _beginEntityVisibilityInteraction() {
    this._entityVisibilityActive = true;
  }

  _endEntityVisibilityInteraction() {
    window.setTimeout(() => {
      const activeElement = this.shadowRoot?.activeElement;

      if (
        activeElement?.classList?.contains("entity-visibility") ||
        activeElement?.classList?.contains("person-entity-select") ||
        activeElement?.classList?.contains("power-sensor-select") ||
        activeElement?.classList?.contains("entity-filter-input") ||
        activeElement?.classList?.contains("favorite-filter-input") ||
        activeElement?.matches?.("[data-page-key]")
      ) {
        return;
      }

      this._entityVisibilityActive = false;

      if (this._pendingHassRender) {
        this._pendingHassRender = false;
        this._render();
      }
    }, 150);
  }

  _setEntityVisibility(entityId, mode) {
    const entityOverrides = {
      ...(this._config.entity_overrides || {}),
    };

    const nextOverride = {
      ...(entityOverrides[entityId] || {}),
    };

    delete nextOverride.visibility;
    delete nextOverride.visible;
    delete nextOverride.hidden;

    if (nextOverride.card === "hidden") {
      delete nextOverride.card;
    }

    if (mode === "show") {
      nextOverride.visibility = "show";
    } else if (mode === "hide") {
      nextOverride.visibility = "hide";
    }

    if (Object.keys(nextOverride).length > 0) {
      entityOverrides[entityId] = nextOverride;
    } else {
      delete entityOverrides[entityId];
    }

    const next = {
      ...this._config,
    };

    if (Object.keys(entityOverrides).length > 0) {
      next.entity_overrides = entityOverrides;
    } else {
      delete next.entity_overrides;
    }

    this._fireConfigChanged(next);
  }

  _setFavoriteEntity(entityId, checked) {
    const favorites = asArray(
      this._config.favorite_entities
    ).map(String);

    const nextFavorites = checked
      ? [...new Set([...favorites, entityId])]
      : favorites.filter((id) => id !== entityId);

    const next = { ...this._config };

    if (nextFavorites.length > 0) {
      next.favorite_entities = nextFavorites;
    } else {
      delete next.favorite_entities;
    }

    this._fireConfigChanged(next);
  }

  _favoriteEntityRows(area) {
    return this._favoriteEntityRowsForEntities(
      this._entitiesForArea(area.area_id)
    );
  }

  _favoriteEntityRowsForEntities(entities) {
    const favorites = new Set(
      asArray(this._config.favorite_entities).map(String)
    );

    if (!entities.length) {
      return `
        <div class="entity-empty">
          Keine Entities in diesem Bereich gefunden.
        </div>
      `;
    }

    return entities.map((entity) => {
      const entityId = entity.entity_id;
      const name = rawFriendlyName(
        this._hass,
        entityId,
        entity
      );

      return `
        <label class="entity-row favorite-config-row">
          <span class="entity-copy">
            <span class="entity-name">
              ${this._escape(name)}
            </span>
            <span class="entity-meta">
              ${this._escape(domainOf(entityId))}
            </span>
            <span class="entity-id">
              ${this._escape(entityId)}
            </span>
          </span>
          <input
            class="favorite-toggle"
            type="checkbox"
            data-entity-id="${this._escape(entityId)}"
            ${favorites.has(entityId) ? "checked" : ""}
          />
        </label>
      `;
    }).join("");
  }

  _applyEntityFilter() {
    if (!this.shadowRoot) return;

    const query = String(this._entityFilter || "")
      .trim()
      .toLocaleLowerCase("de");
    let visibleRows = 0;

    for (
      const details of
        this.shadowRoot.querySelectorAll(
          ".entity-area[data-entity-area]"
        )
    ) {
      const rows = [
        ...details.querySelectorAll(
          ".entity-config-row"
        ),
      ];

      let matchesInArea = 0;

      for (const row of rows) {
        const searchText = String(row.textContent || "")
          .toLocaleLowerCase("de");
        const matches =
          !query || searchText.includes(query);

        row.hidden = !matches;

        if (matches) {
          matchesInArea += 1;
          visibleRows += 1;
        }
      }

      details.hidden =
        Boolean(query) && matchesInArea === 0;

      if (query && matchesInArea > 0) {
        details.open = true;
      }
    }

    const empty = this.shadowRoot.querySelector(
      ".entity-filter-empty"
    );

    if (empty) {
      empty.hidden = !query || visibleRows > 0;
    }
  }

  _applyFavoriteFilter() {
    if (!this.shadowRoot) return;

    const query = String(this._favoriteFilter || "")
      .trim()
      .toLocaleLowerCase("de");
    let visibleRows = 0;

    for (
      const details of
        this.shadowRoot.querySelectorAll(
          ".entity-area[data-favorite-area]"
        )
    ) {
      const rows = [
        ...details.querySelectorAll(
          ".favorite-config-row"
        ),
      ];

      let matchesInArea = 0;

      for (const row of rows) {
        const searchText = String(row.textContent || "")
          .toLocaleLowerCase("de");
        const matches =
          !query || searchText.includes(query);

        row.hidden = !matches;

        if (matches) {
          matchesInArea += 1;
          visibleRows += 1;
        }
      }

      details.hidden = Boolean(query) && matchesInArea === 0;

      if (query && matchesInArea > 0) {
        details.open = true;
      }
    }

    const empty = this.shadowRoot.querySelector(
      ".favorite-filter-empty"
    );

    if (empty) {
      empty.hidden = !query || visibleRows > 0;
    }
  }

  _entityVisibilityRows(area) {
    const entities =
      this._entitiesForArea(area.area_id);

    if (!entities.length) {
      return `
        <div class="entity-empty">
          Keine Entities in diesem Bereich gefunden.
        </div>
      `;
    }

    return entities.map((entity) => {
      const entityId = entity.entity_id;
      const mode =
        roomEntityVisibilityMode(
          this._config,
          entityId
        );

      const name = rawFriendlyName(
        this._hass,
        entityId,
        entity
      );

      const domain = domainOf(entityId);

      const autoVisible =
        shouldAutoShowRoomEntity(
          this._hass,
          entity,
          this._config
        );

      const effectiveVisible =
        mode === "show"
          ? true
          : mode === "hide"
            ? false
            : autoVisible;

      const modeLabel =
        mode === "show"
          ? "Anzeigen"
          : mode === "hide"
            ? "Ausblenden"
            : "Auto";

      return `
        <div class="entity-row entity-config-row">
          <span class="entity-copy">
            <span class="entity-name">
              ${this._escape(name)}
            </span>

            <span class="entity-status-line">
              <span
                class="entity-status ${effectiveVisible ? "visible" : "hidden"}"
              >
                ${effectiveVisible ? "Sichtbar" : "Unsichtbar"}
              </span>

              <span class="entity-mode">
                ${this._escape(modeLabel)}
              </span>
            </span>

            <span class="entity-meta">
              ${this._escape(domain)}
            </span>

            <span class="entity-id">
              ${this._escape(entityId)}
            </span>
          </span>

          <select
            class="entity-visibility"
            data-entity-id="${this._escape(entityId)}"
            aria-label="Sichtbarkeit ${this._escape(name)}"
          >
            <option value="auto" ${mode === "auto" ? "selected" : ""}>
              Auto
            </option>
            <option value="show" ${mode === "show" ? "selected" : ""}>
              Anzeigen
            </option>
            <option value="hide" ${mode === "hide" ? "selected" : ""}>
              Ausblenden
            </option>
          </select>
        </div>
      `;
    }).join("");
  }

  _setBoolean(key, value, defaultValue) {
    const next = { ...this._config };

    if (value === defaultValue) {
      delete next[key];
    } else {
      next[key] = value;
    }

    this._fireConfigChanged(next);
  }

  _effectiveBoolean(key, defaultValue) {
    const value = this._config?.[key];
    return value == null
      ? defaultValue
      : value === true;
  }

  _powerSensorOptionsHtml(selectedEntityId = "") {
    const sensors = Object.keys(
      this._hass?.states || {}
    )
      .filter((entityId) => {
        if (!entityId.startsWith("sensor.")) return false;

        const stateObj = this._hass.states[entityId];
        const deviceClass = String(
          stateObj?.attributes?.device_class || ""
        ).toLowerCase();
        const unit = String(
          stateObj?.attributes?.unit_of_measurement || ""
        ).toLowerCase();

        return (
          deviceClass === "power" ||
          ["w", "kw", "mw"].includes(unit)
        );
      })
      .map((entityId) => ({
        entityId,
        name:
          this._hass.states[entityId]?.attributes
            ?.friendly_name ||
          entityId,
      }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, "de")
      );

    return [
      `<option value="">Automatisch</option>`,
      ...sensors.map(({ entityId, name }) => `
        <option
          value="${this._escape(entityId)}"
          ${entityId === selectedEntityId ? "selected" : ""}
        >
          ${this._escape(name)}
        </option>
      `),
    ].join("");
  }

  _powerSensorSelectHtml() {
    const selected =
      String(this._config.home_power_entity || "");

    return `
      <label class="row power-sensor-setting-row">
        <span class="copy">
          <span class="name">Stromsensor</span>
          <span class="desc">
            Leistungssensor für die Strom-Kachel auf der Startseite.
          </span>
        </span>
        <select
          class="power-sensor-select"
          aria-label="Stromsensor auswählen"
        >
          ${this._powerSensorOptionsHtml(selected)}
        </select>
      </label>
    `;
  }

  _setHomePowerEntity(entityId) {
    const next = { ...this._config };
    const value = String(entityId || "");

    if (value) {
      next.home_power_entity = value;
    } else {
      delete next.home_power_entity;
    }

    this._fireConfigChanged(next);
  }

  _personOptionsHtml(selectedEntityId = "") {
    const people = Object.keys(
      this._hass?.states || {}
    )
      .filter((entityId) =>
        entityId.startsWith("person.")
      )
      .map((entityId) => ({
        entityId,
        name:
          this._hass.states[entityId]?.attributes
            ?.friendly_name ||
          entityId,
      }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, "de")
      );

    return [
      `<option value="">Nicht belegt</option>`,
      ...people.map(({ entityId, name }) => `
        <option
          value="${this._escape(entityId)}"
          ${entityId === selectedEntityId ? "selected" : ""}
        >
          ${this._escape(name)}
        </option>
      `),
    ].join("");
  }

  _personSelectHtml(index) {
    const selected =
      asArray(this._config.home_people_entities)[index] ||
      "";

    return `
      <label class="row person-setting-row">
        <span class="copy">
          <span class="name">Person ${index + 1}</span>
          <span class="desc">
            Profilbild und Anwesenheit auf der Startseite.
          </span>
        </span>
        <select
          class="person-entity-select"
          data-person-index="${index}"
          aria-label="Person ${index + 1} auswählen"
        >
          ${this._personOptionsHtml(selected)}
        </select>
      </label>
    `;
  }

  _setHomePerson(index, entityId) {
    const people = Array(3).fill("");
    asArray(this._config.home_people_entities)
      .slice(0, 3)
      .forEach((value, itemIndex) => {
        people[itemIndex] = String(value || "");
      });

    people[index] = String(entityId || "");

    const next = { ...this._config };

    if (people.some(Boolean)) {
      next.home_people_entities = people;
    } else {
      delete next.home_people_entities;
    }

    this._fireConfigChanged(next);
  }

  _toggleHtml(key, label, description, defaultValue) {
    const checked =
      this._effectiveBoolean(key, defaultValue);

    return `
      <label class="row">
        <span class="copy">
          <span class="name">${this._escape(label)}</span>
          <span class="desc">${this._escape(description)}</span>
        </span>
        <input
          class="setting-toggle"
          type="checkbox"
          data-key="${this._escape(key)}"
          data-default="${defaultValue ? "true" : "false"}"
          ${checked ? "checked" : ""}
        />
      </label>
    `;
  }

  _customPages() {
    return asArray(this._config.custom_pages).filter(
      (page) =>
        page &&
        typeof page === "object" &&
        !isSchedulerCustomPage(page)
    );
  }

  _schedulerPopupEnabled() {
    return schedulerPopupEnabled(this._config || {});
  }

  _setSchedulerPopup(value) {
    const pages = asArray(this._config.custom_pages).filter(
      (page) => !isSchedulerCustomPage(page)
    );
    const next = {
      ...this._config,
      scheduler_popup: value === true,
    };

    if (pages.length > 0) next.custom_pages = pages;
    else delete next.custom_pages;

    this._fireConfigChanged(next);
  }

  _lightControlPopupEnabled() {
    return lightControlPopupEnabled(this._config || {});
  }

  _maybeEnsureLightControlHelpers() {
    if (
      !this._hass ||
      !this._lightControlPopupEnabled() ||
      this._lightHelpersEnsured ||
      this._lightHelperSetupState !== ""
    ) {
      return;
    }

    queueMicrotask(() => {
      if (
        this._hass &&
        this._lightControlPopupEnabled() &&
        !this._lightHelpersEnsured &&
        this._lightHelperSetupState === ""
      ) {
        this._setupLightControlHelpers(false);
      }
    });
  }

  async _assignLightHelperCategory(entityId, categoryId) {
    let lastError = null;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        await this._hass.callWS({
          type: "config/entity_registry/update",
          entity_id: entityId,
          categories: { helpers: categoryId },
        });
        return;
      } catch (error) {
        lastError = error;

        if (attempt < 3) {
          await new Promise((resolve) =>
            setTimeout(resolve, 200 * (attempt + 1))
          );
        }
      }
    }

    throw lastError;
  }

  async _ensureLightControlBlueprint() {
    return ensureAtzeLightBlueprint(this._hass);
  }

  async _ensureLightControlHelpers() {
    if (!this._hass) {
      throw new Error("Home Assistant ist noch nicht verfügbar.");
    }

    const domains = [
      ...new Set(
        ATZE_LIGHT_HELPERS.map((helper) => helper.domain)
      ),
    ];
    const helperLists = await Promise.all(
      domains.map((domain) =>
        this._hass.callWS({ type: `${domain}/list` })
      )
    );
    const knownEntityIds = new Set([
      ...Object.keys(this._hass.states || {}),
      ...this._entities.map((entity) => entity.entity_id),
    ]);

    domains.forEach((domain, index) => {
      for (const helper of helperLists[index] || []) {
        if (helper?.id) {
          knownEntityIds.add(`${domain}.${helper.id}`);
        }
      }
    });

    const entityIds = [];
    let created = 0;

    for (const helper of ATZE_LIGHT_HELPERS) {
      const expectedEntityId = `${helper.domain}.${helper.id}`;

      if (!knownEntityIds.has(expectedEntityId)) {
        const result = await this._hass.callWS({
          type: `${helper.domain}/create`,
          ...helper.values,
        });
        const createdId = result?.id;

        if (createdId !== helper.id) {
          throw new Error(
            `${expectedEntityId} konnte nicht mit der vorgesehenen Entity-ID angelegt werden.`
          );
        }

        knownEntityIds.add(expectedEntityId);
        created += 1;
      }

      entityIds.push(expectedEntityId);
    }

    const categories = await this._hass.callWS({
      type: "config/category_registry/list",
      scope: "helpers",
    });
    let category = (categories || []).find(
      (entry) =>
        String(entry?.name || "").trim().toLowerCase() ===
        ATZE_LIGHT_HELPER_CATEGORY.toLowerCase()
    );

    if (!category) {
      category = await this._hass.callWS({
        type: "config/category_registry/create",
        scope: "helpers",
        name: ATZE_LIGHT_HELPER_CATEGORY,
        icon: "mdi:lightbulb-group-outline",
      });
    }

    if (!category?.category_id) {
      throw new Error("Die Helfer-Kategorie konnte nicht angelegt werden.");
    }

    for (const entityId of entityIds) {
      await this._assignLightHelperCategory(
        entityId,
        category.category_id
      );
    }

    return { created, total: entityIds.length };
  }

  async _setupLightControlHelpers(enablePopup) {
    if (this._lightHelperSetupState === "loading") return;

    this._lightHelperSetupState = "loading";
    this._lightHelperSetupMessage =
      "Helfer, Kategorie und Blueprint werden geprüft …";
    this._render();

    try {
      const [helperResult, blueprintResult] =
        await Promise.all([
          this._ensureLightControlHelpers(),
          this._ensureLightControlBlueprint(),
        ]);

      this._lightHelpersEnsured = true;
      this._lightHelperSetupState = "success";

      const helperMessage = helperResult.created
        ? `${helperResult.created} fehlende Helfer wurden angelegt; alle ${helperResult.total} sind der Kategorie zugeordnet.`
        : `Alle ${helperResult.total} Helfer sind vorhanden und der Kategorie zugeordnet.`;

      const blueprintMessage = blueprintResult.created
        ? "Der Lichtsteuerungs-Blueprint wurde in Home Assistant angelegt."
        : blueprintResult.updated
          ? "Der Lichtsteuerungs-Blueprint wurde in Home Assistant aktualisiert."
          : "Der Lichtsteuerungs-Blueprint ist bereits in der aktuellen Version vorhanden.";

      this._lightHelperSetupMessage =
        `${helperMessage} ${blueprintMessage}`;

      if (enablePopup) {
        this._fireConfigChanged({
          ...this._config,
          light_control_popup: true,
        });
      } else {
        this._render();
      }
    } catch (error) {
      this._lightHelpersEnsured = false;
      this._lightHelperSetupState = "error";
      this._lightHelperSetupMessage =
        error?.message ||
        "Die Lichtsteuerung konnte nicht vollständig eingerichtet werden.";
      console.error(
        "Atze Dashboard: Lichtsteuerung konnte nicht vollständig eingerichtet werden.",
        error
      );
      this._render();
    }
  }

  _setLightControlPopup(value) {
    if (value !== true) {
      this._lightHelpersEnsured = false;
      this._lightHelperSetupState = "";
      this._lightHelperSetupMessage = "";
      this._fireConfigChanged({
        ...this._config,
        light_control_popup: false,
      });
      return;
    }

    this._setupLightControlHelpers(true);
  }

  _addCustomPage(template = "empty") {
    const pages = [...this._customPages()];
    const scheduler = template === "scheduler";

    pages.push({
      title: scheduler ? "Zeitpläne" : "Eigene Seite",
      path: scheduler ? "zeitplaene" : `eigene-seite-${pages.length + 1}`,
      icon: scheduler ? "mdi:calendar-clock" : "mdi:view-dashboard-outline",
      cards: [{
        type: scheduler ? "custom:scheduler-card" : "markdown",
        ...(scheduler ? {} : { content: "# Eigene Seite" }),
      }],
    });

    this._fireConfigChanged({
      ...this._config,
      custom_pages: pages,
    });
  }

  _updateCustomPage(index, value) {
    const pages = this._customPages().map((page) => ({ ...page }));
    if (!pages[index]) return;

    pages[index] = value;
    this._fireConfigChanged({
      ...this._config,
      custom_pages: pages,
    });
  }

  _removeCustomPage(index) {
    const pages = this._customPages().filter((_, itemIndex) => itemIndex !== index);
    const next = { ...this._config };

    if (pages.length > 0) next.custom_pages = pages;
    else delete next.custom_pages;

    this._fireConfigChanged(next);
  }

  _customPageView(page, index) {
    return page.view && typeof page.view === "object"
      ? page.view
      : page.card && !page.cards && !page.sections
        ? {
            title: page.title || `Eigene Seite ${index + 1}`,
            path: page.path || `eigene-seite-${index + 1}`,
            icon: page.icon || "mdi:view-dashboard-outline",
            cards: [{ ...page.card }],
          }
        : page;
  }

  _customPageHtml(page, index) {
    const view = this._customPageView(page, index);

    return `
      <div class="custom-page" data-custom-page="${index}">
        <div class="custom-page-heading">
          <strong>${this._escape(page.title || `Eigene Seite ${index + 1}`)}</strong>
          <button class="custom-page-remove" type="button" data-index="${index}">
            Entfernen
          </button>
        </div>
        <ha-yaml-editor
          class="custom-page-yaml"
          data-page-key="view"
          data-index="${index}"
          aria-label="YAML für ${this._escape(view.title || `Eigene Seite ${index + 1}`)}"
        ></ha-yaml-editor>
      </div>
    `;
  }

  _render() {
    if (!this.shadowRoot) return;

    const blocked = this._blockedAreaIds();
    const selected = this._selectedAreaIds();
    const customPagesHtml = this._customPages()
      .map((page, index) => this._customPageHtml(page, index))
      .join("");

    const entityAreaPanels =
      this._eligibleAreas()
        .filter((area) =>
          selected.has(area.area_id)
        )
        .map((area) => `
          <details
            class="entity-area"
            data-entity-area="${this._escape(area.area_id)}"
            ${this._openEntityAreaIds.has(area.area_id) ? "open" : ""}
          >
            <summary>
              <span class="entity-summary-main">
                <ha-icon
                  icon="${this._escape(
                    area.icon || "mdi:home-outline"
                  )}"
                ></ha-icon>
                <span>
                  ${this._escape(
                    area.name || area.area_id
                  )}
                </span>
              </span>

              <span class="entity-summary-end">
                <span class="entity-count">
                  ${this._entitiesForArea(area.area_id).length}
                </span>
                <ha-icon
                  class="entity-chevron"
                  icon="mdi:chevron-right"
                ></ha-icon>
              </span>
            </summary>

            <div class="entity-rows">
              ${this._entityVisibilityRows(area)}
            </div>
          </details>
        `)
        .join("");

    const configuredFavorites = new Set(
      asArray(this._config.favorite_entities).map(String)
    );

    const assignedFavoriteAreaPanels =
      this._eligibleAreas()
        .filter((area) => selected.has(area.area_id))
        .map((area) => {
          const entities = this._entitiesForArea(area.area_id);
          const favoriteCount = entities.filter((entity) =>
            configuredFavorites.has(entity.entity_id)
          ).length;

          return `
            <details
              class="entity-area"
              data-favorite-area="${this._escape(area.area_id)}"
              ${this._openEntityAreaIds.has(area.area_id) ? "open" : ""}
            >
              <summary>
                <span class="entity-summary-main">
                  <ha-icon
                    icon="${this._escape(
                      area.icon || "mdi:home-outline"
                    )}"
                  ></ha-icon>
                  <span>${this._escape(area.name || area.area_id)}</span>
                </span>

                <span class="entity-summary-end">
                  <span class="entity-count">
                    ${favoriteCount} / ${entities.length}
                  </span>
                  <ha-icon
                    class="entity-chevron"
                    icon="mdi:chevron-right"
                  ></ha-icon>
                </span>
              </summary>

              <div class="entity-rows">
                ${this._favoriteEntityRows(area)}
              </div>
            </details>
          `;
        })
        .join("");

    const unassignedEntities = this._entitiesWithoutArea();
    const unassignedFavoriteCount = unassignedEntities.filter(
      (entity) => configuredFavorites.has(entity.entity_id)
    ).length;
    const unassignedAreaId = "__unassigned__";

    const favoriteAreaPanels = `
      ${assignedFavoriteAreaPanels}
      <details
        class="entity-area"
        data-favorite-area="${unassignedAreaId}"
        ${this._openEntityAreaIds.has(unassignedAreaId) ? "open" : ""}
      >
        <summary>
          <span class="entity-summary-main">
            <ha-icon icon="mdi:tray-remove"></ha-icon>
            <span>Ohne Bereich</span>
          </span>

          <span class="entity-summary-end">
            <span class="entity-count">
              ${unassignedFavoriteCount} / ${unassignedEntities.length}
            </span>
            <ha-icon
              class="entity-chevron"
              icon="mdi:chevron-right"
            ></ha-icon>
          </span>
        </summary>

        <div class="entity-rows">
          ${this._favoriteEntityRowsForEntities(unassignedEntities)}
        </div>
      </details>
    `;

    const areaRows = this._orderedAreas().map((area) => {
      const blockedArea = blocked.has(area.area_id);
      const checked =
        !blockedArea &&
        selected.has(area.area_id);

      return `
        <label
          class="row area-config-row ${blockedArea ? "blocked" : ""}"
          data-area-row="${this._escape(area.area_id)}"
          draggable="${blockedArea ? "false" : "true"}"
        >
          <span class="area">
            <span
              class="drag-handle"
              title="${blockedArea ? "" : "Ziehen zum Sortieren"}"
              aria-hidden="true"
            >
              <ha-icon icon="mdi:drag-vertical"></ha-icon>
            </span>
            <ha-icon
              class="area-icon"
              icon="${this._escape(
                area.icon || "mdi:home-outline"
              )}"
            ></ha-icon>
            <span class="copy">
              <span class="name">
                ${this._escape(area.name || area.area_id)}
              </span>
              ${blockedArea
                ? '<span class="desc">Label no-strategy / no-dboard</span>'
                : ""}
            </span>
          </span>
          <input
            class="area-toggle"
            type="checkbox"
            data-area-id="${this._escape(area.area_id)}"
            ${checked ? "checked" : ""}
            ${blockedArea ? "disabled" : ""}
          />
        </label>
      `;
    }).join("");

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          color: var(--primary-text-color);
          font-family: var(--ha-font-family-body, inherit);
        }
        .editor {
          display: grid;
          gap: 16px;
          padding: 4px 0 24px;
        }

        .editor-version {
          padding: 0 4px 2px;
          color: var(--secondary-text-color);
          font-size: 14px;
          font-weight: 500;
        }
        .panel {
          background: var(
            --ha-card-background,
            var(--card-background-color)
          );
          border: 1px solid var(
            --divider-color,
            rgba(127,127,127,.18)
          );
          border-radius: 16px;
          overflow: hidden;
        }

        .editor-section > summary {
          min-height: 72px;
          padding: 0 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          cursor: pointer;
          user-select: none;
          list-style: none;
        }

        .editor-section > summary::-webkit-details-marker {
          display: none;
        }

        .editor-section > summary::marker {
          content: "";
        }

        .editor-section-summary-main {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .editor-section-summary-main > ha-icon {
          width: 28px;
          height: 28px;
          color: var(--primary-color);
        }

        .editor-section-summary-title {
          font-size: 18px;
          font-weight: 600;
        }

        .editor-section-chevron {
          width: 24px;
          height: 24px;
          color: var(--secondary-text-color);
          transition: transform 160ms ease;
          flex: 0 0 auto;
        }

        .editor-section[open]
          > summary
          .editor-section-chevron {
          transform: rotate(90deg);
        }

        .editor-section-body {
          border-top: 1px solid var(
            --divider-color,
            rgba(127,127,127,.18)
          );
        }

        .editor-section-help {
          padding: 14px 18px 12px;
          color: var(--secondary-text-color);
          font-size: 13px;
          line-height: 1.4;
        }

        .header {
          padding: 16px 18px 12px;
        }
        .title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
          font-weight: 600;
        }
        .title ha-icon {
          color: var(--primary-color);
        }
        .help {
          margin-top: 6px;
          color: var(--secondary-text-color);
          font-size: 13px;
          line-height: 1.4;
        }

        .entity-filter-wrap,
        .favorite-filter-wrap {
          margin: 0 16px 14px;
          min-height: 46px;
          padding: 0 13px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid var(
            --divider-color,
            rgba(127,127,127,.22)
          );
          border-radius: 13px;
          background: var(
            --secondary-background-color,
            rgba(127,127,127,.10)
          );
        }

        .entity-filter-wrap:focus-within,
        .favorite-filter-wrap:focus-within {
          border-color: var(--primary-color, #03a9f4);
          box-shadow: 0 0 0 1px var(--primary-color, #03a9f4);
        }

        .entity-filter-wrap ha-icon,
        .favorite-filter-wrap ha-icon {
          width: 22px;
          height: 22px;
          flex: 0 0 auto;
          color: var(--secondary-text-color);
        }

        .entity-filter-input,
        .favorite-filter-input {
          min-width: 0;
          width: 100%;
          height: 44px;
          padding: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--primary-text-color);
          font: inherit;
          font-size: 15px;
        }

        .entity-filter-input::placeholder,
        .favorite-filter-input::placeholder {
          color: var(--secondary-text-color);
          opacity: 1;
        }

        .entity-filter-empty,
        .favorite-filter-empty {
          padding: 4px 18px 16px;
          color: var(--secondary-text-color);
          font-size: 13px;
        }

        /* Author display rules must not override the hidden attribute. */
        .entity-config-row[hidden],
        .entity-area[data-entity-area][hidden],
        .entity-filter-empty[hidden],
        .favorite-config-row[hidden],
        .entity-area[data-favorite-area][hidden],
        .favorite-filter-empty[hidden] {
          display: none !important;
        }

        .toolbar {
          display: flex;
          gap: 8px;
          padding: 0 16px 12px;
        }
        .toolbar button {
          border: 0;
          border-radius: 10px;
          padding: 8px 12px;
          cursor: pointer;
          background: var(
            --secondary-background-color,
            rgba(127,127,127,.12)
          );
          color: var(--primary-text-color);
          font: inherit;
        }
        .custom-pages-list {
          display: grid;
          gap: 12px;
          padding: 0 16px 16px;
        }
        .custom-page {
          display: grid;
          gap: 12px;
          padding: 14px;
          border: 1px solid var(--divider-color, rgba(127,127,127,.18));
          border-radius: 13px;
          background: var(--secondary-background-color, rgba(127,127,127,.08));
        }
        .custom-page-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .custom-page-remove {
          border: 0;
          background: transparent;
          color: var(--error-color, #db4437);
          cursor: pointer;
          font: inherit;
        }
        .custom-page-field {
          display: grid;
          gap: 5px;
          color: var(--secondary-text-color);
          font-size: 12px;
        }
        .custom-page-field input,
        .custom-page-field textarea {
          box-sizing: border-box;
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--divider-color, rgba(127,127,127,.22));
          border-radius: 10px;
          outline: 0;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font: inherit;
        }
        .custom-page-field textarea {
          resize: vertical;
          font-family: var(--code-font-family, monospace);
        }
        .custom-page-field input:focus,
        .custom-page-field textarea:focus {
          border-color: var(--primary-color, #03a9f4);
        }
        .custom-page-error {
          color: var(--error-color, #db4437);
          font-size: 12px;
        }
        .custom-page-yaml {
          display: block;
          min-height: 220px;
          --code-mirror-max-height: 55vh;
        }
        .rows {
          border-top: 1px solid var(
            --divider-color,
            rgba(127,127,127,.18)
          );
        }
        .row {
          min-height: 58px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 10px 18px;
          border-bottom: 1px solid var(
            --divider-color,
            rgba(127,127,127,.12)
          );
          cursor: pointer;
        }
        .row:last-child {
          border-bottom: 0;
        }
        .row.blocked {
          opacity: .48;
          cursor: default;
        }
        .person-entity-select,
        .power-sensor-select {
          width: min(260px, 46%);
          min-width: 150px;
          min-height: 38px;
          box-sizing: border-box;
          padding: 7px 34px 7px 10px;
          border: 1px solid var(
            --divider-color,
            rgba(127,127,127,.28)
          );
          border-radius: 10px;
          background: var(
            --card-background-color,
            var(--ha-card-background)
          );
          color: var(--primary-text-color);
          font: inherit;
        }
        .area {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .area-icon {
          width: 22px;
          height: 22px;
          color: var(--secondary-text-color);
        }
        .drag-handle {
          width: 24px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--secondary-text-color);
          cursor: grab;
          opacity: .72;
        }
        .drag-handle ha-icon {
          width: 22px;
          height: 22px;
        }
        .area-config-row.dragging {
          opacity: .42;
        }
        .area-config-row.drag-over {
          box-shadow:
            inset 0 2px 0
            var(--primary-color, #03a9f4);
        }
        .blocked .drag-handle {
          cursor: default;
          opacity: .18;
        }
        .copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .name {
          font-size: 15px;
          font-weight: 500;
        }
        .desc {
          color: var(--secondary-text-color);
          font-size: 12px;
          line-height: 1.3;
        }
        input[type="checkbox"] {
          width: 20px;
          height: 20px;
          flex: 0 0 auto;
          accent-color: var(--primary-color, #03a9f4);
          cursor: pointer;
        }
        .loading {
          padding: 20px 18px;
          color: var(--secondary-text-color);
        }

        .entity-area {
          border-top: 1px solid var(
            --divider-color,
            rgba(127,127,127,.14)
          );
        }

        .entity-area:first-child {
          border-top: 0;
        }

        .entity-area summary {
          min-height: 54px;
          padding: 10px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          cursor: pointer;
          user-select: none;
          list-style: none;
        }

        .entity-area summary::-webkit-details-marker {
          display: none;
        }

        .entity-area summary::marker {
          content: "";
        }

        .entity-summary-main,
        .entity-summary-end {
          display: flex;
          align-items: center;
        }

        .entity-summary-main {
          min-width: 0;
          gap: 10px;
          font-weight: 600;
        }

        .entity-summary-end {
          gap: 8px;
          flex: 0 0 auto;
        }

        .entity-area summary ha-icon {
          width: 20px;
          height: 20px;
          color: var(--primary-color);
        }

        .entity-chevron {
          color: var(--secondary-text-color) !important;
          transition: transform 160ms ease;
        }

        .entity-area[open] .entity-chevron {
          transform: rotate(90deg);
        }

        .entity-count {
          color: var(--secondary-text-color);
          font-size: 12px;
        }

        .entity-rows {
          border-top: 1px solid var(
            --divider-color,
            rgba(127,127,127,.10)
          );
        }

        .entity-row {
          min-height: 68px;
          padding: 10px 18px 10px 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          border-bottom: 1px solid var(
            --divider-color,
            rgba(127,127,127,.10)
          );
        }

        .entity-row:last-child {
          border-bottom: 0;
        }

        .entity-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .entity-name {
          font-size: 14px;
          font-weight: 550;
        }

        .entity-status-line {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 2px;
        }

        .entity-status {
          display: inline-flex;
          align-items: center;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.25;
        }


        .entity-status.visible {
          color: #30D158;
        }

        .entity-status.hidden {
          color: var(--secondary-text-color);
        }

        .entity-mode {
          color: var(--secondary-text-color);
          font-size: 11px;
          line-height: 1.25;
        }

        .entity-meta,
        .entity-id {
          color: var(--secondary-text-color);
          font-size: 11px;
          line-height: 1.25;
          overflow-wrap: anywhere;
        }

        .entity-visibility {
          min-width: 112px;
          flex: 0 0 auto;
          padding: 7px 8px;
          border-radius: 9px;
          border: 1px solid var(
            --divider-color,
            rgba(127,127,127,.22)
          );
          background: var(
            --secondary-background-color,
            rgba(127,127,127,.10)
          );
          color: var(--primary-text-color);
          font: inherit;
        }

        .entity-empty {
          padding: 16px 18px 16px 48px;
          color: var(--secondary-text-color);
          font-size: 13px;
        }

        @media (max-width: 600px) {
          .entity-row {
            padding-left: 18px;
            align-items: flex-start;
          }

          .entity-visibility {
            min-width: 102px;
          }
        }
      </style>

      <div class="editor">
        <div class="editor-version">
          Atze Dashboard ${ATZE_VERSION}
        </div>

        <details
          class="panel editor-section"
          data-editor-section="rooms"
          ${this._openEditorSections.has("rooms") ? "open" : ""}
        >
          <summary>
            <span class="editor-section-summary-main">
              <ha-icon icon="mdi:floor-plan"></ha-icon>
              <span class="editor-section-summary-title">Räume</span>
            </span>
            <ha-icon
              class="editor-section-chevron"
              icon="mdi:chevron-right"
            ></ha-icon>
          </summary>

          <div class="editor-section-body">
            <div class="editor-section-help">
              Wähle aus, welche Bereiche angezeigt werden.
              Ziehe Räume am Griff nach oben oder unten, um ihre
              Reihenfolge zu ändern. Bereiche mit
              <b>no-strategy</b> oder <b>no-dboard</b> bleiben
              immer ausgeblendet.
            </div>

            <div class="toolbar">
              <button id="select-all" type="button">Alle</button>
              <button id="select-none" type="button">Keine</button>
              <button id="reset-order" type="button">
                Reihenfolge zurücksetzen
              </button>
            </div>

            <div class="rows">
              ${this._loading
                ? '<div class="loading">Bereiche werden geladen …</div>'
                : (
                    areaRows ||
                    '<div class="loading">Keine Bereiche gefunden.</div>'
                  )}
            </div>
          </div>
        </details>

        <details
          class="panel editor-section"
          data-editor-section="custom-pages"
          ${this._openEditorSections.has("custom-pages") ? "open" : ""}
        >
          <summary>
            <span class="editor-section-summary-main">
              <ha-icon icon="mdi:card-multiple-outline"></ha-icon>
              <span class="editor-section-summary-title">Eigene Seiten</span>
            </span>
            <ha-icon class="editor-section-chevron" icon="mdi:chevron-right"></ha-icon>
          </summary>

          <div class="editor-section-body">
            <div class="editor-section-help">
              Lege zusätzliche Dashboard-Seiten an oder kopiere die YAML einer
              vorhandenen Ansicht hinein. Verwende den Inhalt einer einzelnen
              Ansicht mit title, path und cards oder sections – ohne den äußeren
              Schlüssel views. Eigene Seiten erscheinen in der Navigation.
            </div>
            <div class="toolbar">
              <button id="add-custom-page" type="button">Leere Seite</button>
            </div>
            <div class="custom-pages-list">
              ${customPagesHtml || '<div class="loading">Noch keine eigene Seite angelegt.</div>'}
            </div>
          </div>
        </details>

        <details
          class="panel editor-section"
          data-editor-section="entities"
          ${this._openEditorSections.has("entities") ? "open" : ""}
        >
          <summary>
            <span class="editor-section-summary-main">
              <ha-icon icon="mdi:format-list-checks"></ha-icon>
              <span class="editor-section-summary-title">
                Entitäten pro Raum
              </span>
            </span>
            <ha-icon
              class="editor-section-chevron"
              icon="mdi:chevron-right"
            ></ha-icon>
          </summary>

          <div class="editor-section-body">
            <div class="editor-section-help">
              Auto zeigt nur typische Bedienelemente und sinnvolle
              Sicherheits-Sensoren. Sensorwerte, Diagnose-Entities,
              Regler und Konfiguration bleiben standardmäßig in
              Badges, Popups oder Wartung. Mit Anzeigen oder
              Ausblenden kannst du jede Entity gezielt überschreiben.
            </div>

            <div class="rows">
              ${this._toggleHtml(
                "strict_room_entity_auto",
                "Strenge automatische Auswahl",
                "Empfohlen: technische Sensoren werden nicht als eigene Raumkarten angezeigt.",
                true
              )}
              ${this._toggleHtml(
                "hide_unavailable",
                "Nicht verfügbare Entitäten ausblenden",
                "Deaktivierte, entfernte oder nicht verfügbare Entitäten werden nicht als Raumkarten angezeigt.",
                false
              )}
            </div>

            <div class="entity-filter-wrap">
              <ha-icon icon="mdi:magnify"></ha-icon>
              <input
                class="entity-filter-input"
                type="search"
                inputmode="search"
                autocomplete="off"
                placeholder="Entität suchen …"
                aria-label="Entitäten pro Raum durchsuchen"
                value="${this._escape(this._entityFilter)}"
              />
            </div>

            <div class="entity-filter-empty" hidden>
              Keine passende Entität gefunden.
            </div>

            <div class="entity-area-list">
              ${this._loading
                ? '<div class="loading">Entities werden geladen …</div>'
                : (
                    entityAreaPanels ||
                    '<div class="loading">Keine ausgewählten Räume gefunden.</div>'
                  )}
            </div>
          </div>
        </details>

        <details
          class="panel editor-section"
          data-editor-section="favorites"
          ${this._openEditorSections.has("favorites") ? "open" : ""}
        >
          <summary>
            <span class="editor-section-summary-main">
              <ha-icon icon="mdi:star-outline"></ha-icon>
              <span class="editor-section-summary-title">
                Favoriten
              </span>
            </span>
            <ha-icon
              class="editor-section-chevron"
              icon="mdi:chevron-right"
            ></ha-icon>
          </summary>

          <div class="editor-section-body">
            <div class="editor-section-help">
              Wähle die Entitäten aus, die auf der Startseite zwischen
              den sechs Statuskacheln und den Raum-Bildern erscheinen sollen.
              Bedienelemente lassen sich dort direkt schalten; Sensoren und
              weitere Entitäten öffnen ihre Detailansicht.
            </div>

            <div class="favorite-filter-wrap">
              <ha-icon icon="mdi:magnify"></ha-icon>
              <input
                class="favorite-filter-input"
                type="search"
                inputmode="search"
                autocomplete="off"
                placeholder="Entität suchen …"
                aria-label="Favoriten-Entitäten durchsuchen"
                value="${this._escape(this._favoriteFilter)}"
              />
            </div>

            <div class="favorite-filter-empty" hidden>
              Keine passende Entität gefunden.
            </div>

            <div class="entity-area-list">
              ${this._loading
                ? '<div class="loading">Entities werden geladen …</div>'
                : (
                    favoriteAreaPanels ||
                    '<div class="loading">Keine ausgewählten Räume gefunden.</div>'
                  )}
            </div>
          </div>
        </details>

        <details
          class="panel editor-section"
          data-editor-section="people"
          ${this._openEditorSections.has("people") ? "open" : ""}
        >
          <summary>
            <span class="editor-section-summary-main">
              <ha-icon icon="mdi:account-group-outline"></ha-icon>
              <span class="editor-section-summary-title">
                Personen / Anwesenheit
              </span>
            </span>
            <ha-icon
              class="editor-section-chevron"
              icon="mdi:chevron-right"
            ></ha-icon>
          </summary>

          <div class="editor-section-body">
            <div class="editor-section-help">
              Bis zu drei Personen werden unter dem großen Profil auf
              der Startseite angezeigt. Zuhause erscheint das normale
              Profilbild, bei Abwesenheit wird es rot dargestellt.
            </div>
            <div class="rows">
              ${this._personSelectHtml(0)}
              ${this._personSelectHtml(1)}
              ${this._personSelectHtml(2)}
            </div>
          </div>
        </details>

        <details
          class="panel editor-section"
          data-editor-section="home-status"
          ${this._openEditorSections.has("home-status") ? "open" : ""}
        >
          <summary>
            <span class="editor-section-summary-main">
              <ha-icon icon="mdi:home-lightning-bolt-outline"></ha-icon>
              <span class="editor-section-summary-title">
                Startseite / Status
              </span>
            </span>
            <ha-icon
              class="editor-section-chevron"
              icon="mdi:chevron-right"
            ></ha-icon>
          </summary>

          <div class="editor-section-body">
            <div class="editor-section-help">
              Lege fest, welcher Leistungssensor für die Strom-Kachel
              verwendet wird. Ist der Sensor nicht verfügbar, wird die
              Kachel automatisch ausgeblendet.
            </div>
            <div class="rows">
              ${this._powerSensorSelectHtml()}
            </div>
          </div>
        </details>

        <details
          class="panel editor-section"
          data-editor-section="views"
          ${this._openEditorSections.has("views") ? "open" : ""}
        >
          <summary>
            <span class="editor-section-summary-main">
              <ha-icon icon="mdi:view-dashboard-outline"></ha-icon>
              <span class="editor-section-summary-title">Ansichten</span>
            </span>
            <ha-icon
              class="editor-section-chevron"
              icon="mdi:chevron-right"
            ></ha-icon>
          </summary>

          <div class="editor-section-body">
            <div class="rows">
              ${this._toggleHtml(
                "home_view",
                "Startseite anzeigen",
                "Zuhause-Übersicht mit Statuskarten und Räumen.",
                true
              )}
              ${this._toggleHtml(
                "security_view",
                "Sicherheit anzeigen",
                "Labelbasierte Sicherheitsansicht.",
                true
              )}
              ${this._toggleHtml(
                "maintenance_view",
                "Wartung anzeigen",
                "Batterie- und Wartungsansicht.",
                true
              )}
              ${this._toggleHtml(
                "single_room_navigation",
                "Räume als Unterseiten",
                "Raumansichten als Subviews öffnen.",
                true
              )}
            </div>
          </div>
        </details>

        <details
          class="panel editor-section"
          data-editor-section="display"
          ${this._openEditorSections.has("display") ? "open" : ""}
        >
          <summary>
            <span class="editor-section-summary-main">
              <ha-icon icon="mdi:tune-variant"></ha-icon>
              <span class="editor-section-summary-title">Darstellung</span>
            </span>
            <ha-icon
              class="editor-section-chevron"
              icon="mdi:chevron-right"
            ></ha-icon>
          </summary>

          <div class="editor-section-body">
            <div class="rows">
              <label class="row">
                <span class="copy">
                  <span class="name">Zeitpläne</span>
                  <span class="desc">Zeigt auf der Startseite einen Button, der ein Bubble-Popup mit Scheduler Card öffnet.</span>
                </span>
                <input
                  class="setting-toggle"
                  type="checkbox"
                  data-key="scheduler_popup"
                  data-default="false"
                  ${this._schedulerPopupEnabled() ? "checked" : ""}
                />
              </label>
              <label class="row">
                <span class="copy">
                  <span class="name">Lichtsteuerung</span>
                  <span class="desc">
                    Öffnet die Lichtsteuerung in einem Bubble-Popup und legt fehlende Helfer automatisch an.
                    ${this._lightHelperSetupMessage
                      ? `<br><b>${this._escape(this._lightHelperSetupMessage)}</b>`
                      : ""}
                  </span>
                </span>
                <input
                  class="setting-toggle"
                  type="checkbox"
                  data-key="light_control_popup"
                  data-default="false"
                  ${this._lightControlPopupEnabled() ? "checked" : ""}
                  ${this._lightHelperSetupState === "loading" ? "disabled" : ""}
                />
              </label>
              ${this._toggleHtml(
                "force_kiosk",
                "Header ausblenden",
                "Atze-Kiosk-Fallback mit Sidebar-Menüknopf.",
                false
              )}
              ${this._toggleHtml(
                "clock_kiosk_toggle",
                "Kiosk über Uhrzeit umschalten",
                "Tippen auf die Uhrzeit blendet den Home-Assistant-Header ein oder aus.",
                true
              )}
              ${this._toggleHtml(
                "hide_scrollbar",
                "Scrollbalken ausblenden",
                "Scrollen bleibt möglich.",
                true
              )}
            </div>
          </div>
        </details>
      </div>
    `;

    for (
      const details of
        this.shadowRoot.querySelectorAll(
          ".editor-section[data-editor-section]"
        )
    ) {
      details.addEventListener(
        "toggle",
        () => {
          const sectionId =
            details.dataset.editorSection;

          if (!sectionId) return;

          if (details.open) {
            this._openEditorSections.add(sectionId);
          } else {
            this._openEditorSections.delete(sectionId);
          }
        }
      );
    }

    this.shadowRoot
      .querySelector("#select-all")
      ?.addEventListener("click", () =>
        this._selectAllAreas()
      );

    this.shadowRoot
      .querySelector("#select-none")
      ?.addEventListener("click", () =>
        this._selectNoAreas()
      );

    this.shadowRoot
      .querySelector("#reset-order")
      ?.addEventListener("click", () =>
        this._resetAreaOrder()
      );

    this.shadowRoot
      .querySelector("#add-custom-page")
      ?.addEventListener("click", () =>
        this._addCustomPage("empty")
      );

    for (const button of this.shadowRoot.querySelectorAll(".custom-page-remove")) {
      button.addEventListener("click", () => {
        this._removeCustomPage(Number(button.dataset.index));
      });
    }

    for (const field of this.shadowRoot.querySelectorAll(".custom-page-yaml")) {
      const beginInteraction = () =>
        this._beginEntityVisibilityInteraction();
      const index = Number(field.dataset.index);
      const commitPendingValue = () => {
        const value = this._pendingCustomPageValues.get(index);
        if (!value) return;

        this._pendingCustomPageValues.delete(index);
        this._updateCustomPage(index, value);
      };

      field.addEventListener("pointerdown", beginInteraction);
      field.addEventListener("focusin", beginInteraction);
      field.addEventListener("focusout", () => {
        window.setTimeout(() => {
          if (field.matches(":focus-within")) return;
          commitPendingValue();
          this._endEntityVisibilityInteraction();
        }, 100);
      });

      field.addEventListener("value-changed", (event) => {
        event.stopPropagation();
        const value = event.detail?.value;

        if (
          event.detail?.isValid &&
          value &&
          typeof value === "object" &&
          !Array.isArray(value)
        ) {
          this._pendingCustomPageValues.set(index, value);
        }
      });

      field.addEventListener("editor-save", commitPendingValue);

      const page = this._customPages()[index];
      const value = this._customPageView(page, index);
      const initialize = () => field.setValue?.(value);

      if (customElements.get("ha-yaml-editor")) initialize();
      else customElements.whenDefined("ha-yaml-editor").then(initialize);
    }

    for (
      const row of
        this.shadowRoot.querySelectorAll(
          ".area-config-row[draggable='true']"
        )
    ) {
      row.addEventListener("dragstart", (event) => {
        const areaId = row.dataset.areaRow;
        this._draggedAreaId = areaId || null;
        row.classList.add("dragging");

        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData(
            "text/plain",
            areaId || ""
          );
        }
      });

      row.addEventListener("dragend", () => {
        this._draggedAreaId = null;

        for (
          const item of
            this.shadowRoot.querySelectorAll(
              ".area-config-row"
            )
        ) {
          item.classList.remove(
            "dragging",
            "drag-over"
          );
        }
      });

      row.addEventListener("dragover", (event) => {
        event.preventDefault();

        if (
          this._draggedAreaId &&
          this._draggedAreaId !== row.dataset.areaRow
        ) {
          row.classList.add("drag-over");

          if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "move";
          }
        }
      });

      row.addEventListener("dragleave", () => {
        row.classList.remove("drag-over");
      });

      row.addEventListener("drop", (event) => {
        event.preventDefault();
        row.classList.remove("drag-over");

        const dragged =
          this._draggedAreaId ||
          event.dataTransfer?.getData("text/plain");

        this._moveArea(
          dragged,
          row.dataset.areaRow
        );
      });
    }

    for (const input of this.shadowRoot.querySelectorAll(".area-toggle")) {
      input.addEventListener("change", (event) => {
        const target = event.currentTarget;
        this._setArea(
          target.dataset.areaId,
          target.checked
        );
      });
    }

    for (
      const details of
        this.shadowRoot.querySelectorAll(
          ".entity-area[data-entity-area], .entity-area[data-favorite-area]"
        )
    ) {
      details.addEventListener(
        "toggle",
        () => {
          const areaId =
            details.dataset.entityArea ||
            details.dataset.favoriteArea;

          if (!areaId) return;

          if (details.open) {
            this._openEntityAreaIds.add(areaId);
          } else {
            this._openEntityAreaIds.delete(areaId);
          }
        }
      );
    }

    for (
      const select of
        this.shadowRoot.querySelectorAll(
          ".entity-visibility"
        )
    ) {
      const beginInteraction = () =>
        this._beginEntityVisibilityInteraction();

      select.addEventListener(
        "pointerdown",
        beginInteraction
      );

      select.addEventListener(
        "focus",
        beginInteraction
      );

      select.addEventListener(
        "blur",
        () => this._endEntityVisibilityInteraction()
      );

      select.addEventListener(
        "change",
        (event) => {
          const target = event.currentTarget;
          const areaDetails = target.closest(
            ".entity-area[data-entity-area]"
          );
          const areaId =
            areaDetails?.dataset?.entityArea;

          if (areaDetails?.open && areaId) {
            this._openEntityAreaIds.add(areaId);
          }

          this._entityVisibilityActive = false;
          this._pendingHassRender = false;

          this._setEntityVisibility(
            target.dataset.entityId,
            target.value
          );
        }
      );
    }

    const powerSensorSelect =
      this.shadowRoot.querySelector(
        ".power-sensor-select"
      );

    if (powerSensorSelect) {
      const beginInteraction = () =>
        this._beginEntityVisibilityInteraction();

      powerSensorSelect.addEventListener(
        "pointerdown",
        beginInteraction
      );
      powerSensorSelect.addEventListener(
        "focus",
        beginInteraction
      );
      powerSensorSelect.addEventListener(
        "blur",
        () => this._endEntityVisibilityInteraction()
      );
      powerSensorSelect.addEventListener(
        "change",
        (event) => {
          this._entityVisibilityActive = false;
          this._pendingHassRender = false;
          this._setHomePowerEntity(
            event.currentTarget.value
          );
        }
      );
    }

    for (
      const select of
        this.shadowRoot.querySelectorAll(
          ".person-entity-select"
        )
    ) {
      const beginInteraction = () =>
        this._beginEntityVisibilityInteraction();

      select.addEventListener(
        "pointerdown",
        beginInteraction
      );
      select.addEventListener(
        "focus",
        beginInteraction
      );
      select.addEventListener(
        "blur",
        () => this._endEntityVisibilityInteraction()
      );
      select.addEventListener("change", (event) => {
        const target = event.currentTarget;
        this._entityVisibilityActive = false;
        this._pendingHassRender = false;
        this._setHomePerson(
          Number(target.dataset.personIndex),
          target.value
        );
      });
    }

    for (const input of this.shadowRoot.querySelectorAll(".setting-toggle")) {
      input.addEventListener("change", (event) => {
        const target = event.currentTarget;

        if (target.dataset.key === "scheduler_popup") {
          this._setSchedulerPopup(target.checked);
          return;
        }

        if (target.dataset.key === "light_control_popup") {
          this._setLightControlPopup(target.checked);
          return;
        }

        this._setBoolean(
          target.dataset.key,
          target.checked,
          target.dataset.default === "true"
        );
      });
    }

    for (
      const input of
        this.shadowRoot.querySelectorAll(".favorite-toggle")
    ) {
      input.addEventListener("change", (event) => {
        const target = event.currentTarget;
        this._setFavoriteEntity(
          target.dataset.entityId,
          target.checked
        );
      });
    }

    const entityFilter = this.shadowRoot.querySelector(
      ".entity-filter-input"
    );

    if (entityFilter) {
      entityFilter.addEventListener(
        "focus",
        () => this._beginEntityVisibilityInteraction()
      );

      entityFilter.addEventListener(
        "blur",
        () => this._endEntityVisibilityInteraction()
      );

      entityFilter.addEventListener("input", (event) => {
        this._entityFilter = event.currentTarget.value;
        this._applyEntityFilter();
      });
    }

    const favoriteFilter = this.shadowRoot.querySelector(
      ".favorite-filter-input"
    );

    if (favoriteFilter) {
      favoriteFilter.addEventListener(
        "focus",
        () => this._beginEntityVisibilityInteraction()
      );

      favoriteFilter.addEventListener(
        "blur",
        () => this._endEntityVisibilityInteraction()
      );

      favoriteFilter.addEventListener("input", (event) => {
        this._favoriteFilter = event.currentTarget.value;
        this._applyFavoriteFilter();
      });
    }

    this._applyEntityFilter();
    this._applyFavoriteFilter();
  }
}

if (!customElements.get("atze-dashboard-strategy-editor")) {
  customElements.define(
    "atze-dashboard-strategy-editor",
    AtzeDashboardStrategyEditor
  );
}


const strategyElement = `ll-strategy-dashboard-${STRATEGY_TYPE}`;

if (!customElements.get(strategyElement)) {
  customElements.define(strategyElement, AtzeDashboardStrategy);
}

window.customStrategies = window.customStrategies || [];

const atzeStrategyRegistration = {
  type: STRATEGY_TYPE,
  strategyType: "dashboard",
  name: "Atze Dashboard",
  description:
    "Automatisches, flexibel anpassbares Area-Dashboard mit Bubble-Card-Unterstützung.",
};

const existingAtzeStrategy = window.customStrategies.find(
  (entry) =>
    entry.type === STRATEGY_TYPE &&
    entry.strategyType === "dashboard"
);

if (existingAtzeStrategy) {
  Object.assign(
    existingAtzeStrategy,
    atzeStrategyRegistration
  );
} else {
  window.customStrategies.push(
    atzeStrategyRegistration
  );
}

console.info(
  `%c ATZE-DASHBOARD %c v${ATZE_VERSION} `,
  "background:#03a9f4;color:white;font-weight:700;padding:2px 6px;border-radius:4px 0 0 4px;",
  "background:#263238;color:white;padding:2px 6px;border-radius:0 4px 4px 0;"
);
