import Link from "next/link";
import type { Prisma, PropertyType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PUBLIC_STATUSES } from "@/domain/lifecycle";
import { MARKET_CITIES } from "@/domain/constants";
import { PropertyCard } from "@/components/property-card";
import { EmptyState } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/current-user";
import { SaveSearchButton } from "@/components/save-search-button";
import { buildMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";
import { TrackOnMount } from "@/components/analytics/track-on-mount";
import { priceRange } from "@/lib/analytics/events";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Filter Owner-Listed Homes",
  description: "Filter owner-listed homes by city, price, bedrooms, bathrooms, and property type on Keyd.",
  path: "/search",
  index: false,
});

interface SP {
  city?: string;
  minPrice?: string;
  maxPrice?: string;
  beds?: string;
  baths?: string;
  type?: string;
}

function loadSearch(where: Prisma.PropertyWhereInput) {
  return prisma.property.findMany({
    where,
    orderBy: { publishedAt: "desc" },
    include: { photos: { orderBy: { position: "asc" }, take: 1 } },
    take: 60,
  });
}

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const user = await getCurrentUser();
  const where: Prisma.PropertyWhereInput = { status: { in: PUBLIC_STATUSES } };
  if (searchParams.city) where.city = searchParams.city;
  if (searchParams.type) where.propertyType = searchParams.type as PropertyType;
  const price: Prisma.IntFilter = {};
  if (searchParams.minPrice) price.gte = Number(searchParams.minPrice);
  if (searchParams.maxPrice) price.lte = Number(searchParams.maxPrice);
  if (price.gte || price.lte) where.askingPrice = price;
  if (searchParams.beds) where.bedrooms = { gte: Number(searchParams.beds) };
  if (searchParams.baths) where.bathrooms = { gte: Number(searchParams.baths) };

  // Degrade gracefully to an empty result set if the database is unavailable.
  let properties: Awaited<ReturnType<typeof loadSearch>> = [];
  try {
    properties = await loadSearch(where);
  } catch {
    properties = [];
  }

  return (
    <div className="container-page py-6">
      <TrackOnMount
        event="search"
        params={{
          search_term: searchParams.city,
          city: searchParams.city,
          state: searchParams.city ? "TX" : undefined,
          property_type: searchParams.type,
          price_range: priceRange(Number(searchParams.minPrice) || null, Number(searchParams.maxPrice) || null),
        }}
        dedupeKey={`search_${JSON.stringify(searchParams)}`}
      />
      <TrackOnMount
        event="view_search_results"
        params={{ result_count: properties.length, city: searchParams.city, state: searchParams.city ? "TX" : undefined }}
        dedupeKey={`results_${JSON.stringify(searchParams)}_${properties.length}`}
      />
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Homes for sale by owner</h1>
          <p className="text-sm text-slate-500">{properties.length} home(s) in the DFW area</p>
        </div>
        {user?.role === "BUYER" && <SaveSearchButton filters={searchParams as Record<string, string | undefined>} />}
      </div>

      {/* Filters */}
      <form className="card mb-6 grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6" method="get">
        <label className="text-sm">
          <span className="label">City</span>
          <select name="city" defaultValue={searchParams.city ?? ""} className="input">
            <option value="">Any</option>
            {MARKET_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="label">Min price</span>
          <input name="minPrice" defaultValue={searchParams.minPrice ?? ""} inputMode="numeric" className="input" placeholder="Any" />
        </label>
        <label className="text-sm">
          <span className="label">Max price</span>
          <input name="maxPrice" defaultValue={searchParams.maxPrice ?? ""} inputMode="numeric" className="input" placeholder="Any" />
        </label>
        <label className="text-sm">
          <span className="label">Beds (min)</span>
          <select name="beds" defaultValue={searchParams.beds ?? ""} className="input">
            <option value="">Any</option>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="label">Baths (min)</span>
          <select name="baths" defaultValue={searchParams.baths ?? ""} className="input">
            <option value="">Any</option>
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="label">Type</span>
          <select name="type" defaultValue={searchParams.type ?? ""} className="input">
            <option value="">Any</option>
            <option value="SINGLE_FAMILY">Single-family</option>
            <option value="TOWNHOUSE">Townhouse</option>
            <option value="CONDO">Condo</option>
            <option value="MULTI_FAMILY">Multi-family</option>
            <option value="LAND">Land</option>
          </select>
        </label>
        <div className="sm:col-span-3 lg:col-span-6 flex gap-2">
          <button className="btn-primary" type="submit">Apply filters</button>
          <Link href="/homes-for-sale" className="btn-ghost">Reset</Link>
        </div>
      </form>

      {properties.length === 0 ? (
        <EmptyState icon="🔍" title="No homes match your filters" message="Try widening your price range or removing a filter." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <PropertyCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
