// Market Readiness Score — pure, deterministic, and explainable.
//
// The score (0..100) is the sum of weighted components. `computeReadiness`
// takes a plain input object (decoupled from Prisma) so it is trivially unit-testable.
// `blockers` are the hard requirements that must be satisfied to publish.

import { MIN_PHOTOS } from "./constants";

export interface ReadinessInput {
  emailVerified: boolean;
  phoneVerified: boolean;
  identityVerified: boolean;
  ownershipVerified: boolean;
  hasAddress: boolean;
  presentFacts: {
    bedrooms: boolean;
    bathrooms: boolean;
    squareFeet: boolean;
    yearBuilt: boolean;
    propertyType: boolean;
  };
  hasAskingPrice: boolean;
  photoCount: number;
  disclosuresTotal: number;
  disclosuresAcknowledged: number;
  showingWindowCount: number;
  /// Outstanding data-quality warnings surfaced by the workflow (each deducts points).
  warnings: string[];
}

export interface ReadinessComponent {
  key: string;
  label: string;
  earned: number;
  max: number;
  ok: boolean;
  detail: string;
}

export interface ReadinessResult {
  score: number; // 0..100
  components: ReadinessComponent[];
  warnings: string[];
  /// Hard requirements not yet met — publishing is blocked until these are empty.
  blockers: string[];
  publishable: boolean;
}

const WEIGHTS = {
  contact: 10,
  identity: 15,
  ownership: 15,
  facts: 20,
  price: 10,
  photos: 15,
  disclosures: 8,
  showing: 7,
} as const;
// Sum = 100.

const WARNING_PENALTY = 4; // points per outstanding warning
const MAX_WARNING_PENALTY = 20;

export function computeReadiness(input: ReadinessInput): ReadinessResult {
  const components: ReadinessComponent[] = [];
  const blockers: string[] = [];

  // Contact verification (email + phone)
  {
    const both = input.emailVerified && input.phoneVerified;
    const earned = (input.emailVerified ? 0.5 : 0) * WEIGHTS.contact + (input.phoneVerified ? 0.5 : 0) * WEIGHTS.contact;
    components.push({
      key: "contact",
      label: "Contact verification",
      earned: Math.round(earned),
      max: WEIGHTS.contact,
      ok: both,
      detail: both
        ? "Email and phone verified."
        : `Verify ${[!input.emailVerified && "email", !input.phoneVerified && "phone"].filter(Boolean).join(" and ")}.`,
    });
  }

  // Seller identity verification
  components.push({
    key: "identity",
    label: "Seller identity verification",
    earned: input.identityVerified ? WEIGHTS.identity : 0,
    max: WEIGHTS.identity,
    ok: input.identityVerified,
    detail: input.identityVerified ? "Identity verified." : "Complete identity verification.",
  });
  if (!input.identityVerified) blockers.push("Seller identity must be verified before publishing.");

  // Ownership verification
  components.push({
    key: "ownership",
    label: "Ownership verification",
    earned: input.ownershipVerified ? WEIGHTS.ownership : 0,
    max: WEIGHTS.ownership,
    ok: input.ownershipVerified,
    detail: input.ownershipVerified ? "Ownership verified." : "Ownership of this property must be verified.",
  });
  if (!input.ownershipVerified) blockers.push("Property ownership must be verified before publishing.");

  // Required property details
  {
    const total = Object.keys(input.presentFacts).length + (input.hasAddress ? 1 : 0);
    const present = Object.values(input.presentFacts).filter(Boolean).length + (input.hasAddress ? 1 : 0);
    const denom = Object.keys(input.presentFacts).length + 1;
    const earned = Math.round((present / denom) * WEIGHTS.facts);
    const ok = present === denom;
    components.push({
      key: "facts",
      label: "Required property details",
      earned,
      max: WEIGHTS.facts,
      ok,
      detail: ok ? "All required facts provided." : `${present}/${denom} required details provided.`,
    });
    if (!input.hasAddress) blockers.push("A property address is required before publishing.");
    const missingFacts = Object.entries(input.presentFacts).filter(([, v]) => !v).map(([k]) => k);
    if (missingFacts.length) blockers.push(`Missing required facts: ${missingFacts.join(", ")}.`);
    void total;
  }

  // Asking price
  components.push({
    key: "price",
    label: "Asking-price information",
    earned: input.hasAskingPrice ? WEIGHTS.price : 0,
    max: WEIGHTS.price,
    ok: input.hasAskingPrice,
    detail: input.hasAskingPrice ? "Asking price set." : "Set an asking price.",
  });
  if (!input.hasAskingPrice) blockers.push("An asking price is required before publishing.");

  // Photo completeness
  {
    const ratio = Math.min(1, input.photoCount / MIN_PHOTOS);
    const earned = Math.round(ratio * WEIGHTS.photos);
    const ok = input.photoCount >= MIN_PHOTOS;
    components.push({
      key: "photos",
      label: "Photo completeness",
      earned,
      max: WEIGHTS.photos,
      ok,
      detail: ok
        ? `${input.photoCount} photos uploaded.`
        : `Add ${MIN_PHOTOS - input.photoCount} more photo(s) (minimum ${MIN_PHOTOS}).`,
    });
    if (!ok) blockers.push(`At least ${MIN_PHOTOS} photos are required before publishing.`);
  }

  // Disclosure checklist
  {
    const total = Math.max(1, input.disclosuresTotal);
    const ratio = Math.min(1, input.disclosuresAcknowledged / total);
    const earned = Math.round(ratio * WEIGHTS.disclosures);
    const ok = input.disclosuresAcknowledged >= input.disclosuresTotal && input.disclosuresTotal > 0;
    components.push({
      key: "disclosures",
      label: "Disclosure checklist",
      earned,
      max: WEIGHTS.disclosures,
      ok,
      detail: ok
        ? "Disclosure checklist complete."
        : `${input.disclosuresAcknowledged}/${input.disclosuresTotal} disclosures acknowledged.`,
    });
  }

  // Showing availability
  {
    const ok = input.showingWindowCount > 0;
    components.push({
      key: "showing",
      label: "Showing availability",
      earned: ok ? WEIGHTS.showing : 0,
      max: WEIGHTS.showing,
      ok,
      detail: ok ? `${input.showingWindowCount} availability window(s) set.` : "Add showing availability windows.",
    });
  }

  const rawScore = components.reduce((sum, c) => sum + c.earned, 0);
  const penalty = Math.min(MAX_WARNING_PENALTY, input.warnings.length * WARNING_PENALTY);
  const score = Math.max(0, Math.min(100, rawScore - penalty));

  return {
    score,
    components,
    warnings: input.warnings,
    blockers,
    publishable: blockers.length === 0,
  };
}
