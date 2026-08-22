import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard-shell";
import { noindexMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = noindexMetadata;

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("SELLER");
  const [pendingShowings, unreadMessages] = await Promise.all([
    prisma.showingRequest.count({ where: { sellerId: user.id, status: "REQUESTED" } }),
    prisma.message.count({
      where: { conversation: { sellerId: user.id }, readAt: null, NOT: { senderId: user.id } },
    }),
  ]);

  return (
    <DashboardShell
      title="Seller"
      nav={[
        { href: "/seller", label: "Dashboard", icon: "🏠" },
        { href: "/seller/properties/new", label: "New listing", icon: "➕" },
        { href: "/seller/showings", label: "Showings", icon: "📅", badge: pendingShowings },
        { href: "/seller/messages", label: "Messages", icon: "💬", badge: unreadMessages },
        { href: "/seller/interest", label: "Buyer interest", icon: "📝" },
        { href: "/account", label: "Account", icon: "⚙️" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
