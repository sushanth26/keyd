// Integration test: property creation → AI onboarding workflow → publish → buyer match.
// Exercises the real database, background worker, providers, and lifecycle rules.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { publishEvent } from "@/events/bus";
import { drainOnce } from "@/jobs/runner";
import { publishListingGuarded } from "@/services/publish";

const stamp = Date.now();
const sellerEmail = `it-seller-${stamp}@keyd.local`;
const buyerEmail = `it-buyer-${stamp}@keyd.local`;
let sellerId = "";
let buyerId = "";
let propertyId = "";

async function drainAll() {
  for (let i = 0; i < 15; i++) {
    if ((await drainOnce()) === 0) break;
  }
}

beforeAll(async () => {
  const hash = await bcrypt.hash("Password123!", 8);
  const seller = await prisma.user.create({
    data: { email: sellerEmail, fullName: "IT Seller", role: "SELLER", passwordHash: hash, phone: "214-555-7777", emailVerifiedAt: new Date(), phoneVerifiedAt: new Date(), identityStatus: "VERIFIED" },
  });
  sellerId = seller.id;
  const buyer = await prisma.user.create({
    data: { email: buyerEmail, fullName: "IT Buyer", role: "BUYER", passwordHash: hash, phone: "469-555-7777", emailVerifiedAt: new Date(), phoneVerifiedAt: new Date() },
  });
  buyerId = buyer.id;
  await prisma.buyerProfile.create({
    data: { userId: buyer.id, preferredCities: ["Frisco"], minPrice: 300000, maxPrice: 800000, minBedrooms: 3, minBathrooms: 2, propertyTypes: ["SINGLE_FAMILY"], desiredFeatures: ["Pool"], notifyOnMatch: true },
  });
  const property = await prisma.property.create({
    data: {
      slug: `it-${stamp}`, sellerId: seller.id, status: "DRAFT",
      addressLine1: "10 Integration Way", city: "Frisco", state: "TX", zip: "75034", propertyType: "SINGLE_FAMILY",
      askingPrice: 640000, bedrooms: 4, bathrooms: 3, squareFeet: 2600, yearBuilt: 2017,
      features: ["Pool", "Updated Kitchen"], improvements: "New roof 2023",
      disclosures: [{ key: "sellers_disclosure", label: "x", acknowledged: true }],
      showingAvailability: [{ dayOfWeek: "Saturday", start: "10:00", end: "16:00" }],
    },
  });
  propertyId = property.id;
  for (let i = 0; i < 5; i++) {
    await prisma.propertyPhoto.create({ data: { propertyId: property.id, storageKey: `public/it/${stamp}-${i}`, position: i } });
  }
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [sellerEmail, buyerEmail] } } });
  await prisma.$disconnect();
});

describe("AI-first property onboarding + publication", () => {
  it("runs the workflow to READY_FOR_REVIEW and generates content", async () => {
    await publishEvent("property.created", { propertyId, sellerId });
    await drainAll();

    const p = await prisma.property.findUniqueOrThrow({ where: { id: propertyId }, include: { workflowRuns: true, recommendations: true } });
    expect(p.status).toBe("READY_FOR_REVIEW");
    expect(p.aiContentStatus).toBe("GENERATED");
    expect(p.headline).toBeTruthy();
    expect(p.description).toContain("Frisco");
    expect(p.readinessScore).toBeGreaterThan(80);
    expect(p.workflowRuns[0]?.status).toBe("COMPLETED");
  });

  it("records provenance and confidence for AI content", async () => {
    const prov = await prisma.dataProvenance.findMany({ where: { propertyId, source: "AI" } });
    expect(prov.length).toBeGreaterThan(0);
    expect(prov.some((x) => x.field === "headline" && x.confidence != null)).toBe(true);
  });

  it("is idempotent — re-running the workflow does not duplicate or regress state", async () => {
    await publishEvent("property.created", { propertyId, sellerId });
    await drainAll();
    const runs = await prisma.workflowRun.count({ where: { propertyId } });
    expect(runs).toBe(1); // single WorkflowRun row (upsert on idempotency key)
  });

  it("blocks publishing until content is approved", async () => {
    const blocked = await publishListingGuarded(propertyId, sellerId);
    expect(blocked.ok).toBe(false);
  });

  it("publishes after approval and matches + notifies the buyer", async () => {
    await prisma.property.update({ where: { id: propertyId }, data: { aiContentStatus: "APPROVED", contentApprovedAt: new Date(), contentApprovedById: sellerId } });
    const published = await publishListingGuarded(propertyId, sellerId);
    expect(published.ok).toBe(true);

    const p = await prisma.property.findUniqueOrThrow({ where: { id: propertyId } });
    expect(p.status).toBe("ACTIVE");
    expect(p.publishedAt).toBeTruthy();

    // property.published enqueues matching — drain it.
    await drainAll();
    const match = await prisma.buyerMatch.findUnique({ where: { buyerId_propertyId: { buyerId, propertyId } } });
    expect(match).toBeTruthy();
    expect(match!.score).toBeGreaterThanOrEqual(0.6);

    const notif = await prisma.notification.findFirst({ where: { userId: buyerId, type: "NEW_BUYER_MATCH" } });
    expect(notif).toBeTruthy();
  });

  it("records lifecycle transitions in the audit trail", async () => {
    const transitions = await prisma.statusTransition.findMany({ where: { propertyId } });
    const toStatuses = transitions.map((t) => t.toStatus);
    expect(toStatuses).toContain("VERIFICATION_PENDING");
    expect(toStatuses).toContain("READY_FOR_REVIEW");
    expect(toStatuses).toContain("ACTIVE");
  });
});
