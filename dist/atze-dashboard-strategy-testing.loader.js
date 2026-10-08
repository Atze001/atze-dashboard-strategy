const response = await fetch("/local/atze-dashboard-strategy-testing.version?t=" + Date.now(), { cache: "no-store" });
const revision = response.ok ? (await response.text()).trim().toUpperCase() : String(Date.now());
await import("/local/atze-dashboard-strategy-testing.bundle.js?v=" + encodeURIComponent(revision));
