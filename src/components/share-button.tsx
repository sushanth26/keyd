"use client";

import { useState } from "react";
import { analytics } from "@/lib/analytics/events";

export function ShareButton({ url, listingId }: { url: string; listingId?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-secondary w-full"
      onClick={async () => {
        try {
          if (navigator.share) {
            await navigator.share({ url });
            if (listingId) analytics.share({ listing_id: listingId, method: "web_share" });
          } else {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            if (listingId) analytics.share({ listing_id: listingId, method: "copy_link" });
          }
        } catch {
          /* user cancelled */
        }
      }}
    >
      {copied ? "✓ Link copied" : "🔗 Share"}
    </button>
  );
}
