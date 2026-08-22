import Link from "next/link";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState, Badge } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import { resolveReportAction, adminPauseListingAction } from "@/app/admin/actions";
import { formatDateTime } from "@/lib/format";

export default async function AdminReports() {
  await requireRole("ADMIN");
  const reports = await prisma.report.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { property: { select: { slug: true, addressLine1: true, city: true, status: true } }, reporter: { select: { email: true } } },
    take: 100,
  });

  return (
    <div>
      <PageHeader title="Reports" subtitle="Review reported listings and take action." />
      {reports.length === 0 ? (
        <EmptyState icon="🚩" title="No reports" message="Reported listings appear here for review." />
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge tone={r.reason === "FRAUD" ? "red" : "amber"}>{r.reason}</Badge>
                    <Badge tone={r.status === "OPEN" ? "amber" : r.status === "RESOLVED" ? "green" : "slate"}>{r.status}</Badge>
                  </div>
                  {r.property && (
                    <Link href={`/p/${r.property.slug}`} className="mt-1 block font-semibold text-slate-900 hover:underline">
                      {r.property.addressLine1}, {r.property.city}
                    </Link>
                  )}
                  <p className="text-xs text-slate-400">Reported {formatDateTime(r.createdAt)}{r.reporter ? ` by ${r.reporter.email}` : " (anonymous)"}</p>
                </div>
              </div>
              {r.details && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-sm text-slate-600">“{r.details}”</p>}
              {r.status !== "RESOLVED" && r.status !== "DISMISSED" && (
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  {r.property && ["ACTIVE", "BUYER_INTEREST_RECEIVED"].includes(r.property.status) && (
                    <form action={adminPauseListingAction.bind(null, r.propertyId!)}>
                      <SubmitButton variant="danger">Pause listing</SubmitButton>
                    </form>
                  )}
                  <form action={resolveReportAction.bind(null, r.id, "RESOLVED")} className="flex items-end gap-2">
                    <input name="notes" className="input" placeholder="Resolution notes" />
                    <SubmitButton>Resolve</SubmitButton>
                  </form>
                  <form action={resolveReportAction.bind(null, r.id, "DISMISSED")}>
                    <SubmitButton variant="secondary">Dismiss</SubmitButton>
                  </form>
                </div>
              )}
              {r.resolutionNotes && <p className="mt-2 text-xs text-slate-400">Resolution: {r.resolutionNotes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
