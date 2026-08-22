// Simple DB-backed sliding-window rate limiter using the AuditLog as an event store
// is avoided; instead we count recent domain rows. For messaging/showings/inquiries
// we count actions in the window directly from their tables via a generic counter
// table would be ideal, but to avoid extra schema we use an in-memory + DB hybrid.
//
// MVP approach: in-process token buckets keyed by action+subject. Resets on restart,
// which is acceptable for abuse-deterrence in a single-node MVP. The interface is
// stable so a Redis-backed limiter can replace it later.

interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const w = { count: 1, resetAt: now + windowMs };
    buckets.set(key, w);
    return { allowed: true, remaining: limit - 1, resetAt: w.resetAt };
  }
  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }
  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}
