"use client";

// Sticky top navigation for the full (unlocked) report. Carries the single
// report action: unlock the session (primary). The light, branded
// homepage treatment replaces the old dark bar.
import Link from "next/link";
import { NexubisLogo } from "@/components/NexubisLogo";
import { RocketIcon } from "@/components/SiteHeader";
import { BookCallButton } from "./BookCallButton";
import { REPORT_NAV } from "@/lib/scorecard/copy";

export function ReportNav({ company }: { company: string }) {
  return (
    <nav className="sc-report-nav" aria-label="Report">
      <div className="site-container sc-report-nav-inner">
        <Link href="/" className="sc-report-nav-brand" aria-label="Nexubis home">
          <NexubisLogo className="sc-report-nav-logo" />
        </Link>
        <div className="sc-report-nav-actions">
          <BookCallButton className="btn btn-primary sc-report-nav-book" business={company}>
            <span className="sc-report-nav-book-icon">
              <RocketIcon />
            </span>
            <span>{REPORT_NAV.book}</span>
          </BookCallButton>
        </div>
      </div>
    </nav>
  );
}
