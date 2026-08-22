"use client";

// Submit button for the favorite form that fires GA4 `save_listing` when the action
// will save (not when un-saving). Uses form status for the pending state.
import { useFormStatus } from "react-dom";
import { analytics } from "@/lib/analytics/events";

export function FavoriteSubmit({ listingId, favorited }: { listingId: string; favorited: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={() => {
        if (!favorited) analytics.saveListing({ listing_id: listingId });
      }}
      className="btn-secondary w-full"
    >
      {favorited ? "♥ Saved" : "♡ Save"}
    </button>
  );
}
