// ATZE testing loader. Kept separate from the dashboard bundle so it can
// detect a newer build while Home Assistant remains open as a single-page app.
const versionURL = "/local/atze-dashboard-strategy-testing.version";
const bundleURL = "/local/atze-dashboard-strategy-testing.bundle.js";
const refreshKey = "atze-testing:refresh-attempt";
const returnKey = "atze-testing:return-url";
const homeTag = "atze-testing-home-overview-card";

const onTestingDashboard = () => location.pathname.split("/")[1] === "atze-test";

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

const activeRevision = () => customElements.get(homeTag)?.testingRevision || "UNKNOWN";
if (initialRevision && activeRevision() === initialRevision) {
  sessionStorage.removeItem(refreshKey);
}

async function checkForUpdate() {
  if (!onTestingDashboard() || document.visibilityState !== "visible") return;
  const available = await currentRevision();
  if (!available || activeRevision() === available) return;

  // One full-page restart per revision at most. If deployment is inconsistent,
  // stop here instead of trapping the user in a reload loop.
  if (sessionStorage.getItem(refreshKey) === available) return;
  sessionStorage.setItem(refreshKey, available);
  sessionStorage.setItem(returnKey, location.pathname + location.search + location.hash);
  const url = new URL(location.href);
  url.searchParams.set("atze_testing_refresh", available);
  location.replace(url.href);
}

setInterval(checkForUpdate, 60_000);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") checkForUpdate();
});
// Also detect stale registered components immediately when the route is opened.
setTimeout(checkForUpdate, 2500);
