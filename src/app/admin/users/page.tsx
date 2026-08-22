import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { PageHeader, Badge } from "@/components/ui";
import { SubmitButton } from "@/components/form";
import { blockUserAction, unblockUserAction } from "@/app/admin/actions";
import { formatDate } from "@/lib/format";

export default async function AdminUsers() {
  await requireRole("ADMIN");
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <div>
      <PageHeader title="Users" subtitle="Review accounts and manage access." />
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Verified</th>
              <th className="px-4 py-2">Joined</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className={u.isBlocked ? "bg-red-50/40" : ""}>
                <td className="px-4 py-2">
                  <p className="font-medium text-slate-800">{u.fullName}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </td>
                <td className="px-4 py-2"><Badge tone={u.role === "ADMIN" ? "violet" : u.role === "SELLER" ? "blue" : "slate"}>{u.role}</Badge></td>
                <td className="px-4 py-2">
                  <div className="flex gap-1 text-xs">
                    {u.emailVerifiedAt && <Badge tone="green">Email</Badge>}
                    {u.phoneVerifiedAt && <Badge tone="green">Phone</Badge>}
                    {u.identityStatus === "VERIFIED" && <Badge tone="green">ID</Badge>}
                  </div>
                </td>
                <td className="px-4 py-2 text-slate-500">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-2">
                  {u.role !== "ADMIN" && (
                    u.isBlocked ? (
                      <form action={unblockUserAction.bind(null, u.id)}><SubmitButton variant="secondary">Unblock</SubmitButton></form>
                    ) : (
                      <form action={blockUserAction.bind(null, u.id)}><SubmitButton variant="danger">Block</SubmitButton></form>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
