// The ONLY sanctioned way to change a property's lifecycle status.
// It validates the transition against the deterministic state machine, records a
// StatusTransition row + audit entry, sets lifecycle timestamps, and emits the
// relevant funnel analytics event — all in one transaction.
import type { ActorType, PropertyStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertTransition } from "@/domain/lifecycle";
import { recordAudit, trackEvent } from "@/lib/audit";

const STATUS_ANALYTICS: Partial<Record<PropertyStatus, Parameters<typeof trackEvent>[0]["type"]>> = {
  ACTIVE: "LISTING_PUBLISHED",
  UNDER_CONTRACT: "PROPERTY_UNDER_CONTRACT",
  SOLD: "PROPERTY_SOLD",
  PAUSED: "LISTING_PAUSED",
  WITHDRAWN: "LISTING_WITHDRAWN",
};

export interface TransitionActor {
  actorType: ActorType;
  actorId?: string | null;
  reason?: string;
}

export async function transitionProperty(
  propertyId: string,
  to: PropertyStatus,
  actor: TransitionActor,
): Promise<{ from: PropertyStatus; to: PropertyStatus }> {
  return prisma.$transaction(async (tx) => {
    const property = await tx.property.findUniqueOrThrow({
      where: { id: propertyId },
      select: { id: true, status: true, sellerId: true, publishedAt: true },
    });
    const from = property.status;

    // Idempotency: re-requesting the current status is a no-op, not an error.
    if (from === to) return { from, to };

    assertTransition(from, to);

    const data: Prisma.PropertyUpdateInput = { status: to };
    if (to === "ACTIVE" && !property.publishedAt) data.publishedAt = new Date();
    if (to === "SOLD") data.soldAt = new Date();

    await tx.property.update({ where: { id: propertyId }, data });

    await tx.statusTransition.create({
      data: { propertyId, fromStatus: from, toStatus: to, reason: actor.reason, actorType: actor.actorType, actorId: actor.actorId ?? null },
    });

    await recordAudit(tx, {
      actorType: actor.actorType,
      actorId: actor.actorId,
      action: `property.status.${to.toLowerCase()}`,
      entityType: "Property",
      entityId: propertyId,
      metadata: { from, to, reason: actor.reason },
    });

    const evt = STATUS_ANALYTICS[to];
    if (evt) await trackEvent({ type: evt, propertyId, userId: property.sellerId }, tx);

    return { from, to };
  });
}
