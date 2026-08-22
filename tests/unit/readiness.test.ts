import { describe, it, expect } from "vitest";
import { computeReadiness, type ReadinessInput } from "@/domain/readiness";

function fullyReady(overrides: Partial<ReadinessInput> = {}): ReadinessInput {
  return {
    emailVerified: true,
    phoneVerified: true,
    identityVerified: true,
    ownershipVerified: true,
    hasAddress: true,
    presentFacts: {
      bedrooms: true,
      bathrooms: true,
      squareFeet: true,
      yearBuilt: true,
      propertyType: true,
    },
    hasAskingPrice: true,
    photoCount: 6,
    disclosuresTotal: 5,
    disclosuresAcknowledged: 5,
    showingWindowCount: 2,
    warnings: [],
    ...overrides,
  };
}

describe("market readiness scoring", () => {
  it("scores a fully complete, verified listing at 100 and marks it publishable", () => {
    const r = computeReadiness(fullyReady());
    expect(r.score).toBe(100);
    expect(r.publishable).toBe(true);
    expect(r.blockers).toHaveLength(0);
  });

  it("blocks publishing when identity is not verified", () => {
    const r = computeReadiness(fullyReady({ identityVerified: false }));
    expect(r.publishable).toBe(false);
    expect(r.blockers.some((b) => /identity/i.test(b))).toBe(true);
    expect(r.score).toBeLessThan(100);
  });

  it("blocks publishing when ownership is not verified", () => {
    const r = computeReadiness(fullyReady({ ownershipVerified: false }));
    expect(r.publishable).toBe(false);
    expect(r.blockers.some((b) => /ownership/i.test(b))).toBe(true);
  });

  it("blocks publishing with too few photos and reports how many are needed", () => {
    const r = computeReadiness(fullyReady({ photoCount: 2 }));
    expect(r.publishable).toBe(false);
    const photos = r.components.find((c) => c.key === "photos")!;
    expect(photos.ok).toBe(false);
    expect(photos.detail).toMatch(/3 more/);
  });

  it("requires an asking price to publish", () => {
    const r = computeReadiness(fullyReady({ hasAskingPrice: false }));
    expect(r.publishable).toBe(false);
    expect(r.blockers.some((b) => /asking price/i.test(b))).toBe(true);
  });

  it("lists each missing required fact as a blocker", () => {
    const r = computeReadiness(
      fullyReady({
        presentFacts: { bedrooms: false, bathrooms: false, squareFeet: true, yearBuilt: true, propertyType: true },
      }),
    );
    expect(r.publishable).toBe(false);
    expect(r.blockers.some((b) => /bedrooms/.test(b) && /bathrooms/.test(b))).toBe(true);
  });

  it("deducts points for outstanding warnings but never below zero", () => {
    const clean = computeReadiness(fullyReady());
    const warned = computeReadiness(fullyReady({ warnings: ["price is an outlier vs comps", "sqft inconsistent"] }));
    expect(warned.score).toBeLessThan(clean.score);
    expect(warned.score).toBeGreaterThanOrEqual(0);
  });

  it("caps the warning penalty", () => {
    const many = computeReadiness(fullyReady({ warnings: Array(20).fill("w") }));
    // Max penalty is 20 points; a perfect base of 100 should land at exactly 80.
    expect(many.score).toBe(80);
  });

  it("gives partial credit for partial photo and disclosure completion", () => {
    const r = computeReadiness(fullyReady({ photoCount: 3, disclosuresAcknowledged: 2, disclosuresTotal: 5 }));
    const photos = r.components.find((c) => c.key === "photos")!;
    const disc = r.components.find((c) => c.key === "disclosures")!;
    expect(photos.earned).toBeGreaterThan(0);
    expect(photos.earned).toBeLessThan(photos.max);
    expect(disc.earned).toBeGreaterThan(0);
    expect(disc.earned).toBeLessThan(disc.max);
  });
});
