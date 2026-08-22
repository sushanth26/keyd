import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { PageHeader, Alert } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import { savePreferencesAction } from "@/app/buyer/actions";
import { MARKET_CITIES } from "@/domain/constants";

export default async function PreferencesPage({ searchParams }: { searchParams: { saved?: string } }) {
  const user = await requireRole("BUYER");
  const p = await prisma.buyerProfile.findUnique({ where: { userId: user.id } });
  const cities = new Set(p?.preferredCities ?? []);
  const types = new Set(p?.propertyTypes ?? []);

  return (
    <div className="max-w-2xl">
      <PageHeader title="Search preferences" subtitle="We use these to match you with new listings. We never use protected characteristics." />
      {searchParams.saved && <Alert tone="success">Preferences saved. New matching listings will notify you.</Alert>}

      <form action={savePreferencesAction} className="space-y-5">
        <section className="card p-5">
          <h2 className="label mb-2">Preferred cities</h2>
          <div className="flex flex-wrap gap-2">
            {MARKET_CITIES.map((c) => (
              <label key={c} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
                <input type="checkbox" name="cities" value={c} defaultChecked={cities.has(c)} /> {c}
              </label>
            ))}
          </div>
        </section>

        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          <label className="block"><span className="label">Min price ($)</span><input name="minPrice" inputMode="numeric" className="input" defaultValue={p?.minPrice ?? ""} /></label>
          <label className="block"><span className="label">Max price ($)</span><input name="maxPrice" inputMode="numeric" className="input" defaultValue={p?.maxPrice ?? ""} /></label>
          <label className="block"><span className="label">Min bedrooms</span><input name="minBedrooms" inputMode="numeric" className="input" defaultValue={p?.minBedrooms ?? ""} /></label>
          <label className="block"><span className="label">Min bathrooms</span><input name="minBathrooms" inputMode="decimal" className="input" defaultValue={p?.minBathrooms ?? ""} /></label>
          <label className="block"><span className="label">Move-in timeframe</span>
            <select name="moveInTimeframe" className="input" defaultValue={p?.moveInTimeframe ?? ""}>
              <option value="">No preference</option>
              <option value="IMMEDIATE">Immediate</option>
              <option value="WITHIN_3_MONTHS">Within 3 months</option>
              <option value="WITHIN_6_MONTHS">Within 6 months</option>
              <option value="FLEXIBLE">Flexible</option>
            </select>
          </label>
          <label className="block"><span className="label">Financing readiness</span>
            <select name="financingReadiness" className="input" defaultValue={p?.financingReadiness ?? "NOT_STARTED"}>
              <option value="NOT_STARTED">Not started</option>
              <option value="PREQUALIFIED">Prequalified</option>
              <option value="PREAPPROVED">Preapproved</option>
              <option value="CASH_VERIFIED">Cash (proof of funds)</option>
            </select>
          </label>
        </section>

        <section className="card p-5">
          <h2 className="label mb-2">Property types</h2>
          <div className="flex flex-wrap gap-2">
            {[["SINGLE_FAMILY", "Single-family"], ["TOWNHOUSE", "Townhouse"], ["CONDO", "Condo"], ["MULTI_FAMILY", "Multi-family"], ["LAND", "Land"]].map(([v, l]) => (
              <label key={v} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
                <input type="checkbox" name="propertyTypes" value={v} defaultChecked={types.has(v as never)} /> {l}
              </label>
            ))}
          </div>
          <label className="mt-4 block">
            <span className="label">Desired features (comma-separated)</span>
            <input name="desiredFeatures" className="input" defaultValue={p?.desiredFeatures.join(", ") ?? ""} placeholder="Pool, Updated Kitchen, Single Story" />
          </label>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" name="notifyOnMatch" defaultChecked={p?.notifyOnMatch ?? true} /> Email me when a new home matches
          </label>
        </section>

        <div className="flex justify-end"><SubmitButton pendingLabel="Saving…">Save preferences</SubmitButton></div>
      </form>
    </div>
  );
}
