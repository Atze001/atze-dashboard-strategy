import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const core = await readFile(resolve(root, "src/00-core.js"), "utf8");
const expected = {
  treppenhaus: "hausflur",
  treppenflur: "hausflur",
  arbeitszimmer: "buro",
  spielzimmer: "kinderzimmer",
  veranda: "balkon",
};

const block = core.match(/const DEFAULT_HOME_ROOM_IMAGE_ALIASES = \{([\s\S]*?)\n\};/);
if (!block) throw new Error("DEFAULT_HOME_ROOM_IMAGE_ALIASES wurde nicht gefunden.");

for (const [alias, target] of Object.entries(expected)) {
  const pattern = new RegExp(`\\b${alias}:\\s*["']${target}["']`);
  if (!pattern.test(block[1])) throw new Error(`Erwarteter Raum-Alias fehlt: ${alias} -> ${target}`);
}

const imageBlock = core.match(/const DEFAULT_HOME_ROOM_IMAGE_FILES = \{([\s\S]*?)\n\};/);
if (!imageBlock) throw new Error("DEFAULT_HOME_ROOM_IMAGE_FILES wurde nicht gefunden.");

for (const target of new Set(Object.values(expected))) {
  const pattern = new RegExp(`\\b["']?${target}["']?\\s*:`);
  if (!pattern.test(imageBlock[1])) throw new Error(`Alias-Ziel besitzt kein Standardbild: ${target}`);
}

console.log("Raum-Alias-Prüfung erfolgreich.");
