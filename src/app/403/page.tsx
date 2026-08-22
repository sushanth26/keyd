import type { Metadata } from "next";
import Link from "next/link";
import { noindexMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = noindexMetadata;

export default function ForbiddenPage() {
  return (
    <div className="container-page flex flex-col items-center justify-center gap-3 py-24 text-center">
      <div className="text-4xl">🔒</div>
      <h1 className="text-2xl font-bold text-slate-900">You don&apos;t have access to that</h1>
      <p className="max-w-md text-slate-500">Your account role isn&apos;t permitted to view this page.</p>
      <Link href="/" className="btn-primary mt-2">
        Back to home
      </Link>
    </div>
  );
}
