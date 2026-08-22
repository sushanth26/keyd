import { describe, it, expect } from "vitest";
import { screenFairHousing, screenMany } from "@/domain/fair-housing";

describe("fair-housing screening", () => {
  it("flags familial-status steering", () => {
    expect(screenFairHousing("Perfect for a family with kids").length).toBeGreaterThan(0);
    expect(screenFairHousing("This family-friendly home").length).toBeGreaterThan(0);
  });

  it("flags religion, safety, and school-quality proxies", () => {
    expect(screenFairHousing("Near a great church").length).toBeGreaterThan(0);
    expect(screenFairHousing("In a safe neighborhood").length).toBeGreaterThan(0);
    expect(screenFairHousing("Zoned for good schools").length).toBeGreaterThan(0);
  });

  it("passes neutral, property-focused copy", () => {
    expect(screenFairHousing("4 bedroom home with an updated kitchen and covered patio")).toHaveLength(0);
    expect(screenFairHousing("Spacious lot with a pool and three-car garage")).toHaveLength(0);
  });

  it("screenMany aggregates across fields", () => {
    const flags = screenMany(["Great home", "adults only", null, "family-friendly"]);
    expect(flags.length).toBe(2);
  });
});
