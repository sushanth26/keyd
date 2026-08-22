// Buyer-matching workflow. Runs when a property is published (property.published),
// scoring registered buyers against the listing and notifying strong matches.
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { computeMatch, MATCH_THRESHOLD } from "@/domain/matching";
import { notify } from "@/services/notifications";
import { trackEvent } from "@/lib/audit";
import { isPubliclyVisible } from "@/domain/lifecycle";
import { formatCurrency } from "@/lib/format";

export async function runBuyerMatching(propertyId: string): Promise<void> {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property || !isPubliclyVisible(property.status)) {
    logger.info("matching.skipped_not_public", { propertyId });
    return;
  }

  const buyers = await prisma.buyerProfile.findMany({ include: { user: { select: { id: true, isBlocked: true } } } });

  for (const profile of buyers) {
    if (profile.user.isBlocked) continue;

    const outcome = computeMatch(
      {
        city: property.city,
        askingPrice: property.askingPrice,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        propertyType: property.propertyType,
        features: property.features,
      },
      {
        preferredCities: profile.preferredCities,
        minPrice: profile.minPrice,
        maxPrice: profile.maxPrice,
        minBedrooms: profile.minBedrooms,
        minBathrooms: profile.minBathrooms,
        propertyTypes: profile.propertyTypes,
        moveInTimeframe: profile.moveInTimeframe,
        financingReadiness: profile.financingReadiness,
        desiredFeatures: profile.desiredFeatures,
      },
    );

    if (!outcome.eligible || outcome.score < MATCH_THRESHOLD) continue;

    // Idempotent upsert of the match; only notify (and count analytics) once.
    const existing = await prisma.buyerMatch.findUnique({
      where: { buyerId_propertyId: { buyerId: profile.userId, propertyId } },
    });

    const match = await prisma.buyerMatch.upsert({
      where: { buyerId_propertyId: { buyerId: profile.userId, propertyId } },
      create: { buyerId: profile.userId, propertyId, score: outcome.score, reasons: outcome.reasons as unknown as Prisma.InputJsonValue },
      update: { score: outcome.score, reasons: outcome.reasons as unknown as Prisma.InputJsonValue },
    });

    if (!existing || !existing.notifiedAt) {
      await trackEvent({ type: "BUYER_MATCHED", propertyId, userId: profile.userId, properties: { score: outcome.score } });
      if (profile.notifyOnMatch) {
        await notify({
          userId: profile.userId,
          type: "NEW_BUYER_MATCH",
          title: "New home matches your search",
          body: `A ${property.bedrooms ?? "-"} bed home in ${property.city} at ${formatCurrency(
            property.askingPrice,
          )} matches your preferences.`,
          actionPath: `/p/${property.slug}`,
        });
        await prisma.buyerMatch.update({ where: { id: match.id }, data: { notifiedAt: new Date() } });
      }
    }
  }
  logger.info("matching.done", { propertyId });
}
