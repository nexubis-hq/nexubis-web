"use client";

// The report's "book a call" CTA. A non-embed link that opens cal.com prefilled
// with the person's name, their business, and THIS report's URL, so an
// email/report-originated booking correlates back to the exact Scorecard (section 1).
// Fires AuditBookClick on click; a click is intent, NOT a booking. The confirmed
// Schedule only comes from the cal.com webhook (section 3). Usable from server components.
import { useEffect, useRef } from "react";
import { buildBookingUrl } from "@/lib/booking";
import { trackMeta } from "@/lib/meta/track";
import { META_EVENTS, LEAD_CONTENT_NAME } from "@/lib/meta/events";

export function BookCallButton({
  className,
  personName,
  business,
  reveal,
  children,
}: {
  className?: string;
  personName?: string;
  business?: string;
  reveal?: boolean;
  children: React.ReactNode;
}) {
  // SSR-safe href carries name + business immediately; on mount it is upgraded
  // with the live report URL (window.location); a DOM write via ref, not state,
  // so there is no hydration mismatch (same pattern as the share link).
  const baseHref = buildBookingUrl({ name: personName, business });
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    ref.current?.setAttribute("href", buildBookingUrl({ name: personName, business, reportUrl: window.location.href }));
  }, [personName, business]);

  return (
    <a
      ref={ref}
      href={baseHref}
      className={className}
      onClick={() => trackMeta(META_EVENTS.auditBookClick, { content_name: LEAD_CONTENT_NAME, ...(business ? { business } : {}) })}
      {...(reveal ? { "data-reveal": "" } : {})}
    >
      {children}
    </a>
  );
}
