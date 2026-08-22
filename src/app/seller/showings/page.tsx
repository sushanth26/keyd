import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState, Badge } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import { formatDateTime } from "@/lib/format";
import { respondShowingAction } from "@/app/seller/actions";

const STATUS_TONE = { REQUESTED: "amber", CONFIRMED: "green", DECLINED: "red", RESCHEDULE_PROPOSED: "amber", CANCELLED: "slate", COMPLETED: "blue" } as const;

export default async function SellerShowings() {
  const user = await requireRole("SELLER");
  const showings = await prisma.showingRequest.findMany({
    where: { sellerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { property: { select: { addressLine1: true, city: true } }, buyer: { select: { fullName: true } } },
  });

  return (
    <div>
      <PageHeader title="Showings" subtitle="Approve, decline, or confirm buyer showing requests." />
      {showings.length === 0 ? (
        <EmptyState icon="📅" title="No showing requests yet" message="Buyers can request showings from your published listings." />
      ) : (
        <div className="space-y-3">
          {showings.map((s) => {
            const slots = (Array.isArray(s.proposedSlots) ? s.proposedSlots : []) as string[];
            return (
              <div key={s.id} className="card p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{s.buyer.fullName}</p>
                    <p className="text-sm text-slate-500">{s.property.addressLine1}, {s.property.city}</p>
                  </div>
                  <Badge tone={STATUS_TONE[s.status]}>{s.status.replace(/_/g, " ")}</Badge>
                </div>
                {s.buyerMessage && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-sm text-slate-600">“{s.buyerMessage}”</p>}
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase text-slate-400">Proposed times</p>
                  {s.status === "REQUESTED" ? (
                    <div className="mt-2 space-y-2">
                      {slots.map((slot, i) => (
                        <form key={i} action={respondShowingAction.bind(null, s.id, "CONFIRMED", slot)} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 p-2">
                          <span className="text-sm text-slate-700">{formatDateTime(slot)}</span>
                          <SubmitButton variant="primary">Confirm this time</SubmitButton>
                        </form>
                      ))}
                      <form action={respondShowingAction.bind(null, s.id, "DECLINED", undefined)}>
                        <SubmitButton variant="secondary" className="w-full">Decline all</SubmitButton>
                      </form>
                    </div>
                  ) : (
                    <ul className="mt-1 text-sm text-slate-600">
                      {s.confirmedStart ? <li>✓ Confirmed for {formatDateTime(s.confirmedStart)}</li> : slots.map((slot, i) => <li key={i}>{formatDateTime(slot)}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
