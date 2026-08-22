// The polling worker loop. Used by both the standalone worker (npm run worker)
// and the in-process poller booted from instrumentation.ts.
import { claimNextJob, completeJob, failJob } from "./queue";
import { getHandler } from "./handlers";
import { logger } from "@/lib/logger";

// Web Crypto (globalThis.crypto) is available in Node 18+ and needs no import,
// keeping this module free of node builtins so it bundles cleanly everywhere.
const WORKER_ID = `${process.pid}-${globalThis.crypto.randomUUID().slice(0, 8)}`;

/// Process at most `max` jobs that are currently runnable. Returns count processed.
export async function drainOnce(max = 25): Promise<number> {
  let processed = 0;
  for (let i = 0; i < max; i++) {
    const job = await claimNextJob(WORKER_ID);
    if (!job) break;
    try {
      const handler = getHandler(job.type);
      await handler(job.payload);
      await completeJob(job.id);
      logger.info("job.done", { id: job.id, type: job.type });
    } catch (err) {
      await failJob(job, err);
    }
    processed++;
  }
  return processed;
}

let running = false;

/// Continuous poll loop for the standalone worker process.
export async function startWorkerLoop(pollMs: number): Promise<void> {
  running = true;
  logger.info("worker.start", { workerId: WORKER_ID, pollMs });
  while (running) {
    try {
      const n = await drainOnce();
      if (n === 0) await sleep(pollMs);
    } catch (err) {
      logger.error("worker.loop_error", { error: err instanceof Error ? err.message : String(err) });
      await sleep(pollMs);
    }
  }
}

export function stopWorkerLoop() {
  running = false;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
