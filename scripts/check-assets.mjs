import { access, readdir, readFile } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = resolve(root, "src");
const assetDir = resolve(root, "dist/assets");
const imageExtensions = new Set([".webp", ".png", ".jpg", ".jpeg", ".svg"]);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

const sourceFiles = (await walk(sourceDir)).filter((file) => file.endsWith(".js"));
const references = new Set();

for (const file of sourceFiles) {
  const content = await readFile(file, "utf8");
  const regex = /["'`]([a-zA-Z0-9._-]+(?:\/[a-zA-Z0-9._-]+)+\.(?:webp|png|jpe?g|svg))["'`]/g;
  for (const match of content.matchAll(regex)) references.add(match[1]);
}

const missing = [];
for (const reference of references) {
  try { await access(resolve(assetDir, reference)); }
  catch { missing.push(reference); }
}

if (missing.length) {
  console.error("Fehlende, im Source referenzierte Assets:");
  for (const file of missing.sort()) console.error(`  - ${file}`);
  process.exit(1);
}

const allAssets = (await walk(assetDir))
  .filter((file) => imageExtensions.has(extname(file).toLowerCase()))
  .map((file) => relative(assetDir, file).replaceAll("\\", "/"));
const unused = allAssets.filter((file) => !references.has(file));

console.log(`Asset-Prüfung erfolgreich: ${references.size} Referenzen vorhanden.`);
if (unused.length) {
  console.log(`Hinweis: ${unused.length} Bilddatei(en) werden nicht direkt im Source referenziert.`);
}
