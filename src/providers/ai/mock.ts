// Deterministic, fact-grounded mock AI. Produces professional listing copy using
// ONLY the facts provided (no invented numbers, schools, or neighborhood claims) and
// deliberately avoids fair-housing-risky language.
import type {
  AIProvider,
  GeneratedListing,
  ListingFacts,
  MissingInfoFinding,
  PhotoAdvice,
} from "./index";
import { MIN_PHOTOS } from "@/domain/constants";

function money(n: number | null): string {
  return n == null ? "" : `$${n.toLocaleString("en-US")}`;
}

function factList(f: ListingFacts): string[] {
  const parts: string[] = [];
  if (f.bedrooms != null) parts.push(`${f.bedrooms} bedroom${f.bedrooms === 1 ? "" : "s"}`);
  if (f.bathrooms != null) parts.push(`${f.bathrooms} bath${f.bathrooms === 1 ? "" : "s"}`);
  if (f.squareFeet != null) parts.push(`${f.squareFeet.toLocaleString("en-US")} sq ft`);
  if (f.garageSpaces != null && f.garageSpaces > 0) parts.push(`${f.garageSpaces}-car garage`);
  if (f.stories != null) parts.push(`${f.stories}-story`);
  if (f.yearBuilt != null) parts.push(`built ${f.yearBuilt}`);
  return parts;
}

function typeLabel(t: string): string {
  return (
    {
      SINGLE_FAMILY: "single-family home",
      TOWNHOUSE: "townhouse",
      CONDO: "condominium",
      MULTI_FAMILY: "multi-family home",
      LAND: "lot",
      OTHER: "property",
    }[t] ?? "home"
  );
}

export class MockAI implements AIProvider {
  async generateListing(f: ListingFacts): Promise<GeneratedListing> {
    const facts = factList(f);
    const type = typeLabel(f.propertyType);
    const location = `${f.city}, ${f.state}`;
    const feature = f.features[0];

    const headline = [
      f.bedrooms != null ? `${f.bedrooms}BR` : null,
      f.bathrooms != null ? `${f.bathrooms}BA` : null,
      capitalize(type),
      `in ${f.city}`,
      feature ? `— ${feature}` : null,
    ]
      .filter(Boolean)
      .join(" ");

    const sentences: string[] = [];
    sentences.push(
      `This ${type} in ${location} offers ${facts.length ? facts.join(", ") : "a comfortable layout"}.`,
    );
    if (f.features.length) {
      sentences.push(`Notable features include ${joinNatural(f.features)}.`);
    }
    if (f.lotSizeSqft) {
      sentences.push(`The property sits on a ${f.lotSizeSqft.toLocaleString("en-US")} sq ft lot.`);
    }
    if (f.improvements && f.improvements.trim()) {
      sentences.push(`Recent improvements: ${f.improvements.trim()}.`);
    }
    if (f.hoaFeeMonthly != null) {
      sentences.push(
        f.hoaFeeMonthly > 0 ? `HOA dues are ${money(f.hoaFeeMonthly)}/month.` : `There are no HOA dues.`,
      );
    }
    sentences.push(`Listed directly by the owner on Keyd — contact the owner to schedule a private showing.`);
    const description = sentences.join(" ");

    const highlights = [
      ...facts.map(capitalize),
      ...f.features.slice(0, 6),
      f.askingPrice ? `Offered at ${money(f.askingPrice)}` : null,
    ]
      .filter(Boolean)
      .slice(0, 8) as string[];

    const buyerFaq = [
      {
        question: "How do I schedule a showing?",
        answer:
          "Use the “Request a showing” button on the listing to propose times. The owner will confirm, decline, or suggest alternatives.",
      },
      {
        question: "Is this listed with an agent?",
        answer: "No. This home is listed directly by the owner on Keyd. Keyd does not represent either party.",
      },
      {
        question: "How do I express interest?",
        answer:
          "You can submit a structured, non-binding interest form with your proposed price and terms. It is not a binding offer.",
      },
      f.hoaFeeMonthly != null
        ? {
            question: "Are there HOA dues?",
            answer:
              f.hoaFeeMonthly > 0
                ? `Yes, HOA dues are ${money(f.hoaFeeMonthly)} per month.`
                : "No, this property has no HOA dues.",
          }
        : null,
    ].filter(Boolean) as { question: string; answer: string }[];

    const shortDesc = `${f.bedrooms ?? ""}BR/${f.bathrooms ?? ""}BA ${type} in ${f.city}${
      f.askingPrice ? ` — ${money(f.askingPrice)}` : ""
    }`;

    const socialCaptions = {
      short: shortDesc,
      long: `${headline}. ${facts.join(", ")}. ${
        f.features.length ? `Features: ${f.features.slice(0, 4).join(", ")}. ` : ""
      }Listed by owner on Keyd.`,
      twitter: `${shortDesc} 🏡 Listed by owner on Keyd. #${f.city.replace(/\s/g, "")}Homes #ForSaleByOwner`,
      facebook: `Just listed by owner in ${location}: ${headline}. ${
        f.askingPrice ? `Offered at ${money(f.askingPrice)}. ` : ""
      }Message the owner directly through Keyd to schedule a showing.`,
      instagram: `${headline} ✨\n${facts.join(" • ")}\nListed by owner on Keyd\n#${f.city.replace(/\s/g, "")} #ForSaleByOwner #DFWHomes`,
    };

    const openHouseCopy = `Open House — ${headline}\n${facts.join(" • ")}\n${
      f.askingPrice ? `Offered at ${money(f.askingPrice)}\n` : ""
    }Listed directly by the owner. Stop by to tour the home and meet the owner. Details and directions available on the Keyd listing page.`;

    const emailSummary = `${headline}\n\n${description}\n\n${
      f.askingPrice ? `Asking price: ${money(f.askingPrice)}\n` : ""
    }View the full listing and photos on Keyd.`;

    // Confidence reflects how complete the input facts were.
    const filled = [f.bedrooms, f.bathrooms, f.squareFeet, f.yearBuilt, f.askingPrice].filter((v) => v != null).length;
    const confidence = 0.55 + 0.09 * filled; // 0.55..1.0

    return {
      headline,
      description,
      highlights,
      buyerFaq,
      socialCaptions,
      openHouseCopy,
      emailSummary,
      confidence: Math.min(1, confidence),
    };
  }

