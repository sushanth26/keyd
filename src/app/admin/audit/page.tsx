import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { PageHeader, Badge } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export default async function AdminAudit() {
  await requireRole("ADMIN");
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <div>
      <PageHeader title="Audit log" subtitle="Immutable record of high-risk and lifecycle actions." />
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Actor</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Entity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2 text-slate-500">{formatDateTime(l.createdAt)}</td>
                <td className="px-4 py-2"><Badge tone={l.actorType === "AI" ? "violet" : l.actorType === "ADMIN" ? "blue" : l.actorType === "SYSTEM" ? "slate" : "green"}>{l.actorType}</Badge></td>
                <td className="px-4 py-2 font-mono text-xs text-slate-700">{l.action}</td>
                <td className="px-4 py-2 text-xs text-slate-400">{l.entityType}:{l.entityId.slice(-6)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
