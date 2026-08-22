// Fair-housing safeguards. Scans listing text for language that could signal a
// preference/limitation based on a protected class (steering). Used to screen BOTH
// AI-generated and seller-entered copy before publication, and to keep the AI
// generator honest. Pure and unit-testable.

/// Phrases that commonly raise fair-housing concerns in real-estate advertising.
const RISKY_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /\bfamily[- ]friendly\b/i, reason: "familial-status steering" },
  { pattern: /\bperfect for (a )?famil(y|ies)\b/i, reason: "familial-status steering" },
  { pattern: /\bno kids?\b/i, reason: "familial-status discrimination" },
  { pattern: /\badults? only\b/i, reason: "familial-status discrimination" },
  { pattern: /\bmature (couple|individuals?)\b/i, reason: "age/familial-status steering" },
  { pattern: /\bempty[- ]nester/i, reason: "familial-status steering" },
  { pattern: /\b(christian|catholic|jewish|muslim|church|mosque|synagogue|temple)\b/i, reason: "religion reference" },
  { pattern: /\bsafe neighborhood\b/i, reason: "steering ('safe' can imply protected-class proxy)" },
  { pattern: /\bgood schools?\b/i, reason: "steering (school-quality claims can proxy protected class)" },
  { pattern: /\bexclusive\b/i, reason: "potential exclusionary steering" },
  { pattern: /\bideal for (single|young|old)\b/i, reason: "age/marital-status steering" },
  { pattern: /\b(handicap|disabled) (accessible|friendly)\b/i, reason: "disability reference (state facts, not preferences)" },
  { pattern: /\bable[- ]bodied\b/i, reason: "disability discrimination" },
  { pattern: /\bethnic\b/i, reason: "national-origin/race reference" },
];

export interface FairHousingFlag {
  match: string;
  reason: string;
}

export function screenFairHousing(text: string | null | undefined): FairHousingFlag[] {
  if (!text) return [];
  const flags: FairHousingFlag[] = [];
  for (const { pattern, reason } of RISKY_PATTERNS) {
    const m = text.match(pattern);
    if (m) flags.push({ match: m[0], reason });
  }
  return flags;
}

export function screenMany(texts: (string | null | undefined)[]): FairHousingFlag[] {
  return texts.flatMap((t) => screenFairHousing(t));
}
