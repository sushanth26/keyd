import Link from "next/link";
import type { User } from "@prisma/client";
import { logoutAction } from "@/lib/auth/actions";

// `user` is resolved by the (dynamic) root layout and passed in, so the header always
// reflects the current session rather than a statically-cached logged-out state.
export function SiteHeader({ user }: { user: User | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="container-page flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight text-brand-700">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-600 text-white">K</span>
          <span>Keyd</span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm font-medium text-slate-600 sm:flex">
          <Link href="/homes-for-sale" className="rounded-md px-3 py-1.5 hover:bg-slate-100">
            Browse homes
          </Link>
          {!user && (
            <Link href="/sell" className="rounded-md px-3 py-1.5 hover:bg-slate-100">
              Sell your home
            </Link>
          )}
          {user?.role === "SELLER" && (
            <Link href="/seller" className="rounded-md px-3 py-1.5 hover:bg-slate-100">
              Seller dashboard
            </Link>
          )}
          {user?.role === "BUYER" && (
            <Link href="/buyer" className="rounded-md px-3 py-1.5 hover:bg-slate-100">
              Buyer dashboard
            </Link>
          )}
          {user?.role === "ADMIN" && (
            <Link href="/admin" className="rounded-md px-3 py-1.5 hover:bg-slate-100">
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 text-sm">
          {user ? (
            <>
              <Link href="/notifications" className="rounded-md px-2 py-1.5 hover:bg-slate-100" aria-label="Notifications">
                🔔
              </Link>
              <Link href="/account" className="hidden text-slate-500 hover:underline sm:inline">
                {user.fullName}
              </Link>
              <form action={logoutAction}>
                <button className="btn-secondary" type="submit">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                Sign in
              </Link>
              <Link href="/register" className="btn-primary">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
