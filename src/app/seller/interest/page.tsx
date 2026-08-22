import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState, Badge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import { NON_BINDING_DISCLAIMER } from "@/domain/constants";

export default async function SellerInterest() {
  const user = await requireRole("SELLER");
  const interests = await prisma.buyerInterest.findMany({
    where: { property: { sellerId: user.id } },
    orderBy: { createdAt: "desc" },
    include: {
      property: { select: { addressLine1: true, city: true, askingPrice: true } },
      buyer: { select: { fullName: true } },
    },
  });

  // Mark viewed.
  await prisma.buyerInterest.updateMany({ where: { property: { sellerId: user.id }, status: "SUBMITTED" }, data: { status: "SELLER_VIEWED" } });

  return (
    <div>
      <PageHeader title="Buyer interest" subtitle="Structured, non-binding interest submitted by buyers." />
      {interests.length === 0 ? (
        <EmptyState icon="📝" title="No buyer interest yet" message="When buyers submit interest on your listings, their proposed terms appear here." />
      ) : (
        <div className="space-y-3">
          {interests.map((i) => {
            const askVsProposed = i.property.askingPrice ? Math.round((i.proposedPrice / i.property.askingPrice) * 100) : null;
            return (
              <div key={i.id} className="card p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{i.buyer.fullName}</p>
                    <p className="text-sm text-slate-500">{i.property.addressLine1}, {i.property.city}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">{formatCurrency(i.proposedPrice)}</p>
                    {askVsProposed != null && <p className="text-xs text-slate-400">{askVsProposed}% of asking</p>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Badge tone="slate">{i.financingType}</Badge>
                  <Badge tone="blue">{i.preapprovalStatus.replace(/_/g, " ")}</Badge>
                  {i.downPayment && <Badge tone="slate">Down {formatCurrency(i.downPayment)}</Badge>}
                  {i.preferredClosingDate && <Badge tone="slate">Close {formatDate(i.preferredClosingDate)}</Badge>}
                  {i.contingencies.map((c) => <Badge key={c} tone="amber">{c}</Badge>)}
                </div>
                {i.message && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-sm text-slate-600">“{i.message}”</p>}
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-6 rounded-lg bg-slate-100 p-3 text-xs text-slate-400">{NON_BINDING_DISCLAIMER}</p>
    </div>
  );
}
