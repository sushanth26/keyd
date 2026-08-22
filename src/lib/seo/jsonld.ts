// JSON-LD structured data builders (Schema.org). Uses only PUBLIC information —
// never seller email, phone, account ID, or other personal data.
import type { PropertyStatus, PropertyType } from "@prisma/client";
import { siteConfig } from "./config";
import { absoluteUrl, homesForSalePath } from "./urls";

type Json = Record<string, unknown>;

export function organizationJsonLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteConfig.baseUrl}/#organization`,
    name: siteConfig.name,
    url: siteConfig.baseUrl,
    logo: absoluteUrl(siteConfig.defaultOgImagePath),
    description: siteConfig.description,
    areaServed: "Dallas–Fort Worth, Texas",
    ...(siteConfig.twitterHandle
      ? { sameAs: [`https://twitter.com/${siteConfig.twitterHandle.replace(/^@/, "")}`] }
      : {}),
  };
}

export function websiteJsonLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteConfig.baseUrl}/#website`,
    name: siteConfig.name,
    url: siteConfig.baseUrl,
    publisher: { "@id": `${siteConfig.baseUrl}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl(homesForSalePath)}?city={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

export function itemListJsonLd(urls: string[], name?: string): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    ...(name ? { name } : {}),
    numberOfItems: urls.length,
    itemListElement: urls.map((url, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(url),
    })),
  };
}

/** Map our property type to a valid Schema.org residence/place type. */
function residenceType(type: PropertyType): string {
  switch (type) {
    case "SINGLE_FAMILY":
      return "SingleFamilyResidence";
    case "TOWNHOUSE":
      return "House";
    case "CONDO":
      return "Apartment";
    case "MULTI_FAMILY":
      return "ApartmentComplex";
    case "LAND":
      return "Place";
    default:
      return "Residence";
  }
}

function availability(status: PropertyStatus): string {
  switch (status) {
    case "UNDER_CONTRACT":
      return "https://schema.org/LimitedAvailability";
    case "SOLD":
      return "https://schema.org/SoldOut";
    default:
      return "https://schema.org/InStock";
  }
}

export interface PropertyJsonLdInput {
  id: string;
  url: string; // absolute canonical URL
  headline: string | null;
  description: string | null;
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
  propertyType: PropertyType;
  status: PropertyStatus;
  askingPrice: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  images: string[]; // absolute image URLs
  publishedAt: Date | null;
}

/**
 * Property structured data as a @graph: a residence entity plus an Offer for price.
 * Only public property attributes are included — no seller contact/account data.
 */
export function propertyJsonLd(p: PropertyJsonLdInput): Json {
  const residenceId = `${p.url}#property`;
  const name = p.headline || `${p.bedrooms ?? ""}-bedroom home in ${p.city}, ${p.state}`.trim();

  const residence: Json = {
    "@type": residenceType(p.propertyType),
    "@id": residenceId,
    name,
    url: p.url,
    ...(p.description ? { description: p.description } : {}),
    ...(p.images.length ? { image: p.images } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: p.addressLine1,
      addressLocality: p.city,
      addressRegion: p.state,
      postalCode: p.zip,
      addressCountry: "US",
    },
  };
  if (p.bedrooms != null) residence.numberOfBedrooms = p.bedrooms;
  if (p.bathrooms != null) residence.numberOfBathroomsTotal = p.bathrooms;
  if (p.squareFeet != null) {
    residence.floorSize = { "@type": "QuantitativeValue", value: p.squareFeet, unitCode: "FTK" };
  }

  const graph: Json[] = [residence];

  if (p.askingPrice != null) {
    graph.push({
      "@type": "Offer",
      "@id": `${p.url}#offer`,
      url: p.url,
      price: p.askingPrice,
      priceCurrency: "USD",
      availability: availability(p.status),
      itemOffered: { "@id": residenceId },
      seller: { "@id": `${siteConfig.baseUrl}/#organization` },
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}
