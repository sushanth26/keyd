"use client";

import { useFormState } from "react-dom";
import { createDraftAction } from "@/app/seller/actions";
import { SubmitButton, FormError } from "@/components/form";
import { MARKET_CITIES } from "@/domain/constants";

export default function NewListingPage() {
  const [state, action] = useFormState<{ error?: string }, FormData>(createDraftAction, {});
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold text-slate-900">Start your listing</h1>
      <p className="mt-1 text-sm text-slate-500">
        Just the basics to begin. Next you'll complete a guided questionnaire, then Keyd's AI prepares your listing for review.
      </p>
      <form action={action} className="mt-6 space-y-4">
        <FormError message={state.error} />
        <div>
          <label className="label" htmlFor="addressLine1">Street address</label>
          <input className="input" id="addressLine1" name="addressLine1" placeholder="1204 Bluebonnet Trail" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="city">City</label>
            <input className="input" id="city" name="city" list="cities" placeholder="Frisco" required />
            <datalist id="cities">
              {MARKET_CITIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="label" htmlFor="zip">ZIP</label>
            <input className="input" id="zip" name="zip" inputMode="numeric" pattern="\d{5}" placeholder="75034" required />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="propertyType">Property type</label>
          <select className="input" id="propertyType" name="propertyType" defaultValue="SINGLE_FAMILY">
            <option value="SINGLE_FAMILY">Single-family home</option>
            <option value="TOWNHOUSE">Townhouse</option>
            <option value="CONDO">Condominium</option>
            <option value="MULTI_FAMILY">Multi-family</option>
            <option value="LAND">Land / lot</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <SubmitButton className="w-full" pendingLabel="Creating draft…">
          Create draft &amp; continue
        </SubmitButton>
        <p className="text-center text-xs text-slate-400">
          Keyd is not a brokerage. You remain the owner and decision-maker for your sale.
        </p>
      </form>
    </div>
  );
}
