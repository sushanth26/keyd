import type { Metadata } from "next";
import { LocationListingPage } from "@/components/location-listing-page";
import { buildMetadata } from "@/lib/seo/metadata";
import { homesForSalePath } from "@/lib/seo/urls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Homes for Sale by Owner",
  description: "Browse owner-listed homes for sale on Keyd. View photos, prices, property details, and contact homeowners directly without agents or commission.",
  path: homesForSalePath,
});

export default function HomesForSalePage() {
  return <LocationListingPage />;
}
