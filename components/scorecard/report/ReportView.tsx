// The client-facing audit report, rebuilt 2026-09-01 to the LekkeWeb report's
// structure in the Nexubis skin: dark hero with the untouched gap gauge, a
// card column of pillar sections with working/fix lists, competitor
// benchmarking, top-3 issues, the prioritised start list, the Netherlands
// proof, and a book-a-call close; a sticky "On this page" sidebar with
// Laine's card on desktop, a sticky jump-to bar and bottom CTA on mobile.
// Server component; expand state and nav tracking live in small client
// children. Every dynamic section derives from the stored rubric scores
// (lib/scorecard/report-derive.ts), so pre-rebuild reports render identically.
import Link from "next/link";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { PlanCallVignette, PlanPreviewVignette, PlanSlackVignette } from "@/components/vignettes/PlanVignettes";
import { ScoreRing } from "./ScoreRing";
import { BenchmarkRadar } from "./BenchmarkRadar";
import { ReportNav } from "./ReportNav";
import { BookCallButton } from "./BookCallButton";
import { CollapsibleList } from "./CollapsibleList";
import { JumpToNav } from "./JumpToNav";
import { MobileCtaBar } from "./MobileCtaBar";
import { ReportSidebar, type ReportNavItem, type SectionTone } from "./ReportSidebar";
import { REPORT, REPORT2, POWERED_BY, VERDICT_LINES, BAND_SCALE, TEASER } from "@/lib/scorecard/copy";
import {
  workingItems,
  fixItems,
  issuesCount,
  pillarSummary,
  topIssues,
  startList,
  stayingSameLine,
  industryDescriptor,
  PILLAR_CHIP_LABELS,
} from "@/lib/scorecard/report-derive";
import { OXIPACK_CASE_URL } from "@/lib/site-config";
import { OxipackProofVideo } from "@/components/OxipackProofVideo";
import { getCaseStudyBySlug } from "@/lib/work/data";
import { RUBRIC } from "@/lib/scorecard/rubric";
import { VERDICT_LABELS } from "@/lib/scorecard/scoring";
import { prospectScores, type ScorecardResult } from "@/lib/scorecard/result";

function loomEmbedUrl(loomUrl: string): string | null {
  const m = loomUrl.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/);
  return m ? `https://www.loom.com/embed/${m[1]}` : null;
}

// The three "recommended next step" cards reuse the homepage plan vignettes,
// which line up one-to-one: book a call, see it first, the team joins.
const NEXT_STEP_VIGNETTES = [PlanCallVignette, PlanPreviewVignette, PlanSlackVignette];

// The Oxipack case-study showreel, the same clip the homepage proof block uses.
const OXIPACK_SHOWREEL = getCaseStudyBySlug("oxipack")?.heroVideo;
const OXIPACK_PROOF_VIDEO =
  OXIPACK_SHOWREEL?.src && OXIPACK_SHOWREEL.poster && OXIPACK_SHOWREEL.title
    ? { src: OXIPACK_SHOWREEL.src, poster: OXIPACK_SHOWREEL.poster, title: OXIPACK_SHOWREEL.title }
    : null;

