import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard-shell";
import { noindexMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = noindexMetadata;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("ADMIN");
  const [pendingVer, openReports, failedJobs] = await Promise.all([
    prisma.identityVerification.count({ where: { status: "PENDING" } }),
    prisma.report.count({ where: { status: { in: ["OPEN", "REVIEWING"] } } }),
    prisma.job.count({ where: { status: { in: ["FAILED", "DEAD"] } } }),
  ]);
  return (
    <DashboardShell
      title="Admin"
      nav={[
        { href: "/admin", label: "Overview", icon: "📊" },
        { href: "/admin/verifications", label: "Verifications", icon: "🪪", badge: pendingVer },
        { href: "/admin/reports", label: "Reports", icon: "🚩", badge: openReports },
        { href: "/admin/properties", label: "Properties", icon: "🏘️" },
        { href: "/admin/users", label: "Users", icon: "👤" },
        { href: "/admin/workflows", label: "Workflows", icon: "⚙️", badge: failedJobs },
        { href: "/admin/audit", label: "Audit log", icon: "📜" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
