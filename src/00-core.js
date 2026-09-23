/**
 * Atze Dashboard Strategy
 * Version source: ATZE_VERSION below
 *
 * v0.159 focus:
 * - Split the source into maintainable build modules
 *
 * License: MIT
 */

const ATZE_VERSION = "0.235.0";
const STRATEGY_TYPE = "atze-dashboard";

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
      --bubble-border: 0 !important;
      --bubble-box-shadow: none !important;
      border: 0 !important;
      box-shadow: none !important;
      overflow: hidden !important;
    }

    /* Give all standard room cards 4 px more vertical space. */
    ha-card,
    .bubble-button-card-container,
    .bubble-media-player-container,
    .bubble-climate-container,
    .bubble-select-card-container,
    .bubble-cover-card-container,
    .bubble-cover-container {
      min-height: ${compact ? "56px" : "64px"} !important;
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
          ? (config.climate_card_layout || config.apple_card_layout || "large")
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
    if (domainOf(entityId) === "light") {
      // Keep light cards clean in room views: no three-dot popup button.
      // The popup mapping itself remains intact for future/other navigation.
    } else if (domainOf(entityId) === "climate") {
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
  const hasExplicitOrder = Number.isFinite(Number(override.order));
  const order = hasExplicitOrder
    ? Number(override.order)
    : 1000;

  const name = displayName(hass, entity, config, area).toLowerCase();

  // Lights whose name/entity id contains Decke, Haupt or Main are shown first.
  // An explicit entity_overrides.order always keeps the highest priority.
  const lightPriority =
    !hasExplicitOrder &&
    domainOf(entity.entity_id) === "light" &&
    /(^|[\\s._-])(decke|haupt|main)([\\s._-]|$)/i.test(
      `${name} ${entity.entity_id}`
    )
      ? 0
      : 1;

  return { order, lightPriority, name };
}

function compareEntities(hass, config, area) {
  return (a, b) => {
    const aa = entityOrder(hass, a, config, area);
    const bb = entityOrder(hass, b, config, area);

    if (aa.order !== bb.order) return aa.order - bb.order;
    if (aa.lightPriority !== bb.lightPriority) {
      return aa.lightPriority - bb.lightPriority;
    }
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
      windowState.badge.atze_badge_group = "window";
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
      rollerShutterState.badge.atze_badge_group = "roller_shutter";
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

  // Lights always use a two-column grid in room views.
  // Keep Bubble pop-ups outside the inner grid so they stay invisible until opened.
  if (groupKey === "light") {
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
          columns: 2,
          square: false,
          cards: visibleCards,
        },
        ...popupCards,
      ],
    };
  }

  // Switches are sorted directly in the room view. The custom grid stores
  // the chosen order per room in the browser and applies it immediately.
  if (groupKey !== "technik") {
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
          type: "custom:atze-sortable-switch-grid",
          area_id: area.area_id,
          group_key: groupKey,
          // Preserve the layout from before direct drag & drop:
          // regular room groups remain one-column; compact groups keep their
          // configured column count. Lights use their dedicated 2-column path.
          columns: compact ? columns : 1,
          cards: visibleCards,
        },
        ...popupCards,
      ],
    };
  }

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
      .slice(0, 5),
    hacs_update_entities:
      selectHacsUpdateEntities(hass, usableEntities),
    home_assistant_update_entity:
      config.home_assistant_update_entity ||
      "binary_sensor.home_assistant_update_verfugbar",
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
      ...customPageLinks,
    ],
    scheduler_popup: showSchedulerPopup,
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
    cards: showSchedulerPopup
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

function buildCustomPageViews(config) {
  const usedPaths = new Set([
    config.home_path || "home",
    config.security_path || "sicherheit",
    config.maintenance_path || "wartung",
  ]);

  return asArray(config.custom_pages)
    .filter((page) => !isSchedulerCustomPage(page))
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

  const roomImageKey =
    defaultHomeRoomImageKey(area, DEFAULT_HOME_ROOM_IMAGES);
  const roomLightImageKey =
    defaultHomeRoomImageKey(area, DEFAULT_HOME_ROOM_LIGHT_IMAGES);
  const hasRoomHeaderImage =
    Boolean(roomImageKey && DEFAULT_HOME_ROOM_IMAGES[roomImageKey]);
  const roomLightEntities = entities
    .filter((entity) => domainOf(entity.entity_id) === "light")
    .map((entity) => entity.entity_id);
  const roomLightsOn = roomLightEntities.some(
    (entityId) => hass.states?.[entityId]?.state === "on"
  );
  const roomHeaderImage =
    hasRoomHeaderImage
      ? (
          roomLightsOn
            ? DEFAULT_HOME_ROOM_LIGHT_IMAGES[roomLightImageKey] ||
              DEFAULT_HOME_ROOM_IMAGES[roomImageKey]
            : DEFAULT_HOME_ROOM_IMAGES[roomImageKey]
        )
      : undefined;

  const roomHeaderCard =
    config.room_home_button === false
      ? undefined
      : {
          type: "custom:atze-room-nav-header",
          icon: "mdi:home",
          area_name: areaName,
          navigation_path: roomHomePath,
          hide_home_icon: hasRoomHeaderImage,
          ...(hasRoomHeaderImage
            ? {
                light_entities: roomLightEntities,
                dark_image: DEFAULT_HOME_ROOM_IMAGES[roomImageKey],
                light_image:
                  DEFAULT_HOME_ROOM_LIGHT_IMAGES[roomLightImageKey] ||
                  DEFAULT_HOME_ROOM_IMAGES[roomImageKey],
              }
            : {}),
          ...(roomHeaderImage ? { background_image: roomHeaderImage } : {}),
          ...(hasRoomHeaderImage ? { overlay_badges: badgeSelection.badges } : {}),
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
    badges: hasRoomHeaderImage ? [] : badgeSelection.badges,
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

  const enabled = false;

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
