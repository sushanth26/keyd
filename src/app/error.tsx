"use client";

// Route-segment error boundary. Any unhandled error in a page renders this friendly
// branded screen with a retry, instead of a raw "500: Internal Server Error".
import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("route error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="container-page flex flex-col items-center justify-center gap-3 py-24 text-center">
      <div className="text-4xl">⚠️</div>
      <h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1>
      <p className="max-w-md text-slate-500">
        We hit a temporary problem loading this page. Please try again in a moment.
      </p>
      <div className="mt-2 flex gap-2">
        <button onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/homes-for-sale" className="btn-secondary">
          Browse homes
        </Link>
      </div>
      {error.digest && <p className="mt-2 text-xs text-slate-400">Reference: {error.digest}</p>}
    </div>
  );
}
