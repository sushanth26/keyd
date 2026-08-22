import Link from "next/link";

export function SiteHeader() {
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
          <Link href="/sell" className="rounded-md px-3 py-1.5 hover:bg-slate-100">
            Sell your home
          </Link>
          <Link href="/how-it-works" className="rounded-md px-3 py-1.5 hover:bg-slate-100">
            How it works
          </Link>
        </nav>

        <div className="flex items-center gap-2 text-sm">
          <Link href="/login" className="btn-ghost">
            Sign in
          </Link>
          <Link href="/register" className="btn-primary">
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
