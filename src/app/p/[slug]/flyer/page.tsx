import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { isPubliclyVisible } from "@/domain/lifecycle";
import { formatCurrency, baths, formatNumber } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { qrDataUrl } from "@/lib/qr";
import { propertyUrl } from "@/lib/seo/urls";
import { noindexMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = noindexMetadata;

export default async function FlyerPage({ params }: { params: { slug: string } }) {
  const property = await prisma.property
    .findUnique({
      where: { slug: params.slug },
      include: { photos: { orderBy: { position: "asc" }, take: 4 }, seller: { select: { fullName: true } } },
    })
    .catch(() => null);
  if (!property || !isPubliclyVisible(property.status)) notFound();
  const qr = await qrDataUrl(propertyUrl(property));

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 print:p-0">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">For sale by owner</p>
          <h1 className="text-3xl font-extrabold text-slate-900">{formatCurrency(property.askingPrice)}</h1>
          <p className="text-lg text-slate-700">{property.addressLine1}, {property.city}, {property.state} {property.zip}</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="QR" className="h-24 w-24" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {property.photos.map((ph, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={ph.id} src={mediaUrl(ph.storageKey)} alt="" className={i === 0 ? "col-span-2 aspect-[16/9] w-full rounded-lg object-cover" : "aspect-[4/3] w-full rounded-lg object-cover"} />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 rounded-lg border border-slate-200 p-3 text-center">
        <Fact label="Beds" value={property.bedrooms ?? "—"} />
        <Fact label="Baths" value={baths(property.bathrooms)} />
        <Fact label="Sq Ft" value={formatNumber(property.squareFeet)} />
        <Fact label="Year" value={property.yearBuilt ?? "—"} />
        <Fact label="Type" value={property.propertyType.replace(/_/g, " ")} />
      </div>

      {property.description && <p className="mt-4 text-slate-700">{property.description}</p>}

      {property.highlights.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-1 text-sm text-slate-700">
          {property.highlights.map((h, i) => <li key={i}>• {h}</li>)}
        </ul>
      )}

      <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 text-sm text-slate-500">
        <p>Listed directly by {property.seller.fullName} on Keyd</p>
        <p className="font-semibold text-brand-700">{propertyUrl(property)}</p>
      </div>
      <p className="mt-2 text-[10px] text-slate-400">Keyd is not a brokerage and does not provide legal, appraisal, escrow, or title services. Scan the QR code to contact the owner and schedule a showing.</p>

      <p className="mt-6 rounded-lg bg-brand-50 p-3 text-center text-sm text-brand-800 print:hidden">
        Tip: use your browser&apos;s Print (⌘/Ctrl+P) to save this flyer as a PDF.
      </p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-[70px] flex-1">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-xs uppercase text-slate-500">{label}</p>
    </div>
  );
}
