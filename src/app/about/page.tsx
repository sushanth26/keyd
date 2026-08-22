import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { organizationJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "About Keyd",
  description: "Keyd is a direct owner-to-buyer real-estate marketplace helping homeowners list, promote, and sell without agents or commission.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="container-page max-w-4xl py-12">
      <JsonLd data={organizationJsonLd()} />
      <h1 className="text-3xl font-bold text-slate-900">About Keyd</h1>
      <p className="mt-4 text-lg leading-relaxed text-slate-600">
        Keyd is a non-MLS, owner-to-buyer marketplace for homeowners who want a clearer way to sell directly. Sellers create
        verified listings, buyers browse public property details, and both sides connect inside Keyd without agent
        gatekeeping or commission.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <section className="card p-5">
          <h2 className="font-semibold text-slate-900">Owner listed</h2>
          <p className="mt-2 text-sm text-slate-600">Listings are created and approved by the homeowner, with public facts shown to buyers.</p>
        </section>
        <section className="card p-5">
          <h2 className="font-semibold text-slate-900">Direct buyer contact</h2>
          <p className="mt-2 text-sm text-slate-600">Buyers can message owners, request showings, and submit non-binding interest through Keyd.</p>
        </section>
        <section className="card p-5">
          <h2 className="font-semibold text-slate-900">No brokerage role</h2>
          <p className="mt-2 text-sm text-slate-600">Keyd is a self-service marketing platform, not a real-estate brokerage or legal service.</p>
        </section>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/homes-for-sale" className="btn-primary">Browse homes</Link>
        <Link href="/sell" className="btn-secondary">Sell directly</Link>
      </div>
    </div>
  );
}
