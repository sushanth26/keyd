import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { sendMessageAction, blockConversationAction } from "@/app/buyer/actions";
import { SubmitButton } from "@/components/form";
import { Alert } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { noindexMetadata } from "@/lib/seo/metadata";
import { TrackOnMount } from "@/components/analytics/track-on-mount";

export const dynamic = "force-dynamic";
export const metadata: Metadata = noindexMetadata;

export default async function ThreadPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { contacted?: string; err?: string };
}) {
  const user = await requireUser();
  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      property: { select: { addressLine1: true, city: true, slug: true } },
      buyer: { select: { id: true, fullName: true } },
      seller: { select: { id: true, fullName: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!conversation) notFound();
  if (conversation.buyerId !== user.id && conversation.sellerId !== user.id) redirect("/");

  // Mark incoming messages as read.
  await prisma.message.updateMany({
    where: { conversationId: conversation.id, readAt: null, NOT: { senderId: user.id } },
    data: { readAt: new Date() },
  });

  const other = user.id === conversation.buyerId ? conversation.seller.fullName : conversation.buyer.fullName;
  const blocked = conversation.buyerBlocked || conversation.sellerBlocked;
  const backHref = user.role === "SELLER" ? "/seller/messages" : "/buyer/messages";

  return (
    <div className="container-page max-w-2xl py-6">
      {searchParams.contacted === conversation.propertyId && (
        <>
          <TrackOnMount
            event="contact_seller"
            params={{ listing_id: conversation.propertyId, contact_method: "keyd_message" }}
            dedupeKey={`contact_${conversation.propertyId}_${conversation.id}`}
          />
          <TrackOnMount
            event="generate_lead"
            params={{ listing_id: conversation.propertyId, lead_type: "seller_message" }}
            dedupeKey={`lead_message_${conversation.propertyId}_${conversation.id}`}
          />
        </>
      )}
      <div className="mb-3 flex items-center justify-between">
        <Link href={backHref} className="text-sm text-brand-600 hover:underline">← All messages</Link>
        <form action={blockConversationAction.bind(null, conversation.id)}>
          <button className="text-xs text-red-500 hover:underline">Block &amp; report</button>
        </form>
      </div>

      <div className="card p-4">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-900">{other}</h1>
          <Link href={`/p/${conversation.property.slug}`} className="text-sm text-brand-600 hover:underline">View listing</Link>
        </div>
        <p className="mb-4 text-sm text-slate-500">{conversation.property.addressLine1}, {conversation.property.city}</p>

        {searchParams.err === "rate" && <Alert tone="warning">You're sending messages too quickly. Please slow down.</Alert>}
        {searchParams.err === "blocked" && <Alert tone="error">This conversation is blocked.</Alert>}

        <div className="max-h-[50vh] space-y-2 overflow-y-auto py-2">
          {conversation.messages.length === 0 && <p className="text-center text-sm text-slate-400">No messages yet. Say hello!</p>}
          {conversation.messages.map((m) => {
            const mine = m.senderId === user.id;
            return (
              <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-800"}`}>
                  <p className="whitespace-pre-line">{m.body}</p>
                  <p className={`mt-1 text-[10px] ${mine ? "text-brand-100" : "text-slate-400"}`}>{formatDateTime(m.createdAt)}{m.redacted ? " · contact hidden" : ""}</p>
                </div>
              </div>
            );
          })}
        </div>

        {blocked ? (
          <Alert tone="error">This conversation is blocked. No new messages can be sent.</Alert>
        ) : (
          <form action={sendMessageAction.bind(null, conversation.id)} className="mt-3 flex gap-2">
            <input name="message" required className="input" placeholder="Type a message…" autoComplete="off" />
            <SubmitButton>Send</SubmitButton>
          </form>
        )}
        <p className="mt-2 text-xs text-slate-400">For your safety, contact details (email, phone, links) are hidden automatically.</p>
      </div>
    </div>
  );
}
