import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "How Keyd Works",
  description: "Learn how homeowners list directly on Keyd and how buyers search homes, contact sellers, request showings, and submit non-binding interest.",
  path: "/how-it-works",
});

const sellerSteps = [
  "Start a guided listing and add property facts, photos, features, and showing availability.",
  "Review AI-assisted listing copy, disclosures, and readiness recommendations before publishing.",
  "Verify identity and ownership, then publish the listing for buyers to discover.",
  "Respond directly to buyer messages, showing requests, and non-binding interest.",
];

const buyerSteps = [
  "Browse owner-listed homes by market, city, price, property type, and home facts.",
  "Open a listing to view photos, property details, highlights, and public seller-provided information.",
  "Save homes, request showings, contact the seller, or submit structured non-binding interest.",
  "Keep conversations, showings, favorites, and saved searches organized in a buyer account.",
];

export default function HowItWorksPage() {
  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-bold text-slate-900">How Keyd works</h1>
      <p className="mt-3 max-w-3xl text-lg leading-relaxed text-slate-600">
        Keyd helps homeowners publish verified, owner-listed homes and lets buyers contact sellers directly. The platform
        supports listing creation, buyer discovery, messaging, showings, and non-binding interest without acting as a broker.
      </p>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-xl font-semibold text-slate-900">For sellers</h2>
          <ol className="mt-4 space-y-3">
            {sellerSteps.map((step, index) => (
              <li key={step} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600 font-semibold text-white">{index + 1}</span>
                <p className="text-sm leading-relaxed text-slate-600">{step}</p>
              </li>
            ))}
          </ol>
          <Link href="/register?role=seller" className="btn-primary mt-5">Start a listing</Link>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">For buyers</h2>
          <ol className="mt-4 space-y-3">
            {buyerSteps.map((step, index) => (
              <li key={step} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-800 font-semibold text-white">{index + 1}</span>
                <p className="text-sm leading-relaxed text-slate-600">{step}</p>
              </li>
            ))}
          </ol>
          <Link href="/homes-for-sale" className="btn-secondary mt-5">Browse owner-listed homes</Link>
        </section>
      </div>
    </div>
  );
}
