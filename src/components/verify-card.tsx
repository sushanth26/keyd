"use client";

import { useFormState } from "react-dom";
import { SubmitButton, FormError } from "@/components/form";
import type { ActionState } from "@/lib/auth/actions";

export function VerifyCard({
  channel,
  destination,
  initiallyVerified,
  verifyAction,
  resendAction,
}: {
  channel: "Email" | "Phone";
  destination: string;
  initiallyVerified: boolean;
  verifyAction: (prev: ActionState, form: FormData) => Promise<ActionState>;
  resendAction: () => Promise<void>;
}) {
  const [state, action] = useFormState<ActionState, FormData>(verifyAction, {});
  const verified = initiallyVerified || state.ok;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">{channel} verification</h3>
          <p className="text-sm text-slate-500">{destination}</p>
        </div>
        {verified ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
            ✓ Verified
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">Pending</span>
        )}
      </div>

      {!verified && (
        <form action={action} className="mt-4 space-y-3">
          <FormError message={state.error} />
          <div className="flex gap-2">
            <input
              className="input font-mono tracking-widest"
              name="code"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              placeholder="6-digit code"
              aria-label={`${channel} verification code`}
              required
            />
            <SubmitButton pendingLabel="Checking…">Verify</SubmitButton>
          </div>
          <button
            type="button"
            onClick={() => resendAction()}
            className="text-xs font-medium text-brand-600 hover:underline"
          >
            Resend code
          </button>
        </form>
      )}
    </div>
  );
}
