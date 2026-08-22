"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FinancingReadiness, FinancingType, MoveInTimeframe, PreapprovalStatus, PropertyType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertRole, getCurrentUser } from "@/lib/auth/current-user";
import { trackEvent, recordAudit } from "@/lib/audit";
import { notify } from "@/services/notifications";
import { redactContactInfo, sanitizeMultiline, sanitizeText } from "@/lib/sanitize";
import { checkRateLimit } from "@/lib/rate-limit";
import { createShowingRequest, submitShowingFeedback, bumpToInterestReceived } from "@/services/showings";
import { isPubliclyVisible } from "@/domain/lifecycle";
import { propertyPath } from "@/lib/seo/urls";

// --- Favorites ---
export async function toggleFavoriteAction(propertyId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const existing = await prisma.favorite.findUnique({ where: { userId_propertyId: { userId: user.id, propertyId } } });
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
  } else {
    await prisma.favorite.create({ data: { userId: user.id, propertyId } });
    await trackEvent({ type: "PROPERTY_SAVED", userId: user.id, propertyId });
  }
  revalidatePath("/buyer/favorites");
}

// --- Saved searches ---
export async function saveSearchAction(filters: Record<string, string>) {
  const user = await assertRole("BUYER");
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(filters)) if (v) clean[k] = sanitizeText(v);
  const name = [clean.city ?? "All DFW", clean.maxPrice ? `≤ $${Number(clean.maxPrice).toLocaleString()}` : "", clean.beds ? `${clean.beds}+ bd` : ""]
    .filter(Boolean)
    .join(" · ");
  await prisma.savedSearch.create({ data: { userId: user.id, name: name || "Saved search", filters: clean } });
  revalidatePath("/buyer/searches");
}

export async function deleteSavedSearchAction(id: string) {
  const user = await assertRole("BUYER");
  await prisma.savedSearch.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/buyer/searches");
}

// --- Preferences ---
export async function savePreferencesAction(formData: FormData) {
  const user = await assertRole("BUYER");
  const cities = formData.getAll("cities").map(String);
  const num = (k: string) => {
    const v = String(formData.get(k) ?? "").replace(/[^0-9.]/g, "");
    return v ? Number(v) : null;
  };
  await prisma.buyerProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });
  await prisma.buyerProfile.update({
    where: { userId: user.id },
    data: {
      preferredCities: cities,
      minPrice: num("minPrice") == null ? null : Math.round(num("minPrice")!),
      maxPrice: num("maxPrice") == null ? null : Math.round(num("maxPrice")!),
      minBedrooms: num("minBedrooms") == null ? null : Math.round(num("minBedrooms")!),
      minBathrooms: num("minBathrooms"),
      propertyTypes: formData.getAll("propertyTypes").map(String) as PropertyType[],
      moveInTimeframe: (String(formData.get("moveInTimeframe") ?? "") || null) as MoveInTimeframe | null,
      financingReadiness: (String(formData.get("financingReadiness") ?? "NOT_STARTED")) as FinancingReadiness,
      desiredFeatures: String(formData.get("desiredFeatures") ?? "").split(",").map(sanitizeText).filter(Boolean).slice(0, 15),
      notifyOnMatch: formData.get("notifyOnMatch") === "on",
    },
  });
  revalidatePath("/buyer/preferences");
  redirect("/buyer/preferences?saved=1");
}

// --- Messaging ---
async function getOrCreateConversation(propertyId: string, buyerId: string) {
  const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId } });
  if (property.sellerId === buyerId) throw new Error("You can't message yourself about your own listing.");
  return prisma.conversation.upsert({
    where: { propertyId_buyerId: { propertyId, buyerId } },
    create: { propertyId, buyerId, sellerId: property.sellerId },
    update: {},
    include: { property: true },
  });
}

export async function contactOwnerAction(propertyId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "BUYER") redirect("/login");

  const rl = await checkRateLimit(`inquiry:${user.id}`, 20, 60 * 60 * 1000);
  if (!rl.allowed) redirect(`/p/${(await prisma.property.findUniqueOrThrow({ where: { id: propertyId } })).slug}?err=rate`);

  const conversation = await getOrCreateConversation(propertyId, user.id);
  const raw = String(formData.get("message") ?? "");
  const { text, redacted } = redactContactInfo(raw);
  if (text.trim()) {
    await prisma.message.create({ data: { conversationId: conversation.id, senderId: user.id, body: text, redacted } });
    await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });
  }
  const isNew = await prisma.message.count({ where: { conversationId: conversation.id } });
  if (isNew <= 1) {
    await trackEvent({ type: "INQUIRY_CREATED", userId: user.id, propertyId });
    await notify({
      userId: conversation.sellerId,
      type: "NEW_INQUIRY",
      title: "New buyer inquiry",
      body: `A buyer messaged you about ${conversation.property.addressLine1}, ${conversation.property.city}.`,
      actionPath: "/seller/messages",
    });
  }
  redirect(`/messages/${conversation.id}?contacted=${propertyId}`);
}

