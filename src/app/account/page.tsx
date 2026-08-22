import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { PageHeader, Badge, LinkButton } from "@/components/ui";
import { logoutAction } from "@/lib/auth/actions";
import { SubmitButton } from "@/components/form";
import { homeForRole } from "@/lib/auth/roles";
import { noindexMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = noindexMetadata;

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <div className="container-page max-w-2xl py-6">
      <PageHeader title="Account" subtitle="Your profile and verification status." />

      <div className="card space-y-3 p-5">
        <Row label="Name" value={user.fullName} />
        <Row label="Email" value={user.email} extra={user.emailVerifiedAt ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Unverified</Badge>} />
        <Row label="Phone" value={user.phone ?? "—"} extra={user.phoneVerifiedAt ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Unverified</Badge>} />
        <Row label="Role" value={<Badge tone="blue">{user.role}</Badge>} />
        {user.role === "SELLER" && (
          <Row label="Identity" value={<Badge tone={user.identityStatus === "VERIFIED" ? "green" : "amber"}>{user.identityStatus}</Badge>} />
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <LinkButton href={homeForRole(user.role)} variant="secondary">Dashboard</LinkButton>
        <LinkButton href="/notifications" variant="secondary">Notifications</LinkButton>
        {(!user.emailVerifiedAt || !user.phoneVerifiedAt) && <LinkButton href="/verify">Verify contact details</LinkButton>}
        {user.role === "BUYER" && <LinkButton href="/buyer/preferences" variant="secondary">Search preferences</LinkButton>}
        <form action={logoutAction}><SubmitButton variant="secondary">Sign out</SubmitButton></form>
      </div>

      {user.role === "SELLER" && user.identityStatus !== "VERIFIED" && (
        <p className="mt-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-500">
          Identity and ownership verification are initiated automatically when you submit a listing for AI preparation. An
          administrator reviews them for the MVP. <Link href="/seller" className="text-brand-600 underline">Go to your listings →</Link>
        </p>
      )}
    </div>
  );
}

function Row({ label, value, extra }: { label: string; value: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="flex items-center gap-2 text-sm font-medium text-slate-800">{value}{extra}</span>
    </div>
  );
}
