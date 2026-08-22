import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { PageHeader, Alert, Badge } from "@/components/ui";
import { ReadinessCard } from "@/components/readiness-card";
import { SubmitButton } from "@/components/form";
import { approveContentAction, editContentAction, publishListingAction } from "@/app/seller/actions";

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { err?: string; approved?: string; edited?: string };
}) {
  const user = await requireRole("SELLER");
  const property = await prisma.property.findUnique({
    where: { id: params.id },
    include: { provenance: { where: { source: "AI" }, orderBy: { createdAt: "desc" }, take: 5 } },
  });
  if (!property || property.sellerId !== user.id) notFound();
  if (property.aiContentStatus === "NONE") redirect(`/seller/properties/${property.id}`);

  const faq = (Array.isArray(property.buyerFaq) ? property.buyerFaq : []) as { question: string; answer: string }[];
  const captions = (property.socialCaptions ?? {}) as Record<string, string>;
  const approved = property.aiContentStatus === "APPROVED";
  const readiness = property.readinessBreakdown as { publishable?: boolean } | null;
  const canPublish = approved && readiness?.publishable && property.status === "READY_FOR_REVIEW";
  const confidence = property.provenance[0]?.confidence;

  return (
    <div>
      <PageHeader
        title="Review your AI-prepared listing"
        subtitle="Everything below was drafted by Keyd from the facts you provided. Nothing goes live until you approve and publish."
        action={
          <Badge tone={approved ? "green" : "violet"}>
            {approved ? "Approved by you" : "Awaiting your approval"}
          </Badge>
        }
      />
      <Link href={`/seller/properties/${property.id}`} className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← Back to listing
      </Link>

      {searchParams.err && <Alert tone="error" title="Can't proceed">{searchParams.err}</Alert>}
      {searchParams.approved && <Alert tone="success">Content approved. You can publish when readiness requirements are met.</Alert>}
      {searchParams.edited && <Alert tone="info">Content updated. Re-approve your edited copy before publishing.</Alert>}

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="card p-5">
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Headline & description</h2>
              <Badge tone="blue">AI-generated{confidence != null ? ` · ${Math.round(confidence * 100)}% confidence` : ""}</Badge>
            </div>
            {/* Inline edit form */}
            <form action={editContentAction.bind(null, property.id)} className="space-y-3">
              <div>
                <label className="label" htmlFor="headline">Headline</label>
                <input className="input" id="headline" name="headline" defaultValue={property.headline ?? ""} />
              </div>
              <div>
                <label className="label" htmlFor="description">Description</label>
                <textarea className="input min-h-[140px]" id="description" name="description" defaultValue={property.description ?? ""} />
              </div>
              <SubmitButton variant="secondary" pendingLabel="Saving…">Save edits</SubmitButton>
            </form>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 text-lg font-bold text-slate-900">Highlights</h2>
            <div className="flex flex-wrap gap-2">
              {property.highlights.map((h, i) => (
                <span key={i} className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-800">{h}</span>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 text-lg font-bold text-slate-900">Buyer FAQ</h2>
            <dl className="space-y-3">
              {faq.map((f, i) => (
                <div key={i}>
                  <dt className="text-sm font-semibold text-slate-800">{f.question}</dt>
                  <dd className="text-sm text-slate-600">{f.answer}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 text-lg font-bold text-slate-900">Promotional copy</h2>
            <div className="space-y-3 text-sm">
              {Object.entries(captions).map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{k}</p>
                  <p className="text-slate-700">{v}</p>
                </div>
              ))}
              {property.openHouseCopy && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Open house</p>
                  <p className="whitespace-pre-line text-slate-700">{property.openHouseCopy}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: approve + publish */}
        <div className="space-y-4">
          <ReadinessCard score={property.readinessScore} breakdown={property.readinessBreakdown} />

          <div className="card space-y-3 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Approve & publish</h2>
            {!approved ? (
              <form action={approveContentAction.bind(null, property.id)}>
                <SubmitButton className="w-full" pendingLabel="Approving…">
                  Approve all content
                </SubmitButton>
              </form>
            ) : (
              <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">✓ You approved this content.</p>
            )}

            <form action={publishListingAction.bind(null, property.id)}>
              <SubmitButton className="w-full" pendingLabel="Publishing…" variant={canPublish ? "primary" : "secondary"}>
                Publish listing
              </SubmitButton>
            </form>
            {!canPublish && (
              <p className="text-xs text-slate-400">
                Publishing unlocks once content is approved and all readiness requirements (verification, required facts,
                price, and photos) are met.
              </p>
            )}
            <p className="text-xs text-slate-400">
              You are the decision-maker. Keyd does not publish anything without your explicit approval.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
