import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { ScorecardFlow } from "@/components/scorecard/flow/ScorecardFlow";
import { LaineIntroVideo } from "@/components/scorecard/flow/LaineIntroVideo";
import { LANDING, LANDING_BELOW, SCORECARD_NAME } from "@/lib/scorecard/copy";
import { OXIPACK_CASE_URL } from "@/lib/site-config";

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

      {/* Below the fold: what you get, one proof line, Laine's intro slot.
          Short on purpose; the page has one job. */}
      <section className="sc-wyg section" aria-label={LANDING_BELOW.whatYouGet.title}>
        <div className="site-container">
          <h2 data-reveal>{LANDING_BELOW.whatYouGet.title}</h2>
          <ol className="sc-wyg-grid">
            {LANDING_BELOW.whatYouGet.items.map((item, i) => (
              <li key={item.title} data-reveal data-reveal-delay={i * 0.08}>
                <span className="sc-wyg-index" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </li>
            ))}
          </ol>
          <p className="sc-landing-proof" data-reveal>
            {LANDING_BELOW.proofLine}{" "}
            <Link href={OXIPACK_CASE_URL}>{LANDING_BELOW.proofLink}</Link>
          </p>
        </div>
      </section>

      <LaineIntroVideo title={LANDING_BELOW.video.title} comingNote={LANDING_BELOW.video.comingNote} />
    </main>
  );
}
