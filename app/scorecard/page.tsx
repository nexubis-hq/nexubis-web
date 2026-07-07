import type { Metadata } from "next";
import Link from "next/link";
import { NexubisLogo } from "@/components/NexubisLogo";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { ScorecardFlow } from "@/components/scorecard/flow/ScorecardFlow";
import { LANDING, SCORECARD_NAME } from "@/lib/scorecard/copy";

export const metadata: Metadata = {
  title: `${SCORECARD_NAME} | Nexubis`,
  description: LANDING.subheadline,
};

// The public entry: landing plus the instant Credibility Check. The flow
// (form, scan, teaser, unlock) is client-side; this shell stays server-rendered.
export default function ScorecardPage() {
  return (
    <main className="sc-report sc-entry">
      <RevealOnScroll />
      <nav className="sc-topbar" aria-label="Scorecard">
        <Link href="/" aria-label="Nexubis home">
          <NexubisLogo className="sc-topbar-logo" />
        </Link>
      </nav>
      <ScorecardFlow />
    </main>
  );
}
