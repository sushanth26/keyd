import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard-shell";
import { noindexMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = noindexMetadata;

export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("BUYER");
  const [matches, unread] = await Promise.all([
    prisma.buyerMatch.count({ where: { buyerId: user.id } }),
    prisma.message.count({ where: { conversation: { buyerId: user.id }, readAt: null, NOT: { senderId: user.id } } }),
  ]);
  return (
    <DashboardShell
      title="Buyer"
      nav={[
        { href: "/buyer", label: "Dashboard", icon: "🏠" },
        { href: "/homes-for-sale", label: "Browse homes", icon: "🔍" },
        { href: "/buyer/matches", label: "Matches", icon: "✨", badge: matches },
        { href: "/buyer/favorites", label: "Favorites", icon: "♥" },
        { href: "/buyer/searches", label: "Saved searches", icon: "🔔" },
        { href: "/buyer/showings", label: "Showings", icon: "📅" },
        { href: "/buyer/messages", label: "Messages", icon: "💬", badge: unread },
        { href: "/buyer/preferences", label: "Preferences", icon: "⚙️" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
