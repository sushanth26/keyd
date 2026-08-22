import { describe, it, expect } from "vitest";
import { computeMatch, MATCH_THRESHOLD, type MatchPreferences, type MatchProperty } from "@/domain/matching";

const property: MatchProperty = {
  city: "Frisco",
  askingPrice: 600000,
  bedrooms: 4,
  bathrooms: 3,
  propertyType: "SINGLE_FAMILY",
  features: ["Pool", "Updated Kitchen"],
};

function prefs(over: Partial<MatchPreferences> = {}): MatchPreferences {
  return {
    preferredCities: ["Frisco"],
    minPrice: 400000,
    maxPrice: 700000,
    minBedrooms: 3,
    minBathrooms: 2,
    propertyTypes: ["SINGLE_FAMILY"],
    moveInTimeframe: "WITHIN_3_MONTHS",
    financingReadiness: "PREAPPROVED",
    desiredFeatures: ["Pool"],
    ...over,
  };
}

describe("buyer matching", () => {
  it("scores a strong match highly and marks it eligible", () => {
    const r = computeMatch(property, prefs());
    expect(r.eligible).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(MATCH_THRESHOLD);
  });

  it("excludes properties in a non-preferred city", () => {
    const r = computeMatch(property, prefs({ preferredCities: ["Plano"] }));
    expect(r.eligible).toBe(false);
    expect(r.score).toBe(0);
  });

  it("excludes properties above the max price band", () => {
    const r = computeMatch(property, prefs({ maxPrice: 500000 }));
    expect(r.eligible).toBe(false);
  });

  it("lowers score when desired features are missing", () => {
    const withFeature = computeMatch(property, prefs({ desiredFeatures: ["Pool"] })).score;
    const withoutFeature = computeMatch(property, prefs({ desiredFeatures: ["Tennis Court"] })).score;
    expect(withoutFeature).toBeLessThan(withFeature);
  });

  it("treats empty city preference as no city filter", () => {
    const r = computeMatch(property, prefs({ preferredCities: [] }));
    expect(r.eligible).toBe(true);
  });
});