function PageSpeedTable({ result }: { result: ScorecardResult }) {
  const rows = result.exhibits.filter((e) => e.resolved);
  if (rows.every((r) => !r.pageSpeed)) return null;
  return (
    <div className="sc-pagespeed" data-reveal>
      <h4>Measured loading speed</h4>
      <table>
        <thead>
          <tr>
            <th scope="col">Company</th>
            <th scope="col">Mobile</th>
            <th scope="col">Desktop</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.company} className={r.isProspect ? "sc-row-you" : undefined}>
              <th scope="row">{r.isProspect ? `${r.company} (you)` : r.company}</th>
              <td>{r.pageSpeed?.mobile?.performance ?? "not measured"}</td>
              <td>{r.pageSpeed?.desktop?.performance ?? "not measured"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Where the score sits on the 0 to 100 scale, with the three bands marked.
// Part of the untouched gap gauge: markup and classes unchanged.
function BandScale({ overall, band }: { overall: number | null; band: "wide" | "visible" | "narrow" }) {
  if (overall === null) return null;
  return (
    <div className="sc-band-scale">
      <div className="sc-band-track" aria-hidden="true">
        <span className="sc-band-seg" style={{ width: "60%" }} />
        <span className="sc-band-seg" style={{ width: "20%" }} />
        <span className="sc-band-seg" style={{ width: "20%" }} />
        <span className="sc-band-marker" style={{ left: `${overall}%` }} />
      </div>
      <div className="sc-band-labels">
        {BAND_SCALE.map((b) => (
          <span key={b.band} className={b.band === band ? "sc-band-label is-current" : "sc-band-label"}>
            {b.label}
            <em>{b.range}</em>
          </span>
        ))}
      </div>
    </div>
  );
}

export function ReportView({
  result,
  loomUrl = null,
  chrome = true,
}: {
  result: ScorecardResult;
  loomUrl?: string | null;
  /** False when embedded inside a page that already owns the main landmark
   *  and top bar; true for the standalone route. */
  chrome?: boolean;
}) {
  const p = prospectScores(result);
  const overall = p?.overall ?? null;
  const rivals = result.scores.filter((s) => !s.isProspect);
  const embed = loomUrl ? loomEmbedUrl(loomUrl) : null;
  const issues = issuesCount(result);
  const top3 = topIssues(result);
  const starts = startList(result);
  const company = result.meta.company;

  // Nav sections: the five pillars (dot toned by score) plus the cross-pillar
  // sections, in page order.
  const pillarItems: ReportNavItem[] = RUBRIC.map((cat): ReportNavItem => {
    const total = p?.categories.find((x) => x.key === cat.key)?.total ?? null;
    const tone: SectionTone = total === null ? "neutral" : total >= 14 ? "good" : total >= 9 ? "mid" : "poor";
    return { id: `category-${cat.key}`, label: cat.label, tone };
  });
  const navItems: ReportNavItem[] = [
    { id: "sc-competitors", label: REPORT2.competitorsTitle, tone: "neutral" },
    ...pillarItems,
    ...(top3.length ? [{ id: "sc-top3", label: REPORT2.top3Title, tone: "neutral" as SectionTone }] : []),
    ...(starts.length ? [{ id: "sc-start", label: "Where we would start", tone: "neutral" as SectionTone }] : []),
    { id: "sc-proof", label: "Client proof", tone: "neutral" },
    { id: "sc-book", label: "Book a call", tone: "neutral" },
  ];

  const Shell = chrome ? "main" : "div";
  return (
    <Shell className="sc-report sc-report-v2">
      <RevealOnScroll />
      {chrome ? <ReportNav company={company} /> : null}

      {/* 1 + 2 + 3. Hero: the framing line, the untouched gap gauge with the
          band strip, the one-line verdict, the issues count, the pillar chips. */}
      <header className="sc-hero">
        <div className="site-container">
          <p className="sc-hero-kicker" data-reveal>
            {POWERED_BY}
          </p>
          <p className="sc-hero-frame" data-reveal>
            {REPORT2.heroLine(industryDescriptor(result), company)}
          </p>
          <div className="sc-hero-card" data-reveal>
            <div className="sc-hero-grid">
              <div className="sc-score-ring">
                <ScoreRing value={overall} display={overall === null ? "?" : String(overall)} subLabel="of 100" ariaLabel={`Credibility Score ${overall ?? "unknown"} of 100`} />
                <p className="sc-verdict-band">{VERDICT_LABELS[result.verdict.band]}</p>
                <BandScale overall={overall} band={result.verdict.band} />
              </div>
              <div className="sc-hero-verdict">
                <h1 className="sc-hero-line">{VERDICT_LINES[result.verdict.band]}</h1>
                <p className="sc-hero-issues">
                  <strong>{issues}</strong> {REPORT2.issuesFound(issues)}
                </p>
                <ul className="sc-pillar-chips" aria-label="Pillars">
                  {RUBRIC.map((cat) => {
                    const total = p?.categories.find((x) => x.key === cat.key)?.total ?? null;
                    return (
                      <li key={cat.key}>
                        <a href={`#category-${cat.key}`}>
                          <span className="sc-pillar-chip-label">{PILLAR_CHIP_LABELS[cat.key]}</span>
                          <span className="sc-pillar-chip-score">{total === null ? "-" : `${total}/20`}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 4. The disclaimer line. */}
      <p className="sc-disclaimer site-container" data-reveal>
        {REPORT2.disclaimer}
      </p>

      {/* Mobile: sticky jump-to bar (the sidebar's phone form). */}
      <JumpToNav items={navItems} />

      {/* Walkthrough video (conditional; absent means the section does not render) */}
      {embed ? (
        <section className="sc-loom section">
          <div className="site-container">
            <p className="sc-loom-line" data-reveal>
              {REPORT.loomLine(result.meta.contactName || "Your reviewer")}
            </p>
            <div className="sc-loom-frame" data-reveal>
              <iframe src={embed} title="Personal walkthrough of your results" allowFullScreen />
            </div>
          </div>
        </section>
      ) : null}

      <div className="sc-body">
        <div className="site-container sc-body-inner">
          <div className="sc-body-main">
            {/* 5. Overall competitor comparison: the existing chips, radar and
                stance, restyled as the first card. */}
            <section className="sc-card sc-competitors" id="sc-competitors">
              <h2 data-reveal>{REPORT2.competitorsTitle}</h2>
              <p className="sc-chips-label" data-reveal>
                {TEASER.chipsLabel}
              </p>
              <ul className="sc-overall-chips" data-reveal>
                {result.scores.map((s) => (
                  <li key={s.company} className={s.isProspect ? "sc-chip-you" : "sc-chip"}>
                    <span className="sc-chip-name">{s.company}</span>
                    <span className="sc-chip-score">{s.scored && s.overall !== null ? s.overall : TEASER.rivalNotScored}</span>
                  </li>
                ))}
              </ul>
              {p ? (
                <div className="sc-score-radar" data-reveal>
                  <BenchmarkRadar prospect={p} rivals={rivals} />
                </div>
              ) : null}
            </section>

            {/* 6. The five pillar sections. */}
            {RUBRIC.map((catDef) => {
              const cat = p?.categories.find((c) => c.key === catDef.key);
              if (!cat) return null;
              const copy = result.deckCopy.categories.find((c) => c.key === catDef.key);
              return (
                <section className="sc-card sc-pillar" id={`category-${catDef.key}`} key={catDef.key}>
                  <header className="sc-pillar-head" data-reveal>
                    <span className={`sc-pillar-score sc-pillar-score-${cat.total === null ? "na" : cat.total >= 14 ? "good" : cat.total >= 9 ? "mid" : "poor"}`}>
                      {cat.total === null ? "?" : cat.total}
                      <em>/20</em>
                    </span>
                    <div>
                      <h3>{catDef.label}</h3>
                      <p className="sc-pillar-summary">{pillarSummary(cat)}</p>
                    </div>
                  </header>
                  <CollapsibleList items={workingItems(cat)} tone="working" />
                  <CollapsibleList items={fixItems(cat)} tone="fix" />
                  {copy?.competitorNote ? (
                    <p className="sc-competitor-note" data-reveal>
                      <span>{REPORT.whereCompetitorsStand}:</span> {copy.competitorNote}
                    </p>
                  ) : null}
                  {catDef.key === "website" ? <PageSpeedTable result={result} /> : null}
                  <details className="sc-looked-at">
                    <summary>{REPORT.whatWeLookedAt}</summary>
                    <ul>
                      {catDef.checks.map((c) => (
                        <li key={c.key}>{c.plain}</li>
                      ))}
                    </ul>
                  </details>
                </section>
              );
            })}

            {/* 7. Top 3 things costing you customers. */}
            {top3.length ? (
              <section className="sc-top3" id="sc-top3">
                <h2 data-reveal>{REPORT2.top3Title}</h2>
                <ol className="sc-top3-list">
                  {top3.map((issue) => (
                    <li className="sc-card sc-top3-item" key={issue.rank} data-reveal>
                      <span className="sc-top3-rank" aria-hidden="true">
                        {issue.rank}
                      </span>
                      <div>
                        <p className="sc-top3-title">{issue.title}</p>
                        <p className="sc-top3-body">{issue.body}</p>
                        <p className="sc-top3-impact">{issue.impact}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            {/* 8. Where we would start + the cost of doing nothing. */}
            {starts.length ? (
              <section className="sc-start" id="sc-start">
                <h2 data-reveal>{REPORT2.startTitle(company)}</h2>
                <div className="sc-card sc-start-card" data-reveal>
                  <p className="sc-start-intro">{REPORT2.startIntro}</p>
                  <ul className="sc-start-list">
                    {starts.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  <p className="sc-start-cost">{stayingSameLine(result)}</p>
                </div>
              </section>
            ) : null}

            {/* 9. Netherlands proof: the Oxipack block, kept. */}
            <section className="sc-proof" id="sc-proof">
              <div className="sc-proof-inner">
                <div className="sc-proof-text">
                  <h2 data-reveal>{REPORT2.proofTitle}</h2>
                  <blockquote data-reveal>
                    <p>{REPORT.proofBody}</p>
                  </blockquote>
                  <Link className="sc-proof-link" href={OXIPACK_CASE_URL} data-reveal>
                    {REPORT.proofLink}
                  </Link>
                </div>
                {OXIPACK_PROOF_VIDEO ? (
                  <div className="sc-proof-media" data-reveal>
                    <OxipackProofVideo
                      src={OXIPACK_PROOF_VIDEO.src}
                      poster={OXIPACK_PROOF_VIDEO.poster}
                      title={OXIPACK_PROOF_VIDEO.title}
                    />
                  </div>
                ) : null}
              </div>
            </section>

            {/* 10. Book a call (copy placeholder until Prompt 4; no pricing). */}
            <section className="sc-card sc-book" id="sc-book" data-reveal>
              <h2>{REPORT2.bookTitle}</h2>
              <p>{REPORT2.bookBody}</p>
              <BookCallButton className="btn btn-primary sc-book-btn" personName={result.meta.contactName} business={company}>
                {REPORT2.bookButton}
              </BookCallButton>
            </section>
          </div>

          {/* 11. Sticky sidebar: On this page + the Laine card (desktop). */}
          <ReportSidebar items={navItems} company={company} contactName={result.meta.contactName} />
        </div>
      </div>

      {/* 12. Recommended next step 01/02/03, then the closer. */}
      <section className="sc-next-step section">
        <div className="site-container">
          <h2 data-reveal>{REPORT.nextStepTitle}</h2>
          <ol className="plan-grid sc-next-plan">
            {REPORT.nextStepSteps.map((s, i) => {
              const Vignette = NEXT_STEP_VIGNETTES[i];
              return (
                <li className="plan-card" key={s.title} data-reveal data-reveal-delay={(i + 1) * 0.1}>
                  <div className="plan-card-head">
                    <span className="plan-card-index" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3>{s.title}</h3>
                  </div>
                  <p>{s.body}</p>
                  {Vignette ? (
                    <div className="plan-vignette">
                      <Vignette />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
          <BookCallButton
            className="btn btn-primary sc-next-step-cta"
            personName={result.meta.contactName}
            business={company}
            reveal
          >
            {REPORT.nextStepButton}
          </BookCallButton>
        </div>
      </section>

      <footer className="sc-soft-close section">
        <div className="site-container">
          <p className="sc-soft-close-line" data-reveal>
            {REPORT.softClose.split(/(?<=\.)\s+/).map((sentence, i) => (
              <span className="sc-soft-close-sentence" key={i}>
                {sentence}
              </span>
            ))}
          </p>
          <p className="sc-contact" data-reveal>
            <a href={`mailto:${REPORT.contactEmail}`}>{REPORT.contactEmail}</a>
            <span aria-hidden="true"> / </span>
            <a href={`https://${REPORT.contactSite}`}>{REPORT.contactSite}</a>
          </p>
        </div>
      </footer>

      {/* Mobile sticky CTA bar. */}
      <MobileCtaBar company={company} contactName={result.meta.contactName} />
    </Shell>
  );
}
