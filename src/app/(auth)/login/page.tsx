"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { loginAction, type ActionState } from "@/lib/auth/actions";
import { SubmitButton, FormError } from "@/components/form";

export default function LoginPage() {
  const [state, action] = useFormState<ActionState, FormData>(loginAction, {});
  return (
    <div className="card p-6">
      <h1 className="text-xl font-bold text-slate-900">Sign in to Keyd</h1>
      <p className="mt-1 text-sm text-slate-500">Welcome back.</p>
      <form action={action} className="mt-6 space-y-4">
        <FormError message={state.error} />
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <SubmitButton className="w-full" pendingLabel="Signing in…">Sign in</SubmitButton>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        New to Keyd?{" "}
        <Link href="/register" className="font-semibold text-brand-600 hover:underline">Create an account</Link>
      </p>
      <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
        Demo logins (password <code>Password123!</code>): admin@keyd.local · seller1@keyd.local · buyer1@keyd.local
      </p>
    </div>
  );
}