  async findMissingInfo(f: ListingFacts, photoCount: number): Promise<MissingInfoFinding[]> {
    const findings: MissingInfoFinding[] = [];
    const req: [keyof ListingFacts, string][] = [
      ["bedrooms", "Number of bedrooms"],
      ["bathrooms", "Number of bathrooms"],
      ["squareFeet", "Square footage"],
      ["yearBuilt", "Year built"],
      ["propertyType", "Property type"],
    ];
    for (const [key, label] of req) {
      if (f[key] == null) findings.push({ field: key as string, message: `${label} is required.`, severity: "BLOCKER" });
    }
    if (f.askingPrice == null)
      findings.push({ field: "askingPrice", message: "Set an asking price.", severity: "BLOCKER" });
    if (photoCount < MIN_PHOTOS)
      findings.push({
        field: "photos",
        message: `Add at least ${MIN_PHOTOS} photos (${photoCount} uploaded).`,
        severity: "BLOCKER",
      });
    if (f.features.length === 0)
      findings.push({ field: "features", message: "Add a few standout features to strengthen the listing.", severity: "WARNING" });
    if (!f.improvements)
      findings.push({
        field: "improvements",
        message: "Describe recent improvements or upgrades (optional but recommended).",
        severity: "INFO",
      });
    if (f.lotSizeSqft == null)
      findings.push({ field: "lotSizeSqft", message: "Lot size helps buyers compare properties.", severity: "INFO" });
    return findings;
  }

  async advisePhotos(f: ListingFacts, photoCount: number): Promise<PhotoAdvice> {
    const recs: string[] = [];
    if (photoCount < MIN_PHOTOS) recs.push(`Upload at least ${MIN_PHOTOS} photos; ${photoCount} added so far.`);
    recs.push("Lead with a bright, straight-on exterior/front photo.");
    recs.push("Include the kitchen, primary bedroom, primary bath, and living area.");
    if (f.features.some((x) => /pool|yard|patio|deck/i.test(x))) recs.push("Show outdoor features (pool, yard, patio) in daylight.");
    recs.push("Shoot in landscape orientation with lights on and blinds open.");
    return { photoCount, recommendations: recs };
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function joinNatural(items: string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
