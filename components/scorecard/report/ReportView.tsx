// The client-facing audit report: a mobile-first single-scroll page in the
// Nexubis skin, print-friendly, every colour and font from the repo tokens.
// Renders the nine report pages of Part 2B Section 7 in order, always in
// full: the unlock gate is gone, so there is no teaser variant and nothing is
// ever locked. Server component; motion comes from RevealOnScroll's
// data-reveal hook only, so nothing here couples to homepage animation markup.
import Link from "next/link";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { PlanCallVignette, PlanPreviewVignette, PlanSlackVignette } from "@/components/vignettes/PlanVignettes";
import { ScoreRing } from "./ScoreRing";
import { BenchmarkRadar } from "./BenchmarkRadar";
import { ReportNav } from "./ReportNav";
import { BookCallButton } from "./BookCallButton";
import { ReportSidebar, type ReportNavItem, type SectionTone } from "./ReportSidebar";
import { REPORT, POWERED_BY, BAND_SCALE, TEASER } from "@/lib/scorecard/copy";
import { OXIPACK_CASE_URL } from "@/lib/site-config";
import { OxipackProofVideo } from "@/components/OxipackProofVideo";
import { getCaseStudyBySlug } from "@/lib/work/data";
import { RUBRIC } from "@/lib/scorecard/rubric";
import { VERDICT_LABELS } from "@/lib/scorecard/scoring";
import { prospectScores, type ScorecardResult, type CompanyExhibit } from "@/lib/scorecard/result";

function loomEmbedUrl(loomUrl: string): string | null {
  const m = loomUrl.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/);
  return m ? `https://www.loom.com/embed/${m[1]}` : null;
}

// The three "recommended next step" cards reuse the homepage plan vignettes,
// which line up one-to-one: book a call, see it first, the team joins.
const NEXT_STEP_VIGNETTES = [PlanCallVignette, PlanPreviewVignette, PlanSlackVignette];

// The Oxipack case-study showreel, the same clip the homepage proof block uses,
// shown beside the proof quote. Null (section renders text-only) if the case
// study has no hero video.
const OXIPACK_SHOWREEL = getCaseStudyBySlug("oxipack")?.heroVideo;
const OXIPACK_PROOF_VIDEO =
  OXIPACK_SHOWREEL?.src && OXIPACK_SHOWREEL.poster && OXIPACK_SHOWREEL.title
    ? { src: OXIPACK_SHOWREEL.src, poster: OXIPACK_SHOWREEL.poster, title: OXIPACK_SHOWREEL.title }
    : null;

