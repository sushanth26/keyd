import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import type { AnalyticsEventType } from "@prisma/client";
import { PageHeader, StatTile } from "@/components/ui";

const FUNNEL: { type: AnalyticsEventType; label: string }[] = [
  { type: "SELLER_REGISTERED", label: "Sellers registered" },
  { type: "LISTING_STARTED", label: "Listings started" },
  { type: "LISTING_COMPLETED", label: "Listings completed" },
  { type: "LISTING_VERIFIED", label: "Listings verified" },
  { type: "LISTING_PUBLISHED", label: "Listings published" },
  { type: "BUYER_REGISTERED", label: "Buyers registered" },
  { type: "PROPERTY_VIEWED", label: "Property views" },
  { type: "PROPERTY_SAVED", label: "Properties saved" },
  { type: "BUYER_MATCHED", label: "Buyers matched" },
  { type: "INQUIRY_CREATED", label: "Inquiries" },
  { type: "SHOWING_REQUESTED", label: "Showings requested" },
  { type: "SHOWING_COMPLETED", label: "Showings completed" },
  { type: "BUYER_INTEREST_SUBMITTED", label: "Buyer interest" },
  { type: "PROPERTY_UNDER_CONTRACT", label: "Under contract" },
  { type: "PROPERTY_SOLD", label: "Sold" },
];

export default async function AdminOverview() {
  await requireRole("ADMIN");
  const grouped = await prisma.analyticsEvent.groupBy({ by: ["type"], _count: { _all: true } });
  const counts = new Map(grouped.map((g) => [g.type, g._count._all]));

  const [users, properties, activeListings, openReports] = await Promise.all([
    prisma.user.count(),
    prisma.property.count(),
    prisma.property.count({ where: { status: { in: ["ACTIVE", "BUYER_INTEREST_RECEIVED", "UNDER_CONTRACT"] } } }),
    prisma.report.count({ where: { status: { in: ["OPEN", "REVIEWING"] } } }),
  ]);

  return (
    <div>
      <PageHeader title="Marketplace overview" subtitle="Funnel metrics and platform health." />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Users" value={users} />
        <StatTile label="Properties" value={properties} />
        <StatTile label="Active listings" value={activeListings} />
        <StatTile label="Open reports" value={openReports} />
      </div>

      <h2 className="mb-3 text-lg font-bold text-slate-900">Conversion funnel</h2>
      <div className="card divide-y divide-slate-100 p-0">
        {FUNNEL.map((f) => {
          const count = counts.get(f.type) ?? 0;
          const max = Math.max(1, counts.get("PROPERTY_VIEWED") ?? 1, counts.get("SELLER_REGISTERED") ?? 1);
          const pct = Math.min(100, Math.round((count / max) * 100));
          return (
            <div key={f.type} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-44 shrink-0 text-sm text-slate-600">{f.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-10 shrink-0 text-right text-sm font-semibold text-slate-800">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
