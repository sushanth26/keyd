// Central SEO/site configuration. The production base URL is read from an env var
// so absolute canonical/OG/sitemap URLs are correct in every environment.
//
// NEXT_PUBLIC_SITE_URL is preferred (available client + server). It falls back to
// APP_URL (server) and finally localhost, so the app still builds/runs without it.

function normalize(url: string): string {
  return url.replace(/\/+$/, "");
}

export const siteConfig = {
  name: "Keyd",
  /** Absolute production origin, e.g. https://keyd.com — no trailing slash. */
  baseUrl: normalize(
    process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || "http://localhost:3000",
  ),
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
