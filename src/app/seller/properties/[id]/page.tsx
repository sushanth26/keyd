import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { PageHeader, StatusBadge, Alert, LinkButton, Badge } from "@/components/ui";
import { ReadinessCard } from "@/components/readiness-card";
import { SubmitButton } from "@/components/form";
import { formatCurrency, baths } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import {
  submitForPreparationAction,
  pauseListingAction,
  resumeListingAction,
  withdrawListingAction,
  markUnderContractAction,
  markSoldAction,
  uploadPhotosAction,
  reorderPhotoAction,
  deletePhotoAction,
} from "@/app/seller/actions";

export default async function PropertyHub({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { prepared?: string; published?: string };
}) {
  const user = await requireRole("SELLER");
  const property = await prisma.property.findUnique({
    where: { id: params.id },
    include: {
      photos: { orderBy: { position: "asc" } },
      recommendations: { where: { resolvedAt: null }, orderBy: { severity: "desc" } },
      _count: { select: { showings: true, buyerInterests: true, conversations: true, favorites: true } },
    },
  });
  if (!property || property.sellerId !== user.id) notFound();

  const s = property.status;
  const isDraftLike = s === "DRAFT" || s === "NEEDS_ATTENTION";
  const isLive = ["ACTIVE", "BUYER_INTEREST_RECEIVED", "UNDER_CONTRACT"].includes(s);

  return (
    <div>
      <PageHeader
        title={property.addressLine1}
        subtitle={`${property.city}, ${property.state} ${property.zip}`}
        action={<StatusBadge status={s} />}
      />

      {searchParams.published && <Alert tone="success" title="Published!">Your listing is live and buyers are being matched.</Alert>}
      {searchParams.prepared && (
        <Alert tone="info" title="AI preparation started">
          Keyd is validating details, verifying ownership, enriching data, scoring readiness, and drafting your listing. This
          page updates as it progresses — refresh in a few seconds.
        </Alert>
      )}
      {s === "READY_FOR_REVIEW" && (
        <Alert tone="success" title="Your AI-prepared listing is ready to review">
          <Link href={`/seller/properties/${property.id}/review`} className="font-semibold underline">
            Review the content and publish →
          </Link>
        </Alert>
      )}
      {s === "VERIFICATION_PENDING" && (
        <Alert tone="warning" title="Verifying identity & ownership">
          Your draft is prepared. We're verifying your identity and ownership. An administrator reviews this for the MVP; you'll
          be notified when it clears.
        </Alert>
      )}

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left: readiness + recommendations */}
        <div className="space-y-6">
          <ReadinessCard score={property.readinessScore} breakdown={property.readinessBreakdown} />

          <div className="card p-5">
            <h2 className="mb-3 text-lg font-bold text-slate-900">Recommended actions</h2>
            {property.recommendations.length === 0 ? (
              <p className="text-sm text-slate-500">No outstanding recommendations. Nice work!</p>
            ) : (
              <ul className="space-y-2">
                {property.recommendations.map((r) => (
                  <li key={r.id} className="flex items-start gap-2 rounded-lg border border-slate-100 p-3">
                    <Badge tone={r.severity === "BLOCKER" ? "red" : r.severity === "WARNING" ? "amber" : "slate"}>
                      {r.severity}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{r.title}</p>
                      <p className="text-sm text-slate-500">{r.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Photos */}
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Photos</h2>
              <span className="text-xs text-slate-400">{property.photos.length} uploaded</span>
            </div>
            <form action={uploadPhotosAction.bind(null, property.id)} className="mb-4 flex flex-wrap items-center gap-2">
              <input
                type="file"
                name="files"
                multiple
                accept="image/png,image/jpeg,image/webp"
                className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
              />
              <SubmitButton variant="secondary" pendingLabel="Uploading…">Upload</SubmitButton>
            </form>
            {property.photos.length === 0 ? (
              <p className="text-sm text-slate-500">Add at least 5 photos. Lead with a bright exterior shot.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {property.photos.map((ph, i) => (
                  <div key={ph.id} className="group relative overflow-hidden rounded-lg border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaUrl(ph.storageKey)} alt={ph.caption ?? ""} className="aspect-[4/3] w-full object-cover" />
                    {i === 0 && <span className="absolute left-1 top-1 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">Cover</span>}
                    <div className="flex items-center justify-between gap-1 p-1">
                      <div className="flex gap-1">
                        <form action={reorderPhotoAction.bind(null, property.id, ph.id, "up")}>
                          <button className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100" aria-label="Move up" disabled={i === 0}>↑</button>
                        </form>
                        <form action={reorderPhotoAction.bind(null, property.id, ph.id, "down")}>
                          <button className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100" aria-label="Move down" disabled={i === property.photos.length - 1}>↓</button>
                        </form>
                      </div>
                      <form action={deletePhotoAction.bind(null, property.id, ph.id)}>
                        <button className="rounded px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-50" aria-label="Delete photo">✕</button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: facts + actions */}
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Listing</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Asking price" value={formatCurrency(property.askingPrice)} />
              <Row label="Beds / Baths" value={`${property.bedrooms ?? "—"} / ${baths(property.bathrooms)}`} />
              <Row label="Square feet" value={property.squareFeet?.toLocaleString() ?? "—"} />
              <Row label="Year built" value={property.yearBuilt ?? "—"} />
              <Row label="Showings" value={property._count.showings} />
              <Row label="Buyer interest" value={property._count.buyerInterests} />
              <Row label="Saves" value={property._count.favorites} />
            </dl>
            <div className="mt-4 flex flex-col gap-2">
              <LinkButton href={`/seller/properties/${property.id}/edit`} variant="secondary">
                Edit details &amp; questionnaire
              </LinkButton>
              {isLive && (
                <>
                  <LinkButton href={`/p/${property.slug}`} variant="secondary">View public page</LinkButton>
                  <LinkButton href={`/seller/properties/${property.id}/promote`} variant="secondary">Promotion tools</LinkButton>
                  <LinkButton href={`/seller/properties/${property.id}/analytics`} variant="secondary">Analytics</LinkButton>
                </>
              )}
              {property.aiContentStatus !== "NONE" && (
                <LinkButton href={`/seller/properties/${property.id}/review`} variant="secondary">Review AI content</LinkButton>
              )}
            </div>
          </div>

          {/* Lifecycle actions */}
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Actions</h2>
            <div className="flex flex-col gap-2">
              {isDraftLike && (
                <form action={submitForPreparationAction.bind(null, property.id)}>
                  <SubmitButton className="w-full" pendingLabel="Submitting…">
                    Submit for AI preparation
                  </SubmitButton>
                </form>
              )}
              {s === "READY_FOR_REVIEW" && (
                <LinkButton href={`/seller/properties/${property.id}/review`}>Review &amp; publish</LinkButton>
              )}
              {(s === "ACTIVE" || s === "BUYER_INTEREST_RECEIVED") && (
                <>
                  <form action={markUnderContractAction.bind(null, property.id)}>
                    <SubmitButton className="w-full" pendingLabel="Updating…">Mark under contract</SubmitButton>
                  </form>
                  <form action={pauseListingAction.bind(null, property.id)}>
                    <SubmitButton variant="secondary" className="w-full">Pause listing</SubmitButton>
                  </form>
                </>
              )}
              {s === "PAUSED" && (
                <form action={resumeListingAction.bind(null, property.id)}>
                  <SubmitButton className="w-full">Resume listing</SubmitButton>
                </form>
              )}
              {s === "UNDER_CONTRACT" && (
                <>
                  <form action={markSoldAction.bind(null, property.id)}>
                    <SubmitButton className="w-full">Mark as sold</SubmitButton>
                  </form>
                  <form action={resumeListingAction.bind(null, property.id)}>
                    <SubmitButton variant="secondary" className="w-full">Back to active</SubmitButton>
                  </form>
                </>
              )}
              {!["SOLD", "WITHDRAWN"].includes(s) && (
                <form action={withdrawListingAction.bind(null, property.id)}>
                  <SubmitButton variant="danger" className="w-full">Withdraw listing</SubmitButton>
                </form>
              )}
              {(s === "SOLD" || s === "WITHDRAWN") && <p className="text-sm text-slate-500">This listing is closed.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}
