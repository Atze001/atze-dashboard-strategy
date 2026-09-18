/**
 * Atze Dashboard Strategy
 * Version: 0.98.0
 *
 * v0.98 focus:
 * - Switch room views to strict automatic entity selection
 * - Add Auto / Anzeigen / Ausblenden overrides per entity
 * - Add per-room entity controls to the graphical strategy editor
 *
 * License: MIT
 */

const ATZE_VERSION = "0.98.0";
const STRATEGY_TYPE = "atze-dashboard";

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
    .bubble-cover-card-container,
    .bubble-cover-container,
    .bubble-select-card-container {
      background-color: rgba(44,44,46,0.92) !important;
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
        ...base,
        card_type: "button",
        button_type: "state",

        // Display only the opening percentage as the secondary line.
        show_state: false,
        show_attribute: true,
        attribute: "current_position",

        // Custom icon handling below owns open / stop / close.
        tap_action: {
          action: "none",
        },
        double_tap_action: {
          action: "none",
        },
        hold_action: {
          action: "none",
        },

        // The remaining card surface always opens Home Assistant More Info.
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

    case "climate":
      return { ...base, card_type: "climate" };

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
    const nativeRows = Number(
      options.compact
        ? (override.rows ?? config.apple_compact_rows ?? 1)
        : (override.rows ?? config.apple_card_rows ?? 1)
    );

    const normalizedRows =
      Number.isFinite(nativeRows) && nativeRows > 0
        ? nativeRows
        : 1;

    card.card_layout =
      override.card_layout ||
      config.apple_card_layout ||
      "large";

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

    if (domainOf(entityId) === "cover") {
      appendBubbleStyle(
        card,
        appleHomeCoverControlStyle(entityId)
      );
    }

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
    } else {
      card.sub_button = [settingsButton];
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

const DEFAULT_HOME_ROOM_IMAGES = {
  kuche: new URL("kueche.jpg", ATZE_ASSET_BASE_URL).href,
  schlafzimmer: new URL("schlafzimmer.jpg", ATZE_ASSET_BASE_URL).href,
  bad: new URL("bad.jpg", ATZE_ASSET_BASE_URL).href,
  flur: new URL("flur.jpg", ATZE_ASSET_BASE_URL).href,
  wohnzimmer: new URL("wohnzimmer.jpg", ATZE_ASSET_BASE_URL).href,
  buro: new URL("buro.jpg", ATZE_ASSET_BASE_URL).href,
  balkon: new URL("balkon.jpg", ATZE_ASSET_BASE_URL).href,
};

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

function selectHomeBaseStatusEntity(
  hass,
  usableEntities,
  config
) {
  if (
    config.home_homebase_entity &&
    hass.states[config.home_homebase_entity]
  ) {
    return config.home_homebase_entity;
  }

  const candidates = usableEntities
    .filter((entity) => hass.states[entity.entity_id])
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

      // Prefer a sensor carrying the actual current mode over a selector.
      if (domain === "sensor") score += 100;
      if (domain === "select") score += 40;

      return { entity, score };
    })
    .filter((entry) => entry.score >= 180)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.entity.entity_id || null;
}


