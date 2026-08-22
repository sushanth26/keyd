import { requireRole } from "@/lib/auth/current-user";
import { ConversationList } from "@/components/conversation-list";
import { PageHeader } from "@/components/ui";

export default async function BuyerMessages() {
  const user = await requireRole("BUYER");
  return (
    <div>
      <PageHeader title="Messages" subtitle="Your conversations with owners." />
      <ConversationList userId={user.id} role="BUYER" />
    </div>
  );
}
