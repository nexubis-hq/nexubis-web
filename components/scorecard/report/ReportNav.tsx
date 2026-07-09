"use client";

// Sticky top navigation for the full (unlocked) report. Replaces the old dark
// bar with the light, branded homepage treatment, and carries the two report
// actions: book an application call (primary), and share the report with a
// colleague (secondary). Share opens a prefilled email compose (Gmail web,
// falling back to the user's mail client) so the sender only adds recipients
// and hits send.
import Link from "next/link";
import { useEffect, useRef } from "react";
import { NexubisLogo } from "@/components/NexubisLogo";
import { RocketIcon } from "@/components/SiteHeader";
import { BOOKING_URL } from "@/lib/site-config";
import { REPORT_NAV, SHARE } from "@/lib/scorecard/copy";

// Build the mailto: for sharing this report. Exported so it can be unit-tested
// without a browser. The report URL is passed in (window.location on the
// client) so the body carries the live link.
export function buildShareMailto(company: string, overall: number | null, reportUrl: string): string {
  const subject = encodeURIComponent(SHARE.subject(company));
  const body = encodeURIComponent(`${SHARE.body(company, overall)}${reportUrl}`);
  return `mailto:?subject=${subject}&body=${body}`;
}

export function ReportNav({ company, overall }: { company: string; overall: number | null }) {
  // A real mailto: anchor is the robust, testable share path: it opens whatever
  // mail the reader actually uses (Outlook, Apple Mail, or Gmail when set as the
  // browser's mail handler) with the subject, summary and report link prefilled,
  // and supports middle/right-click. The href needs the live report URL, so it
  // is set on the anchor via a ref in an effect (a DOM write, not React state,
  // so no hydration mismatch and no re-render).
  // SSR-safe base href (subject + summary, no link) from props, upgraded on
  // mount to include the live report URL. So the button is a working mailto
  // even before hydration, just without the link line.
  const baseHref = buildShareMailto(company, overall, "");
  const shareRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    shareRef.current?.setAttribute("href", buildShareMailto(company, overall, window.location.href));
  }, [company, overall]);

  return (
    <nav className="sc-report-nav" aria-label="Report">
      <div className="site-container sc-report-nav-inner">
        <Link href="/" className="sc-report-nav-brand" aria-label="Nexubis home">
          <NexubisLogo className="sc-report-nav-logo" />
        </Link>
        <div className="sc-report-nav-actions">
          <a ref={shareRef} className="btn btn-secondary sc-report-nav-share" href={baseHref}>
            <ShareIcon />
            <span>{REPORT_NAV.share}</span>
          </a>
          <Link href={BOOKING_URL} className="btn btn-primary sc-report-nav-book">
            <span className="sc-report-nav-book-icon">
              <RocketIcon />
            </span>
            <span>{REPORT_NAV.book}</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 15V3M8 7l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