function ExhibitCard({ exhibit, label }: { exhibit: CompanyExhibit; label: string }) {
  return (
    <figure className={exhibit.isProspect ? "sc-exhibit sc-exhibit-prospect" : "sc-exhibit"} data-reveal>
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

// Where the score sits on the 0 to 100 scale, with the three bands marked, so
// the band name carries its meaning instead of floating as a label.
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

  // Sidebar "on this page" items: first impression plus the five categories,
  // each dot toned by how the category scored (good / mid / poor).
  const navItems: ReportNavItem[] = [
    { id: "sc-first-impression", label: "First impression", tone: "neutral" },
    ...RUBRIC.map((cat): ReportNavItem => {
      const total = p?.categories.find((x) => x.key === cat.key)?.total ?? null;
      const tone: SectionTone = total === null ? "neutral" : total >= 14 ? "good" : total >= 9 ? "mid" : "poor";
      return { id: `category-${cat.key}`, label: cat.label, tone };
    }),
  ];

  const Shell = chrome ? "main" : "div";
  return (
    <Shell className="sc-report">
      <RevealOnScroll />
      {chrome ? <ReportNav company={result.meta.company} /> : null}

      {/* 1. Hero: land straight on the score. Brand, score and benchmark share
          one section, so a stranger sees where they stand before scrolling. */}
      <header className="sc-hero">
        <div className="site-container">
          <p className="sc-hero-kicker" data-reveal>
            {POWERED_BY}
          </p>
          <h1 className="sc-hero-title" data-reveal>
            {REPORT.coverTitlePrefix} <span className="sc-hero-company">{result.meta.company}</span>
          </h1>
          <div className="sc-hero-card" data-reveal>
            <div className="sc-score-grid">
              <div className="sc-score-ring">
                <ScoreRing value={overall} display={overall === null ? "?" : String(overall)} subLabel="of 100" ariaLabel={`Credibility Score ${overall ?? "unknown"} of 100`} />
                <p className="sc-verdict-band">{VERDICT_LABELS[result.verdict.band]}</p>
                <BandScale overall={overall} band={result.verdict.band} />
              </div>
              <div className="sc-score-copy">
                <p className="sc-verdict-paragraph">{result.verdict.paragraph}</p>
                <p className="sc-chips-label">{TEASER.chipsLabel}</p>
                <ul className="sc-overall-chips">
                  {result.scores.map((s) => (
                    <li key={s.company} className={s.isProspect ? "sc-chip-you" : "sc-chip"}>
                      <span className="sc-chip-name">{s.company}</span>
                      <span className="sc-chip-score">{s.scored && s.overall !== null ? s.overall : TEASER.rivalNotScored}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {p ? (
                <div className="sc-score-radar">
                  <BenchmarkRadar prospect={p} rivals={rivals} />
                </div>
              ) : null}
            </div>
          </div>
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

      {/* 3. First impression: the prospect's own screenshot leads, large; the
          competitors follow in a smaller row beneath. */}
      <section className="sc-first-impression section" id="sc-first-impression">
        <div className="site-container">
          <h2 data-reveal>{REPORT.firstImpressionTitle}</h2>
          {(() => {
            const prospectExhibit = result.exhibits.find((e) => e.isProspect);
            const rivalExhibits = result.exhibits.filter((e) => !e.isProspect);
            return (
              <>
                {prospectExhibit ? (
                  <div className="sc-exhibit-hero">
                    <ExhibitCard exhibit={prospectExhibit} label={`${prospectExhibit.company} (you)`} />
                  </div>
                ) : null}
                {rivalExhibits.length > 0 ? (
                  <div className="sc-exhibit-grid sc-exhibit-grid-rivals">
                    {rivalExhibits.map((e) => (
                      <ExhibitCard key={e.company} exhibit={e} label={e.company} />
                    ))}
                  </div>
                ) : null}
              </>
            );
          })()}
          <p className="sc-first-impression-line" data-reveal>
            {REPORT.firstImpressionLine}
          </p>
        </div>
      </section>

      {(
        <>
          {/* 5. Five category pages, alongside the sticky "on this page" nav +
              Laine's book-a-call card (desktop; the nav collapses on mobile). */}
          <div className="sc-body">
            <div className="site-container sc-body-inner">
              <div className="sc-body-main">
                {RUBRIC.map((cat, i) => (
                  <CategorySection key={cat.key} result={result} index={i + 1} catKey={cat.key} />
                ))}
              </div>
              <ReportSidebar items={navItems} company={result.meta.company} contactName={result.meta.contactName} />
            </div>
          </div>

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

          {/* 7. Proof (the one place a client is named), with the Oxipack
              showreel beside the quote, the same clip the homepage uses. */}
          <section className="sc-proof section">
            <div className="site-container sc-proof-inner">
              <div className="sc-proof-text">
                <h2 data-reveal>{REPORT.proofTitle}</h2>
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

          {/* 8. Recommended next step: the homepage "How It Works" treatment,
              same numbered cards and looping vignettes. */}
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
                business={result.meta.company}
                reveal
              >
                {REPORT.nextStepButton}
              </BookCallButton>
            </div>
          </section>

          {/* 9. Soft close: the two sentences each get their own line. */}
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
        </>
      )}
    </Shell>
  );
}
