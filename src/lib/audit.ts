// Append-only audit trail + funnel analytics helpers.
// AuditLog rows are never updated or deleted by application code.

import type { ActorType, AnalyticsEventType, Prisma } from "@prisma/client";
import { prisma } from "./db";

export async function recordAudit(
  tx: Prisma.TransactionClient | typeof prisma,
  params: {
    actorType: ActorType;
    actorId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  const client = tx ?? prisma;
  await client.auditLog.create({
    data: {
      actorType: params.actorType,
      actorId: params.actorId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata,
    },
  });
}

export async function trackEvent(
  params: {
    type: AnalyticsEventType;
    userId?: string | null;
    propertyId?: string | null;
    properties?: Prisma.InputJsonValue;
  },
  tx?: Prisma.TransactionClient,
) {
  const client = tx ?? prisma;
  await client.analyticsEvent.create({
    data: {
      type: params.type,
      userId: params.userId ?? null,
      propertyId: params.propertyId ?? null,
      properties: params.properties,
    },
  });
}
