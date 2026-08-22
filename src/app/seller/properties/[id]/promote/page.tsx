import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { PageHeader, Alert } from "@/components/ui";
import { CopyBlock } from "@/components/copy-block";
import { qrDataUrl } from "@/lib/qr";
import { env } from "@/lib/env";
import { formatCurrency } from "@/lib/format";

const CHECKLIST = [
  "Share the link with friends, family, and coworkers",
  "Post the social captions on Facebook, Instagram, and Nextdoor",
  "Print the flyer and post it at community boards (with permission)",
  "Add the QR code to your yard sign",
  "Email the summary to your personal network",
  "Schedule an open house and share the announcement",
];

export default async function PromotePage({ params }: { params: { id: string } }) {
  const user = await requireRole("SELLER");
  const property = await prisma.property.findUnique({ where: { id: params.id } });
  if (!property || property.sellerId !== user.id) notFound();

  const url = `${env.APP_URL}/p/${property.slug}`;
  const qr = await qrDataUrl(url);
  const captions = (property.socialCaptions ?? {}) as Record<string, string>;

  return (
    <div>
      <PageHeader title="Promotion tools" subtitle="Download and share assets to reach more buyers. Keyd publishes only to this marketplace." />
      <Link href={`/seller/properties/${property.id}`} className="mb-4 inline-block text-sm text-brand-600 hover:underline">← Back to listing</Link>

      <Alert tone="info">
        Keyd never auto-posts to Zillow, social networks, or other marketplaces without an approved integration. Use these
        assets to cross-post yourself.
      </Alert>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <div className="card space-y-3 p-5">
            <h2 className="text-lg font-bold text-slate-900">Shareable link & copy</h2>
            <CopyBlock label="Listing link" text={url} />
            {captions.short && <CopyBlock label="Short promo" text={captions.short} />}
            {captions.facebook && <CopyBlock label="Facebook" text={captions.facebook} />}
            {captions.instagram && <CopyBlock label="Instagram" text={captions.instagram} />}
            {captions.twitter && <CopyBlock label="X / Twitter" text={captions.twitter} />}
            {property.openHouseCopy && <CopyBlock label="Open house announcement" text={property.openHouseCopy} />}
            {property.emailSummary && <CopyBlock label="Email summary" text={property.emailSummary} />}
          </div>

          <div className="card p-5">
            <h2 className="mb-2 text-lg font-bold text-slate-900">Seller sharing checklist</h2>
            <ul className="space-y-1.5 text-sm text-slate-700">
              {CHECKLIST.map((c) => (
                <li key={c} className="flex items-start gap-2"><span className="text-brand-500">☐</span> {c}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5 text-center">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">QR code</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="Listing QR code" className="mx-auto h-44 w-44" />
            <p className="mt-2 text-xs text-slate-400">Right-click to save the image.</p>
          </div>
          <div className="card p-5 text-center">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-400">Digital flyer</h2>
            <p className="mb-3 text-sm text-slate-500">{formatCurrency(property.askingPrice)} · {property.city}</p>
            <Link href={`/p/${property.slug}/flyer`} target="_blank" className="btn-primary w-full">Open printable flyer ↗</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
