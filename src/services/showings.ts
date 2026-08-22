// Showing request lifecycle: create (buyer), respond (seller), feedback (buyer).
import { prisma } from "@/lib/db";
import { notify } from "@/services/notifications";
import { recordAudit, trackEvent } from "@/lib/audit";
import { transitionProperty } from "@/services/property-status";
import { sanitizeMultiline } from "@/lib/sanitize";
import { checkRateLimit } from "@/lib/rate-limit";

export async function createShowingRequest(params: {
  propertyId: string;
  buyerId: string;
  proposedSlots: string[];
  message?: string;
}) {
  const property = await prisma.property.findUniqueOrThrow({ where: { id: params.propertyId } });

  // Rate-limit showing requests per buyer to deter spam.
  const rl = await checkRateLimit(`showing:${params.buyerId}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) throw new Error("You've sent too many showing requests recently. Please try again later.");

  const showing = await prisma.showingRequest.create({
    data: {
      propertyId: params.propertyId,
      buyerId: params.buyerId,
      sellerId: property.sellerId,
      proposedSlots: params.proposedSlots,
      buyerMessage: params.message ? sanitizeMultiline(params.message, 1000) : null,
      status: "REQUESTED",
    },
  });

  await trackEvent({ type: "SHOWING_REQUESTED", propertyId: params.propertyId, userId: params.buyerId });
  await recordAudit(prisma, { actorType: "USER", actorId: params.buyerId, action: "showing.requested", entityType: "ShowingRequest", entityId: showing.id });
  await notify({
    userId: property.sellerId,
    type: "SHOWING_REQUEST",
    title: "New showing request",
    body: `A buyer requested a showing for ${property.addressLine1}, ${property.city}. Review and confirm a time.`,
    actionPath: "/seller/showings",
  });
  return showing;
}

export async function respondToShowing(showingId: string, decision: "CONFIRMED" | "DECLINED", confirmedSlot?: string) {
  const showing = await prisma.showingRequest.findUniqueOrThrow({ where: { id: showingId }, include: { property: true } });

  await prisma.showingRequest.update({
    where: { id: showingId },
    data: {
      status: decision,
      confirmedStart: decision === "CONFIRMED" && confirmedSlot ? new Date(confirmedSlot) : null,
    },
  });
  await recordAudit(prisma, { actorType: "USER", actorId: showing.sellerId, action: `showing.${decision.toLowerCase()}`, entityType: "ShowingRequest", entityId: showingId });
  await notify({
    userId: showing.buyerId,
    type: decision === "CONFIRMED" ? "SHOWING_CONFIRMATION" : "SHOWING_RESCHEDULE",
    title: decision === "CONFIRMED" ? "Your showing is confirmed" : "Showing request declined",
    body:
      decision === "CONFIRMED"
        ? `The owner confirmed your showing for ${showing.property.addressLine1}${confirmedSlot ? ` at ${new Date(confirmedSlot).toLocaleString()}` : ""}.`
        : `The owner couldn't accommodate your requested times for ${showing.property.addressLine1}. You can propose new times.`,
    actionPath: "/buyer/showings",
  });
}

export async function submitShowingFeedback(showingId: string, buyerId: string, rating: number, comments: string, interested: boolean) {
  const showing = await prisma.showingRequest.findUniqueOrThrow({ where: { id: showingId } });
  if (showing.buyerId !== buyerId) throw new Error("Not your showing");
  await prisma.showingRequest.update({
    where: { id: showingId },
    data: { status: "COMPLETED", feedback: { rating, comments: sanitizeMultiline(comments, 1000), interested } },
  });
  await trackEvent({ type: "SHOWING_COMPLETED", propertyId: showing.propertyId, userId: buyerId });
}

export async function markShowingCompleted(showingId: string) {
  const showing = await prisma.showingRequest.findUniqueOrThrow({ where: { id: showingId } });
  if (showing.status !== "COMPLETED") {
    await prisma.showingRequest.update({ where: { id: showingId }, data: { status: "COMPLETED" } });
    await trackEvent({ type: "SHOWING_COMPLETED", propertyId: showing.propertyId, userId: showing.buyerId });
  }
}

/// When the first buyer interest arrives, nudge the listing to BUYER_INTEREST_RECEIVED.
export async function bumpToInterestReceived(propertyId: string, actorId: string) {
  const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId }, select: { status: true } });
  if (property.status === "ACTIVE") {
    await transitionProperty(propertyId, "BUYER_INTEREST_RECEIVED", { actorType: "SYSTEM", actorId, reason: "Buyer interest received" });
  }
}
