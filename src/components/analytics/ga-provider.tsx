"use client";

// Loads GA4 (gtag.js) only when analytics is enabled AND the user has granted consent,
// then sends exactly one `page_view` per SPA navigation (initial config uses
// send_page_view:false to avoid a duplicate automatic hit).
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GA_MEASUREMENT_ID, analyticsEnabled } from "@/lib/analytics/config";
import { getConsent, CONSENT_EVENT } from "@/lib/analytics/consent";
import { sendPageView } from "@/lib/analytics/events";

export function GaProvider() {
  const enabled = analyticsEnabled();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [granted, setGranted] = useState(false);
  const lastUrl = useRef<string | null>(null);

  // React to consent grants/revocations without a page reload.
  useEffect(() => {
    if (!enabled) return;
    const sync = () => setGranted(getConsent() === "granted");
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, [enabled]);

  // Initialize the gtag queue once, with automatic page_view disabled.
  useEffect(() => {
    if (!enabled || !granted || typeof window === "undefined") return;
    if (typeof window.gtag === "function") return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });
  }, [enabled, granted]);

  // One page_view per unique path+query. The ref dedupes StrictMode double-effects.
  useEffect(() => {
    if (!enabled || !granted) return;
    const qs = searchParams?.toString();
    const url = pathname + (qs ? `?${qs}` : "");
    if (lastUrl.current === url) return;
    lastUrl.current = url;
    sendPageView(url, typeof document !== "undefined" ? document.title : undefined);
  }, [enabled, granted, pathname, searchParams]);

  if (!enabled || !granted) return null;
  return (
    <Script
      id="ga4-src"
      strategy="afterInteractive"
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
    />
  );
}
