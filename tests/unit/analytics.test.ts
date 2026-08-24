import { describe, it, expect, beforeEach, vi } from "vitest";
import { priceRange, sendEvent, analytics } from "@/lib/analytics/events";

// analyticsEnabled() is false in tests (no NEXT_PUBLIC_GA4_MEASUREMENT_ID), so events
// must be no-ops — GA must never receive hits from automated tests.
describe("analytics gating", () => {
  beforeEach(() => {
    (globalThis as unknown as { window?: unknown }).window = {
      gtag: vi.fn(),
      dataLayer: [],
      location: { origin: "https://keyd.live" },
    };
  });

  it("does not call gtag when analytics is disabled (no measurement id)", () => {
    const gtag = (globalThis as unknown as { window: { gtag: ReturnType<typeof vi.fn> } }).window.gtag;
    sendEvent("view_item", { listing_id: "abc" });
    analytics.contactSeller({ listing_id: "abc", contact_method: "message" });
    expect(gtag).not.toHaveBeenCalled();
  });
});

describe("priceRange bucketing (no raw values sent)", () => {
  it("buckets prices into coarse ranges", () => {
    expect(priceRange(null, 250000)).toBe("under_300k");
    expect(priceRange(null, 400000)).toBe("300k_500k");
    expect(priceRange(null, 600000)).toBe("500k_750k");
    expect(priceRange(null, 900000)).toBe("750k_1m");
    expect(priceRange(null, 1500000)).toBe("over_1m");
    expect(priceRange(null, null)).toBeUndefined();
  });
});
