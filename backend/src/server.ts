import { createApp } from "./app";
import { config } from "./config";
import { reconcileCheckRequests } from "./services/check-lifecycle.service";

const app = createApp();

app.listen(config.port, () => {
  console.log(`Backend running on http://localhost:${config.port}`);
});

const reconciliationIntervalMs = Number(process.env.CHECK_RECONCILIATION_INTERVAL_MS || 30000);

void reconcileCheckRequests().catch((error) => {
  console.error("Initial check reconciliation failed:", error);
});

setInterval(() => {
  void reconcileCheckRequests().catch((error) => {
    console.error("Background check reconciliation failed:", error);
  });
}, Math.max(10000, reconciliationIntervalMs));
