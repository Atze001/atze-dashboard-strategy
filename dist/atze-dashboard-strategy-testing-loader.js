// Atze Dashboard Strategy - online testing loader
// This file stays stable. The query parameter forces the current testing
// branch bundle to be fetched instead of reusing an older browser/CDN copy.
const testBundle =
  "https://raw.githubusercontent.com/Atze001/atze-dashboard-strategy/testing/dist/atze-dashboard-strategy-testing.js" +
  "?t=" + Date.now();

import(testBundle).catch((error) => {
  console.error("[ATZE TESTING] Failed to load testing strategy:", error);
});
