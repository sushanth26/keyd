"use client";

// Lightweight, extensible cookie-consent banner. Shows only when analytics is
// configured and the user hasn't chosen yet. Analytics stays off until "Accept".
import { useEffect, useState } from "react";
import Link from "next/link";
import { analyticsEnabled } from "@/lib/analytics/config";
import { getConsent, setConsent } from "@/lib/analytics/consent";

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (analyticsEnabled() && getConsent() === null) setVisible(true);
  }, []);

  if (!visible) return null;

  const choose = (v: "granted" | "denied") => {
    setConsent(v);
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
      <div className="container-page flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          We use privacy-friendly analytics to understand how Keyd is used and improve the marketplace. No personal
          information is sold. See our{" "}
          <Link href="/about" className="font-medium text-brand-600 underline">
            privacy note
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => choose("denied")} className="btn-secondary">
            Decline
          </button>
          <button type="button" onClick={() => choose("granted")} className="btn-primary">
            Accept analytics
          </button>
        </div>
      </div>
    </div>
  );
}
