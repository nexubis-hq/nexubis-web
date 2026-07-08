// The client-facing Scorecard report: a mobile-first single-scroll page in the
// Nexubis skin, print-friendly, every colour and font from the repo tokens.
// Renders the nine report pages of Part 2B Section 7 in order, or the teaser
// variant (cover, first impression, score and verdict line, locked categories,
// one unlock panel). Server component; motion comes from RevealOnScroll's
// data-reveal hook only, so nothing here couples to homepage animation markup.
import Link from "next/link";
import { NexubisLogo } from "@/components/NexubisLogo";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { ScoreRing } from "./ScoreRing";
import { BenchmarkRadar } from "./BenchmarkRadar";
import { UnlockPanel } from "./UnlockPanel";
import { REPORT, POWERED_BY, VERDICT_LINES } from "@/lib/scorecard/copy";
import { BOOKING_URL, OXIPACK_CASE_URL } from "@/lib/site-config";
import { RUBRIC, categoryLabel } from "@/lib/scorecard/rubric";
import { VERDICT_LABELS } from "@/lib/scorecard/scoring";
import { prospectScores, type ScorecardResult, type CompanyExhibit } from "@/lib/scorecard/result";

function loomEmbedUrl(loomUrl: string): string | null {
  const m = loomUrl.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/);
  return m ? `https://www.loom.com/embed/${m[1]}` : null;
}

function ExhibitCard({ exhibit, label }: { exhibit: CompanyExhibit; label: string }) {
  return (
    <figure className="sc-exhibit" data-reveal>
      <div className="sc-exhibit-frame">
        {exhibit.desktopUrl ? (
          // ScreenshotOne serves a stable CDN-cached PNG; next/image cannot
          // optimise a dynamic remote host list, so a plain img is correct here.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={exhibit.desktopUrl} alt={`First-load homepage of ${exhibit.company}`} loading="lazy" />
        ) : (
          <div className="sc-exhibit-missing">
            <p>{exhibit.resolved ? `${exhibit.company}'s site could not be captured.` : `No website could be found for "${exhibit.company}".`}</p>
          </div>
        )}
      </div>
      <figcaption>
        <span className={exhibit.isProspect ? "sc-exhibit-you" : "sc-exhibit-name"}>{label}</span>
      </figcaption>
    </figure>
  );
}

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

