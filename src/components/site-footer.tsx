import { LEGAL_DISCLAIMER } from "@/domain/constants";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="container-page py-8 text-sm text-slate-500">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold text-slate-700">Keyd — list your home directly. No agents, no commission.</p>
          <nav className="flex flex-wrap gap-3 text-xs">
            <Link href="/homes-for-sale" className="hover:text-brand-700">Browse homes</Link>
            <Link href="/sell" className="hover:text-brand-700">Sell</Link>
            <Link href="/how-it-works" className="hover:text-brand-700">How it works</Link>
            <Link href="/about" className="hover:text-brand-700">About</Link>
          </nav>
        </div>
        <p className="mt-4 max-w-3xl text-xs leading-relaxed text-slate-400">{LEGAL_DISCLAIMER}</p>
      </div>
    </footer>
  );
}
