import Link from "next/link";
import { prisma } from "@/lib/db";
import { PUBLIC_STATUSES } from "@/domain/lifecycle";
import { PropertyCard } from "@/components/property-card";
import { EmptyState } from "@/components/ui";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo/jsonld";
import { cityIntro, getCitiesWithInventory, getLocationStats, getStatesWithInventory, stateIntro } from "@/lib/seo/locations";
import { cityPath, homesForSalePath, propertyPath, statePath } from "@/lib/seo/urls";
import { formatCurrency } from "@/lib/format";
import { logger } from "@/lib/logger";
import { TrackOnMount } from "@/components/analytics/track-on-mount";
import type { Prisma } from "@prisma/client";

interface Props {
  state?: string;
  city?: string;
}

function loadProperties(where: Prisma.PropertyWhereInput) {
  return prisma.property.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    include: { photos: { orderBy: { position: "asc" }, take: 1 } },
    take: 60,
  });
}

function heading({ state, city }: Props): string {
  if (state && city) return `Homes for Sale by Owner in ${city}, ${state}`;
  if (state) return `Homes for Sale by Owner in ${state}`;
  return "Homes for Sale by Owner";
}

export async function LocationListingPage({ state, city }: Props) {
  const where = { status: { in: PUBLIC_STATUSES }, ...(state ? { state } : {}), ...(city ? { city } : {}) };

  // A database outage degrades to an empty, still-useful page instead of a crash.
  let properties: Awaited<ReturnType<typeof loadProperties>> = [];
  let states: Awaited<ReturnType<typeof getStatesWithInventory>> = [];
  let cities: Awaited<ReturnType<typeof getCitiesWithInventory>> = [];
  let stats: Awaited<ReturnType<typeof getLocationStats>> | null = null;
  try {
    [properties, states, cities, stats] = await Promise.all([
      loadProperties(where),
      getStatesWithInventory(),
      getCitiesWithInventory(state),
      state ? getLocationStats({ state, city }) : Promise.resolve(null),
    ]);
  } catch (err) {
    logger.error("location_page.db_error", { error: err instanceof Error ? err.message : String(err), state, city });
  }

  const title = heading({ state, city });
  const intro = state && city
    ? cityIntro(city, state, stats ?? { count: properties.length, minPrice: null, maxPrice: null })
    : state
      ? stateIntro(state, stats ?? { count: properties.length, minPrice: null, maxPrice: null }, cities.length)
      : "Browse owner-listed homes for sale on Keyd. View photos, prices, property details, and contact homeowners directly without agents or commission.";
  const listUrls = properties.map((p) => propertyPath(p));
  const breadcrumb = breadcrumbJsonLd([
    { name: "Homes for sale", path: homesForSalePath },
    ...(state ? [{ name: state, path: statePath(state) }] : []),
    ...(state && city ? [{ name: city, path: cityPath(state, city) }] : []),
  ]);

  return (
    <div className="container-page py-8">
      <TrackOnMount
        event="view_search_results"
        params={{ result_count: properties.length, city, state }}
        dedupeKey={`location_results_${state ?? "all"}_${city ?? "all"}_${properties.length}`}
      />
      <JsonLd data={breadcrumb} />
      {listUrls.length > 0 && <JsonLd data={itemListJsonLd(listUrls, title)} />}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          <p className="mt-2 leading-relaxed text-slate-600">{intro}</p>
          {stats?.minPrice != null && stats.maxPrice != null && (
            <p className="mt-2 text-sm text-slate-500">
              Current owner-listed inventory ranges from {formatCurrency(stats.minPrice)} to {formatCurrency(stats.maxPrice)}.
            </p>
          )}
        </div>
        <Link href="/search" className="btn-secondary">
          Filter homes
        </Link>
      </div>

      {states.length > 0 && !state && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900">Browse by state</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {states.map((s) => (
              <Link key={s.slug} href={statePath(s.state)} className="rounded-full border border-slate-200 px-4 py-1.5 text-sm text-slate-700 hover:border-brand-300 hover:bg-brand-50">
                {s.state} ({s.count})
              </Link>
            ))}
          </div>
        </section>
      )}

      {cities.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900">{state ? `Browse ${state} by city` : "Browse by city"}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {cities.map((c) => (
              <Link key={`${c.state}-${c.slug}`} href={cityPath(c.state, c.city)} className="rounded-full border border-slate-200 px-4 py-1.5 text-sm text-slate-700 hover:border-brand-300 hover:bg-brand-50">
                {c.city}, {c.state} ({c.count})
              </Link>
            ))}
          </div>
        </section>
      )}

      {properties.length === 0 ? (
        <EmptyState icon="Search" title="No active owner-listed homes here yet" message="This page remains available for buyers, but it will stay out of search indexes until there is useful inventory." />
      ) : (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            {properties.length} active listing{properties.length === 1 ? "" : "s"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((p, index) => (
              <PropertyCard key={p.id} p={p} position={index + 1} source={city ? "city_page" : state ? "state_page" : "homes_for_sale"} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
