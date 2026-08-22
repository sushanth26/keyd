// Property-data enrichment provider abstraction.
//
// "seed" driver derives an estimated value range and mock comparables from seeded
// per-city price-per-sqft baselines for DFW. A real integration (ATTOM, county
// records, AVM vendor) would replace this driver only.
import { env } from "@/lib/env";

export interface EnrichmentInput {
  city: string;
  zip: string;
  squareFeet: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  yearBuilt: number | null;
  askingPrice: number | null;
}

export interface Comparable {
  address: string;
  soldPrice: number;
  squareFeet: number;
  distanceMiles: number;
}

export interface EnrichmentResult {
  provider: string;
  estimatedValueLow: number | null;
  estimatedValueHigh: number | null;
  pricePerSqft: number | null;
  comparables: Comparable[];
  neighborhood: string | null;
  /// Data-quality signal for downstream warnings, e.g. asking price far outside estimate.
  priceAssessment: "in_range" | "above_range" | "below_range" | "unknown";
  confidence: number;
}

// Seeded median $/sqft baselines for the initial DFW market (illustrative, not appraisal).
const CITY_PPSF: Record<string, number> = {
  Allen: 245,
  Frisco: 265,
  Plano: 250,
  McKinney: 235,
  Prosper: 275,
  Wylie: 215,
  "The Colony": 230,
  "Little Elm": 220,
};
const DEFAULT_PPSF = 235;

class SeedEnrichment {
  async enrich(input: EnrichmentInput): Promise<EnrichmentResult> {
    const ppsf = CITY_PPSF[input.city] ?? DEFAULT_PPSF;
    if (!input.squareFeet) {
      return {
        provider: "seed",
        estimatedValueLow: null,
        estimatedValueHigh: null,
        pricePerSqft: ppsf,
        comparables: [],
        neighborhood: input.city,
        priceAssessment: "unknown",
        confidence: 0.4,
      };
    }
    const mid = Math.round(input.squareFeet * ppsf);
    const estimatedValueLow = Math.round(mid * 0.92);
    const estimatedValueHigh = Math.round(mid * 1.08);

    // Deterministic pseudo-comparables (no randomness — reproducible).
    const comparables: Comparable[] = [0, 1, 2].map((i) => {
      const sizeDelta = [-120, 80, 200][i];
      const sqft = Math.max(600, input.squareFeet! + sizeDelta);
      const priceFactor = [0.97, 1.0, 1.05][i];
      return {
        address: `${1200 + i * 37} ${["Maple", "Cedar", "Bluebonnet"][i]} Ln, ${input.city}, TX ${input.zip}`,
        soldPrice: Math.round(sqft * ppsf * priceFactor),
        squareFeet: sqft,
        distanceMiles: [0.4, 0.7, 1.1][i],
      };
    });

    let priceAssessment: EnrichmentResult["priceAssessment"] = "unknown";
    if (input.askingPrice != null) {
      if (input.askingPrice < estimatedValueLow * 0.9) priceAssessment = "below_range";
      else if (input.askingPrice > estimatedValueHigh * 1.1) priceAssessment = "above_range";
      else priceAssessment = "in_range";
    }

    return {
      provider: "seed",
      estimatedValueLow,
      estimatedValueHigh,
      pricePerSqft: ppsf,
      comparables,
      neighborhood: input.city,
      priceAssessment,
      confidence: 0.7,
    };
  }
}

export interface EnrichmentProvider {
  enrich(input: EnrichmentInput): Promise<EnrichmentResult>;
}

let instance: EnrichmentProvider | null = null;
export function enrichment(): EnrichmentProvider {
  if (instance) return instance;
  instance = new SeedEnrichment();
  return instance;
}