export async function sendMessageAction(conversationId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const conversation = await prisma.conversation.findUniqueOrThrow({ where: { id: conversationId } });
  if (conversation.buyerId !== user.id && conversation.sellerId !== user.id) redirect("/");
  if (conversation.buyerBlocked || conversation.sellerBlocked) redirect(`/messages/${conversationId}?err=blocked`);

  const rl = await checkRateLimit(`msg:${user.id}`, 30, 10 * 60 * 1000);
  if (!rl.allowed) redirect(`/messages/${conversationId}?err=rate`);

  const { text, redacted } = redactContactInfo(String(formData.get("message") ?? ""));
  if (text.trim()) {
    await prisma.message.create({ data: { conversationId, senderId: user.id, body: text, redacted } });
    await prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });
    const recipient = user.id === conversation.buyerId ? conversation.sellerId : conversation.buyerId;
    await notify({
      userId: recipient,
      type: "NEW_INQUIRY",
      title: "New message",
      body: "You have a new message on Keyd.",
      actionPath: `/messages/${conversationId}`,
      sendEmail: false,
    });
  }
  revalidatePath(`/messages/${conversationId}`);
}

export async function blockConversationAction(conversationId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const c = await prisma.conversation.findUniqueOrThrow({ where: { id: conversationId } });
  const field = user.id === c.sellerId ? { buyerBlocked: true } : { sellerBlocked: true };
  await prisma.conversation.update({ where: { id: conversationId }, data: field });
  revalidatePath(`/messages/${conversationId}`);
}

// --- Showings ---
export async function requestShowingAction(propertyId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "BUYER") redirect("/login");
  const slots = formData.getAll("slots").map(String).filter(Boolean);
  const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId } });
  if (!isPubliclyVisible(property.status)) redirect(`/p/${property.slug}`);
  try {
    await createShowingRequest({ propertyId, buyerId: user.id, proposedSlots: slots, message: String(formData.get("message") ?? "") });
  } catch {
    redirect(`/p/${property.slug}?err=rate`);
  }
  redirect(`/buyer/showings?requested=1&listing=${propertyId}`);
}

export async function submitShowingFeedbackAction(showingId: string, formData: FormData) {
  const user = await assertRole("BUYER");
  await submitShowingFeedback(
    showingId,
    user.id,
    Number(formData.get("rating") ?? 3),
    String(formData.get("comments") ?? ""),
    formData.get("interested") === "on",
  );
  revalidatePath("/buyer/showings");
}

// --- Buyer interest (non-binding) ---
const interestSchema = z.object({
  proposedPrice: z.number().int().positive(),
  financingType: z.enum(["CASH", "CONVENTIONAL", "FHA", "VA", "OTHER"]),
  acknowledged: z.literal(true),
});

export async function submitInterestAction(propertyId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "BUYER") redirect("/login");
  const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId } });

  const parsed = interestSchema.safeParse({
    proposedPrice: Number(String(formData.get("proposedPrice") ?? "").replace(/[^0-9]/g, "")),
    financingType: String(formData.get("financingType") ?? "CONVENTIONAL"),
    acknowledged: formData.get("acknowledged") === "on" ? true : false,
  });
  if (!parsed.success) redirect(`/p/${property.slug}?ierr=1`);

  const contingencies = formData.getAll("contingencies").map(String);
  const closing = String(formData.get("preferredClosingDate") ?? "");
  await prisma.buyerInterest.create({
    data: {
      propertyId,
      buyerId: user.id,
      proposedPrice: parsed.data.proposedPrice,
      financingType: parsed.data.financingType as FinancingType,
      downPayment: Number(String(formData.get("downPayment") ?? "").replace(/[^0-9]/g, "")) || null,
      preapprovalStatus: (String(formData.get("preapprovalStatus") ?? "NONE")) as PreapprovalStatus,
      preferredClosingDate: closing ? new Date(closing) : null,
      contingencies,
      message: sanitizeMultiline(String(formData.get("message") ?? ""), 2000) || null,
      acknowledgedNonBinding: true,
    },
  });
  await bumpToInterestReceived(propertyId, user.id);
  await trackEvent({ type: "BUYER_INTEREST_SUBMITTED", userId: user.id, propertyId });
  await recordAudit(prisma, { actorType: "USER", actorId: user.id, action: "buyer_interest.submitted", entityType: "Property", entityId: propertyId });
  await notify({
    userId: property.sellerId,
    type: "BUYER_INTEREST_SUBMITTED",
    title: "New buyer interest received",
    body: `A buyer submitted structured interest on ${property.addressLine1}, ${property.city}. Review the details in your dashboard.`,
    actionPath: "/seller/interest",
  });
  redirect(`/p/${property.slug}?interest=1`);
}

// --- Reports (fraud / inaccurate) ---
export async function reportAction(propertyId: string, formData: FormData) {
  const user = await getCurrentUser();
  const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId } });
  await prisma.report.create({
    data: {
      reporterId: user?.id ?? null,
      propertyId,
      reason: (String(formData.get("reason") ?? "OTHER")) as "FRAUD" | "INACCURATE" | "SPAM" | "INAPPROPRIATE" | "DUPLICATE" | "OTHER",
      details: sanitizeMultiline(String(formData.get("details") ?? ""), 1000) || null,
    },
  });
  redirect(`/p/${property.slug}?reported=1`);
}
