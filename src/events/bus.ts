// Minimal domain event bus. Publishing records an immutable DomainEvent and enqueues
// the background jobs subscribed to that event type. Keeps side effects out of the
// request path and gives us an audit of everything that happened.
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { enqueue } from "@/jobs/queue";
import { logger } from "@/lib/logger";

/// event type -> jobs to enqueue (with an idempotency key derived from the payload)
const SUBSCRIPTIONS: Record<string, { jobType: string; idempotency: (p: any) => string }[]> = {
  "property.created": [
    { jobType: "property.onboarding", idempotency: (p) => `onboarding:${p.propertyId}` },
  ],
  "property.published": [
    { jobType: "property.match_buyers", idempotency: (p) => `match:${p.propertyId}:${p.publishedAt ?? ""}` },
  ],
};

export async function publishEvent(type: string, payload: Prisma.InputJsonValue & Record<string, unknown>) {
  await prisma.domainEvent.create({ data: { type, payload } });
  logger.info("event.published", { type });
  const subs = SUBSCRIPTIONS[type] ?? [];
  for (const sub of subs) {
    await enqueue(sub.jobType, payload, { idempotencyKey: sub.idempotency(payload) });
  }
}
