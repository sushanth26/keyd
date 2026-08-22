import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isPubliclyVisible } from "@/domain/lifecycle";
import { trackEvent } from "@/lib/audit";
import { mediaUrl } from "@/lib/media";
import { buildMetadata } from "@/lib/seo/metadata";
import { absoluteUrl, listingIdFromSegment, propertyPath, propertyUrl, homesForSalePath, statePath, cityPath } from "@/lib/seo/urls";
import { propertyJsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/seo/json-ld";
import { PropertyDetail, type PropertyForDetail } from "@/components/property-detail";

export const dynamic = "force-dynamic";

type Params = { state: string; city: string; listing: string };

function typeLabel(t: string): string {
  return t === "SINGLE_FAMILY"
    ? "Home"
    : t === "MULTI_FAMILY"
      ? "Multi-Family Home"
      : t.charAt(0) + t.slice(1).toLowerCase().replace(/_/g, " ");
}

async function loadPublicProperty(listingSeg: string) {
  const id = listingIdFromSegment(listingSeg);
  if (!id) return null;
  const property = await prisma.property.findUnique({
    where: { id },
    include: { photos: { orderBy: { position: "asc" } }, seller: { select: { fullName: true, identityStatus: true } } },
  });
  if (!property || !isPubliclyVisible(property.status)) return null;
  return property;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const property = await loadPublicProperty(params.listing);
  if (!property) return { title: "Listing not found", robots: { index: false, follow: false } };

  const beds = property.bedrooms ? `${property.bedrooms}-Bed ` : "";
  const title = `${beds}${typeLabel(property.propertyType)} for Sale by Owner in ${property.city}, ${property.state}`;
  const bedText = property.bedrooms ? `${property.bedrooms}-bedroom ` : "";
  const description = `View photos, price, features, and property details for this owner-listed ${bedText}home in ${property.city}, ${property.state}. Contact the seller directly on Keyd.`;
  const image = property.photos[0] ? absoluteUrl(mediaUrl(property.photos[0].storageKey)) : undefined;

  return buildMetadata({
    title,
    description,
    path: propertyPath(property),
    image,
    imageAlt: `${bedText}home for sale in ${property.city}, ${property.state}`,
  });
}

export default async function CanonicalPropertyPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: { interest?: string };
}) {
  const property = await loadPublicProperty(params.listing);
  if (!property) notFound();

  // Slug correction: if the path isn't the canonical one, 308 to canonical (no duplicates).
  const canonical = propertyPath(property);
  const requested = `/homes/${params.state}/${params.city}/${params.listing}`;
  if (requested !== canonical) redirect(canonical);

  const user = await getCurrentUser();
  const isOwner = user?.id === property.sellerId;
  const favorited = user
    ? !!(await prisma.favorite.findUnique({ where: { userId_propertyId: { userId: user.id, propertyId: property.id } } }))
    : false;

  if (!isOwner) await trackEvent({ type: "PROPERTY_VIEWED", userId: user?.id ?? null, propertyId: property.id });

  const images = property.photos.slice(0, 6).map((ph) => absoluteUrl(mediaUrl(ph.storageKey)));
  const propertyLd = propertyJsonLd({
    id: property.id,
    url: propertyUrl(property),
    headline: property.headline,
    description: property.description,
    addressLine1: property.addressLine1,
    city: property.city,
    state: property.state,
    zip: property.zip,
    propertyType: property.propertyType,
    status: property.status,
    askingPrice: property.askingPrice,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    squareFeet: property.squareFeet,
    images,
    publishedAt: property.publishedAt,
  });
  const breadcrumb = breadcrumbJsonLd([
    { name: "Homes for sale", path: homesForSalePath },
    { name: property.state, path: statePath(property.state) },
    { name: property.city, path: cityPath(property.state, property.city) },
    { name: `${property.addressLine1}`, path: canonical },
  ]);

  return (
    <>
      <JsonLd data={propertyLd} />
      <JsonLd data={breadcrumb} />
      <PropertyDetail
        property={property as PropertyForDetail}
        isOwner={isOwner}
        isAuthed={!!user}
        favorited={favorited}
        interestJustSubmitted={!!searchParams.interest}
      />
    </>
  );
}
