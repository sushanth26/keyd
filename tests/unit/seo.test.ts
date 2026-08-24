import { describe, it, expect } from "vitest";
import { normalizeBaseUrl } from "@/lib/seo/config";
import { slugifyPart, propertyPath, listingIdFromSegment, statePath, cityPath, absoluteUrl } from "@/lib/seo/urls";
import { buildMetadata, clampDescription, noindexMetadata } from "@/lib/seo/metadata";
import { propertyJsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";

describe("normalizeBaseUrl (production crash guard)", () => {
  it("adds https:// to a protocol-less domain (the keyd.live crash case)", () => {
    expect(normalizeBaseUrl("www.keyd.live")).toBe("https://www.keyd.live");
    expect(normalizeBaseUrl("keyd.live")).toBe("https://keyd.live");
  });
  it("keeps a valid URL and strips trailing slashes / paths", () => {
    expect(normalizeBaseUrl("https://keyd.live/")).toBe("https://keyd.live");
    expect(normalizeBaseUrl("http://localhost:3000")).toBe("http://localhost:3000");
  });
  it("falls back to localhost for empty or unparseable values", () => {
    expect(normalizeBaseUrl("")).toBe("http://localhost:3000");
    expect(normalizeBaseUrl("   ")).toBe("http://localhost:3000");
    expect(normalizeBaseUrl(undefined)).toBe("http://localhost:3000");
  });
  it("never throws, so metadataBase = new URL(baseUrl) is always safe", () => {
    for (const v of ["www.x.com", "bad url", "", "ftp://x", "https://ok.com"]) {
      expect(() => new URL(normalizeBaseUrl(v))).not.toThrow();
    }
  });
});

describe("SEO URL builders", () => {
  it("slugifies location parts", () => {
    expect(slugifyPart("The Colony")).toBe("the-colony");
    expect(slugifyPart("McKinney")).toBe("mckinney");
  });
  it("builds canonical property paths with the id as the final token", () => {
    const p = { id: "clabc123", slug: "1204-bluebonnet-trail-75034", state: "TX", city: "Frisco" };
    expect(propertyPath(p)).toBe("/homes/tx/frisco/1204-bluebonnet-trail-75034-clabc123");
  });
  it("extracts the listing id from a segment", () => {
    expect(listingIdFromSegment("1204-bluebonnet-trail-75034-clabc123")).toBe("clabc123");
    expect(listingIdFromSegment("")).toBeNull();
  });
  it("builds state/city paths", () => {
    expect(statePath("TX")).toBe("/homes-for-sale/tx");
    expect(cityPath("TX", "Little Elm")).toBe("/homes-for-sale/tx/little-elm");
  });
  it("makes absolute URLs and passes through absolute inputs", () => {
    expect(absoluteUrl("/x")).toMatch(/^https?:\/\/.+\/x$/);
    expect(absoluteUrl("https://a.com/y")).toBe("https://a.com/y");
  });
});

describe("metadata generator", () => {
  it("emits title, canonical, and index directives by default", () => {
    const m = buildMetadata({ title: "T", description: "D", path: "/homes-for-sale" });
    expect(m.title).toBe("T");
    expect(m.alternates?.canonical).toMatch(/\/homes-for-sale$/);
    expect(m.robots).toMatchObject({ index: true, follow: true });
    expect(m.openGraph?.title).toBe("T");
    expect((m.twitter as { card?: string })?.card).toBe("summary_large_image");
  });
  it("supports noindex for thin/parameterized pages", () => {
    const m = buildMetadata({ title: "T", description: "D", path: "/search", index: false });
    expect(m.robots).toMatchObject({ index: false });
  });
  it("clamps long descriptions without cutting mid-word", () => {
    const long = "word ".repeat(60);
    const out = clampDescription(long, 50);
    expect(out.length).toBeLessThanOrEqual(51);
    expect(out.endsWith("…")).toBe(true);
  });
  it("noindexMetadata blocks indexing", () => {
    expect(noindexMetadata.robots).toMatchObject({ index: false, follow: false });
  });
});

describe("property JSON-LD (privacy)", () => {
  const input = {
    id: "clabc123",
    url: "https://keyd.live/homes/tx/frisco/x-clabc123",
    headline: "4BR Home in Frisco",
    description: "Nice home",
    addressLine1: "1204 Bluebonnet Trail",
    city: "Frisco",
    state: "TX",
    zip: "75034",
    propertyType: "SINGLE_FAMILY" as const,
    status: "ACTIVE" as const,
    askingPrice: 615000,
    bedrooms: 4,
    bathrooms: 3,
    squareFeet: 2850,
    images: ["https://keyd.live/api/media/x.jpg"],
    publishedAt: null,
  };

  it("produces a residence + offer graph with public facts only", () => {
    const ld = propertyJsonLd(input) as { "@graph": Record<string, unknown>[] };
    const residence = ld["@graph"][0];
    const offer = ld["@graph"][1];
    expect(residence["@type"]).toBe("SingleFamilyResidence");
    expect((residence.address as Record<string, unknown>).addressLocality).toBe("Frisco");
    expect(residence.numberOfBedrooms).toBe(4);
    expect(offer["@type"]).toBe("Offer");
    expect(offer.price).toBe(615000);
    expect(offer.priceCurrency).toBe("USD");
  });

  it("never includes seller PII fields", () => {
    const serialized = JSON.stringify(propertyJsonLd(input));
    for (const forbidden of ["email", "telephone", "phone", "sellerId", "accountId"]) {
      expect(serialized.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });

  it("breadcrumb has ordered positions", () => {
    const bc = breadcrumbJsonLd([
      { name: "Homes", path: "/homes-for-sale" },
      { name: "TX", path: "/homes-for-sale/tx" },
    ]) as { itemListElement: { position: number }[] };
    expect(bc.itemListElement.map((i) => i.position)).toEqual([1, 2]);
  });
});
