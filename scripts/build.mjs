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

const sourceContents = await Promise.all(
  sources.map((source) => readFile(resolve(root, source), "utf8"))
);

const versionMatch = sourceContents[0].match(
  /const ATZE_VERSION = "([^"]+)";/
);

if (!versionMatch) {
  throw new Error("ATZE_VERSION was not found in src/00-core.js.");
}

const version = versionMatch[1];
const bundle = sourceContents.join("");

const packagePath = resolve(root, "package.json");
const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
packageJson.version = version;

const readmePath = resolve(root, "README.md");
const readme = await readFile(readmePath, "utf8");
const versionLine = /^Version \*\*[^*]+\*\*$/m;

if (!versionLine.test(readme)) {
  throw new Error("Current version line was not found in README.md.");
}

const syncedReadme = readme.replace(
  versionLine,
  `Version **${version}**`
);

await Promise.all([
  writeFile(
    resolve(root, "dist/atze-dashboard-strategy.js"),
    bundle,
    "utf8"
  ),
  writeFile(
    packagePath,
    `${JSON.stringify(packageJson, null, 2)}\n`,
    "utf8"
  ),
  writeFile(readmePath, syncedReadme, "utf8"),
]);

console.log(
  `Built dashboard bundle and synchronized version ${version} to package.json and README.md.`
);
