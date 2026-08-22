import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Sell Your Home by Owner",
  description:
    "Create a verified owner-listed home on Keyd, publish property details, receive buyer messages, and sell directly without agent commission.",
  path: "/sell",
});

const steps = [
  "Answer guided questions about your home, pricing, features, documents, and showing windows.",
  "Review AI-assisted listing copy and readiness recommendations before anything goes public.",
  "Complete identity and ownership verification so buyers know the listing is real.",
  "Publish, share your listing, and respond directly to buyer messages and showing requests.",
];

export default function SellPage() {
  return (
    <div className="container-page py-12">
      <section className="max-w-3xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Sell your home directly with Keyd</h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-600">
          Keyd gives homeowners a structured way to create, verify, publish, and promote an owner-listed home. Buyers can
          view public listing details, contact you directly, request showings, and submit non-binding interest through the
          platform.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/register?role=seller" className="btn-primary px-6 py-3">Start a listing</Link>
          <Link href="/how-it-works" className="btn-secondary px-6 py-3">See how it works</Link>
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step} className="card p-5">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 font-bold text-white">{index + 1}</div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{step}</p>
          </div>
        ))}
      </section>

      <section className="mt-10 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-900">Built for direct seller-to-buyer conversations</h2>
        <p className="mt-2 max-w-3xl text-slate-600">
          Keyd is not a brokerage and does not provide legal, title, escrow, mortgage, or appraisal services. You stay in
          control of your listing while choosing the qualified professionals you need outside the platform.
        </p>
      </section>
    </div>
  );
}
