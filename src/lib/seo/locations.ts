// Data helpers for programmatic location SEO (state/city pages). A location page is
// only indexable when it has real inventory; otherwise it stays accessible but
// `noindex,follow` to avoid thin/doorway pages.
import { prisma } from "@/lib/db";
import { PUBLIC_STATUSES } from "@/domain/lifecycle";
import { citySlug, stateSlug } from "./urls";
import { formatCurrency } from "@/lib/format";

/** Minimum active listings for a location page to be indexed. */
export const MIN_LISTINGS_TO_INDEX = 1;

const publicWhere = { status: { in: PUBLIC_STATUSES } } as const;

export interface StateInventory {
  state: string;
  slug: string;
  count: number;
}
export interface CityInventory {
  city: string;
  state: string;
  slug: string;
  count: number;
}

export async function getStatesWithInventory(): Promise<StateInventory[]> {
  const rows = await prisma.property.groupBy({ by: ["state"], where: publicWhere, _count: { _all: true } });
  return rows
    .map((r) => ({ state: r.state, slug: stateSlug(r.state), count: r._count._all }))
    .sort((a, b) => b.count - a.count);
}

export async function getCitiesWithInventory(state?: string): Promise<CityInventory[]> {
  const rows = await prisma.property.groupBy({
    by: ["city", "state"],
    where: state ? { ...publicWhere, state } : publicWhere,
    _count: { _all: true },
  });
  return rows
    .map((r) => ({ city: r.city, state: r.state, slug: citySlug(r.city), count: r._count._all }))
    .sort((a, b) => b.count - a.count);
}

export async function findStateBySlug(slug: string): Promise<string | null> {
  const states = await getStatesWithInventory();
  return states.find((s) => s.slug === slug)?.state ?? null;
}

export async function findCityBySlug(state: string, wantedCitySlug: string): Promise<string | null> {
  const cities = await getCitiesWithInventory(state);
  return cities.find((c) => c.slug === wantedCitySlug)?.city ?? null;
}

export interface LocationStats {
  count: number;
  minPrice: number | null;
  maxPrice: number | null;
}

export async function getLocationStats(where: { state: string; city?: string }): Promise<LocationStats> {
  const agg = await prisma.property.aggregate({
    where: { ...publicWhere, state: where.state, ...(where.city ? { city: where.city } : {}) },
    _count: { _all: true },
    _min: { askingPrice: true },
    _max: { askingPrice: true },
  });
  return { count: agg._count._all, minPrice: agg._min.askingPrice, maxPrice: agg._max.askingPrice };
}

/** Unique, data-derived intro copy for a city page (kept distinct per city). */
export function cityIntro(city: string, state: string, stats: LocationStats): string {
  if (stats.count === 0) {
    return `Browse for-sale-by-owner homes in ${city}, ${state} on Keyd. New owner-listed properties are added regularly — check back soon or save a search to be notified.`;
  }
  const priceRange =
    stats.minPrice != null && stats.maxPrice != null
      ? stats.minPrice === stats.maxPrice
        ? ` priced at ${formatCurrency(stats.minPrice)}`
        : ` priced from ${formatCurrency(stats.minPrice)} to ${formatCurrency(stats.maxPrice)}`
      : "";
  return `Explore ${stats.count} owner-listed home${stats.count === 1 ? "" : "s"} for sale in ${city}, ${state}${priceRange}. Every listing on Keyd is posted directly by the homeowner — view photos, prices, and property details, then contact the seller directly. No agents, no commission.`;
}

export function stateIntro(state: string, stats: LocationStats, cityCount: number): string {
  if (stats.count === 0) {
    return `Find for-sale-by-owner homes across ${state} on Keyd. Owner-listed properties are added regularly.`;
  }
  return `Discover ${stats.count} owner-listed home${stats.count === 1 ? "" : "s"} for sale across ${cityCount} ${cityCount === 1 ? "city" : "cities"} in ${state}. Browse by city, view photos and prices, and contact sellers directly on Keyd — no agents, no commission.`;
}
