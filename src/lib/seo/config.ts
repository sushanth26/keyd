// Central SEO/site configuration. The production base URL is read from an env var
// so absolute canonical/OG/sitemap URLs are correct in every environment.
//
// NEXT_PUBLIC_SITE_URL is preferred (available client + server). It falls back to
// APP_URL (server) and finally localhost, so the app still builds/runs without it.

const DEFAULT_BASE_URL = "http://localhost:3000";

/**
 * Produce a valid absolute origin with no trailing slash. Tolerates common
 * misconfiguration (a domain with no protocol, e.g. "www.keyd.live") by defaulting
 * to https, and falls back to localhost for anything unparseable. This prevents a
 * bad env value from throwing in `new URL(...)` and taking down every page.
 */
export function normalizeBaseUrl(raw?: string): string {
  const value = (raw || "").trim();
  if (!value) return DEFAULT_BASE_URL;
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withProtocol);
    return `${url.protocol}//${url.host}`.replace(/\/+$/, "");
  } catch {
    return DEFAULT_BASE_URL;
  }
}

export const siteConfig = {
  name: "Keyd",
  /** Absolute production origin, e.g. https://keyd.com — no trailing slash. */
  baseUrl: normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL),
  defaultTitle: "Keyd — Sell Your Home Directly to Buyers | For Sale by Owner DFW",
  titleTemplate: "%s | Keyd",
  description:
    "Keyd is a for-sale-by-owner marketplace for the Dallas–Fort Worth area. Browse owner-listed homes, view photos and details, and contact sellers directly — no agents, no commission.",
  /** X/Twitter handle used for `twitter:site` / `creator`. Optional. */
  twitterHandle: process.env.NEXT_PUBLIC_TWITTER_HANDLE || undefined,
  /** Google Search Console verification token (meta tag). Optional. */
  googleSiteVerification: process.env.NEXT_PUBLIC_GSC_VERIFICATION || undefined,
  /** Default branded social-sharing image (file-convention route). */
  defaultOgImagePath: "/opengraph-image",
} as const;

export type SiteConfig = typeof siteConfig;
