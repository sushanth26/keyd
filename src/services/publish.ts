// Deterministic publish gate. A listing may go ACTIVE only when:
//  1) it is in READY_FOR_REVIEW,
//  2) the seller has APPROVED the content, and
//  3) readiness has no blockers (identity + ownership verified, required facts,
//     price, and minimum photos present).
// This enforces "publish only after seller approval AND successful verification."
import { prisma } from "@/lib/db";
import { assessProperty } from "@/services/readiness";
import { transitionProperty } from "@/services/property-status";
import { publishEvent } from "@/events/bus";
import { notify } from "@/services/notifications";

export async function publishListingGuarded(
  propertyId: string,
  actorId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId } });

  if (property.status !== "READY_FOR_REVIEW") {
    return { ok: false, reason: `This listing can't be published from status "${property.status}".` };
  }
  if (property.aiContentStatus !== "APPROVED") {
    return { ok: false, reason: "Approve the listing content before publishing." };
  }

  const readiness = await assessProperty(propertyId);
  if (!readiness.publishable) {
    return { ok: false, reason: `Resolve these before publishing: ${readiness.blockers.join(" ")}` };
  }

  await transitionProperty(propertyId, "ACTIVE", { actorType: "USER", actorId, reason: "Seller published" });
  await publishEvent("property.published", { propertyId, publishedAt: new Date().toISOString() });
  await notify({
    userId: property.sellerId,
    type: "LISTING_PUBLISHED",
    title: "Your listing is live on Keyd",
    body: "Your home is now published and visible to buyers. We're matching it with registered buyers and will notify strong matches.",
    actionPath: `/p/${property.slug}`,
  });
  return { ok: true };
}
