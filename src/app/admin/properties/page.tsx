import Link from "next/link";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { PageHeader, StatusBadge, Badge } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import { adminPauseListingAction } from "@/app/admin/actions";
import { formatCurrency } from "@/lib/format";

export default async function AdminProperties() {
  await requireRole("ADMIN");
  const properties = await prisma.property.findMany({
    orderBy: { updatedAt: "desc" },
    include: { seller: { select: { fullName: true, email: true } }, _count: { select: { photos: true, reports: true } } },
    take: 200,
  });

  // Simple duplicate detection: same normalized address + zip appearing more than once.
  const counts = new Map<string, number>();
  for (const p of properties) {
    const key = `${p.addressLine1.toLowerCase().replace(/\s+/g, " ").trim()}|${p.zip}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return (
    <div>
      <PageHeader title="Properties" subtitle="All listings, incomplete drafts, duplicates, and reported items." />
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-2">Address</th>
              <th className="px-4 py-2">Owner</th>
              <th className="px-4 py-2">Price</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Flags</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {properties.map((p) => {
              const key = `${p.addressLine1.toLowerCase().replace(/\s+/g, " ").trim()}|${p.zip}`;
              const dup = (counts.get(key) ?? 0) > 1;
              const incomplete = p._count.photos < 5 || p.askingPrice == null;
              return (
                <tr key={p.id}>
                  <td className="px-4 py-2">
                    <Link href={`/p/${p.slug}`} className="font-medium text-slate-800 hover:underline">{p.addressLine1}</Link>
                    <div className="text-xs text-slate-400">{p.city}, {p.state}</div>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{p.seller.fullName}</td>
                  <td className="px-4 py-2 text-slate-600">{formatCurrency(p.askingPrice)}</td>
                  <td className="px-4 py-2"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {dup && <Badge tone="amber">Duplicate?</Badge>}
                      {incomplete && <Badge tone="slate">Incomplete</Badge>}
                      {p._count.reports > 0 && <Badge tone="red">{p._count.reports} report(s)</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    {["ACTIVE", "BUYER_INTEREST_RECEIVED"].includes(p.status) && (
                      <form action={adminPauseListingAction.bind(null, p.id)}>
                        <SubmitButton variant="secondary">Pause</SubmitButton>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
