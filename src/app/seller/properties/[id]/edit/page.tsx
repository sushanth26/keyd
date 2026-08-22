import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import { saveListingAction, uploadDocumentAction, deleteDocumentAction } from "@/app/seller/actions";
import { DISCLOSURE_CHECKLIST, MARKET_CITIES } from "@/domain/constants";
import { formatDate } from "@/lib/format";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SUGGESTED_FEATURES = ["Updated Kitchen", "Hardwood Floors", "Pool", "Covered Patio", "Game Room", "Solar Panels", "Open Floor Plan", "Fenced Backyard", "Study/Office", "Three-Car Garage"];

export default async function EditListing({ params }: { params: { id: string } }) {
  const user = await requireRole("SELLER");
  const p = await prisma.property.findUnique({
    where: { id: params.id },
    include: { documents: { orderBy: { createdAt: "desc" } } },
  });
  if (!p || p.sellerId !== user.id) notFound();

  const disclosures = (Array.isArray(p.disclosures) ? p.disclosures : []) as { key: string; acknowledged: boolean }[];
  const ackSet = new Set(disclosures.filter((d) => d.acknowledged).map((d) => d.key));
  const windows = (Array.isArray(p.showingAvailability) ? p.showingAvailability : []) as { dayOfWeek: string; start: string; end: string }[];
  const activeDays = new Set(windows.map((w) => w.dayOfWeek));
  const start = windows[0]?.start ?? "10:00";
  const end = windows[0]?.end ?? "17:00";

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Guided listing questionnaire" subtitle="Tell us about your home. You can save and come back anytime." />
      <Link href={`/seller/properties/${p.id}`} className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← Back to listing
      </Link>

      <form action={saveListingAction.bind(null, p.id)} className="space-y-8">
        {/* Address */}
        <Section title="Address" step={1}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Street address" className="sm:col-span-2">
              <input className="input" name="addressLine1" defaultValue={p.addressLine1} required />
            </Field>
            <Field label="City">
              <input className="input" name="city" list="cities" defaultValue={p.city} required />
              <datalist id="cities">{MARKET_CITIES.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="ZIP">
              <input className="input" name="zip" pattern="\d{5}" defaultValue={p.zip} required />
            </Field>
          </div>
        </Section>

        {/* Price & facts */}
        <Section title="Price & property facts" step={2}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Asking price ($)">
              <input className="input" name="askingPrice" inputMode="numeric" defaultValue={p.askingPrice ?? ""} placeholder="525000" />
            </Field>
            <Field label="Property type">
              <select className="input" name="propertyType" defaultValue={p.propertyType}>
                <option value="SINGLE_FAMILY">Single-family home</option>
                <option value="TOWNHOUSE">Townhouse</option>
                <option value="CONDO">Condominium</option>
                <option value="MULTI_FAMILY">Multi-family</option>
                <option value="LAND">Land / lot</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>
            <Field label="Bedrooms"><input className="input" name="bedrooms" inputMode="numeric" defaultValue={p.bedrooms ?? ""} /></Field>
            <Field label="Bathrooms"><input className="input" name="bathrooms" inputMode="decimal" defaultValue={p.bathrooms ?? ""} placeholder="2.5" /></Field>
            <Field label="Square feet"><input className="input" name="squareFeet" inputMode="numeric" defaultValue={p.squareFeet ?? ""} /></Field>
            <Field label="Lot size (sq ft)"><input className="input" name="lotSizeSqft" inputMode="numeric" defaultValue={p.lotSizeSqft ?? ""} /></Field>
            <Field label="Year built"><input className="input" name="yearBuilt" inputMode="numeric" defaultValue={p.yearBuilt ?? ""} /></Field>
            <Field label="Garage spaces"><input className="input" name="garageSpaces" inputMode="numeric" defaultValue={p.garageSpaces ?? ""} /></Field>
            <Field label="Stories"><input className="input" name="stories" inputMode="numeric" defaultValue={p.stories ?? ""} /></Field>
            <Field label="HOA dues ($/mo)"><input className="input" name="hoaFeeMonthly" inputMode="numeric" defaultValue={p.hoaFeeMonthly ?? ""} placeholder="0" /></Field>
          </div>
        </Section>

        {/* Features & improvements */}
        <Section title="Features & improvements" step={3}>
          <Field label="Features (comma-separated)">
            <input className="input" name="features" defaultValue={p.features.join(", ")} placeholder="Updated Kitchen, Pool, Covered Patio" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUGGESTED_FEATURES.map((f) => (
                <span key={f} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">{f}</span>
              ))}
            </div>
          </Field>
          <Field label="Recent improvements & upgrades">
            <textarea className="input min-h-[90px]" name="improvements" defaultValue={p.improvements ?? ""} placeholder="New roof (2023), kitchen remodel, HVAC replaced…" />
          </Field>
        </Section>

        {/* Disclosures */}
        <Section title="Disclosure checklist" step={4}>
          <p className="mb-2 text-sm text-slate-500">Confirm the disclosures you have completed. Keyd does not provide legal advice — consult a professional as needed.</p>
          <div className="space-y-2">
            {DISCLOSURE_CHECKLIST.map((d) => (
              <label key={d.key} className="flex items-start gap-2 text-sm">
                <input type="checkbox" name={`disclosure_${d.key}`} defaultChecked={ackSet.has(d.key)} className="mt-1" />
                <span>{d.label}</span>
              </label>
            ))}
          </div>
        </Section>

        {/* Showing availability */}
        <Section title="Showing availability" step={5}>
          <p className="mb-2 text-sm text-slate-500">Select days you're generally available to host showings, and a time window.</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {DAYS.map((d) => (
              <label key={d} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
                <input type="checkbox" name="showingDays" value={d} defaultChecked={activeDays.has(d)} />
                {d.slice(0, 3)}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From"><input className="input" type="time" name="showingStart" defaultValue={start} /></Field>
            <Field label="To"><input className="input" type="time" name="showingEnd" defaultValue={end} /></Field>
          </div>
        </Section>

        <div className="flex items-center justify-between">
          <Link href={`/seller/properties/${p.id}`} className="btn-ghost">Cancel</Link>
          <SubmitButton pendingLabel="Saving…">Save details</SubmitButton>
        </div>
      </form>

      {/* Private documents — separate form (file upload) */}
      <section className="card mt-8 p-5">
        <h2 className="mb-1 text-lg font-bold text-slate-900">Private supporting documents</h2>
        <p className="mb-3 text-sm text-slate-500">
          Disclosures, title, inspection, survey. These are private — never shown publicly, only accessible to you and Keyd administrators.
        </p>
        <form action={uploadDocumentAction.bind(null, p.id)} className="flex flex-wrap items-center gap-2">
          <input type="file" name="file" accept="application/pdf,image/*" className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:font-semibold file:text-white" />
          <select name="docType" className="input w-auto">
            <option value="DISCLOSURE">Disclosure</option>
            <option value="TITLE">Title</option>
            <option value="INSPECTION">Inspection</option>
            <option value="SURVEY">Survey</option>
            <option value="OTHER">Other</option>
          </select>
          <SubmitButton variant="secondary" pendingLabel="Uploading…">Upload</SubmitButton>
        </form>
        {p.documents.length > 0 && (
          <ul className="mt-3 divide-y divide-slate-100">
            {p.documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                <a href={`/api/documents/${d.id}`} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                  📄 {d.filename} <span className="text-xs text-slate-400">({d.docType.toLowerCase()}, {formatDate(d.createdAt)})</span>
                </a>
                <form action={deleteDocumentAction.bind(null, p.id, d.id)}>
                  <button className="text-xs text-red-500 hover:underline">Delete</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Section({ title, step, children }: { title: string; step: number; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{step}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
