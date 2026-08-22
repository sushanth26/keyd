import Link from "next/link";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export async function ConversationList({ userId, role }: { userId: string; role: "BUYER" | "SELLER" }) {
  const conversations = await prisma.conversation.findMany({
    where: role === "BUYER" ? { buyerId: userId } : { sellerId: userId },
    orderBy: { lastMessageAt: "desc" },
    include: {
      property: { select: { addressLine1: true, city: true, slug: true } },
      buyer: { select: { fullName: true } },
      seller: { select: { fullName: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { messages: { where: { readAt: null, NOT: { senderId: userId } } } } },
    },
  });

  if (conversations.length === 0) {
    return <EmptyState icon="💬" title="No conversations yet" message={role === "BUYER" ? "Message an owner from any listing to start a conversation." : "When buyers message you, conversations appear here."} />;
  }

  return (
    <ul className="space-y-2">
      {conversations.map((c) => {
        const other = role === "BUYER" ? c.seller.fullName : c.buyer.fullName;
        const unread = c._count.messages;
        return (
          <li key={c.id}>
            <Link href={`/messages/${c.id}`} className="card flex items-center justify-between gap-3 p-4 hover:shadow-lg">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{other}</p>
                <p className="truncate text-sm text-slate-500">
                  {c.property.addressLine1}, {c.property.city}
                </p>
                {c.messages[0] && <p className="truncate text-sm text-slate-400">{c.messages[0].body}</p>}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-slate-400">{formatDateTime(c.lastMessageAt)}</p>
                {unread > 0 && <span className="mt-1 inline-block rounded-full bg-brand-600 px-2 text-xs font-semibold text-white">{unread}</span>}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
