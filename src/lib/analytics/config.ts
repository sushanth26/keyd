// Client-safe analytics configuration. Reads NEXT_PUBLIC_* values, which Next inlines
// into both server and client bundles.

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || "";

/** Explicit opt-in to run analytics outside production (local debugging / DebugView). */
const FORCE_ENABLED = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";

/**
 * GA4 runs only when a Measurement ID is configured AND we're in production
 * (or analytics is explicitly force-enabled). This keeps events out of automated
 * tests and normal local development.
 */
export function analyticsEnabled(): boolean {
  if (!GA_MEASUREMENT_ID) return false;
  if (FORCE_ENABLED) return true;
  return process.env.NODE_ENV === "production";
}
