import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { ScorecardFlow } from "@/components/scorecard/flow/ScorecardFlow";
import { LANDING, SCORECARD_NAME } from "@/lib/scorecard/copy";

export const metadata: Metadata = {
  title: `${SCORECARD_NAME} | Nexubis`,
  description: LANDING.subheadline,
  alternates: {
    canonical: "https://www.nexubis.io/audit",
  },
};

// The public entry: landing plus the instant Credibility Check. The flow
// (form, scan, teaser, unlock) is client-side; this shell stays server-rendered.
// The header matches the homepage so the tool reads as part of the site, not a
// bare micro-app.
export default function ScorecardPage() {
  return (
    <main className="sc-report sc-entry">
      <RevealOnScroll />
      <SiteHeader />
      <ScorecardFlow />
    </main>
  );
}
