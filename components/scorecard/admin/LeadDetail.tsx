import { FunnelrStatus } from "./FunnelrStatus";
import {
  readFunnelrStatus,
  funnelrTimelineText,
} from "@/lib/scorecard/admin/funnelr-status";
import { isTestContact } from "@/lib/scorecard/admin/test-contacts";
import Link from "next/link";
import { SameContact } from "./SameContact";
import { readAdminNote } from "@/lib/scorecard/admin/notes";
import { readAdminRunHistory } from "@/lib/scorecard/manual/rerun";
import { prospectScores } from "@/lib/scorecard/result";
import { readShared } from "@/lib/scorecard/share";
import { loadLeadsView } from "@/lib/scorecard/admin/data";
import {
  readRunHistory,
  reportRunCount,
} from "@/lib/scorecard/admin/run-history";
import { readRecentScanLog } from "@/lib/scorecard/diagnostics";
import {
  OUTCOME_LABELS,
  runWhy,
  runLabel,
  linkRunToLead,
} from "@/lib/scorecard/admin/activity-view";
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
  const shared = view.reports[id] ?? (!failed ? await readShared(id) : null);
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
  const company = row?.company || report!.result.meta.company;
  const name =
    row?.firstName ||
    manual?.contactName ||
    report?.result.meta.contactName ||
    "";
  const email = row?.email || manual?.contactEmail || "";
  const url =
    failure?.url || lead?.url || manual?.url || report!.prospectData.url;
  const reportSlug =
    row?.reportPath?.split("/").pop() || (!failed && report ? id : undefined);
  const history =
    report && reportSlug
      ? await readRunHistory(reportSlug, report, manual ? "manual" : "visitor")
      : [];
  const logs = (await readRecentScanLog(500)).filter(
    (r) =>
      row &&
      linkRunToLead(r, view.allRows, view.runLinks)?.leadPath ===
        row.leadPath &&
      Date.parse(r.at) >= view.now - 30 * 86400000
  );
  const adminNote = !failed ? await readAdminNote(id) : null;
  const runSummary =
    report && reportSlug ? await readAdminRunHistory(reportSlug, report) : null;
  const absoluteReportUrl = reportSlug
    ? new URL(
        `/audit/r/${reportSlug}`,
        process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexubis.io"
      ).toString()
    : undefined;
  const funnelrStatus = await readFunnelrStatus(email, absoluteReportUrl).catch(
    () => null
  );
  const timeline = [
    ...(funnelrStatus?.history || (funnelrStatus ? [funnelrStatus] : [])).map(
      (entry) => ({ at: entry.at, text: funnelrTimelineText(entry) })
    ),
    ...history.map((r, i) => ({
      at: r.at,
      text:
        r.kind === "re-run (before history was kept)"
          ? `Re-run (before history was kept): ${r.score ?? "n/a"}/100`
          : r.by === "manual" && r.kind === "first run"
            ? "Manual audit made"
            : r.kind === "first run"
              ? `First run by ${r.by}${r.score === null ? " (score not recorded)" : ""}`
              : `Audit re-run from ${r.by}: ${history[i + 1]?.score ?? "n/a"} -> ${r.score ?? "n/a"}`,
    })),
    ...logs.map((r) => ({
      at: r.at,
      text: `${runLabel(r)}${runWhy(r) ? `: ${runWhy(r)}` : ""}`,
    })),
    ...(failure
      ? [
          {
            at: failure.at,
            text: `${OUTCOME_LABELS[failure.outcome]}: ${failure.reason}${failure.siteRead ? ` (${failure.siteRead})` : ""}`,
          },
        ]
      : []),
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
      <Link href="/audit/admin/leads">Back to Leads</Link>
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
          <SameContact contacts={row?.sameContacts || []} />
          <p>
            {company} &middot;{" "}
            <a
              href={/^https?:/.test(url) ? url : `https://${url}`}
              target="_blank"
              rel="noreferrer"
            >
              {row?.host || url}
            </a>{" "}
            &middot; <a href={`mailto:${email}`}>{email}</a>
          </p>
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
              Email {name || "contact"}
            </a>
          )}
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
      </header>
      <div className="sc-admin-grid sc-admin-detailgrid">
        <section className="sc-admin-card">
          <h2>Contact and source</h2>
          <dl className="sc-admin-facts">
            <div>
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
                    {result!.meta.competitors.map((c) => c.name).join(", ") ||
                      "none recorded"}
                  </dd>
                </div>
                <div>
                  <dt>Report runs</dt>
                  <dd>
                    {reportRunCount(history, runSummary?.runCount || 1, report)}{" "}
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
                  <dd>{formatSast(report.expiresAt)} SAST</dd>
                </div>
              </dl>
            </>
          )}
        </section>
        <section className="sc-admin-card">
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
