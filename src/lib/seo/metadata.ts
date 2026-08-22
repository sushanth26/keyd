// Reusable metadata generator — one place to build titles, descriptions, canonical
// URLs, Open Graph, Twitter cards, and robots directives. Use this everywhere instead
// of hand-writing `<head>` tags or duplicating SEO objects.
import type { Metadata } from "next";
import { siteConfig } from "./config";
import { absoluteUrl } from "./urls";

export interface BuildMetadataInput {
  title: string;
  description: string;
  /** Relative canonical path (query params stripped). Absolute URL is derived. */
  path: string;
  /** Absolute image URL for OG/Twitter. Falls back to the branded default. */
  image?: string;
  imageAlt?: string;
  /** Set false for parameterized/thin pages: emits `noindex, follow`. */
  index?: boolean;
  /** "website" (default) or "article". Property pages use "website". */
  ogType?: "website" | "article";
}

/** Truncate to a safe meta-description length without cutting mid-word. */
export function clampDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

export function buildMetadata(input: BuildMetadataInput): Metadata {
  const canonical = absoluteUrl(input.path);
  const description = clampDescription(input.description);
  const index = input.index ?? true;

  const images = input.image
    ? [{ url: input.image, alt: input.imageAlt ?? input.title }]
    : undefined; // undefined → inherits the file-convention default OG image

  return {
    title: input.title,
    description,
    alternates: { canonical },
    robots: {
      index,
      follow: true,
      googleBot: { index, follow: true },
    },
    openGraph: {
      type: input.ogType ?? "website",
      title: input.title,
      description,
      url: canonical,
      siteName: siteConfig.name,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description,
      ...(images ? { images: images.map((i) => i.url) } : {}),
    },
  };
}

/** Metadata for private/auth/dashboard pages: keep them out of the index. */
export const noindexMetadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};
