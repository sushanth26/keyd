// Centralized, typed GA4 event taxonomy. Components call these helpers instead of
// touching `gtag` directly, so event names/params stay consistent and PII-free.
import { analyticsEnabled } from "./config";
import { hasAnalyticsConsent } from "./consent";

export type ParamValue = string | number | boolean | undefined | null;
export type EventParams = Record<string, ParamValue>;

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE = /(?:\+?\d[\d().\s-]{8,}\d)/;

/**
 * Drop empty values, and — as a safety net — refuse to send any string value that
 * looks like an email or phone number. GA4 must never receive PII.
 */
function scrub(params?: EventParams): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!params) return out;
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (typeof value === "string" && (EMAIL_RE.test(value) || PHONE_RE.test(value))) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn(`[analytics] Dropped param "${key}" — looked like PII and was not sent.`);
      }
      continue;
    }
    out[key] = value;
  }
  return out;
}

function canSend(): boolean {
  return (
    analyticsEnabled() &&
    hasAnalyticsConsent() &&
    typeof window !== "undefined" &&
    typeof window.gtag === "function"
  );
}

/** Low-level event sender. Prefer the typed helpers below. */
export function sendEvent(name: string, params?: EventParams): void {
  if (!canSend()) return;
  window.gtag("event", name, scrub(params));
}

export function sendPageView(pagePath: string, pageTitle?: string): void {
  if (!canSend()) return;
  window.gtag("event", "page_view", {
    page_path: pagePath,
    page_location: window.location.origin + pagePath,
    ...(pageTitle ? { page_title: pageTitle } : {}),
  });
}

// ---------------------------------------------------------------------------
// Typed event helpers
// ---------------------------------------------------------------------------

export type PriceRange = "under_300k" | "300k_500k" | "500k_750k" | "750k_1m" | "over_1m";

/** Bucket a price into a coarse range (avoids sending exact user-entered values). */
export function priceRange(min?: number | null, max?: number | null): PriceRange | undefined {
  const v = max ?? min;
  if (v == null) return undefined;
  if (v < 300_000) return "under_300k";
  if (v < 500_000) return "300k_500k";
  if (v < 750_000) return "500k_750k";
  if (v < 1_000_000) return "750k_1m";
  return "over_1m";
}

export const analytics = {
  // --- Buyer funnel ---
  search: (p: { search_term?: string; city?: string; state?: string; property_type?: string; price_range?: string }) =>
    sendEvent("search", p),
  viewSearchResults: (p: { result_count: number; city?: string; state?: string }) =>
    sendEvent("view_search_results", p),
  selectItem: (p: { listing_id: string; position?: number; source?: string }) => sendEvent("select_item", p),
  viewItem: (p: { listing_id: string; property_type?: string; city?: string; state?: string; price?: number; currency?: string }) =>
    sendEvent("view_item", p),
  saveListing: (p: { listing_id: string }) => sendEvent("save_listing", p),
  share: (p: { listing_id: string; method: string }) => sendEvent("share", p),
  scheduleTour: (p: { listing_id: string }) => sendEvent("schedule_tour", p),
  contactSeller: (p: { listing_id: string; contact_method: string }) => sendEvent("contact_seller", p),
  generateLead: (p: { listing_id: string; lead_type: string }) => sendEvent("generate_lead", p),

  // --- Seller funnel ---
  startListing: (p: { source?: string }) => sendEvent("start_listing", p),
  listingStepCompleted: (p: { step_name: string; step_number: number }) => sendEvent("listing_step_completed", p),
  listingPhotoUploaded: (p: { photo_count: number }) => sendEvent("listing_photo_uploaded", p),
  listingPreviewed: (p: { listing_id: string }) => sendEvent("listing_previewed", p),
  listingSubmitted: (p: { listing_id: string }) => sendEvent("listing_submitted", p),
  listingPublished: (p: { listing_id: string }) => sendEvent("listing_published", p),

  // --- Account funnel (GA4 recommended events) ---
  signUp: (p: { method: string }) => sendEvent("sign_up", p),
  login: (p: { method: string }) => sendEvent("login", p),
};

export type AnalyticsApi = typeof analytics;
