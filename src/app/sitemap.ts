import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { PUBLIC_STATUSES } from "@/domain/lifecycle";
import { absoluteUrl, propertyPath, statePath, cityPath, homesForSalePath } from "@/lib/seo/urls";
import { getStatesWithInventory, getCitiesWithInventory, MIN_LISTINGS_TO_INDEX } from "@/lib/seo/locations";

export const dynamic = "force-dynamic";

// The sitemap automatically reflects listing changes: only published (publicly
// visible) properties are included, with `lastmod` from their last meaningful update.
// Drafts, rejected, expired, sold, and withdrawn listings are excluded. Location
// pages appear only when they have enough inventory to be worth indexing.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl(homesForSalePath), lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: absoluteUrl("/sell"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/how-it-works"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  const [states, cities, properties] = await Promise.all([
    getStatesWithInventory(),
    getCitiesWithInventory(),
    prisma.property.findMany({
      where: { status: { in: PUBLIC_STATUSES } },
      select: { id: true, slug: true, city: true, state: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const stateEntries: MetadataRoute.Sitemap = states
    .filter((s) => s.count >= MIN_LISTINGS_TO_INDEX)
    .map((s) => ({ url: absoluteUrl(statePath(s.state)), lastModified: now, changeFrequency: "daily", priority: 0.6 }));

  const cityEntries: MetadataRoute.Sitemap = cities
    .filter((c) => c.count >= MIN_LISTINGS_TO_INDEX)
    .map((c) => ({ url: absoluteUrl(cityPath(c.state, c.city)), lastModified: now, changeFrequency: "daily", priority: 0.7 }));

  const propertyEntries: MetadataRoute.Sitemap = properties.map((p) => ({
    url: absoluteUrl(propertyPath(p)),
    lastModified: p.updatedAt,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticEntries, ...stateEntries, ...cityEntries, ...propertyEntries];
}
