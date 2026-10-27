import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, isValidSession } from "@/lib/scorecard/auth";
import { listManualAudits } from "@/lib/scorecard/manual/run";
import { formatQualifiedAuditDecision } from "@/lib/scorecard/qualified-audit";
import { createManualAudit, rerunManualAudit } from "./actions";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const ERRORS: Record<string, string> = {
  url: "Enter a valid public website link.",
  short: "Paste at least 400 characters of site text.",
  challenge:
    "This looks like a robot-check page. Copy the actual site content from a normal browser and try again.",
  nopaste: "Paste the site's text before running the audit.",
  notready:
    "Fewer than 3 of 5 pillars could be scored. Add more site text and try again.",
  timeout:
    "The manual audit reached its time limit. No new report was saved. Please try again.",
  failed: "The manual audit could not be saved. Please try again.",
};

export default async function ManualAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const jar = await cookies();
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value)) redirect("/audit/admin");
  const params = await searchParams;
  const audits = await listManualAudits();
  return (
    <section className="section">
      <div className="site-container">
        <header className="sc-admin-head">
          <h1>Manual audit</h1>
          <p>
            For sites that block the crawler. Open the site in a normal browser,
            select all, and copy the page text.
          </p>
        </header>
        {params.error ? (
          <p className="sc-form-error" role="alert">
            {ERRORS[params.error] ?? ERRORS.failed}
          </p>
        ) : null}
        {params.created ? (
          <p role="status">
            Audit saved.{" "}
            <Link href={`/audit/r/${encodeURIComponent(params.created)}`}>
              Open report
            </Link>
          </p>
        ) : null}
        <div className="sc-admin-card">
          <form className="sc-admin-form" action={createManualAudit}>
            <label className="sc-field">
              <span className="sc-field-label">Website link (required)</span>
              <input name="url" required placeholder="https://example.com" />
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
              <textarea name="pasteRaw" required rows={18} />
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
            <p>Contact details are for reference only, nothing is sent.</p>
            <label className="sc-field">
              <span className="sc-field-label">Contact name (optional)</span>
              <input name="contactName" />
            </label>
            <label className="sc-field">
              <span className="sc-field-label">Contact email (optional)</span>
              <input name="contactEmail" type="email" />
            </label>
            <button className="btn btn-primary" type="submit">
              Run manual audit
            </button>
          </form>
        </div>
        <h2>Past manual audits</h2>
        <p className="sc-admin-dim">
          Use Re-run here to reuse the stored text. The existing report admin
          page&apos;s Regenerate report button runs the automatic crawler.
        </p>
        <div className="sc-admin-tablewrap">
          <table className="sc-admin-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>URL</th>
                <th>Qualified</th>
                <th>Created</th>
                <th>Report</th>
                <th>Admin</th>
                <th>Re-run</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((audit) => (
                <tr key={audit.slug}>
                  <td>{audit.companyName}</td>
                  <td>{audit.url}</td>
                  <td>
                    {formatQualifiedAuditDecision(audit.qualifiedDecision)}
                  </td>
                  <td>
                    {new Date(audit.createdAt).toLocaleString("en-ZA", {
                      timeZone: "Africa/Johannesburg",
                    })}
                  </td>
                  <td>
                    <Link href={`/audit/r/${audit.slug}`}>Report</Link>
                  </td>
                  <td>
                    <Link href={`/audit/admin/${audit.slug}`}>Admin</Link>
                  </td>
                  <td>
                    <form action={rerunManualAudit}>
                      <input type="hidden" name="slug" value={audit.slug} />
                      <button type="submit" className="btn btn-primary">
                        Re-run
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!audits.length ? <p>No manual audits yet.</p> : null}
        </div>
      </div>
    </section>
  );
}
