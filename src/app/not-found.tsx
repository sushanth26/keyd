import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center justify-center gap-3 py-24 text-center">
      <div className="text-4xl">🏚️</div>
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="max-w-md text-slate-500">This listing or page may have been withdrawn, or the link is incorrect.</p>
      <div className="mt-2 flex gap-2">
        <Link href="/" className="btn-secondary">Home</Link>
        <Link href="/homes-for-sale" className="btn-primary">Browse homes</Link>
      </div>
    </div>
  );
}
