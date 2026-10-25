// ATZE testing loader. A new build is loaded on page start or by the
// explicit reload button in the testing dashboard, never by polling.
const versionURL = "/local/atze-dashboard-strategy-testing.version";
const bundleURL = "/local/atze-dashboard-strategy-testing.bundle.js";
const returnKey = "atze-testing:return-url";

async function currentRevision() {
  try {
    const response = await fetch(versionURL + "?t=" + Date.now(), { cache: "no-store" });
    if (!response.ok) return null;
    const value = (await response.text()).trim().toUpperCase();
    return /^[A-F0-9]{7}$/.test(value) ? value : null;
  } catch (_error) {
    return null;
  }
}

// HA may reopen its default dashboard after a full document navigation.
// Restore the testing route once its frontend has started, without touching
// user credentials or clearing any Home Assistant storage.
const returnURL = sessionStorage.getItem(returnKey);
if (returnURL) {
  sessionStorage.removeItem(returnKey);
  setTimeout(() => {
    try {
      const target = new URL(returnURL, location.origin);
      if (target.origin !== location.origin || target.pathname.split("/")[1] !== "atze-test") return;
      if (location.pathname + location.search !== target.pathname + target.search) {
        history.replaceState(null, "", target.pathname + target.search + target.hash);
        window.dispatchEvent(new Event("location-changed"));
      }
    } catch (_error) { /* A stale return URL must never block HA startup. */ }
  }, 1800);
}

const initialRevision = await currentRevision();
await import(bundleURL + "?v=" + encodeURIComponent(initialRevision || String(Date.now())));
