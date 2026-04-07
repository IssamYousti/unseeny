"use client";

import { useEffect } from "react";

/**
 * Silently deletes an unsaved draft listing when the user leaves the page.
 * Fires on: browser close, refresh, back button, or Next.js client navigation.
 * Safe — the API route only deletes listings with price_per_night = 0.
 */
export default function DiscardDraftGuard({ listingId }: { listingId: string }) {
  useEffect(() => {
    const discard = () =>
      navigator.sendBeacon(`/api/listings/${listingId}/discard`);

    window.addEventListener("beforeunload", discard);

    return () => {
      window.removeEventListener("beforeunload", discard);
      // Also fires on Next.js client-side navigation (component unmount)
      discard();
    };
  }, [listingId]);

  return null;
}
