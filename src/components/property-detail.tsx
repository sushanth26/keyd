import Link from "next/link";
import type { Property, PropertyPhoto } from "@prisma/client";
import { formatCurrency, baths, formatNumber } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { qrDataUrl } from "@/lib/qr";
import { propertyUrl } from "@/lib/seo/urls";
import { NON_BINDING_DISCLAIMER, LEGAL_DISCLAIMER } from "@/domain/constants";
import { Badge, Alert } from "@/components/ui";
import { ShareButton } from "@/components/share-button";
import { SubmitButton } from "@/components/form";
import { FavoriteSubmit } from "@/components/analytics/favorite-submit";
import { TrackOnMount } from "@/components/analytics/track-on-mount";
import { contactOwnerAction, requestShowingAction, reportAction, toggleFavoriteAction } from "@/app/buyer/actions";

export type PropertyForDetail = Property & {
  photos: PropertyPhoto[];
  seller: { fullName: string; identityStatus: string };
};

/** Shared public property page body. Rendered by the canonical /homes/... route. */
export async function PropertyDetail({
  property,
  isOwner,
  isAuthed,
  favorited,
  interestJustSubmitted,
}: {
  property: PropertyForDetail;
  isOwner: boolean;
  isAuthed: boolean;
  favorited: boolean;
  interestJustSubmitted?: boolean;
}) {
  const url = propertyUrl(property);
  const qr = await qrDataUrl(url);
  const faq = (Array.isArray(property.buyerFaq) ? property.buyerFaq : []) as { question: string; answer: string }[];
  const windows = (Array.isArray(property.showingAvailability) ? property.showingAvailability : []) as {
    dayOfWeek: string;
    start: string;
    end: string;
  }[];
  const mapUrl = `https://www.openstreetmap.org/search?query=${encodeURIComponent(
    `${property.addressLine1}, ${property.city}, ${property.state} ${property.zip}`,
  )}`;
  const altBase = `${property.bedrooms ?? ""}-bedroom ${property.propertyType
    .toLowerCase()
    .replace(/_/g, " ")} in ${property.city}, ${property.state}`;

  return (
    <div className="container-page py-6">
      {/* Fire view_item once per view; fire generate_lead when returning from the interest form */}
      <TrackOnMount
        event="view_item"
        params={{
          listing_id: property.id,
          property_type: property.propertyType,
          city: property.city,
          state: property.state,
          price: property.askingPrice ?? undefined,
          currency: "USD",
        }}
      />
      {interestJustSubmitted && (
        <TrackOnMount
          event="generate_lead"
          params={{ listing_id: property.id, lead_type: "buyer_interest" }}
          dedupeKey={`lead_${property.id}`}
        />
      )}

      {interestJustSubmitted && <Alert tone="success">Your non-binding interest was sent to the owner.</Alert>}

      {/* Gallery */}
      <div className="grid gap-2 sm:grid-cols-4 sm:grid-rows-2">
        <div className="sm:col-span-2 sm:row-span-2">
          <div className="aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
            {property.photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaUrl(property.photos[0].storageKey)}
                alt={property.photos[0].caption ? `${property.photos[0].caption} — ${altBase}` : altBase}
                width={property.photos[0].width ?? 1024}
                height={property.photos[0].height ?? 683}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
        </div>
        {property.photos.slice(1, 5).map((ph) => (
          <div key={ph.id} className="hidden overflow-hidden rounded-xl bg-slate-100 sm:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaUrl(ph.storageKey)}
              alt={ph.caption ? `${ph.caption} — ${altBase}` : altBase}
              width={ph.width ?? 1024}
              height={ph.height ?? 683}
              loading="lazy"
              decoding="async"
              className="aspect-[4/3] h-full w-full object-cover"
            />
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Main */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="green">🏠 Listed directly by owner</Badge>
            {property.seller.identityStatus === "VERIFIED" && <Badge tone="blue">✓ Owner verified</Badge>}
            {property.status === "UNDER_CONTRACT" && <Badge tone="violet">Under contract</Badge>}
          </div>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {property.bedrooms ? `${property.bedrooms}-Bed ` : ""}
            {property.propertyType === "SINGLE_FAMILY" ? "Home" : property.propertyType.replace(/_/g, " ").toLowerCase()} for
            Sale by Owner in {property.city}, {property.state}
          </h1>
          <p className="mt-1 text-2xl font-bold text-brand-700">{formatCurrency(property.askingPrice)}</p>
          {property.headline && <p className="text-lg text-slate-700">{property.headline}</p>}
          <p className="text-slate-500">
            {property.addressLine1}, {property.city}, {property.state} {property.zip}
          </p>

          <div className="mt-4 flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-white p-4 text-center">
            <Fact label="Beds" value={property.bedrooms ?? "—"} />
            <Fact label="Baths" value={baths(property.bathrooms)} />
            <Fact label="Sq Ft" value={formatNumber(property.squareFeet)} />
            <Fact label="Lot Sq Ft" value={formatNumber(property.lotSizeSqft)} />
            <Fact label="Year" value={property.yearBuilt ?? "—"} />
            <Fact label="Garage" value={property.garageSpaces ?? "—"} />
            <Fact label="HOA/mo" value={property.hoaFeeMonthly != null ? formatCurrency(property.hoaFeeMonthly) : "—"} />
          </div>

          {property.description && (
            <section className="mt-6">
              <h2 className="text-lg font-bold text-slate-900">About this home</h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-700">{property.description}</p>
            </section>
          )}

          {property.highlights.length > 0 && (
            <section className="mt-6">
              <h2 className="text-lg font-bold text-slate-900">Highlights</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {property.highlights.map((h, i) => (
                  <span key={i} className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-800">
                    {h}
                  </span>
                ))}
              </div>
            </section>
          )}

          {property.features.length > 0 && (
            <section className="mt-6">
              <h2 className="text-lg font-bold text-slate-900">Features</h2>
              <ul className="mt-2 grid grid-cols-2 gap-1 text-sm text-slate-700 sm:grid-cols-3">
                {property.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-1">
                    <span className="text-green-600">✓</span> {f}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {property.improvements && (
            <section className="mt-6">
              <h2 className="text-lg font-bold text-slate-900">Recent improvements</h2>
              <p className="mt-2 text-slate-700">{property.improvements}</p>
            </section>
          )}

          {faq.length > 0 && (
            <section className="mt-6">
              <h2 className="text-lg font-bold text-slate-900">Buyer FAQ</h2>
              <dl className="mt-2 space-y-3">
                {faq.map((f, i) => (
                  <div key={i} className="rounded-lg border border-slate-100 p-3">
                    <dt className="font-semibold text-slate-800">{f.question}</dt>
                    <dd className="text-sm text-slate-600">{f.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section className="mt-6">
            <h2 className="text-lg font-bold text-slate-900">Location</h2>
            <div className="mt-2 flex items-center justify-between rounded-xl border border-slate-200 bg-gradient-to-br from-brand-50 to-slate-100 p-6">
              <div>
                <p className="font-medium text-slate-800">
                  {property.city}, {property.state} {property.zip}
                </p>
                <p className="text-sm text-slate-500">Exact location shared with confirmed showings.</p>
              </div>
              <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                View on map ↗
              </a>
            </div>
          </section>

          {windows.length > 0 && (
            <section className="mt-6">
              <h2 className="text-lg font-bold text-slate-900">Showing availability</h2>
              <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                {windows.map((w, i) => (
                  <li key={i} className="rounded-lg bg-slate-100 px-3 py-1.5 text-slate-700">
                    {w.dayOfWeek} {w.start}–{w.end}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Sidebar actions */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="card space-y-3 p-5">
            <p className="text-sm text-slate-500">Listed directly by</p>
            <p className="text-lg font-semibold text-slate-900">{property.seller.fullName}</p>

            {isOwner ? (
              <Alert tone="info">This is your listing.</Alert>
            ) : (
              <>
                <details className="rounded-lg border border-slate-200 p-3">
                  <summary className="cursor-pointer font-medium text-brand-700">💬 Contact owner</summary>
                  <form action={contactOwnerAction.bind(null, property.id)} className="mt-3 space-y-2">
                    <textarea name="message" required className="input min-h-[80px]" placeholder="Hi, I'm interested in your home…" />
                    <p className="text-xs text-slate-400">Messages stay on Keyd; contact details are hidden by default.</p>
                    <SubmitButton className="w-full">Send message</SubmitButton>
                  </form>
                </details>

                <details className="rounded-lg border border-slate-200 p-3">
                  <summary className="cursor-pointer font-medium text-brand-700">📅 Request a showing</summary>
                  <form action={requestShowingAction.bind(null, property.id)} className="mt-3 space-y-2">
                    <label className="label text-xs">Proposed times</label>
                    <input type="datetime-local" name="slots" className="input" required />
                    <input type="datetime-local" name="slots" className="input" />
                    <input type="datetime-local" name="slots" className="input" />
                    <textarea name="message" className="input min-h-[60px]" placeholder="Optional note" />
                    <SubmitButton className="w-full">Request showing</SubmitButton>
                  </form>
                </details>

                <Link href={`/p/${property.slug}/interest`} className="btn-primary w-full">
                  📝 Submit buyer interest
                </Link>

                <div className="grid grid-cols-2 gap-2">
                  <form action={toggleFavoriteAction.bind(null, property.id)}>
                    <FavoriteSubmit listingId={property.id} favorited={favorited} />
                  </form>
                  <ShareButton url={url} listingId={property.id} />
                </div>
              </>
            )}
          </div>

          <div className="card p-5 text-center">
            <p className="mb-2 text-sm font-medium text-slate-700">Scan to view / share</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt={`QR code linking to this ${altBase} listing`} width={160} height={160} className="mx-auto h-40 w-40" />
            {!isAuthed && (
              <p className="mt-2 text-xs text-slate-400">
                <Link href="/register?role=buyer" className="text-brand-600 underline">
                  Create a buyer account
                </Link>{" "}
                to save, message, and submit interest.
              </p>
            )}
          </div>

          <details className="card p-4 text-sm">
            <summary className="cursor-pointer text-slate-500">🚩 Report this listing</summary>
            <form action={reportAction.bind(null, property.id)} className="mt-3 space-y-2">
              <select name="reason" className="input">
                <option value="INACCURATE">Inaccurate information</option>
                <option value="FRAUD">Looks fraudulent</option>
                <option value="DUPLICATE">Duplicate listing</option>
                <option value="INAPPROPRIATE">Inappropriate content</option>
                <option value="SPAM">Spam</option>
                <option value="OTHER">Other</option>
              </select>
              <textarea name="details" className="input min-h-[60px]" placeholder="What's wrong?" />
              <SubmitButton variant="secondary" className="w-full">
                Submit report
              </SubmitButton>
            </form>
          </details>

          <p className="px-1 text-xs leading-relaxed text-slate-400">{LEGAL_DISCLAIMER}</p>
        </aside>
      </div>

      <p className="mt-8 rounded-lg bg-slate-100 p-3 text-center text-xs text-slate-400">{NON_BINDING_DISCLAIMER}</p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-[64px] flex-1">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
