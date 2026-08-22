"use client";

import { useState, useTransition } from "react";
import { saveSearchAction } from "@/app/buyer/actions";

export function SaveSearchButton({ filters }: { filters: Record<string, string | undefined> }) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) as Record<string, string>;

  return (
    <button
      type="button"
      disabled={pending || saved}
      onClick={() => start(async () => { await saveSearchAction(clean); setSaved(true); })}
      className="btn-secondary"
    >
      {saved ? "✓ Search saved" : pending ? "Saving…" : "🔔 Save this search"}
    </button>
  );
}
