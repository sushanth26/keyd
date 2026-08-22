"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { PropertyType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertRole } from "@/lib/auth/current-user";
import { uniquePropertySlug } from "@/lib/slug";
import { publishEvent } from "@/events/bus";
import { transitionProperty } from "@/services/property-status";
import { assessProperty } from "@/services/readiness";
import { recordAudit, trackEvent } from "@/lib/audit";
import { sanitizeMultiline, sanitizeText } from "@/lib/sanitize";
import { screenMany } from "@/domain/fair-housing";
import { DISCLOSURE_CHECKLIST } from "@/domain/constants";
import { storage } from "@/providers/storage";
import { publishListingGuarded } from "@/services/publish";

async function ownProperty(propertyId: string, userId: string) {
  const p = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!p || p.sellerId !== userId) redirect("/seller");
  return p;
}

// --- Create draft ---
const draftSchema = z.object({
  addressLine1: z.string().min(3).max(160),
  city: z.string().min(2).max(80),
  zip: z.string().regex(/^\d{5}$/, "Enter a 5-digit ZIP"),
  propertyType: z.enum(["SINGLE_FAMILY", "TOWNHOUSE", "CONDO", "MULTI_FAMILY", "LAND", "OTHER"]),
});

export async function createDraftAction(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const user = await assertRole("SELLER");
  const parsed = draftSchema.safeParse({
    addressLine1: sanitizeText(String(formData.get("addressLine1") ?? "")),
    city: sanitizeText(String(formData.get("city") ?? "")),
    zip: String(formData.get("zip") ?? "").trim(),
    propertyType: String(formData.get("propertyType") ?? "SINGLE_FAMILY"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const slug = await uniquePropertySlug(parsed.data.addressLine1, parsed.data.zip);
  const property = await prisma.property.create({
    data: {
      slug,
      sellerId: user.id,
      status: "DRAFT",
      addressLine1: parsed.data.addressLine1,
      city: parsed.data.city,
      zip: parsed.data.zip,
      propertyType: parsed.data.propertyType as PropertyType,
      disclosures: DISCLOSURE_CHECKLIST.map((d) => ({ ...d, acknowledged: false })),
    },
  });
  await trackEvent({ type: "LISTING_STARTED", userId: user.id, propertyId: property.id });
  await recordAudit(prisma, { actorType: "USER", actorId: user.id, action: "property.draft.created", entityType: "Property", entityId: property.id });
  redirect(`/seller/properties/${property.id}`);
}

// --- Save guided questionnaire ---
const num = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").replace(/[^0-9.]/g, "");
  return s === "" ? null : Number(s);
};
const int = (v: FormDataEntryValue | null) => {
  const n = num(v);
  return n == null ? null : Math.round(n);
};

export async function saveListingAction(propertyId: string, formData: FormData) {
  const user = await assertRole("SELLER");
  await ownProperty(propertyId, user.id);

  const features = String(formData.get("features") ?? "")
    .split(",")
    .map((f) => sanitizeText(f))
    .filter(Boolean)
    .slice(0, 20);

  const disclosures = DISCLOSURE_CHECKLIST.map((d) => ({
    ...d,
    acknowledged: formData.get(`disclosure_${d.key}`) === "on",
  }));

  const days = formData.getAll("showingDays").map(String);
  const start = String(formData.get("showingStart") ?? "10:00");
  const end = String(formData.get("showingEnd") ?? "17:00");
  const showingAvailability = days.map((d) => ({ dayOfWeek: d, start, end }));

  await prisma.property.update({
    where: { id: propertyId },
    data: {
      addressLine1: sanitizeText(String(formData.get("addressLine1") ?? "")) || undefined,
      city: sanitizeText(String(formData.get("city") ?? "")) || undefined,
      zip: String(formData.get("zip") ?? "").trim() || undefined,
      askingPrice: int(formData.get("askingPrice")),
      bedrooms: int(formData.get("bedrooms")),
      bathrooms: num(formData.get("bathrooms")),
      squareFeet: int(formData.get("squareFeet")),
      lotSizeSqft: int(formData.get("lotSizeSqft")),
      yearBuilt: int(formData.get("yearBuilt")),
      propertyType: (String(formData.get("propertyType") ?? "SINGLE_FAMILY") as PropertyType) || undefined,
      garageSpaces: int(formData.get("garageSpaces")),
      stories: int(formData.get("stories")),
      hoaFeeMonthly: int(formData.get("hoaFeeMonthly")),
      features,
      improvements: sanitizeMultiline(String(formData.get("improvements") ?? "")) || null,
      disclosures,
      showingAvailability,
    },
  });

  // Keep the readiness score fresh as the seller edits.
  await assessProperty(propertyId);
  revalidatePath(`/seller/properties/${propertyId}`);
  redirect(`/seller/properties/${propertyId}?saved=1`);
}

// --- Submit for AI preparation (fires property.created) ---
export async function submitForPreparationAction(propertyId: string) {
  const user = await assertRole("SELLER");
  const p = await ownProperty(propertyId, user.id);
  if (!["DRAFT", "NEEDS_ATTENTION"].includes(p.status)) {
    redirect(`/seller/properties/${propertyId}`);
  }
  await publishEvent("property.created", { propertyId, sellerId: user.id });
  await recordAudit(prisma, { actorType: "USER", actorId: user.id, action: "property.submitted", entityType: "Property", entityId: propertyId });
  redirect(`/seller/properties/${propertyId}?prepared=1`);
}

// --- Approve AI content ---
export async function approveContentAction(propertyId: string) {
  const user = await assertRole("SELLER");
  const p = await ownProperty(propertyId, user.id);

  // Safety: never approve content that trips a fair-housing rule.
  const flags = screenMany([p.headline, p.description, ...(p.highlights ?? []), p.openHouseCopy]);
  if (flags.length) {
    redirect(`/seller/properties/${propertyId}/review?err=${encodeURIComponent(`Content flagged for fair-housing review: ${flags.map((f) => f.match).join(", ")}. Edit before approving.`)}`);
  }
  await prisma.property.update({
    where: { id: propertyId },
    data: { aiContentStatus: "APPROVED", contentApprovedAt: new Date(), contentApprovedById: user.id },
  });
  await recordAudit(prisma, { actorType: "USER", actorId: user.id, action: "listing.content.approved", entityType: "Property", entityId: propertyId });
  redirect(`/seller/properties/${propertyId}/review?approved=1`);
}

// --- Edit AI content manually ---
export async function editContentAction(propertyId: string, formData: FormData) {
  const user = await assertRole("SELLER");
  await ownProperty(propertyId, user.id);
  await prisma.property.update({
    where: { id: propertyId },
    data: {
      headline: sanitizeText(String(formData.get("headline") ?? "")),
      description: sanitizeMultiline(String(formData.get("description") ?? "")),
      // Editing resets approval — seller must re-approve edited copy.
      aiContentStatus: "GENERATED",
      contentApprovedAt: null,
    },
  });
  redirect(`/seller/properties/${propertyId}/review?edited=1`);
}

// --- Publish / lifecycle actions ---
export async function publishListingAction(propertyId: string) {
  const user = await assertRole("SELLER");
  await ownProperty(propertyId, user.id);
  const result = await publishListingGuarded(propertyId, user.id);
  if (!result.ok) {
    redirect(`/seller/properties/${propertyId}/review?err=${encodeURIComponent(result.reason)}`);
  }
  redirect(`/seller/properties/${propertyId}?published=1`);
}

export async function pauseListingAction(propertyId: string) {
  const user = await assertRole("SELLER");
  await ownProperty(propertyId, user.id);
  await transitionProperty(propertyId, "PAUSED", { actorType: "USER", actorId: user.id, reason: "Seller paused" });
  revalidatePath(`/seller/properties/${propertyId}`);
}

export async function resumeListingAction(propertyId: string) {
  const user = await assertRole("SELLER");
  await ownProperty(propertyId, user.id);
  await transitionProperty(propertyId, "ACTIVE", { actorType: "USER", actorId: user.id, reason: "Seller resumed" });
  revalidatePath(`/seller/properties/${propertyId}`);
}

export async function withdrawListingAction(propertyId: string) {
  const user = await assertRole("SELLER");
  await ownProperty(propertyId, user.id);
  await transitionProperty(propertyId, "WITHDRAWN", { actorType: "USER", actorId: user.id, reason: "Seller withdrew" });
  redirect(`/seller`);
}

export async function markUnderContractAction(propertyId: string) {
  const user = await assertRole("SELLER");
  await ownProperty(propertyId, user.id);
  await transitionProperty(propertyId, "UNDER_CONTRACT", { actorType: "USER", actorId: user.id, reason: "Seller marked under contract" });
  revalidatePath(`/seller/properties/${propertyId}`);
}

export async function markSoldAction(propertyId: string) {
  const user = await assertRole("SELLER");
  await ownProperty(propertyId, user.id);
  await transitionProperty(propertyId, "SOLD", { actorType: "USER", actorId: user.id, reason: "Seller marked sold" });
  revalidatePath(`/seller/properties/${propertyId}`);
}

// --- Photos ---
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"];

export async function uploadPhotosAction(propertyId: string, formData: FormData) {
  const user = await assertRole("SELLER");
  await ownProperty(propertyId, user.id);
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const existing = await prisma.propertyPhoto.count({ where: { propertyId } });
  let position = existing;
  for (const file of files.slice(0, 20)) {
    if (!ALLOWED_IMAGE.includes(file.type)) continue;
    if (file.size > MAX_PHOTO_BYTES) continue;
    const buf = Buffer.from(await file.arrayBuffer());
    const key = storage().buildKey("public", "properties", propertyId, `photo-${position}`);
    const stored = await storage().put({ key, data: buf, contentType: file.type, visibility: "public" });
    await prisma.propertyPhoto.create({ data: { propertyId, storageKey: stored.key, position, caption: sanitizeText(file.name) } });
    position++;
  }
  await assessProperty(propertyId);
  revalidatePath(`/seller/properties/${propertyId}`);
}

export async function reorderPhotoAction(propertyId: string, photoId: string, direction: "up" | "down") {
  const user = await assertRole("SELLER");
  await ownProperty(propertyId, user.id);
  const photos = await prisma.propertyPhoto.findMany({ where: { propertyId }, orderBy: { position: "asc" } });
  const idx = photos.findIndex((p) => p.id === photoId);
  if (idx < 0) return;
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= photos.length) return;
  await prisma.$transaction([
    prisma.propertyPhoto.update({ where: { id: photos[idx].id }, data: { position: photos[swapWith].position } }),
    prisma.propertyPhoto.update({ where: { id: photos[swapWith].id }, data: { position: photos[idx].position } }),
  ]);
  revalidatePath(`/seller/properties/${propertyId}`);
}

export async function deletePhotoAction(propertyId: string, photoId: string) {
  const user = await assertRole("SELLER");
  await ownProperty(propertyId, user.id);
  const photo = await prisma.propertyPhoto.findUnique({ where: { id: photoId } });
  if (photo && photo.propertyId === propertyId) {
    await storage().delete(photo.storageKey);
    await prisma.propertyPhoto.delete({ where: { id: photoId } });
    await assessProperty(propertyId);
  }
  revalidatePath(`/seller/properties/${propertyId}`);
}

// --- Private supporting documents ---
const MAX_DOC_BYTES = 15 * 1024 * 1024;
const ALLOWED_DOC = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export async function uploadDocumentAction(propertyId: string, formData: FormData) {
  const user = await assertRole("SELLER");
  await ownProperty(propertyId, user.id);
  const file = formData.get("file");
  const docType = String(formData.get("docType") ?? "OTHER");
  if (!(file instanceof File) || file.size === 0) redirect(`/seller/properties/${propertyId}/edit`);
  const f = file as File;
  if (!ALLOWED_DOC.includes(f.type) || f.size > MAX_DOC_BYTES) redirect(`/seller/properties/${propertyId}/edit?derr=1`);

  const buf = Buffer.from(await f.arrayBuffer());
  const key = storage().buildKey("private", "documents", propertyId, sanitizeText(f.name));
  const stored = await storage().put({ key, data: buf, contentType: f.type, visibility: "private" });
  await prisma.propertyDocument.create({
    data: {
      propertyId,
      storageKey: stored.key,
      filename: sanitizeText(f.name).slice(0, 200),
      docType: docType as "DISCLOSURE" | "TITLE" | "INSPECTION" | "SURVEY" | "PREAPPROVAL" | "PROOF_OF_FUNDS" | "OTHER",
      contentType: f.type,
      sizeBytes: f.size,
      uploadedById: user.id,
    },
  });
  revalidatePath(`/seller/properties/${propertyId}/edit`);
}

export async function deleteDocumentAction(propertyId: string, documentId: string) {
  const user = await assertRole("SELLER");
  await ownProperty(propertyId, user.id);
  const doc = await prisma.propertyDocument.findUnique({ where: { id: documentId } });
  if (doc && doc.propertyId === propertyId) {
    await storage().delete(doc.storageKey);
    await prisma.propertyDocument.delete({ where: { id: documentId } });
  }
  revalidatePath(`/seller/properties/${propertyId}/edit`);
}

// --- Showing responses ---
export async function respondShowingAction(showingId: string, decision: "CONFIRMED" | "DECLINED", slot?: string) {
  const user = await assertRole("SELLER");
  const showing = await prisma.showingRequest.findUnique({ where: { id: showingId } });
  if (!showing || showing.sellerId !== user.id) redirect("/seller/showings");
  const { respondToShowing } = await import("@/services/showings");
  await respondToShowing(showingId, decision, slot);
  revalidatePath("/seller/showings");
}
