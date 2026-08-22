import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isPubliclyVisible } from "@/domain/lifecycle";
import { formatCurrency } from "@/lib/format";
import { NON_BINDING_DISCLAIMER } from "@/domain/constants";
import { Alert } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import { submitInterestAction } from "@/app/buyer/actions";
import { noindexMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = noindexMetadata;

const CONTINGENCIES = ["Inspection", "Financing", "Appraisal", "Sale of current home", "Title review"];

export default async function BuyerInterestPage({ params }: { params: { slug: string } }) {
  const property = await prisma.property.findUnique({
    where: { slug: params.slug },
    include: { photos: { orderBy: { position: "asc" }, take: 1 } },
  });
  if (!property || !isPubliclyVisible(property.status)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/login`);
  if (user.role !== "BUYER") redirect(`/p/${property.slug}`);

  return (
    <div className="container-page max-w-2xl py-6">
      <Link href={`/p/${property.slug}`} className="mb-3 inline-block text-sm text-brand-600 hover:underline">← Back to listing</Link>
      <h1 className="text-2xl font-bold text-slate-900">Submit buyer interest</h1>
      <p className="text-sm text-slate-500">
        {property.addressLine1}, {property.city} · Asking {formatCurrency(property.askingPrice)}
      </p>

      <Alert tone="warning" title="Not a binding contract">{NON_BINDING_DISCLAIMER}</Alert>

      <form action={submitInterestAction.bind(null, property.id)} className="mt-4 space-y-5">
        <div className="card space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Proposed price ($)</span>
              <input name="proposedPrice" inputMode="numeric" required className="input" defaultValue={property.askingPrice ?? ""} />
            </label>
            <label className="block">
              <span className="label">Financing type</span>
              <select name="financingType" className="input" defaultValue="CONVENTIONAL">
                <option value="CASH">Cash</option>
                <option value="CONVENTIONAL">Conventional</option>
                <option value="FHA">FHA</option>
                <option value="VA">VA</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label className="block">
              <span className="label">Down payment ($)</span>
              <input name="downPayment" inputMode="numeric" className="input" placeholder="Optional" />
            </label>
            <label className="block">
              <span className="label">Preapproval status</span>
              <select name="preapprovalStatus" className="input" defaultValue="NONE">
                <option value="NONE">Not started</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="PREAPPROVED">Preapproved</option>
                <option value="PROOF_OF_FUNDS">Proof of funds (cash)</option>
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="label">Preferred closing date</span>
              <input type="date" name="preferredClosingDate" className="input" />
            </label>
          </div>

          <fieldset>
            <legend className="label">Requested contingencies</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {CONTINGENCIES.map((c) => (
                <label key={c} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
                  <input type="checkbox" name="contingencies" value={c} /> {c}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="label">Message to the owner</span>
            <textarea name="message" className="input min-h-[90px]" placeholder="Share anything that supports your interest…" />
          </label>

          <label className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            <input type="checkbox" name="acknowledged" required className="mt-1" />
            <span>I understand this is a <strong>non-binding expression of interest</strong>, not an offer or a legally binding real-estate contract.</span>
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <Link href={`/p/${property.slug}`} className="btn-ghost">Cancel</Link>
          <SubmitButton pendingLabel="Submitting…">Submit interest</SubmitButton>
        </div>
      </form>

      <p className="mt-4 text-xs text-slate-400">
        Optional: you can upload preapproval or proof-of-funds documents from your buyer dashboard after submitting.
      </p>
    </div>
  );
}
