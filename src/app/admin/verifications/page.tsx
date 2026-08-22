import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { PageHeader, EmptyState, Badge } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import { approveVerificationAction, rejectVerificationAction } from "@/app/admin/actions";
import { formatDate } from "@/lib/format";

export default async function AdminVerifications() {
  await requireRole("ADMIN");
  const pending = await prisma.identityVerification.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { subject: { select: { fullName: true, email: true } }, property: { select: { addressLine1: true, city: true } } },
  });

  return (
    <div>
      <PageHeader title="Verification queue" subtitle="Resolve identity and ownership verification exceptions (manual review provider)." />
      {pending.length === 0 ? (
        <EmptyState icon="✅" title="No pending verifications" message="All identity and ownership checks are resolved." />
      ) : (
        <div className="space-y-3">
          {pending.map((v) => (
            <div key={v.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{v.subject.fullName} <span className="text-sm font-normal text-slate-400">{v.subject.email}</span></p>
                  <p className="text-sm text-slate-500">
                    {v.kind === "OWNERSHIP" ? "Ownership" : "Identity"} · {v.property ? `${v.property.addressLine1}, ${v.property.city}` : "—"} · submitted {formatDate(v.createdAt)}
                  </p>
                </div>
                <Badge tone={v.kind === "OWNERSHIP" ? "violet" : "blue"}>{v.kind}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <form action={approveVerificationAction.bind(null, v.id)}>
                  <SubmitButton>Approve</SubmitButton>
                </form>
                <form action={rejectVerificationAction.bind(null, v.id)} className="flex items-end gap-2">
                  <input name="notes" className="input" placeholder="Reason for rejection" />
                  <SubmitButton variant="danger">Reject</SubmitButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
