import { requireRole } from "@/lib/auth/current-user";
import { ConversationList } from "@/components/conversation-list";
import { PageHeader } from "@/components/ui";

export default async function SellerMessages() {
  const user = await requireRole("SELLER");
  return (
    <div>
      <PageHeader title="Messages" subtitle="Direct conversations with interested buyers." />
      <ConversationList userId={user.id} role="SELLER" />
    </div>
  );
}
