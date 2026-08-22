import { Badge } from "@/components/ui";
import { formatCurrency, baths } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { propertyPath } from "@/lib/seo/urls";
import { TrackedLink } from "@/components/analytics/tracked-link";
import type { PropertyStatus } from "@prisma/client";

export interface PropertyCardData {
  id: string;
  slug: string;
  status: PropertyStatus;
  addressLine1: string;
  city: string;
  state: string;
  askingPrice: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  headline: string | null;
  photos: { storageKey: string }[];
}

export function PropertyCard({
  p,
  action,
  position,
  source,
}: {
  p: PropertyCardData;
  action?: React.ReactNode;
  position?: number;
  source?: string;
}) {
  const href = propertyPath(p);
  const alt = `${p.bedrooms ? `${p.bedrooms}-bed ` : ""}home for sale by owner in ${p.city}, ${p.state}`;
  return (
    <div className="card group overflow-hidden p-0">
      <TrackedLink href={href} listingId={p.id} position={position} source={source} className="block">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
          {p.photos[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl(p.photos[0].storageKey)}
              alt={p.headline ?? alt}
              width={1024}
              height={683}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-slate-300">No photo</div>
          )}
          <span className="absolute left-2 top-2">
            <Badge tone="green">Listed by owner</Badge>
          </span>
          {p.status === "UNDER_CONTRACT" && (
            <span className="absolute right-2 top-2">
              <Badge tone="blue">Under contract</Badge>
            </span>
          )}
        </div>
      </TrackedLink>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <TrackedLink href={href} listingId={p.id} position={position} source={source}>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(p.askingPrice)}</p>
          </TrackedLink>
          {action}
        </div>
        <p className="mt-0.5 text-sm text-slate-600">
          {p.bedrooms ?? "—"} bd · {baths(p.bathrooms)} ba · {p.squareFeet?.toLocaleString() ?? "—"} sqft
        </p>
        <p className="truncate text-sm text-slate-500">
          {p.addressLine1}, {p.city}, {p.state}
        </p>
      </div>
    </div>
  );
}
