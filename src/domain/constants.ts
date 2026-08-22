// Shared domain constants for the Keyd MVP (DFW market).

export const APP_NAME = "Keyd";

/// Initial launch market — single-family-focused DFW communities.
export const MARKET_CITIES = [
  "Allen",
  "Frisco",
  "Plano",
  "McKinney",
  "Prosper",
  "Wylie",
  "The Colony",
  "Little Elm",
] as const;

export type MarketCity = (typeof MARKET_CITIES)[number];

/// Minimum photos required before a listing is publish-ready.
export const MIN_PHOTOS = 5;

/// Standard Texas seller disclosure checklist keys shown to sellers.
export const DISCLOSURE_CHECKLIST: { key: string; label: string }[] = [
  { key: "sellers_disclosure", label: "Seller's Disclosure Notice completed" },
  { key: "lead_paint", label: "Lead-based paint disclosure (homes built before 1978)" },
  { key: "hoa", label: "HOA / MUD / PID information disclosed" },
  { key: "flood", label: "Flood zone / prior flooding disclosed" },
  { key: "known_defects", label: "Known material defects disclosed" },
];

/// Property facts required for a complete, publishable listing.
export const REQUIRED_FACTS = [
  "bedrooms",
  "bathrooms",
  "squareFeet",
  "yearBuilt",
  "propertyType",
] as const;

/// Fair-housing: attributes that must NEVER influence matching, ranking, or content.
export const PROTECTED_CHARACTERISTICS = [
  "race",
  "color",
  "religion",
  "national origin",
  "sex",
  "gender",
  "sexual orientation",
  "familial status",
  "disability",
  "age",
  "ancestry",
  "marital status",
] as const;

export const LEGAL_DISCLAIMER =
  "Keyd is a self-service marketing platform for property owners. Keyd is not a licensed real-estate broker and does not provide brokerage, legal, appraisal, escrow, title, or mortgage services, and does not represent buyers or sellers. All information is provided by the owner. Buyers and sellers are responsible for their own due diligence and for engaging qualified professionals.";

export const NON_BINDING_DISCLAIMER =
  "This is a non-binding expression of interest, not an offer or a legally binding real-estate contract. It creates no obligation for either party. Any binding agreement must be made in a separate written contract prepared and signed outside of Keyd.";
