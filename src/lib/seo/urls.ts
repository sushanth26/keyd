// Clean, human-readable SEO URL builders. Pure functions (no DB) so they can be used
// on the server, in the sitemap, and in client components.
//
// URL scheme:
//   /homes-for-sale                                  browse index
//   /homes-for-sale/{state}                          state location page
//   /homes-for-sale/{state}/{city}                   city location page
//   /homes/{state}/{city}/{property-slug}-{listingId}  canonical property page
//
// The listing ID (a cuid) is the stable identifier and is always the final
// hyphen-delimited token of the last path segment.
import { siteConfig } from "./config";

export function slugifyPart(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function stateSlug(state: string): string {
  return slugifyPart(state);
}

export function citySlug(city: string): string {
  return slugifyPart(city);
}

/** Turn any relative path into an absolute production URL. */
export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteConfig.baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
}

export interface PropertyUrlParts {
  id: string;
  slug: string;
  state: string;
  city: string;
}

/** The final path segment for a property: `{property-slug}-{listingId}`. */
export function listingSegment(p: Pick<PropertyUrlParts, "slug" | "id">): string {
  return `${p.slug}-${p.id}`;
}

/** Canonical relative path to a property page. */
export function propertyPath(p: PropertyUrlParts): string {
  return `/homes/${stateSlug(p.state)}/${citySlug(p.city)}/${listingSegment(p)}`;
}

export function propertyUrl(p: PropertyUrlParts): string {
  return absoluteUrl(propertyPath(p));
}

/** Extract the listing ID (last hyphen-delimited token) from a listing segment. */
export function listingIdFromSegment(segment: string): string | null {
  const idx = segment.lastIndexOf("-");
  const id = idx === -1 ? segment : segment.slice(idx + 1);
  return id && /^[a-z0-9]+$/i.test(id) ? id : null;
}

export const homesForSalePath = "/homes-for-sale";

export function statePath(state: string): string {
  return `${homesForSalePath}/${stateSlug(state)}`;
}

export function cityPath(state: string, city: string): string {
  return `${homesForSalePath}/${stateSlug(state)}/${citySlug(city)}`;
}

/** Marketing routes. */
export const marketingPaths = {
  home: "/",
  sell: "/sell",
  howItWorks: "/how-it-works",
  about: "/about",
  browse: homesForSalePath,
} as const;
