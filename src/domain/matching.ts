// Pure buyer↔property matching. Uses ONLY housing-relevant criteria — never a
// protected characteristic or a proxy for one (see fair-housing safeguards).
import type { PropertyType, MoveInTimeframe, FinancingReadiness } from "@prisma/client";

export interface MatchProperty {
  city: string;
  askingPrice: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType: PropertyType;
  features: string[];
}

export interface MatchPreferences {
  preferredCities: string[];
  minPrice: number | null;
  maxPrice: number | null;
  minBedrooms: number | null;
  minBathrooms: number | null;
  propertyTypes: PropertyType[];
  moveInTimeframe: MoveInTimeframe | null;
  financingReadiness: FinancingReadiness;
  desiredFeatures: string[];
}

export interface MatchReason {
  factor: string;
  detail: string;
}

export interface MatchOutcome {
  score: number; // 0..1
  reasons: MatchReason[];
  /// Hard mismatch on a stated must-have (city or price band) — excluded entirely.
  eligible: boolean;
}

export function computeMatch(property: MatchProperty, prefs: MatchPreferences): MatchOutcome {
  const reasons: MatchReason[] = [];

  // City (hard filter when the buyer specified cities)
  const cityOk = prefs.preferredCities.length === 0 || prefs.preferredCities.includes(property.city);
  if (!cityOk) return { score: 0, reasons: [], eligible: false };
  if (prefs.preferredCities.includes(property.city)) reasons.push({ factor: "city", detail: `In preferred city ${property.city}` });

  // Price band (hard filter when out of range)
  if (property.askingPrice != null) {
    if (prefs.minPrice != null && property.askingPrice < prefs.minPrice) return { score: 0, reasons: [], eligible: false };
    if (prefs.maxPrice != null && property.askingPrice > prefs.maxPrice) return { score: 0, reasons: [], eligible: false };
    if (prefs.maxPrice != null || prefs.minPrice != null) reasons.push({ factor: "price", detail: "Within budget" });
  }

  // Weighted soft scoring
  let score = 0;
  let weight = 0;

  const add = (w: number, ok: boolean, factor: string, detail: string) => {
    weight += w;
    if (ok) {
      score += w;
      reasons.push({ factor, detail });
    }
  };

  add(0.25, cityOk, "city", "City preference met");
  add(
    0.2,
    prefs.minBedrooms == null || (property.bedrooms ?? 0) >= prefs.minBedrooms,
    "bedrooms",
    "Meets bedroom requirement",
  );
  add(
    0.15,
    prefs.minBathrooms == null || (property.bathrooms ?? 0) >= prefs.minBathrooms,
    "bathrooms",
    "Meets bathroom requirement",
  );
  add(
    0.15,
    prefs.propertyTypes.length === 0 || prefs.propertyTypes.includes(property.propertyType),
    "propertyType",
    "Matches property type",
  );

  // Desired features overlap
  const desired = prefs.desiredFeatures.map((f) => f.toLowerCase());
  const have = property.features.map((f) => f.toLowerCase());
  const overlap = desired.filter((d) => have.some((h) => h.includes(d) || d.includes(h)));
  if (desired.length) {
    const ratio = overlap.length / desired.length;
    weight += 0.25;
    score += 0.25 * ratio;
    if (overlap.length) reasons.push({ factor: "features", detail: `Has ${overlap.length}/${desired.length} desired features` });
  }

  const normalized = weight > 0 ? score / weight : 0;
  return { score: Math.round(normalized * 100) / 100, reasons, eligible: true };
}

/// Buyers scoring at or above this threshold are considered a match worth notifying.
export const MATCH_THRESHOLD = 0.6;
