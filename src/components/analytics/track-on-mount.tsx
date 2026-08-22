"use client";

// Fires a single analytics event once when it mounts — used for events that complete
// via a server-action redirect (the destination page renders this with a flag).
// An optional sessionStorage dedupe key prevents refiring if the flagged URL is
// revisited via back/forward.
import { useEffect, useRef } from "react";
import { sendEvent, type EventParams } from "@/lib/analytics/events";

export function TrackOnMount({
  event,
  params,
  dedupeKey,
}: {
  event: string;
  params?: EventParams;
  dedupeKey?: string;
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (dedupeKey && typeof window !== "undefined") {
      const k = `keyd_evt_${dedupeKey}`;
      if (window.sessionStorage.getItem(k)) return;
      window.sessionStorage.setItem(k, "1");
    }
    sendEvent(event, params);
    // Fire exactly once for this mount; params are captured from the initial render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
