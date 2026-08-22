"use client";

import { useState } from "react";

export function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        <button
          type="button"
          className="text-xs font-medium text-brand-600 hover:underline"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <p className="whitespace-pre-line text-sm text-slate-700">{text}</p>
    </div>
  );
}
