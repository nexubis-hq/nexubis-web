import { LinkedinForm } from "./LinkedinForm";
import { firstSeenLine, nextStep } from "@/lib/scorecard/admin/follow-up";
import { normalizeProfile } from "@/lib/scorecard/admin/profiles";
import { readLeadProfile } from "@/lib/scorecard/admin/profiles";
import {
  storedCompanyLinkedin,
  linkedinPeopleSearch,
  linkedinCompanySearch,
  leadBrand,
  websiteUrl,
} from "@/lib/scorecard/admin/linkedin";
import { meetingSummary, meetingText } from "@/lib/scorecard/admin/meetings";
import { auditTimeline } from "@/lib/scorecard/admin/timeline";
import { FunnelrStatus } from "./FunnelrStatus";
import {
  readFunnelrStatus,
  funnelrTimelineText,
} from "@/lib/scorecard/admin/funnelr-status";
import { isTestContact } from "@/lib/scorecard/admin/test-contacts";
import Link from "next/link";
import { SameContact } from "./SameContact";
import { readAdminNote } from "@/lib/scorecard/admin/notes";
import { prospectScores } from "@/lib/scorecard/result";
import { readShared } from "@/lib/scorecard/share";
import { loadLeadsView } from "@/lib/scorecard/admin/data";
import {
  readRunHistory,
  derivedRunHistory,
  reportRunCount,
} from "@/lib/scorecard/admin/run-history";
import { linkRunToLead } from "@/lib/scorecard/admin/activity-view";
import { categoryLabel } from "@/lib/scorecard/rubric";
import { saveLeadNote, attachLoom } from "@/app/audit/admin/actions";
import { CopyLinkButton } from "./CopyLinkButton";
import { RerunAuditForm } from "./RerunAuditForm";
import { LeadStatus, Qualified } from "./LeadStatus";
import { formatSast } from "./date";
import { notFound } from "next/navigation";
export async function LeadDetail({
  id,
  failed = false,
}: {
  id: string;
  failed?: boolean;
}) {
  const view = await loadLeadsView({ period: "all", showTests: true });
  const row = view.allRows.find(
    (r) => r.id === id && (failed ? r.kind === "failed" : r.kind !== "failed")
  );
  const shared = Object.prototype.hasOwnProperty.call(view.reports, id)
    ? view.reports[id]
    : !failed
      ? await readShared(id)
      : null;
  // Reports without a lead record remain available to administrators.
  const report = failed
    ? row?.reportPath
      ? view.reports[row.reportPath.split("/").pop()!]
      : null
    : shared;
  if (!row && !report) notFound();
  const failure = failed ? view.failed.find((r) => r.id === id) : undefined;
  const lead = view.leads.find((r) => r.reportSlug === id);
  const manual = view.manual.find((r) => r.slug === id);
  const rawCompany = row?.company ?? report?.result.meta.company ?? "";
  const name =
    row?.firstName ||
    manual?.contactName ||
    report?.result.meta.contactName ||
    "";
  const email = row?.email || manual?.contactEmail || "";
  const url =
    failure?.url ||
    lead?.url ||
    manual?.url ||
    report?.prospectData.url ||
    row?.host ||
    "";
  const firstName = name.trim().split(/\s+/)[0] || "";
  const company = leadBrand(rawCompany, firstName, url);
  const reportSlug =
    row?.reportPath?.split("/").pop() || (!failed && report ? id : undefined);
  const storedHistory = reportSlug ? view.histories?.[reportSlug] : undefined;
  const history =
    report && reportSlug
      ? storedHistory
        ? storedHistory.length
          ? storedHistory
          : derivedRunHistory(report, manual ? "manual" : "visitor")
        : await readRunHistory(
            reportSlug,
            report,
            manual ? "manual" : "visitor"
          )
      : [];
  const logs = (view.scanLog || []).filter(
    (run) =>
      row &&
      linkRunToLead(run, view.allRows, view.runLinks)?.leadPath ===
        row.leadPath &&
      Date.parse(run.at) >= view.now - 30 * 86400000
  );
  const adminNote = !failed ? await readAdminNote(id) : null;
  const runSummary = reportSlug ? view.adminRuns?.[reportSlug] : null;
  const profile = normalizeProfile(
    row ? await readLeadProfile(row.leadPath).catch(() => null) : null
  );
  const foundCompanyLinkedin = storedCompanyLinkedin(report, rawCompany, true);
  const displayProfile = {
    ...profile,
    companyLinkedin:
      profile.companyLinkedin ||
      (foundCompanyLinkedin
        ? {
            url: foundCompanyLinkedin,
            source: "audit" as const,
            status: "likely" as const,
            savedAt: "",
          }
        : null),
  };
  const companyLinkedin =
    displayProfile.companyLinkedin?.url || linkedinCompanySearch(company);
  const personLinkedin =
    profile.linkedinProfile?.url || linkedinPeopleSearch(firstName, company);
  const meetingEvents = view.meetings?.[email.trim().toLowerCase()] || [];
  const meeting = meetingSummary(meetingEvents);
  const absoluteReportUrl = reportSlug
    ? new URL(
        `/audit/r/${reportSlug}`,
        process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexubis.io"
      ).toString()
    : undefined;
  const funnelrStatus = row
    ? row.funnelrStatus || null
    : await readFunnelrStatus(email, absoluteReportUrl).catch(() => null);
  const timeline = [
    ...(funnelrStatus?.history || (funnelrStatus ? [funnelrStatus] : [])).map(
      (entry) => ({ at: entry.at, text: funnelrTimelineText(entry) })
    ),
    ...auditTimeline(history, logs, failure),
    ...meetingEvents.map((entry) => ({
      at: entry.bookedAt,
      text:
        entry.event === "cancelled"
          ? `Meeting cancelled (was booked for ${formatSast(entry.startTime)})`
          : meetingText(entry, view.now),
    })),
    ...(failure?.note || lead?.note || adminNote?.note
      ? [
          {
            at: failure?.updatedAt || lead?.updatedAt || adminNote!.updatedAt,
            text: "Note saved",
          },
        ]
      : []),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const manualHref = `/audit/admin/manual?${new URLSearchParams({ url, contactName: name, contactEmail: email, ...(failure ? { failedLead: failure.id } : {}) })}`;
  const result = report?.result;
  return (
    <>
      <Link href="/audit/admin/leads">&larr; Back to Leads</Link>
      <header className="sc-admin-head sc-admin-card">
        <div>
          <div className="sc-admin-badges">
            <LeadStatus status={row?.status || (manual ? "hand" : "ready")} />
            <Qualified
              header
              decision={report?.qualifiedDecision || row?.qualifiedDecision}
            />
          </div>
          <h1>{name || company}</h1>
          <p>
            {firstSeenLine(
              company,
              row?.firstSeen || report!.createdAt,
              view.now
            )}
          </p>
          <p className="sc-admin-header-links">
            <a
              className="sc-admin-site-link"
              href={websiteUrl(url) || undefined}
              target="_blank"
              rel="noreferrer"
            >
              {row?.host || url} &#8599;
            </a>
            <span className="sc-admin-link-separator">&middot;</span>
            <a href={companyLinkedin} target="_blank" rel="noreferrer">
              <span className="sc-admin-in">in</span> {company}
            </a>
            <span className="sc-admin-link-separator">&middot;</span>
            <a href={personLinkedin} target="_blank" rel="noreferrer">
              <span className="sc-admin-in">in</span> {firstName || "Person"}
            </a>
            {profile.linkedinProfile?.status === "likely" && (
              <span className="sc-admin-likely">likely</span>
            )}
          </p>
          <SameContact contacts={row?.sameContacts || []} />
        </div>
        <div className="sc-admin-ops">
          {reportSlug ? (
            <Link className="btn btn-primary" href={`/audit/r/${reportSlug}`}>
              View report
            </Link>
          ) : (
            <Link className="btn btn-primary" href={manualHref}>
              Run audit by hand
            </Link>
          )}
          {email && (
            <a className="btn btn-secondary" href={`mailto:${email}`}>
              Email {firstName || "contact"}
            </a>
          )}
          <details className="sc-admin-more">
            <summary className="btn btn-secondary">More &#9662;</summary>
            <div className="sc-admin-more-items">
              {reportSlug && <CopyLinkButton path={`/audit/r/${reportSlug}`} />}{" "}
              {!failed && reportSlug && (
                <RerunAuditForm
                  slug={reportSlug}
                  url={url}
                  company={company}
                  name={name}
                  paste={Boolean(manual && manual.source !== "crawl")}
                />
              )}
            </div>
          </details>
        </div>
      </header>
      <div className="sc-admin-grid sc-admin-detailgrid">
        <section className="sc-admin-card">
          <h2>Contact and source</h2>
          <dl className="sc-admin-facts">
            <div>
              <dt>First name</dt>
              <dd>{name || "not recorded"}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{email || "not recorded"}</dd>
            </div>
            <div>
              <dt>Company</dt>
              <dd>{company}</dd>
            </div>
            <div>
              <dt>Makes</dt>
              <dd>{result?.meta.productOneLiner || "not recorded"}</dd>
            </div>
            <div>
              <dt>Came from</dt>
              <dd>
                {row?.adLabel || "not recorded"}{" "}
                {(lead?.ad || failure?.ad)?.utm_source}
              </dd>
            </div>
            <div>
              <dt>First seen (SAST)</dt>
              <dd>{formatSast(row?.firstSeen || report!.createdAt)}</dd>
            </div>
            <div>
              <dt>Qualified</dt>
              <dd>
                <Qualified
                  decision={report?.qualifiedDecision || row?.qualifiedDecision}
                />
              </dd>
            </div>
          </dl>
        </section>
        <section className="sc-admin-card">
          <h2>Audit</h2>
          {failure && (
            <>
              <p>{failure.reason}</p>
              <p className="sc-admin-dim">
                {failure.siteRead || "Site-read reason not recorded"}
              </p>
            </>
          )}
          {report && (
            <>
              <p>
                <strong className="sc-admin-bigscore">
                  {row?.score ??
                    (report ? prospectScores(report.result)?.overall : null) ??
                    "n/a"}
                </strong>{" "}
                /100 {result!.verdict.band} gap
              </p>
              <dl className="sc-admin-facts">
                <div>
                  <dt>First fix</dt>
                  <dd>{result!.firstFix?.categoryLabel || "n/a"}</dd>
                </div>
                <div>
                  <dt>Competitors</dt>
                  <dd>
                    {result!.meta.competitors.length
                      ? result!.meta.competitors.map((competitor, index) => {
                          const href = websiteUrl(competitor.url);
                          const linkedin = storedCompanyLinkedin(
                            report,
                            competitor.name
                          );
                          return (
                            <span key={`${competitor.name}-${index}`}>
                              {index > 0 && <>, </>}
                              {href ? (
                                <a href={href} target="_blank" rel="noreferrer">
                                  {competitor.name} &#8599;
                                </a>
                              ) : (
                                competitor.name
                              )}
                              {linkedin && (
                                <>
                                  {" "}
                                  &middot;{" "}
                                  <a
                                    href={linkedin}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    LinkedIn &#8599;
                                  </a>
                                </>
                              )}
                            </span>
                          );
                        })
                      : "none recorded"}
                  </dd>
                </div>
                <div>
                  <dt>Report runs</dt>
                  <dd>
                    {reportRunCount(
                      history,
                      runSummary?.runCount || manual?.runCount || 1,
                      report
                    )}{" "}
                    (up to 50 recent runs kept)
                  </dd>
                </div>
                <div>
                  <dt>Last run</dt>
                  <dd>
                    {formatSast(history[0]?.at || report.createdAt)} SAST (
                    {history[0]?.by || "visitor"})
                  </dd>
                </div>
                <div>
                  <dt>Link live until</dt>
                  <dd>
                    {formatSast(report.expiresAt, false, view.now, true)} SAST
                  </dd>
                </div>
              </dl>
            </>
          )}
        </section>
        <section className="sc-admin-card sc-admin-follow-up">
          <h2>Follow-up</h2>
          <p className="sc-admin-next-step">
            <strong>Next step:</strong>{" "}
            {nextStep(
              firstName,
              funnelrStatus?.state === "ok",
              meeting.current,
              view.now
            )}
          </p>
          <dl className="sc-admin-facts">
            <div>
              <dt>Meeting</dt>
              <dd>
                <strong
                  className={
                    meeting.active ? "sc-admin-meeting-active" : "sc-admin-dim"
                  }
                >
                  {meetingText(meeting.current, view.now)}
                </strong>
                <details className="sc-admin-about">
                  <summary>about this</summary>
                  <p>
                    Shows cal.com bookings. Bookings Laine makes outside cal.com
                    don&apos;t show here yet.
                  </p>
                </details>
              </dd>
            </div>
            <div>
              <dt>LinkedIn</dt>
              <dd>
                {row && (
                  <LinkedinForm
                    leadPath={row.leadPath}
                    profile={displayProfile}
                    company={company}
                    name={firstName}
                  />
                )}
              </dd>
            </div>
            <div className="sc-admin-funnelr-muted">
              <dt>Funnelr</dt>
              <dd>
                <FunnelrStatus
                  status={funnelrStatus}
                  leadPath={row?.leadPath || `/audit/admin/${id}`}
                  name={name || company}
                  website={url}
                  email={email}
                  test={isTestContact(email)}
                  manual={row?.status === "hand" || Boolean(manual)}
                  hasReport={Boolean(report)}
                />
              </dd>
            </div>
          </dl>
        </section>
        <section className="sc-admin-card">
          <h2>Notes</h2>
          <form action={saveLeadNote} className="sc-admin-form">
            <input
              type="hidden"
              name={failed ? "failedId" : "slug"}
              value={id}
            />
            <label className="sc-field">
              <span>Working note</span>
              <textarea
                name="note"
                rows={6}
                maxLength={2000}
                defaultValue={
                  failure?.note || lead?.note || adminNote?.note || ""
                }
              />
            </label>
            <button className="btn btn-secondary">Save note</button>
          </form>
        </section>
        <section className="sc-admin-card sc-admin-fullwidth">
          <h2>Timeline</h2>
          <ol className="sc-admin-timeline">
            {timeline.map((r, i) => (
              <li key={i}>
                <time>{formatSast(r.at)} SAST</time>
                <p>{r.text}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
      {result && (
        <>
          <details className="sc-admin-card">
            <summary>Raw scores and evidence</summary>
            {result.scores
              .filter((s) => s.scored)
              .map((s) => (
                <details
                  key={s.company}
                  className="sc-admin-company"
                  open={s.isProspect}
                >
                  <summary>
                    {s.isProspect ? `${s.company} (prospect)` : s.company}:{" "}
                    {s.overall ?? "n/a"}/100
                  </summary>
                  {s.categories.map((cat) => (
                    <div key={cat.key} className="sc-admin-cat">
                      <h3>
                        {categoryLabel(cat.key)}:{" "}
                        {cat.total ?? "not assessable"}/20 ({cat.assessedChecks}
                        /5 checks)
                      </h3>
                      <div
                        className="sc-admin-tablewrap"
                        role="region"
                        aria-label={`${s.company} ${categoryLabel(cat.key)} checks`}
                        tabIndex={0}
                      >
                        <table className="sc-admin-table sc-admin-checks">
                          <tbody>
                            {cat.checks.map((c) => (
                              <tr key={c.key}>
                                <td className="sc-admin-score">
                                  {c.assessable ? c.score : "n/a"}
                                </td>
                                <td className="sc-admin-dim">{c.key}</td>
                                <td>{c.evidence}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </details>
              ))}
          </details>
          <details className="sc-admin-card">
            <summary>Walkthrough video (rarely used)</summary>
            <form action={attachLoom} className="sc-admin-form">
              <input type="hidden" name="slug" value={reportSlug} />
              <label className="sc-field">
                <span>Loom URL (empty removes it)</span>
                <input
                  name="loomUrl"
                  type="url"
                  defaultValue={report?.loomUrl || ""}
                />
              </label>
              <button className="btn btn-secondary">
                {report?.loomUrl ? "Replace video" : "Attach video"}
              </button>
            </form>
          </details>
        </>
      )}
    </>
  );
}