function matchingNoStrategyLabelIds(labels, config) {
  const needle = normalizedText(
    config.no_strategy_label || "no-strategy"
  );

  if (!needle) return new Set();

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

        return name === needle || id === needle;
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
  const needle = normalizedText(
    config.no_strategy_label || "no-strategy"
  );

  const assignedLabels = [
    ...asArray(area?.labels),
    ...asArray(area?.label_ids),
  ];

  return assignedLabels.some((labelId) => {
    const raw = String(labelId || "");

    return (
      noStrategyLabelIds.has(raw) ||
      normalizedText(raw) === needle
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

  if (value >= 80) return "good";
  if (value >= 30) return "warning";
  return "critical";
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

  const maintenanceGroups = [...groups.values()]
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
    title: config.maintenance_title || "Wartung",
    path: config.maintenance_path || "wartung",
    icon:
      config.maintenance_icon ||
      "mdi:battery-heart-variant",
    subview: true,
    panel: true,
    cards: [
      {
        type: "custom:atze-maintenance-overview-card",
        title: config.maintenance_title || "Wartung",
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
  securityEntityIds = []
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

    const occupancy = bestBinaryEntity(
      hass,
      areaEntities,
      config,
      area,
      popupMap,
      "occupancy"
    );

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

    if (power) roomPowerEntities.push(power);
    if (occupancy) occupancyEntities.push(occupancy);
    if (windowEntity) warningEntities.push(windowEntity);
    if (rollerEntity) warningEntities.push(rollerEntity);
    if (smokeEntity) smokeEntities.push(smokeEntity);

    const configuredImage =
      override.home_image ||
      config.home_room_images?.[area.area_id];

    const defaultImage =
      DEFAULT_HOME_ROOM_IMAGES[area.area_id] || null;

    roomTiles.push({
      area_id: area.area_id,
      name,
      path,
      icon,
      image: configuredImage || defaultImage,
      temperature,
      humidity,
      power,
      occupancy,
      window_entity: windowEntity,
      roller_sensor_entity: rollerEntity,
      cover_entity: coverEntity,
      lock_entity: lockEntity,
    });

    for (const entity of areaEntities) {
      if (popupMap.childToParent.has(entity.entity_id)) continue;
      if (shouldHideExactEntity(config, entity.entity_id)) continue;

      const domain = domainOf(entity.entity_id);

      if (domain === "light") {
        lightEntities.push(entity.entity_id);
      }

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
    warning_entities: uniqueEntityIds(warningEntities),
    smoke_entities: uniqueEntityIds(smokeEntities),
    security_entities: uniqueEntityIds(securityEntityIds),
    security_path: config.security_path || "sicherheit",
    room_tiles: roomTiles,
    asset_base: config.home_asset_base || null,
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
    cards: [homeCard],
  };
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
    applyAtzeKioskQueryFallback(config);
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

      return entityHasDirectSecurityLabel(
        entity,
        securityLabelIds,
        config
      );
    });

    const securityEntityIds = securityEntities.map(
      (entity) => entity.entity_id
    );

    const batteryEntities = entities.filter((entity) => {
      const entityId = entity.entity_id;

      if (!hass.states[entityId]) return false;
      if (entity.disabled_by) return false;
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

    const views =
      config.home_view === false
        ? [
            ...(securityView ? [securityView] : []),
            ...(maintenanceView
              ? [maintenanceView]
              : []),
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
              securityEntityIds
            ),
            ...(securityView ? [securityView] : []),
            ...(maintenanceView
              ? [maintenanceView]
              : []),
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
  }

  setConfig(config) {
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
    this._startClock();
    this._render();
  }

  disconnectedCallback() {
    if (this._clockTimer) {
      clearInterval(this._clockTimer);
      this._clockTimer = null;
    }
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

  _alarmActive(stateObj) {
    if (!stateObj) return false;

    const state = String(stateObj.state || "").toLowerCase();

    return ![
      "disarmed",
      "unknown",
      "unavailable",
    ].includes(state);
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


  _roomImageCandidates(room) {
    const fileName = `${room.area_id}.jpg`;
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
      ATZE_HOME_ROOM_IMAGE_CACHE.get(room.area_id)
    );

    // 1) Generated/default room image.
    add(room.image);

    // 2) Explicit YAML asset root.
    if (this._config.asset_base) {
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
    add(new URL(fileName, ATZE_ASSET_BASE_URL).href);

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
          add(
            new URL(
              `assets/${fileName}`,
              new URL("./", resourceUrl)
            ).href
          );
        } catch (_error) {
          // Try next resource entry.
        }
      }
    } catch (_error) {
      // Fixed fallbacks below still work.
    }

    // 5) Common installation names.
    add(`/hacsfiles/atze-dashboard-strategy/assets/${fileName}`);
    add(`/local/atze-dashboard-strategy/assets/${fileName}`);
    add(`/local/atze-dashboard-strat/assets/${fileName}`);

    return candidates;
  }

  _loadRoomImage(img, room) {
    const candidates = this._roomImageCandidates(room);

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
        ATZE_HOME_ROOM_IMAGE_CACHE.get(room.area_id) ===
        currentCandidate
      ) {
        ATZE_HOME_ROOM_IMAGE_CACHE.delete(room.area_id);
      }

      loadNext();
    });

    img.addEventListener("load", () => {
      if (currentCandidate) {
        ATZE_HOME_ROOM_IMAGE_CACHE.set(
          room.area_id,
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

    return badges;
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

    const person = this._state(this._config.person_entity);
    const personPicture = this._personPicture(person);
    const personName = this._personName(person);
    const personState = this._personState(person);
    const personHome =
      String(person?.state || "").toLowerCase() === "home";

    const weather = this._state(this._config.weather_entity);
    const weatherTemperature =
      weather?.attributes?.temperature != null
        ? `${Math.round(Number(weather.attributes.temperature))} °C`
        : "—";

    const weatherText = this._weatherText(weather?.state);
    const weatherIcon = this._weatherIcon(weather?.state);

    const alarmState = this._state(this._config.alarm_entity);
    const alarmText = this._alarmText(alarmState);
    const alarmActive = this._alarmActive(alarmState);

    const homeBaseState =
      this._state(this._config.homebase_entity);

    const homeBaseText = homeBaseState
      ? this._formatted(this._config.homebase_entity)
      : "Nicht verfügbar";

    const homeBaseIcon =
      homeBaseState?.attributes?.icon ||
      "mdi:shield-home";

    const warningActive = (
      this._config.warning_entities || []
    ).some((entityId) =>
      this._isActive(this._state(entityId))
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

        const occupancyState = room.occupancy
          ? this._isActive(this._state(room.occupancy))
          : null;

        const occupancyText =
          occupancyState == null
            ? ""
            : occupancyState
              ? "Erkannt"
              : "Frei";

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
          <button
            class="room ${power ? "has-power" : ""}"
            data-path="${room.path}"
            data-area-id="${room.area_id}"
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
              power
                ? `
                  <div
                    class="room-power"
                    title="Leistung ${power}"
                    aria-label="Leistung ${power}"
                  >
                    <ha-icon icon="mdi:lightning-bolt"></ha-icon>
                    <span>${power}</span>
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
                      <span>
                        <ha-icon icon="mdi:thermometer"></ha-icon>
                        ${temp}
                      </span>
                    `
                    : ""
                }

                ${
                  humidity
                    ? `
                      <span>
                        <ha-icon icon="mdi:water-percent"></ha-icon>
                        ${humidity}
                      </span>
                    `
                    : ""
                }

                ${
                  occupancyText
                    ? `
                      <span class="room-presence ${occupancyState ? "active" : ""}">
                        <ha-icon icon="mdi:account"></ha-icon>
                        ${occupancyText}
                      </span>
                    `
                    : ""
                }
              </div>
            </div>

          </button>
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
          width: 100%;
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
          gap: 14px;
          margin-bottom: 26px;
        }

        .status {
          min-height: 92px;
          padding: 16px 18px;
          display: flex;
          align-items: center;
          gap: 13px;
          border: 1px solid var(--home-card-border);
          border-radius: 28px;
          background: var(--home-card-bg);
          color: var(--primary-text-color);
          overflow: hidden;
        }

        .status ha-icon {
          width: 38px;
          height: 38px;
          flex: 0 0 34px;
        }

        .status.weather ha-icon {
          color: var(--home-yellow);
        }

        .status.power ha-icon {
          color: var(--home-yellow);
        }

        .status.security ha-icon,
        .status.alarmo ha-icon,
        .status.homebase ha-icon {
          color: var(--home-green);
        }

        .status.security.warning ha-icon,
        .status.windows.warning ha-icon,
        .status.alarmo.warning ha-icon {
          color: var(--home-red);
        }

        .status.windows ha-icon {
          color: rgba(235,235,245,0.80);
        }

        .status-main {
          min-width: 0;
          font-size: 20px;
          font-weight: 650;
          white-space: nowrap;
        }

        #security-status,
        #alarm-status,
        #homebase-status {
          cursor: pointer;
        }

        .status-sub {
          margin-top: 3px;
          color: var(--home-muted);
          font-size: 14px;
          white-space: nowrap;
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
          position: relative;
        }

        .room.has-power .room-top {
          padding-top: 30px;
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
          color: var(--home-red);
        }

        .room-icon {
          width: 68px;
          height: 68px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(10,132,255,0.28);
          border: 1px solid rgba(10,132,255,0.64);
          backdrop-filter: blur(18px);
        }

        .room-icon ha-icon {
          width: 34px;
          height: 34px;
          color: #56A8FF;
          transform: translateX(3px);
        }

        .room-bottom {
          position: absolute;
          left: 22px;
          right: 22px;
          bottom: 18px;
        }

        .room-name {
          font-size: clamp(25px, 3.5vw, 34px);
          font-weight: 720;
          letter-spacing: -0.7px;
          text-shadow: 0 2px 10px rgba(0,0,0,0.55);
        }

        .room-meta {
          margin-top: 12px;
          display: flex;
          gap: 18px;
          align-items: center;
          flex-wrap: nowrap;
          width: 100%;
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

        .room-meta span:nth-child(2) ha-icon {
          color: #20A0FF;
        }

        .room-meta .active ha-icon {
          color: var(--home-green);
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

          .quick {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 650px) {
          .page {
            padding: 24px 14px 36px;
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
            gap: 10px;
          }

          .status {
            min-height: 76px;
            border-radius: 23px;
            padding: 13px 14px;
          }

          .status-main {
            font-size: 18px;
          }

          .status-sub {
            font-size: 12px;
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

          .room.has-power .room-top {
            padding-top: 27px;
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
            width: 29px;
            height: 29px;
          }

          .room-name {
            font-size: 27px;
          }

          .room-meta {
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
          <div class="hero">
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

            <div class="status power">
              <ha-icon icon="mdi:flash"></ha-icon>
              <div>
                <div class="status-main">${this._formatPower()}</div>
                <div class="status-sub">Gesamt</div>
              </div>
            </div>

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

            <div class="status windows ${warningActive ? "warning" : ""}">
              <ha-icon icon="${warningActive ? "mdi:window-open-variant" : "mdi:window-closed-variant"}"></ha-icon>
              <div>
                <div class="status-main">${warningActive ? "Unsicher" : "Alle zu"}</div>
                <div class="status-sub">Fenster / Rollläden</div>
              </div>
            </div>

            <div
              class="status alarmo ${alarmActive ? "warning" : ""}"
              id="alarm-status"
            >
              <ha-icon
                icon="${
                  alarmActive
                    ? "mdi:shield-lock"
                    : "mdi:shield-off-outline"
                }"
              ></ha-icon>
              <div>
                <div class="status-main">${alarmText}</div>
                <div class="status-sub">Alarmo</div>
              </div>
            </div>

            <div
              class="status homebase"
              id="homebase-status"
            >
              <ha-icon icon="${homeBaseIcon}"></ha-icon>
              <div>
                <div class="status-main">${homeBaseText}</div>
                <div class="status-sub">AtzeHomeBase</div>
              </div>
            </div>
          </div>

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
          this._loadRoomImage(img, room);
        }

        element.addEventListener(
          "click",
          () => this._navigate(element.dataset.path)
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
                    ${this._formatted(entityId)}
                  </span>
                </span>
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
          color: rgba(235,235,245,0.68);
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
    this._render();
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
  }

  set hass(value) {
    const first = !this._hass;
    this._hass = value;
    if (first || this._areas.length === 0) {
      this._loadRegistries();
    } else {
      this._render();
    }
  }

  get hass() {
    return this._hass;
  }

  setConfig(config) {
    this._config = { ...(config || {}) };
    this._render();
  }

  connectedCallback() {
    this._loadRegistries();
    this._render();
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

  _entitiesForArea(areaId) {
    if (!areaId) return [];

    const deviceById = this._deviceById();

    return (this._entities || [])
      .filter((entity) => {
        if (!entity?.entity_id) return false;
        if (entity.disabled_by) return false;
        if (isBuiltInHiddenEntity(entity.entity_id)) {
          return false;
        }
        if (
          !this._hass?.states?.[entity.entity_id]
        ) {
          return false;
        }

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
      const automatic =
        shouldAutoShowRoomEntity(
          this._hass,
          entity,
          this._config
        )
          ? "Auto: sichtbar"
          : "Auto: ausgeblendet";

      return `
        <div class="entity-row">
          <span class="entity-copy">
            <span class="entity-name">
              ${this._escape(name)}
            </span>
            <span class="entity-meta">
              ${this._escape(domain)} ·
              ${this._escape(automatic)}
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

  _render() {
    if (!this.shadowRoot) return;

    const blocked = this._blockedAreaIds();
    const selected = this._selectedAreaIds();

    const entityAreaPanels =
      this._eligibleAreas()
        .filter((area) =>
          selected.has(area.area_id)
        )
        .map((area) => `
          <details class="entity-area">
            <summary>
              <span>
                <ha-icon
                  icon="${this._escape(
                    area.icon || "mdi:home-outline"
                  )}"
                ></ha-icon>
                ${this._escape(
                  area.name || area.area_id
                )}
              </span>
              <span class="entity-count">
                ${this._entitiesForArea(area.area_id).length}
              </span>
            </summary>

            <div class="entity-rows">
              ${this._entityVisibilityRows(area)}
            </div>
          </details>
        `)
        .join("");

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
                ? '<span class="desc">Label no-strategy</span>'
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
        }

        .entity-area summary > span:first-child {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
        }

        .entity-area summary ha-icon {
          width: 20px;
          height: 20px;
          color: var(--primary-color);
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
        <section class="panel">
          <div class="header">
            <div class="title">
              <ha-icon icon="mdi:floor-plan"></ha-icon>
              <span>Räume</span>
            </div>
            <div class="help">
              Wähle aus, welche Bereiche angezeigt werden.
              Ziehe Räume am Griff nach oben oder unten, um ihre
              Reihenfolge zu ändern. Bereiche mit
              <b>no-strategy</b> bleiben immer ausgeblendet.
            </div>
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
        </section>

        <section class="panel">
          <div class="header">
            <div class="title">
              <ha-icon icon="mdi:format-list-checks"></ha-icon>
              <span>Entitäten pro Raum</span>
            </div>
            <div class="help">
              Auto zeigt nur typische Bedienelemente und sinnvolle
              Sicherheits-Sensoren. Sensorwerte, Diagnose-Entities,
              Regler und Konfiguration bleiben standardmäßig in
              Badges, Popups oder Wartung. Mit Anzeigen oder
              Ausblenden kannst du jede Entity gezielt überschreiben.
            </div>
          </div>

          <div class="rows">
            ${this._toggleHtml(
              "strict_room_entity_auto",
              "Strenge automatische Auswahl",
              "Empfohlen: technische Sensoren werden nicht als eigene Raumkarten angezeigt.",
              true
            )}
          </div>

          <div class="entity-area-list">
            ${this._loading
              ? '<div class="loading">Entities werden geladen …</div>'
              : (
                  entityAreaPanels ||
                  '<div class="loading">Keine ausgewählten Räume gefunden.</div>'
                )}
          </div>
        </section>

        <section class="panel">
          <div class="header">
            <div class="title">
              <ha-icon icon="mdi:view-dashboard-outline"></ha-icon>
              <span>Ansichten</span>
            </div>
          </div>
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
        </section>

        <section class="panel">
          <div class="header">
            <div class="title">
              <ha-icon icon="mdi:tune-variant"></ha-icon>
              <span>Darstellung</span>
            </div>
          </div>
          <div class="rows">
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
        </section>
      </div>
    `;

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
      const select of
        this.shadowRoot.querySelectorAll(
          ".entity-visibility"
        )
    ) {
      select.addEventListener(
        "change",
        (event) => {
          const target = event.currentTarget;

          this._setEntityVisibility(
            target.dataset.entityId,
            target.value
          );
        }
      );
    }

    for (const input of this.shadowRoot.querySelectorAll(".setting-toggle")) {
      input.addEventListener("change", (event) => {
        const target = event.currentTarget;
        this._setBoolean(
          target.dataset.key,
          target.checked,
          target.dataset.default === "true"
        );
      });
    }
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

if (!window.customStrategies.some((entry) => entry.type === STRATEGY_TYPE)) {
  window.customStrategies.push({
    type: STRATEGY_TYPE,
    strategyType: "dashboard",
    name: "Atze Dashboard",
    description:
      "Automatisches, flexibel anpassbares Area-Dashboard mit Bubble-Card-Unterstützung.",
  });
}

console.info(
  `%c ATZE-DASHBOARD %c v${ATZE_VERSION} `,
  "background:#03a9f4;color:white;font-weight:700;padding:2px 6px;border-radius:4px 0 0 4px;",
  "background:#263238;color:white;padding:2px 6px;border-radius:0 4px 4px 0;"
);
