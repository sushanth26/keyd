"use client";

import { Suspense, useState } from "react";
import { useFormState } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { registerAction, type ActionState } from "@/lib/auth/actions";
import { SubmitButton, FormError } from "@/components/form";
import { clsx } from "clsx";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="card p-6 text-sm text-slate-500">Loading…</div>}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const params = useSearchParams();
  const initialRole = (params.get("role") ?? "buyer").toUpperCase() === "SELLER" ? "SELLER" : "BUYER";
  const [role, setRole] = useState<"SELLER" | "BUYER">(initialRole);
  const [state, action] = useFormState<ActionState, FormData>(registerAction, {});

  return (
    <div className="card p-6">
      <h1 className="text-xl font-bold text-slate-900">Create your Keyd account</h1>
      <p className="mt-1 text-sm text-slate-500">Join the DFW owner-to-buyer marketplace.</p>

      <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Account type">
        {(["SELLER", "BUYER"] as const).map((r) => (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={role === r}
            onClick={() => setRole(r)}
            className={clsx(
              "rounded-md px-3 py-2 text-sm font-semibold transition-colors",
              role === r ? "bg-white text-brand-700 shadow-sm" : "text-slate-500",
            )}
          >
            {r === "SELLER" ? "I'm selling" : "I'm buying"}
          </button>
        ))}
      </div>

      <form action={action} className="mt-5 space-y-4">
        <FormError message={state.error} />
        <input type="hidden" name="role" value={role} />
        <div>
          <label className="label" htmlFor="fullName">Full name</label>
          <input className="input" id="fullName" name="fullName" autoComplete="name" required />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="label" htmlFor="phone">Phone</label>
          <input className="input" id="phone" name="phone" type="tel" autoComplete="tel" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
          <p className="mt-1 text-xs text-slate-400">At least 8 characters.</p>
        </div>
        <SubmitButton className="w-full" pendingLabel="Creating account…">
          Create {role === "SELLER" ? "seller" : "buyer"} account
        </SubmitButton>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-600 hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
