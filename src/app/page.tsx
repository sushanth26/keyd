import Link from "next/link";
import { MARKET_CITIES } from "@/domain/constants";
import { prisma } from "@/lib/db";
import { PUBLIC_STATUSES } from "@/domain/lifecycle";
import { JsonLd } from "@/components/seo/json-ld";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { cityPath } from "@/lib/seo/urls";
import type { Metadata } from "next";

export const metadata: Metadata = buildMetadata({
  title: "Sell Your Home Directly to Buyers",
  description:
    "Keyd helps homeowners in the Dallas-Fort Worth area create owner-listed homes, reach buyers directly, and avoid agent commission.",
  path: "/",
});

export default async function LandingPage() {
  const [activeCount] = await Promise.all([
    prisma.property.count({ where: { status: { in: PUBLIC_STATUSES } } }).catch(() => 0),
  ]);

  const steps = [
    { n: 1, t: "Answer a few questions", d: "A guided questionnaire captures your home's facts, features, and showing availability." },
    { n: 2, t: "AI builds your listing", d: "Keyd drafts your headline, description, highlights, buyer FAQ, and promo assets — you approve everything." },
    { n: 3, t: "Verify & publish", d: "We verify your identity and ownership, score your listing's readiness, then you publish in one click." },
    { n: 4, t: "Meet buyers directly", d: "Buyers message you, request showings, and submit structured interest — all in one place." },
  ];

  return (
    <div>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-50 to-slate-50">
        <div className="container-page grid gap-8 py-16 md:grid-cols-2 md:py-24">
          <div className="flex flex-col justify-center">
            <span className="mb-3 inline-flex w-fit items-center rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
              Listed directly by owner · DFW
            </span>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              Sell your home directly. <span className="text-brand-600">No agents. No commission.</span>
            </h1>
            <p className="mt-4 max-w-lg text-lg text-slate-600">
              Keyd is an AI-first marketplace for Allen, Frisco, Plano, McKinney and surrounding DFW communities. We prepare
              your listing, promote it, and connect you directly with verified buyers.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register?role=seller" className="btn-primary px-6 py-3 text-base">
                List your home
              </Link>
              <Link href="/homes-for-sale" className="btn-secondary px-6 py-3 text-base">
                Browse homes{activeCount ? ` (${activeCount})` : ""}
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Keyd is not a brokerage and does not provide legal, appraisal, escrow, or title services.
            </p>
          </div>
          <div className="flex items-center justify-center">
            <div className="card w-full max-w-sm p-6">
              <div className="aspect-video rounded-lg bg-gradient-to-br from-brand-200 to-brand-400" />
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-slate-900">$525,000</p>
                  <p className="text-sm text-slate-500">4 bd · 3 ba · 2,450 sqft · Frisco</p>
                </div>
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Active</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="font-bold text-slate-900">92</p>
                  <p className="text-slate-500">Readiness</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="font-bold text-slate-900">Owner</p>
                  <p className="text-slate-500">Listed by</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="font-bold text-slate-900">Direct</p>
                  <p className="text-slate-500">Messaging</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container-page py-16">
        <h2 className="text-center text-2xl font-bold text-slate-900">How Keyd works for sellers</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="card p-5">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 font-bold text-white">{s.n}</div>
              <h3 className="mt-3 font-semibold text-slate-900">{s.t}</h3>
              <p className="mt-1 text-sm text-slate-500">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Market */}
      <section className="border-y border-slate-200 bg-white">
        <div className="container-page py-12">
          <h2 className="text-center text-xl font-bold text-slate-900">Now serving DFW communities</h2>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {MARKET_CITIES.map((c) => (
              <Link
                key={c}
                href={cityPath("TX", c)}
                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm font-medium text-slate-700 hover:border-brand-300 hover:bg-brand-50"
              >
                {c}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Buyer CTA */}
      <section className="container-page py-16">
        <div className="card flex flex-col items-center gap-4 bg-brand-700 p-10 text-center text-white">
          <h2 className="text-2xl font-bold">Looking to buy?</h2>
          <p className="max-w-lg text-brand-50">
            Save searches, get matched to new homes automatically, message owners directly, and submit non-binding interest.
          </p>
          <Link href="/register?role=buyer" className="btn bg-white px-6 py-3 text-base text-brand-700 hover:bg-brand-50">
            Create a buyer account
          </Link>
        </div>
      </section>
    </div>
  );
}
