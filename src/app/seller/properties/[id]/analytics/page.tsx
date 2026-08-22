import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { PageHeader, StatTile } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { STATUS_LABELS } from "@/domain/lifecycle";

export default async function ListingAnalytics({ params }: { params: { id: string } }) {
  const user = await requireRole("SELLER");
  const property = await prisma.property.findUnique({ where: { id: params.id } });
  if (!property || property.sellerId !== user.id) notFound();

  const [views, saves, counts, transitions] = await Promise.all([
    prisma.analyticsEvent.count({ where: { propertyId: property.id, type: "PROPERTY_VIEWED" } }),
    prisma.analyticsEvent.count({ where: { propertyId: property.id, type: "PROPERTY_SAVED" } }),
    prisma.$transaction([
      prisma.conversation.count({ where: { propertyId: property.id } }),
      prisma.showingRequest.count({ where: { propertyId: property.id } }),
      prisma.buyerInterest.count({ where: { propertyId: property.id } }),
      prisma.buyerMatch.count({ where: { propertyId: property.id } }),
      prisma.favorite.count({ where: { propertyId: property.id } }),
    ]),
    prisma.statusTransition.findMany({ where: { propertyId: property.id }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  const [inquiries, showings, interest, matches, favorites] = counts;

  return (
    <div>
      <PageHeader title="Listing analytics" subtitle={`${property.addressLine1}, ${property.city}`} />
      <Link href={`/seller/properties/${property.id}`} className="mb-4 inline-block text-sm text-brand-600 hover:underline">← Back to listing</Link>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Views" value={views} />
        <StatTile label="Saves" value={Math.max(saves, favorites)} />
        <StatTile label="Matches" value={matches} />
        <StatTile label="Inquiries" value={inquiries} />
        <StatTile label="Showings" value={showings} />
        <StatTile label="Interest" value={interest} />
      </div>

      <div className="mt-6 card p-5">
        <h2 className="mb-3 text-lg font-bold text-slate-900">Status history</h2>
        <ol className="relative ml-3 border-l border-slate-200">
          {transitions.map((t) => (
            <li key={t.id} className="mb-4 ml-4">
              <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-brand-400" />
              <p className="text-sm font-medium text-slate-800">
                {t.fromStatus ? `${STATUS_LABELS[t.fromStatus]} → ` : ""}{STATUS_LABELS[t.toStatus]}
              </p>
              <p className="text-xs text-slate-400">{formatDateTime(t.createdAt)} · by {t.actorType.toLowerCase()}{t.reason ? ` · ${t.reason}` : ""}</p>
            </li>
          ))}
          {transitions.length === 0 && <p className="ml-2 text-sm text-slate-400">No transitions recorded yet.</p>}
        </ol>
      </div>
    </div>
  );
}
