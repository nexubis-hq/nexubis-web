import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, isValidSession } from "@/lib/scorecard/auth";
import { listManualAudits } from "@/lib/scorecard/manual/run";
import { AuditFeedback } from "@/components/scorecard/admin/AuditFeedback";
import { AuditSubmitButton } from "@/components/scorecard/admin/AuditSubmitButton";
import { RerunAuditForm } from "@/components/scorecard/admin/RerunAuditForm";
import { formatSast } from "@/components/scorecard/admin/date";
import { createManualAudit, createNormalManualAudit } from "./actions";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function ManualAuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    url?: string;
    contactName?: string;
    contactEmail?: string;
    failedLead?: string;
    error?: string;
    created?: string;
    updated?: string;
    reason?: string;
  }>;
}) {
  const jar = await cookies();
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value)) redirect("/audit/admin");
  const params = await searchParams;
  const audits = (await listManualAudits()).sort((a, b) =>
    (b.lastRunAt ?? b.updatedAt).localeCompare(a.lastRunAt ?? a.updatedAt)
  );
  return (
    <section className="section">
      <div className="site-container">
        <AuditFeedback
          successSlug={params.updated ?? params.created}
          error={params.error}
          reason={params.reason}
        />
        <header className="sc-admin-head">
          <div>
            <h1>Manual audit</h1>
            <p>
              Run an audit by hand. Nothing is emailed and nothing goes to the
              CRM. If you add a contact email, the audit also shows in Leads as
              Made by hand.
            </p>
          </div>
        </header>
        <section className="sc-admin-card">
          <h2>Run normal audit</h2>
          <p className="sc-admin-description">
            Crawl the site, check its visuals and speed, and score it against
            competitors.
          </p>
          <form className="sc-admin-form" action={createNormalManualAudit}>
            <label className="sc-field">
              <span className="sc-field-label">Website link</span>
              <input
                type="hidden"
                name="failedLead"
                value={params.failedLead ?? ""}
              />
              <input
                name="url"
                defaultValue={params.url}
                required
                placeholder="https://example.com"
              />
            </label>
            <div className="sc-admin-fieldrow">
              <label className="sc-field">
                <span className="sc-field-label">
                  Contact name <span className="sc-admin-dim">(optional)</span>
                </span>
                <input name="contactName" defaultValue={params.contactName} />
              </label>
              <label className="sc-field">
                <span className="sc-field-label">
                  Contact email <span className="sc-admin-dim">(optional)</span>
                </span>
                <input
                  name="contactEmail"
                  type="email"
                  defaultValue={params.contactEmail}
                />
              </label>
            </div>
            <p className="sc-admin-dim">
              Contact details are for reference only, nothing is sent.
            </p>
            <AuditSubmitButton>Run normal audit</AuditSubmitButton>
          </form>
        </section>
        <details className="sc-admin-card sc-admin-paste">
          <summary>Site blocks our audit? Paste the text instead</summary>
          <p className="sc-admin-description">
            Open the site in a normal browser, select all, and copy the page
            text.
          </p>
          <form className="sc-admin-form" action={createManualAudit}>
            <label className="sc-field">
              <span className="sc-field-label">Website link</span>
              <input
                type="hidden"
                name="failedLead"
                value={params.failedLead ?? ""}
              />
              <input
                name="url"
                defaultValue={params.url}
                required
                placeholder="https://example.com"
              />
            </label>
            <label className="sc-field">
              <span className="sc-field-label">Company name (optional)</span>
              <input name="companyName" maxLength={60} />
            </label>
            <label className="sc-field">
              <span className="sc-field-label">
                Paste the site text here. Homepage first. Put --- on its own
                line between pages
              </span>
              <textarea name="pasteRaw" required rows={14} />
            </label>
            <p className="sc-admin-dim">
              Up to 12,000 characters are kept. The scorer reads the first
              8,000, so put the homepage first. Visual and speed checks are not
              run for this site.
            </p>
            <label className="sc-field">
              <span className="sc-field-label">
                Competitors (optional, up to 3; separate with commas or new
                lines)
              </span>
              <textarea name="competitorsRaw" rows={3} />
            </label>
            <div className="sc-admin-fieldrow">
              <label className="sc-field">
                <span className="sc-field-label">Contact name (optional)</span>
                <input name="contactName" defaultValue={params.contactName} />
              </label>
              <label className="sc-field">
                <span className="sc-field-label">Contact email (optional)</span>
                <input
                  name="contactEmail"
                  type="email"
                  defaultValue={params.contactEmail}
                />
              </label>
            </div>
            <p className="sc-admin-dim">
              Contact details are for reference only, nothing is sent.
            </p>
            <AuditSubmitButton>Run audit from pasted text</AuditSubmitButton>
          </form>
        </details>
        <section className="sc-admin-card">
          <h2>Past manual audits</h2>
          <p className="sc-admin-description">
            Newest run first. Times are SAST. Each audit keeps the same report
            link.
          </p>
          <div
            className="sc-admin-tablewrap"
            role="region"
            aria-label="Past manual audits"
            tabIndex={0}
          >
            <table className="sc-admin-table sc-admin-manual-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Source</th>
                  <th>Qualified</th>
                  <th>Last run</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((audit) => (
                  <tr key={audit.slug}>
                    <td>
                      <strong>{audit.companyName}</strong>
                      <span className="sc-admin-subtext">{audit.url}</span>
                    </td>
                    <td>
                      <span className="sc-admin-chip">
                        {audit.source === "crawl" ? "Crawl" : "Pasted text"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`sc-admin-chip ${audit.qualifiedDecision.qualified ? "sc-admin-chip-yes" : ""}`}
                      >
                        {audit.qualifiedDecision.qualified ? "Yes" : "No"}
                      </span>
                      <span className="sc-admin-subtext">
                        {audit.qualifiedDecision.reason}
                      </span>
                    </td>
                    <td>
                      <time dateTime={audit.lastRunAt ?? audit.updatedAt}>
                        {formatSast(audit.lastRunAt ?? audit.updatedAt)}
                      </time>
                      <span className="sc-admin-subtext">
                        run {audit.runCount}
                      </span>
                    </td>
                    <td>
                      <div className="sc-admin-ops">
                        <Link
                          className="btn btn-secondary"
                          href={`/audit/r/${audit.slug}`}
                        >
                          Open report
                        </Link>
                        <Link
                          className="btn btn-secondary"
                          href={`/audit/admin/${audit.slug}`}
                        >
                          Admin view
                        </Link>
                        <RerunAuditForm
                          slug={audit.slug}
                          url={audit.url}
                          company={audit.companyName}
                          name={audit.contactName}
                          paste={audit.source !== "crawl"}
                          destination="manual"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!audits.length ? (
              <p className="sc-admin-empty">
                No manual audits yet. Run your first audit above.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}
