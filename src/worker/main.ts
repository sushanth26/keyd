// Standalone background worker entrypoint: `npm run worker`.
// In Docker Compose this runs as its own service; locally you can run it alongside
// `npm run dev` (with WORKER_IN_PROCESS=false) or rely on the in-process poller.
import "dotenv/config";
import { env } from "@/lib/env";
import { startWorkerLoop, stopWorkerLoop } from "@/jobs/runner";
import { logger } from "@/lib/logger";

process.on("SIGINT", () => {
  logger.info("worker.sigint");
  stopWorkerLoop();
  process.exit(0);
});
process.on("SIGTERM", () => {
  stopWorkerLoop();
  process.exit(0);
});

startWorkerLoop(env.WORKER_POLL_MS).catch((err) => {
  logger.error("worker.fatal", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
