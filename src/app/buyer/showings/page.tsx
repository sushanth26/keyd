import Link from "next/link";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState, Badge, Alert } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import { formatDateTime } from "@/lib/format";
import { submitShowingFeedbackAction } from "@/app/buyer/actions";
import { TrackOnMount } from "@/components/analytics/track-on-mount";

const TONE = { REQUESTED: "amber", CONFIRMED: "green", DECLINED: "red", RESCHEDULE_PROPOSED: "amber", CANCELLED: "slate", COMPLETED: "blue" } as const;

export default async function BuyerShowings({ searchParams }: { searchParams: { requested?: string; listing?: string } }) {
  const user = await requireRole("BUYER");
  const showings = await prisma.showingRequest.findMany({
    where: { buyerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { property: { select: { addressLine1: true, city: true, slug: true } } },
  });

  return (
    <div>
      {searchParams.requested && searchParams.listing && (
        <>
          <TrackOnMount
            event="schedule_tour"
            params={{ listing_id: searchParams.listing }}
            dedupeKey={`tour_${searchParams.listing}`}
          />
          <TrackOnMount
            event="generate_lead"
            params={{ listing_id: searchParams.listing, lead_type: "showing_request" }}
            dedupeKey={`lead_showing_${searchParams.listing}`}
          />
        </>
      )}
      <PageHeader title="Your showings" subtitle="Track requested and confirmed showings." />
      {searchParams.requested && <Alert tone="success">Showing request sent. The owner will confirm or propose new times.</Alert>}

      {showings.length === 0 ? (
        <EmptyState icon="📅" title="No showings yet" message="Request a showing from any listing to get started." />
      ) : (
        <div className="space-y-3">
          {showings.map((s) => {
            const slots = (Array.isArray(s.proposedSlots) ? s.proposedSlots : []) as string[];
            const feedback = s.feedback as { rating?: number } | null;
            return (
              <div key={s.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <Link href={`/p/${s.property.slug}`} className="font-semibold text-slate-900 hover:underline">
                    {s.property.addressLine1}, {s.property.city}
                  </Link>
                  <Badge tone={TONE[s.status]}>{s.status.replace(/_/g, " ")}</Badge>
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  {s.confirmedStart ? (
                    <p>✓ Confirmed for {formatDateTime(s.confirmedStart)}</p>
                  ) : (
                    <p>Proposed: {slots.map((x) => formatDateTime(x)).join(" · ")}</p>
                  )}
                </div>
                {s.status === "CONFIRMED" && !feedback && (
                  <form action={submitShowingFeedbackAction.bind(null, s.id)} className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3">
                    <p className="text-sm font-medium text-slate-700">Attended? Leave feedback</p>
                    <div className="flex items-center gap-3">
                      <label className="text-sm">Rating
                        <select name="rating" className="input mt-1 w-20" defaultValue="4">
                          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </label>
                      <label className="mt-5 flex items-center gap-1.5 text-sm"><input type="checkbox" name="interested" /> Still interested</label>
                    </div>
                    <textarea name="comments" className="input min-h-[60px]" placeholder="Your thoughts (private to you)…" />
                    <SubmitButton variant="secondary">Submit feedback</SubmitButton>
                  </form>
                )}
                {feedback?.rating && <p className="mt-2 text-xs text-slate-400">You rated this showing {feedback.rating}/5.</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
