"use client";

// A real anchor (crawlable) that also fires a GA4 `select_item` event on click.
import Link from "next/link";
import { analytics } from "@/lib/analytics/events";

export function TrackedLink({
  href,
  listingId,
  position,
  source,
  className,
  children,
}: {
  href: string;
  listingId: string;
  position?: number;
  source?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => analytics.selectItem({ listing_id: listingId, position, source })}
    >
      {children}
    </Link>
  );
}
