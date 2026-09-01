import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { SESSION_COOKIE, isValidSession } from "@/lib/scorecard/auth";
import { readShared } from "@/lib/scorecard/share";
import { readLead } from "@/lib/scorecard/leads";
import { prospectScores } from "@/lib/scorecard/result";
import { categoryLabel } from "@/lib/scorecard/rubric";
import { CopyLinkButton } from "@/components/scorecard/admin/CopyLinkButton";
import { attachLoom, regenerateReport, saveLeadNote, setLoomStatus } from "../actions";

export const dynamic = "force-dynamic";

// The internal report view: the sanity-check surface before recording a Loom.
// Routing block, raw scores per check with evidence sentences, and the report
// ops (attach/replace Loom, regenerate, copy link).
export default async function AdminReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const jar = await cookies();
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value)) redirect("/audit/admin");
  const { slug } = await params;
  const { error } = await searchParams;
  const shared = await readShared(slug);
  if (!shared) notFound();
  const lead = await readLead(slug);
  const result = shared.result;
  const p = prospectScores(result);

  return (
    <section className="section">
      <div className="site-container">
        <header className="sc-admin-head">
          <div>
            <h1>{result.meta.company}</h1>
            <p className="sc-admin-dim">
              {result.meta.contactName || "(no contact yet)"} / {result.meta.role || "role unknown"} / {result.meta.date}
            </p>
          </div>
          <div className="sc-admin-ops">
            <CopyLinkButton path={`/audit/r/${slug}`} />
            <Link className="btn btn-secondary" href={`/audit/r/${slug}`}>
              Open public report
            </Link>
            <form action={regenerateReport}>
              <input type="hidden" name="slug" value={slug} />
              <button className="btn btn-secondary" type="submit">
                Regenerate report
              </button>
            </form>
          </div>
        </header>

        <div className="sc-admin-grid">
          <div className="sc-admin-card">
            <h2>Routing</h2>
            <ul className="sc-admin-facts">
              <li>
                <span>Overall</span> {p?.overall ?? "n/a"}/100 ({result.verdict.band} gap, stance {result.verdict.stance})
              </li>
              <li>
                <span>First fix</span> {result.firstFix?.categoryLabel ?? "n/a"}
              </li>
              <li>
                <span>Seniority</span> {result.routing.roleSeniority}
              </li>
              <li>
                <span>Vertical</span> {result.routing.verticalGuess}
              </li>
              <li>
                <span>Geo</span> {result.routing.geoGuess}
              </li>
              <li>
                <span>Follow-up</span> {result.routing.followUpTiming}
              </li>
              <li>
                <span>Loom candidate</span> {result.routing.loomCandidate ? "yes" : "no"}
              </li>
              {lead ? (
                <li>
                  <span>Webhook</span>{" "}
                  <span className={lead.webhookStatus === "failed" ? "sc-admin-warn" : undefined}>{lead.webhookStatus}</span>
                </li>
              ) : null}
            </ul>
          </div>

          <div className="sc-admin-card">
            <h2>Loom</h2>
            {error === "loom" ? <p className="sc-form-error">That does not look like a Loom share URL.</p> : null}
            <form action={attachLoom} className="sc-admin-form">
              <input type="hidden" name="slug" value={slug} />
              <label className="sc-field">
                <span className="sc-field-label">Loom URL (empty removes it)</span>
                <input type="url" name="loomUrl" defaultValue={shared.loomUrl ?? ""} placeholder="https://www.loom.com/share/..." />
              </label>
              <button className="btn btn-primary" type="submit">
                {shared.loomUrl ? "Replace Loom" : "Attach Loom"}
              </button>
              {shared.loomUrl ? <p className="sc-admin-dim">Attached: the walkthrough slot is live on the public report.</p> : <p className="sc-admin-dim">No Loom attached; the public report renders without the video slot.</p>}
            </form>
            {lead ? (
              <form action={setLoomStatus} className="sc-admin-form">
                <input type="hidden" name="slug" value={slug} />
                <label className="sc-field">
                  <span className="sc-field-label">Loom status</span>
                  <select name="loomStatus" defaultValue={lead.loomStatus}>
                    <option value="none">none</option>
                    <option value="selected">selected</option>
                    <option value="recorded">recorded</option>
                    <option value="sent">sent</option>
                  </select>
                </label>
                <button className="btn btn-secondary" type="submit">
                  Save status
                </button>
              </form>
            ) : null}
          </div>

          <div className="sc-admin-card">
            <h2>Notes</h2>
            <form action={saveLeadNote} className="sc-admin-form">
              <input type="hidden" name="slug" value={slug} />
              <label className="sc-field">
                <span className="sc-field-label">Working note</span>
                <textarea name="note" rows={5} defaultValue={lead?.note ?? ""} />
              </label>
              <button className="btn btn-secondary" type="submit" disabled={!lead}>
                Save note
              </button>
              {!lead ? <p className="sc-admin-dim">No lead record for this report (pre-plumbing unlock).</p> : null}
            </form>
          </div>
        </div>

        <h2 className="sc-admin-rawtitle">Raw scores and evidence</h2>
        {result.scores
          .filter((s) => s.scored)
          .map((s) => (
            <details key={s.company} className="sc-admin-company" open={s.isProspect}>
              <summary>
                {s.isProspect ? `${s.company} (prospect)` : s.company}: {s.overall ?? "n/a"}/100
              </summary>
              {s.categories.map((cat) => (
                <div key={cat.key} className="sc-admin-cat">
                  <h3>
                    {categoryLabel(cat.key)}: {cat.total ?? "not assessable"}/20 ({cat.assessedChecks}/5 checks)
                  </h3>
                  <table className="sc-admin-table sc-admin-checks">
                    <tbody>
                      {cat.checks.map((c) => (
                        <tr key={c.key}>
                          <td className="sc-admin-score">{c.assessable ? c.score : "n/a"}</td>
                          <td className="sc-admin-dim">{c.key}</td>
                          <td>{c.evidence}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </details>
          ))}
      </div>
    </section>
  );
}
