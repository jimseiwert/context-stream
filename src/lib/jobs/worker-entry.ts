// Worker Entry Point
// Called directly by tsx for the external worker process.
//
// Usage:
//   tsx src/lib/jobs/worker-entry.ts
//   DISPATCH_MODE=worker tsx src/lib/jobs/worker-entry.ts
//   npm run worker:server
//
// Single-job mode (Kubernetes):
//   JOB_ID=<uuid> WORKER_MODE=single tsx src/lib/jobs/worker-entry.ts

import { startWorkerServer } from "./worker-server";

startWorkerServer().catch((err: unknown) => {
  console.error("[Worker] Fatal error:", err);
  process.exit(1);
});
