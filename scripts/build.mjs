import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sources = [
  "src/00-core.js",
  "src/10-strategy.js",
  "src/20-home-overview.js",
  "src/30-security-overview.js",
  "src/40-maintenance-overview.js",
  "src/50-room-components.js",
  "src/60-editor.js",
];

const bundle = (
  await Promise.all(sources.map((source) => readFile(resolve(root, source), "utf8")))
).join("");

await writeFile(resolve(root, "dist/atze-dashboard-strategy.js"), bundle, "utf8");
console.log(`Built dist/atze-dashboard-strategy.js from ${sources.length} source modules.`);
