// Next.js instrumentation hook. Boots the in-process background job poller when
// WORKER_IN_PROCESS=true, so `npm run dev` alone processes jobs (single-command dev).
//
// Everything node-specific is inside the `NEXT_RUNTIME === "nodejs"` guard so the
// Edge compilation of this file never pulls in node-only modules.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { env } = await import("@/lib/env");
    if (!env.WORKER_IN_PROCESS) return;

    const g = globalThis as unknown as { __keydWorkerStarted?: boolean };
    if (g.__keydWorkerStarted) return;
    g.__keydWorkerStarted = true;

    const { startWorkerLoop } = await import("@/jobs/runner");
    const { logger } = await import("@/lib/logger");
    logger.info("instrumentation.worker_boot", { pollMs: env.WORKER_POLL_MS });
    void startWorkerLoop(env.WORKER_POLL_MS);
  }
}
