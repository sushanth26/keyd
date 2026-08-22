import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LocationListingPage } from "@/components/location-listing-page";
import { buildMetadata } from "@/lib/seo/metadata";
import { cityIntro, findCityBySlug, findStateBySlug, getLocationStats, MIN_LISTINGS_TO_INDEX } from "@/lib/seo/locations";
import { cityPath } from "@/lib/seo/urls";

export const dynamic = "force-dynamic";

type Params = { state: string; city: string };

async function resolveLocation(params: Params) {
  const state = await findStateBySlug(params.state);
  if (!state) return null;
  const city = await findCityBySlug(state, params.city);
  if (!city) return null;
  const canonical = cityPath(state, city);
  if (`/homes-for-sale/${params.state}/${params.city}` !== canonical) redirect(canonical);
  return { state, city };
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
