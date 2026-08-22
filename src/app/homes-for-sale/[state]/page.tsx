import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LocationListingPage } from "@/components/location-listing-page";
import { buildMetadata } from "@/lib/seo/metadata";
import { findStateBySlug, getCitiesWithInventory, getLocationStats, MIN_LISTINGS_TO_INDEX, stateIntro } from "@/lib/seo/locations";
import { statePath } from "@/lib/seo/urls";

export const dynamic = "force-dynamic";

type Params = { state: string };

async function resolveState(slug: string) {
  const state = await findStateBySlug(slug);
  if (!state) return null;
  const canonical = statePath(state);
  if (`/homes-for-sale/${slug}` !== canonical) redirect(canonical);
  return state;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const state = await resolveState(params.state);
  if (!state) return { title: "Homes for sale", robots: { index: false, follow: true } };
  const [stats, cities] = await Promise.all([getLocationStats({ state }), getCitiesWithInventory(state)]);
  return buildMetadata({
    title: `Homes for Sale by Owner in ${state}`,
    description: stateIntro(state, stats, cities.length),
    path: statePath(state),
    index: stats.count >= MIN_LISTINGS_TO_INDEX,
  });
}

export default async function StateHomesPage({ params }: { params: Params }) {
  const state = await resolveState(params.state);
  if (!state) notFound();
  return <LocationListingPage state={state} />;
}
