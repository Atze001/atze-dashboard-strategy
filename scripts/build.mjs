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
const testingRevision = (process.env.ATZE_TESTING_REVISION || "").slice(0, 7).toUpperCase();
const buildTestingArtifacts = process.env.ATZE_BUILD_TESTING === "true";
const bundle = sourceContents.join("");
const testingReplacements = new Map([
  ['const STRATEGY_TYPE = "atze-dashboard";', 'const STRATEGY_TYPE = "atze-dashboard-testing";'],
  ['const ATZE_TESTING_BUILD = false;', 'const ATZE_TESTING_BUILD = true;'],
  ['const ATZE_TESTING_REVISION = "";', `const ATZE_TESTING_REVISION = "${testingRevision}";`],
  ['"custom:atze-home-overview-card"', '"custom:atze-testing-home-overview-card"'],
  ['"custom:atze-security-overview-card"', '"custom:atze-testing-security-overview-card"'],
  ['"custom:atze-maintenance-overview-card"', '"custom:atze-testing-maintenance-overview-card"'],
  ['"custom:atze-room-nav-header"', '"custom:atze-testing-room-nav-header"'],
  ['"custom:atze-warning-badge-v2"', '"custom:atze-testing-warning-badge-v2"'],
  ['"custom:atze-status-badge-v1"', '"custom:atze-testing-status-badge-v1"'],
  ['"custom:atze-room-group"', '"custom:atze-testing-room-group"'],
  ['"custom:atze-sortable-switch-grid"', '"custom:atze-testing-sortable-switch-grid"'],
  ['"atze-dashboard-strategy-editor"', '"atze-dashboard-strategy-editor-testing"'],
  ['"atze-home-overview-card"', '"atze-testing-home-overview-card"'],
  ['"atze-security-overview-card"', '"atze-testing-security-overview-card"'],
  ['"atze-maintenance-overview-card"', '"atze-testing-maintenance-overview-card"'],
  ['"atze-room-nav-header"', '"atze-testing-room-nav-header"'],
  ['"atze-warning-badge-v2"', '"atze-testing-warning-badge-v2"'],
  ['"atze-status-badge-v1"', '"atze-testing-status-badge-v1"'],
  ['"atze-room-group"', '"atze-testing-room-group"'],
  ['"atze-sortable-switch-grid"', '"atze-testing-sortable-switch-grid"'],
  ['const ATZE_ASSET_BASE_URL = new URL(\n  "./assets/",\n  import.meta.url\n).href;', 'const ATZE_ASSET_BASE_URL = new URL("/hacsfiles/atze-dashboard-strategy/assets/", window.location.origin).href;'],
]);

let testingBundle = bundle;
for (const [stableName, testingName] of testingReplacements) {
  testingBundle = testingBundle.split(stableName).join(testingName);
}


const packagePath = resolve(root, "package.json");
const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
packageJson.version = version;

const readmePath = resolve(root, "README.md");
const readme = await readFile(readmePath, "utf8");
const changelog = await readFile(resolve(root, "CHANGELOG.md"), "utf8");
const versionLine = /^Version \*\*[^*]+\*\*$/m;

if (!versionLine.test(readme)) {
  throw new Error("Current version line was not found in README.md.");
}

const changelogSections = [...changelog.matchAll(/^## v[^\n]+[\s\S]*?(?=^## v|(?![\s\S]))/gm)]
  .slice(0, 3)
  .map((match) => match[0].trim())
  .join("\n\n");

if (!changelogSections) {
  throw new Error("No version sections were found in CHANGELOG.md.");
}

const changesBlock = /<!-- latest-changes:start -->[\s\S]*?<!-- latest-changes:end -->/;
if (!changesBlock.test(readme)) {
  throw new Error("Latest changes markers were not found in README.md.");
}

const syncedReadme = readme
  .replace(versionLine, `Version **${version}**`)
  .replace(
    changesBlock,
    `<!-- latest-changes:start -->\n${changelogSections}\n<!-- latest-changes:end -->`
  );

const writes = [
  writeFile(resolve(root, "dist/atze-dashboard-strategy.js"), bundle, "utf8"),
  writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8"),
  writeFile(readmePath, syncedReadme, "utf8"),
];

if (buildTestingArtifacts) {
  writes.push(
    writeFile(resolve(root, "dist/atze-dashboard-strategy-testing.js"), testingBundle, "utf8"),
    writeFile(resolve(root, "dist/atze-dashboard-strategy-testing.bundle.js"), testingBundle, "utf8"),
    writeFile(resolve(root, "dist/atze-dashboard-strategy-testing.loader.js"), `const response = await fetch("/local/atze-dashboard-strategy-testing.version?t=" + Date.now(), { cache: "no-store" });\nconst revision = response.ok ? (await response.text()).trim().toUpperCase() : String(Date.now());\nawait import("/local/atze-dashboard-strategy-testing.bundle.js?v=" + encodeURIComponent(revision));\n`, "utf8"),
    writeFile(resolve(root, "dist/atze-dashboard-strategy-testing.version"), `${testingRevision}\n`, "utf8")
  );
}

await Promise.all(writes);

console.log(
  `Built stable dashboard bundle${buildTestingArtifacts ? " + testing artifacts" : ""} and synchronized version ${version} to package.json and README.md.`
);