function CategorySection({ result, index, catKey }: { result: ScorecardResult; index: number; catKey: (typeof RUBRIC)[number]["key"] }) {
  const p = prospectScores(result);
  const cat = p?.categories.find((c) => c.key === catKey);
  const def = RUBRIC.find((c) => c.key === catKey)!;
  const copy = result.deckCopy.categories.find((c) => c.key === catKey);
  const unassessable = cat?.checks.filter((c) => !c.assessable) ?? [];
  return (
    <section className="sc-category section" id={`category-${catKey}`}>
      <div className="site-container">
        <header className="sc-category-head" data-reveal>
          <span className="sc-ghost-numeral" aria-hidden="true">
            {index}
          </span>
          <div>
            <h2>{def.label}</h2>
            <p className="sc-category-score">
              {cat?.total !== null && cat?.total !== undefined ? (
                <>
                  <strong>{cat.total}</strong> / 20
                </>
              ) : (
                <>{REPORT.couldNotAssess}</>
              )}
            </p>
          </div>
        </header>
        <div className="sc-category-grid">
          <div className="sc-category-copy">
            {copy?.findings.map((f, i) => (
              <p className="sc-finding" data-reveal key={i}>
                {f}
              </p>
            ))}
            {copy?.competitorNote ? (
              <p className="sc-competitor-note" data-reveal>
                <span>{REPORT.whereCompetitorsStand}:</span> {copy.competitorNote}
              </p>
            ) : null}
            {unassessable.length > 0 ? (
              <div className="sc-unassessed" data-reveal>
                <h4>{REPORT.couldNotAssess}</h4>
                <ul>
                  {unassessable.map((c) => (
                    <li key={c.key}>{c.evidence}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {catKey === "website" ? <PageSpeedTable result={result} /> : null}
          </div>
          <aside className="sc-looked-at" data-reveal>
            <h4>{REPORT.whatWeLookedAt}</h4>
            <ul>
              {def.checks.map((c) => (
                <li key={c.key}>{c.plain}</li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
}

// The teaser's locked stand-in for a category: header real, body placeholder
// bars. Placeholder markup, not blurred real content, so nothing gated ever
// reaches the DOM before unlock.
function LockedCategory({ index, label }: { index: number; label: string }) {
  return (
    <section className="sc-category sc-category-locked section" aria-label={`${label} (locked)`}>
      <div className="site-container">
        <header className="sc-category-head">
          <span className="sc-ghost-numeral" aria-hidden="true">
            {index}
          </span>
          <div>
            <h2>{label}</h2>
            <p className="sc-category-score sc-locked-pill">Locked</p>
          </div>
        </header>
        <div className="sc-locked-lines" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </section>
  );
}

export function ReportView({
  result,
  loomUrl = null,
  teaser = false,
  runId,
  chrome = true,
}: {
  result: ScorecardResult;
  loomUrl?: string | null;
  teaser?: boolean;
  /** Required in teaser mode: the unlock panel promotes this run. */
  runId?: string;
  /** False when embedded inside a page that already owns the main landmark
   *  and top bar (the instant-check flow); true for the standalone route. */
  chrome?: boolean;
}) {
  const p = prospectScores(result);
  const overall = p?.overall ?? null;
  const rivals = result.scores.filter((s) => !s.isProspect);
  const embed = loomUrl ? loomEmbedUrl(loomUrl) : null;

  const Shell = chrome ? "main" : "div";
  return (
    <Shell className="sc-report">
      <RevealOnScroll />
      {chrome ? (
        <nav className="sc-topbar" aria-label="Report">
          <Link href="/" aria-label="Nexubis home">
            <NexubisLogo className="sc-topbar-logo" />
          </Link>
        </nav>
      ) : null}

      {/* 1. Cover */}
      <header className="sc-cover">
        <div className="site-container">
          <p className="sc-cover-kicker" data-reveal>
            {POWERED_BY}
          </p>
          <h1 data-reveal>
            {REPORT.coverTitlePrefix} <span className="sc-cover-company">{result.meta.company}</span>
          </h1>
          <p className="sc-cover-date" data-reveal>
            {result.meta.date}
          </p>
        </div>
      </header>

      {/* 2. Walkthrough video (conditional; absent means the section does not render) */}
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

      {/* 3. First impression */}
      <section className="sc-first-impression section">
        <div className="site-container">
          <h2 data-reveal>{REPORT.firstImpressionTitle}</h2>
          <div className="sc-exhibit-grid">
            {result.exhibits.map((e) => (
              <ExhibitCard key={e.company} exhibit={e} label={e.isProspect ? `${e.company} (you)` : e.company} />
            ))}
          </div>
          <p className="sc-first-impression-line" data-reveal>
            {REPORT.firstImpressionLine}
          </p>
        </div>
      </section>

      {/* 4. Your Credibility Score */}
      <section className="sc-score section">
        <div className="site-container">
          <h2 data-reveal>{REPORT.scoreTitle}</h2>
          <div className="sc-score-grid">
            <div className="sc-score-ring" data-reveal>
              <ScoreRing value={overall} display={overall === null ? "?" : String(overall)} subLabel="of 100" ariaLabel={`Credibility Score ${overall ?? "unknown"} of 100`} />
              <p className="sc-verdict-band">{VERDICT_LABELS[result.verdict.band]}</p>
            </div>
            <div className="sc-score-copy" data-reveal>
              {teaser ? (
                <p className="sc-verdict-paragraph">{VERDICT_LINES[result.verdict.band]}</p>
              ) : (
                <p className="sc-verdict-paragraph">{result.verdict.paragraph}</p>
              )}
              <ul className="sc-overall-chips">
                {result.scores.map((s) => (
                  <li key={s.company} className={s.isProspect ? "sc-chip-you" : "sc-chip"}>
                    <span className="sc-chip-name">{s.isProspect ? `${s.company} (you)` : s.company}</span>
                    <span className="sc-chip-score">{s.scored && s.overall !== null ? s.overall : "n/a"}</span>
                  </li>
                ))}
              </ul>
            </div>
            {p ? (
              <div className="sc-score-radar" data-reveal>
                <BenchmarkRadar prospect={p} rivals={rivals} />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {teaser ? (
        <>
          {/* Locked category placeholders + the single unlock panel */}
          {RUBRIC.map((cat, i) => (
            <LockedCategory key={cat.key} index={i + 1} label={cat.label} />
          ))}
          <section className="sc-unlock-section section">
            <div className="site-container">{runId ? <UnlockPanel runId={runId} /> : null}</div>
          </section>
        </>
      ) : (
        <>
          {/* 5. Five category pages */}
          {RUBRIC.map((cat, i) => (
            <CategorySection key={cat.key} result={result} index={i + 1} catKey={cat.key} />
          ))}

          {/* 6. The first place to fix */}
          {result.firstFix ? (
            <section className="sc-first-fix section">
              <div className="site-container">
                <h2 data-reveal>{REPORT.firstFixTitle}</h2>
                <p className="sc-first-fix-category" data-reveal>
                  {result.firstFix.categoryLabel}
                </p>
                <div className="sc-first-fix-grid">
                  <div data-reveal>
                    <h3>Why it comes first</h3>
                    <p>{result.firstFix.why}</p>
                  </div>
                  <div data-reveal>
                    <h3>What fixing it looks like</h3>
                    <p>{result.firstFix.inPractice}</p>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {/* 7. Proof (the one place a client is named) */}
          <section className="sc-proof section">
            <div className="site-container">
              <h2 data-reveal>{REPORT.proofTitle}</h2>
              <blockquote data-reveal>
                <p>{REPORT.proofBody}</p>
              </blockquote>
              <Link className="sc-proof-link" href={OXIPACK_CASE_URL} data-reveal>
                {REPORT.proofLink}
              </Link>
            </div>
          </section>

          {/* 8. Recommended next step */}
          <section className="sc-next-step section">
            <div className="site-container">
              <h2 data-reveal>{REPORT.nextStepTitle}</h2>
              <ol className="sc-steps">
                {REPORT.nextStepSteps.map((s, i) => (
                  <li key={s.title} data-reveal data-reveal-delay={i * 0.08}>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </li>
                ))}
              </ol>
              <a className="btn btn-primary sc-next-step-cta" href={BOOKING_URL} data-reveal>
                {REPORT.nextStepButton}
              </a>
            </div>
          </section>

          {/* 9. Soft close */}
          <footer className="sc-soft-close section">
            <div className="site-container">
              <p className="sc-soft-close-line" data-reveal>
                {REPORT.softClose}
              </p>
              <p className="sc-contact" data-reveal>
                <a href={`mailto:${REPORT.contactEmail}`}>{REPORT.contactEmail}</a>
                <span aria-hidden="true"> / </span>
                <a href={`https://${REPORT.contactSite}`}>{REPORT.contactSite}</a>
              </p>
            </div>
          </footer>
        </>
      )}
    </Shell>
  );
}
