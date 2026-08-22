// Admin resolution of identity/ownership verification exceptions, plus the
// deterministic re-evaluation that advances a property once verification clears.
import { prisma } from "@/lib/db";
import { assessProperty } from "@/services/readiness";
import { transitionProperty } from "@/services/property-status";
import { notify } from "@/services/notifications";
import { recordAudit, trackEvent } from "@/lib/audit";

export async function approveVerification(verificationId: string, adminId: string) {
  const v = await prisma.identityVerification.update({
    where: { id: verificationId },
    data: { status: "APPROVED", reviewedById: adminId },
  });
  if (v.kind === "IDENTITY") {
    await prisma.user.update({ where: { id: v.subjectId }, data: { identityStatus: "VERIFIED" } });
  }
  await recordAudit(prisma, { actorType: "ADMIN", actorId: adminId, action: `verification.${v.kind.toLowerCase()}.approved`, entityType: "IdentityVerification", entityId: v.id, metadata: { propertyId: v.propertyId } });
  if (v.propertyId) await reevaluateAfterVerification(v.propertyId, adminId);
}

export async function rejectVerification(verificationId: string, adminId: string, notes: string) {
  const v = await prisma.identityVerification.update({
    where: { id: verificationId },
    data: { status: "REJECTED", reviewedById: adminId, notes },
  });
  if (v.kind === "IDENTITY") {
    await prisma.user.update({ where: { id: v.subjectId }, data: { identityStatus: "REJECTED" } });
  }
  await recordAudit(prisma, { actorType: "ADMIN", actorId: adminId, action: `verification.${v.kind.toLowerCase()}.rejected`, entityType: "IdentityVerification", entityId: v.id });
  if (v.propertyId) {
    const prop = await prisma.property.findUnique({ where: { id: v.propertyId }, select: { status: true, sellerId: true } });
    if (prop && prop.status === "VERIFICATION_PENDING") {
      await transitionProperty(v.propertyId, "NEEDS_ATTENTION", { actorType: "ADMIN", actorId: adminId, reason: "Verification rejected" });
      await notify({
        userId: prop.sellerId,
        type: "VERIFICATION_REQUIRED",
        title: "Verification needs attention",
        body: `We couldn't verify your ${v.kind.toLowerCase()}: ${notes}. Please review and resubmit.`,
        actionPath: `/seller/properties/${v.propertyId}`,
      });
    }
  }
}

/// Once identity + ownership are approved, advance a VERIFICATION_PENDING property.
export async function reevaluateAfterVerification(propertyId: string, adminId: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { verifications: { select: { kind: true, status: true } }, seller: { select: { identityStatus: true } } },
  });
  if (!property || property.status !== "VERIFICATION_PENDING") return;

  const ownershipOk = property.verifications.some((v) => v.kind === "OWNERSHIP" && v.status === "APPROVED");
  const identityOk = property.seller.identityStatus === "VERIFIED" || property.verifications.some((v) => v.kind === "IDENTITY" && v.status === "APPROVED");
  if (!ownershipOk || !identityOk) return; // still waiting on the other check

  const readiness = await assessProperty(propertyId);
  await trackEvent({ type: "LISTING_VERIFIED", propertyId, userId: property.sellerId });

  if (property.aiContentStatus !== "NONE" && readiness.publishable) {
    await transitionProperty(propertyId, "READY_FOR_REVIEW", { actorType: "SYSTEM", actorId: adminId, reason: "Verification cleared" });
    await notify({
      userId: property.sellerId,
      type: "LISTING_READY_FOR_REVIEW",
      title: "Verified — your listing is ready to review",
      body: `Identity and ownership are verified. Your readiness score is ${readiness.score}/100. Review and publish when ready.`,
      actionPath: `/seller/properties/${propertyId}/review`,
    });
  } else {
    await transitionProperty(propertyId, "NEEDS_ATTENTION", { actorType: "SYSTEM", actorId: adminId, reason: "Verified but missing info" });
    await notify({
      userId: property.sellerId,
      type: "MISSING_LISTING_INFO",
      title: "Verified — a few items still needed",
      body: "Your identity and ownership are verified. Complete the remaining required items to publish.",
      actionPath: `/seller/properties/${propertyId}`,
    });
  }
}
