import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { verifyEmailAction, verifyPhoneAction, resendEmailAction, resendPhoneAction } from "@/lib/auth/actions";
import { homeForRole } from "@/lib/auth/roles";
import { VerifyCard } from "@/components/verify-card";
import { Alert } from "@/components/ui";

export default async function VerifyPage() {
  const user = await requireUser();
  const bothVerified = !!user.emailVerifiedAt && !!user.phoneVerifiedAt;

  return (
    <div className="w-full max-w-lg space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Verify your contact details</h1>
        <p className="mt-1 text-sm text-slate-500">
          We sent 6-digit codes to your email and phone. Verifying builds trust with buyers and is required before publishing a listing.
        </p>
      </div>

      <Alert tone="info" title="Local development">
        Codes are written to <code>storage/outbox/</code> and printed in the server logs (look for{" "}
        <code>verification.code_issued</code>).
      </Alert>

      <VerifyCard
        channel="Email"
        destination={user.email}
        initiallyVerified={!!user.emailVerifiedAt}
        verifyAction={verifyEmailAction}
        resendAction={resendEmailAction}
      />
      <VerifyCard
        channel="Phone"
        destination={user.phone ?? "—"}
        initiallyVerified={!!user.phoneVerifiedAt}
        verifyAction={verifyPhoneAction}
        resendAction={resendPhoneAction}
      />

      <div className="flex items-center justify-between">
        <Link href={homeForRole(user.role)} className="text-sm text-slate-500 hover:underline">
          Skip for now
        </Link>
        <Link href={homeForRole(user.role)} className="btn-primary">
          {bothVerified ? "Continue" : "Go to dashboard"}
        </Link>
      </div>
    </div>
  );
}
