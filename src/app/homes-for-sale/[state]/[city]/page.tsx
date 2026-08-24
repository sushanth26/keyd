import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LocationListingPage } from "@/components/location-listing-page";
import { buildMetadata } from "@/lib/seo/metadata";
import { cityIntro, findCityBySlug, findStateBySlug, getLocationStats, resolveKnownCity, MIN_LISTINGS_TO_INDEX } from "@/lib/seo/locations";
import { cityPath } from "@/lib/seo/urls";

export const dynamic = "force-dynamic";

type Params = { state: string; city: string };

async function resolveLocation(params: Params): Promise<{ state: string; city: string } | null> {
  // Prefer a city that has inventory; otherwise fall back to the known launch market
  // so a valid market city (e.g. Wylie, The Colony) renders an accessible noindex page
  // instead of 404-ing an internal link.
  const state = await findStateBySlug(params.state);
  const city = state ? await findCityBySlug(state, params.city) : null;
  const resolved = state && city ? { state, city } : resolveKnownCity(params.state, params.city);
  if (!resolved) return null;
  const canonical = cityPath(resolved.state, resolved.city);
  if (`/homes-for-sale/${params.state}/${params.city}` !== canonical) redirect(canonical);
  return resolved;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const location = await resolveLocation(params);
  if (!location) return { title: "Homes for sale", robots: { index: false, follow: true } };
  const stats = await getLocationStats(location);
  return buildMetadata({
    title: `Homes for Sale by Owner in ${location.city}, ${location.state}`,
    description: cityIntro(location.city, location.state, stats),
    path: cityPath(location.state, location.city),
    index: stats.count >= MIN_LISTINGS_TO_INDEX,
  });
}

export default async function CityHomesPage({ params }: { params: Params }) {
  const location = await resolveLocation(params);
  if (!location) notFound();
  return <LocationListingPage state={location.state} city={location.city} />;
}
