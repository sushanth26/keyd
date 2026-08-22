import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { PageHeader, Badge, EmptyState } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import { retryJobAction, retryWorkflowAction } from "@/app/admin/actions";
import { formatDateTime } from "@/lib/format";

export default async function AdminWorkflows() {
  await requireRole("ADMIN");
  const [failedJobs, failedRuns] = await Promise.all([
    prisma.job.findMany({ where: { status: { in: ["FAILED", "DEAD"] } }, orderBy: { updatedAt: "desc" }, take: 50 }),
    prisma.workflowRun.findMany({ where: { status: { in: ["FAILED", "NEEDS_ATTENTION"] } }, orderBy: { updatedAt: "desc" }, take: 50, include: { property: { select: { addressLine1: true, city: true } } } }),
  ]);

  return (
    <div>
      <PageHeader title="AI workflows & jobs" subtitle="Monitor background processing and retry failures." />

      <h2 className="mb-2 text-lg font-bold text-slate-900">Failed workflow runs</h2>
      {failedRuns.length === 0 ? (
        <p className="mb-6 text-sm text-slate-500">No failed workflow runs.</p>
      ) : (
        <div className="mb-6 space-y-2">
          {failedRuns.map((r) => (
            <div key={r.id} className="card flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-slate-800">{r.property.addressLine1}, {r.property.city}</p>
                <p className="text-xs text-slate-400">{r.type} · step {r.currentStep ?? "—"} · {formatDateTime(r.updatedAt)}</p>
                {r.error && <p className="text-xs text-red-500">{r.error}</p>}
              </div>
              <form action={retryWorkflowAction.bind(null, r.propertyId)}><SubmitButton>Retry workflow</SubmitButton></form>
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-2 text-lg font-bold text-slate-900">Failed / dead jobs</h2>
      {failedJobs.length === 0 ? (
        <EmptyState icon="✅" title="No failed jobs" message="The background queue is healthy." />
      ) : (
        <div className="space-y-2">
          {failedJobs.map((j) => (
            <div key={j.id} className="card flex items-center justify-between p-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-800">{j.type}</p>
                  <Badge tone={j.status === "DEAD" ? "red" : "amber"}>{j.status}</Badge>
                  <span className="text-xs text-slate-400">attempt {j.attempts}/{j.maxAttempts}</span>
                </div>
                {j.lastError && <p className="text-xs text-red-500">{j.lastError}</p>}
              </div>
              <form action={retryJobAction.bind(null, j.id)}><SubmitButton variant="secondary">Retry job</SubmitButton></form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
