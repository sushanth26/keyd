// Database-backed background job queue.
//
// Jobs are claimed atomically with `FOR UPDATE SKIP LOCKED`, so multiple workers
// (or the in-process poller + a dedicated worker) never double-process a job.
// Failed jobs retry with exponential backoff up to maxAttempts, then move to DEAD.
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface EnqueueOptions {
  runAt?: Date;
  maxAttempts?: number;
  /// If set, a duplicate enqueue with the same key is ignored (idempotency).
  idempotencyKey?: string;
}

export async function enqueue(type: string, payload: Prisma.InputJsonValue, opts: EnqueueOptions = {}) {
  try {
    const job = await prisma.job.create({
      data: {
        type,
        payload,
        runAt: opts.runAt ?? new Date(),
        maxAttempts: opts.maxAttempts ?? 5,
        idempotencyKey: opts.idempotencyKey ?? null,
      },
    });
    logger.info("job.enqueued", { id: job.id, type });
    return job;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      logger.info("job.enqueue.deduped", { type, idempotencyKey: opts.idempotencyKey });
      return null; // duplicate idempotency key — already queued/processed
    }
    throw e;
  }
}

interface ClaimedJob {
  id: string;
  type: string;
  payload: unknown;
  attempts: number;
  maxAttempts: number;
}

/// Atomically claim the next runnable job for this worker, or null if none.
export async function claimNextJob(workerId: string): Promise<ClaimedJob | null> {
  // Prisma stores DateTime as `timestamp` (naive UTC). Compare against UTC wall-clock
  // (now() AT TIME ZONE 'UTC') so the comparison is timezone-correct on any host.
  const rows = await prisma.$queryRaw<ClaimedJob[]>`
    UPDATE "Job" SET
      status = 'RUNNING',
      "lockedAt" = (now() AT TIME ZONE 'UTC'),
      "lockedBy" = ${workerId},
      attempts = attempts + 1,
      "updatedAt" = (now() AT TIME ZONE 'UTC')
    WHERE id = (
      SELECT id FROM "Job"
      WHERE status = 'QUEUED' AND "runAt" <= (now() AT TIME ZONE 'UTC')
      ORDER BY "runAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING id, type, payload, attempts, "maxAttempts";
  `;
  return rows[0] ?? null;
}

export async function completeJob(id: string) {
  await prisma.job.update({ where: { id }, data: { status: "SUCCEEDED", lockedAt: null, lockedBy: null } });
}

export async function failJob(job: ClaimedJob, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const exhausted = job.attempts >= job.maxAttempts;
  if (exhausted) {
    await prisma.job.update({
      where: { id: job.id },
      data: { status: "DEAD", lastError: message, lockedAt: null, lockedBy: null },
    });
    logger.error("job.dead", { id: job.id, type: job.type, error: message });
  } else {
    const backoffMs = Math.min(60_000, 1000 * 2 ** job.attempts); // 2s,4s,8s,... capped 60s
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "QUEUED",
        lastError: message,
        runAt: new Date(Date.now() + backoffMs),
        lockedAt: null,
        lockedBy: null,
      },
    });
    logger.warn("job.retry", { id: job.id, type: job.type, attempt: job.attempts, backoffMs });
  }
}

/// Admin action: re-queue a failed/dead job immediately.
export async function retryJob(id: string) {
  await prisma.job.update({
    where: { id },
    data: { status: "QUEUED", runAt: new Date(), lockedAt: null, lockedBy: null, lastError: null },
  });
}
