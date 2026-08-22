"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertRole } from "@/lib/auth/current-user";
import { approveVerification, rejectVerification } from "@/services/verification-review";
import { transitionProperty } from "@/services/property-status";
import { retryJob, enqueue } from "@/jobs/queue";
import { recordAudit } from "@/lib/audit";
import { sanitizeMultiline } from "@/lib/sanitize";

export async function approveVerificationAction(verificationId: string) {
  const admin = await assertRole("ADMIN");
  await approveVerification(verificationId, admin.id);
  revalidatePath("/admin/verifications");
}

export async function rejectVerificationAction(verificationId: string, formData: FormData) {
  const admin = await assertRole("ADMIN");
  await rejectVerification(verificationId, admin.id, sanitizeMultiline(String(formData.get("notes") ?? "Could not verify"), 500));
  revalidatePath("/admin/verifications");
}

export async function blockUserAction(userId: string) {
  const admin = await assertRole("ADMIN");
  await prisma.user.update({ where: { id: userId }, data: { isBlocked: true } });
  await recordAudit(prisma, { actorType: "ADMIN", actorId: admin.id, action: "user.blocked", entityType: "User", entityId: userId });
  revalidatePath("/admin/users");
}

export async function unblockUserAction(userId: string) {
  const admin = await assertRole("ADMIN");
  await prisma.user.update({ where: { id: userId }, data: { isBlocked: false } });
  await recordAudit(prisma, { actorType: "ADMIN", actorId: admin.id, action: "user.unblocked", entityType: "User", entityId: userId });
  revalidatePath("/admin/users");
}

/// Admin safety pause: force a live listing to PAUSED.
export async function adminPauseListingAction(propertyId: string) {
  const admin = await assertRole("ADMIN");
  const p = await prisma.property.findUniqueOrThrow({ where: { id: propertyId }, select: { status: true } });
  if (["ACTIVE", "BUYER_INTEREST_RECEIVED"].includes(p.status)) {
    await transitionProperty(propertyId, "PAUSED", { actorType: "ADMIN", actorId: admin.id, reason: "Paused by administrator (safety)" });
  }
  revalidatePath("/admin/properties");
  revalidatePath("/admin/reports");
}

export async function resolveReportAction(reportId: string, status: "RESOLVED" | "DISMISSED", formData: FormData) {
  const admin = await assertRole("ADMIN");
  await prisma.report.update({
    where: { id: reportId },
    data: { status, handledById: admin.id, resolutionNotes: sanitizeMultiline(String(formData.get("notes") ?? ""), 500) || null },
  });
  await recordAudit(prisma, { actorType: "ADMIN", actorId: admin.id, action: `report.${status.toLowerCase()}`, entityType: "Report", entityId: reportId });
  revalidatePath("/admin/reports");
}

export async function retryJobAction(jobId: string) {
  await assertRole("ADMIN");
  await retryJob(jobId);
  revalidatePath("/admin/workflows");
}

/// Re-run a failed onboarding workflow by re-enqueuing the job.
export async function retryWorkflowAction(propertyId: string) {
  const admin = await assertRole("ADMIN");
  // Reset the workflow run so it re-executes, then enqueue a fresh job.
  await prisma.workflowRun.updateMany({ where: { propertyId, status: "FAILED" }, data: { status: "PENDING" } });
  await enqueue("property.onboarding", { propertyId }, { idempotencyKey: `onboarding:retry:${propertyId}:${Date.now()}` });
  await recordAudit(prisma, { actorType: "ADMIN", actorId: admin.id, action: "workflow.retried", entityType: "Property", entityId: propertyId });
  revalidatePath("/admin/workflows");
}
