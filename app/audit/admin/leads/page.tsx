import Link from "next/link";
import { SameContact } from "@/components/scorecard/admin/SameContact";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, isValidSession } from "@/lib/scorecard/auth";
import { loadLeadsView } from "@/lib/scorecard/admin/data";
import { ordinal } from "@/lib/scorecard/admin/leads-view";
import { LeadsFilters } from "@/components/scorecard/admin/LeadsFilters";
import { LeadTableRow } from "@/components/scorecard/admin/LeadTableRow";
import { LeadStatus, Qualified } from "@/components/scorecard/admin/LeadStatus";
import { formatSast } from "@/components/scorecard/admin/date";
export const dynamic = "force-dynamic";
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const jar = await cookies();
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value)) redirect("/audit/admin");
  const q = await searchParams;
  const { rows, summary, period, testCount } = await loadLeadsView({
    ...q,
    showTests: q.showTests === "1",
  });
  const href = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...q, ...patch }))
      if (v) params.set(k, v);
    return `/audit/admin/leads?${params}`;
  };
  return (
    <section className="section">
      <div className="site-container">
        <header className="sc-admin-head">
          <div>
            <h1>Leads</h1>
            <p>
              Everyone who gave us their email on the audit, newest first. A
              failed scan is still a lead: it shows up here with the next step
              to take.
            </p>
          </div>
        </header>
        <div className="sc-admin-tiles">
          {[
            [
              "New companies",
              summary.newCompanies,
              "tests and repeat audits left out",
            ],
            [
              "Qualified manufacturers",
              summary.qualified,
              `of the ${summary.total}`,
            ],
            ["Needs a manual audit", summary.needsAction, ""],
            ["Came from an ad", summary.fromAd, `of the ${summary.total}`],
          ].map(([label, note, sub], i) => (
            <Link
              href={i === 2 ? href({ status: "action" }) : href({})}
              className={`sc-admin-card sc-admin-tile ${i === 2 && summary.needsAction ? "sc-admin-danger" : ""}`}
              key={label}
            >
              <span>{label}</span>
              <strong>{note}</strong>
              <small>{sub || "Next step: run by hand"}</small>
            </Link>
          ))}
        </div>
        <div className="sc-admin-toolbar">
          <span>
            {rows.length} leads,{" "}
            {period === "all" ? "all time" : `last ${period} days`}
          </span>
          <div className="sc-admin-activefilters">
            {Object.entries(q)
              .filter(([, v]) => v && !["all", "any"].includes(v))
              .map(([key, value]) => (
                <Link key={key} href={href({ [key]: undefined })}>
                  {key === "showTests" ? "Tests" : `${key}: ${value}`} x
                </Link>
              ))}
          </div>
          <LeadsFilters testCount={testCount} />
        </div>
        {!rows.length ? (
          <p className="sc-admin-empty">
            No leads match these filters.{" "}
            <Link href="/audit/admin/leads">Clear filters</Link>
          </p>
        ) : (
          <div className="sc-admin-card sc-admin-tablewrap">
            <table className="sc-admin-table sc-admin-leads-table">
              <thead>
                <tr>
                  {[
                    "When (SAST)",
                    "Company",
                    "Contact",
                    "Status",
                    "Qualified",
                    "Score",
                    "From ad",
                    "Next",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <LeadTableRow
                    key={`${r.kind}-${r.id}`}
                    href={r.leadPath}
                    test={r.isTest}
                  >
                    <td>{formatSast(r.firstSeen)}</td>
                    <td>
                      <strong>
                        <Link href={r.leadPath}>{r.company}</Link>
                      </strong>
                      <span className="sc-admin-subtext">{r.host}</span>
                      <SameContact contacts={r.sameContacts} />
                      {r.isTest && (
                        <span className="sc-admin-chip">test</span>
                      )}{" "}
                      {r.auditNumber > 1 && (
                        <span className="sc-admin-chip">
                          {ordinal(r.auditNumber)} audit
                        </span>
                      )}
                    </td>
                    <td>
                      {r.firstName}
                      <a
                        className="sc-admin-subtext"
                        href={`mailto:${r.email}`}
                      >
                        {r.email}
                      </a>
                    </td>
                    <td>
                      <LeadStatus status={r.status} />
                      {r.funnelrStatus && r.funnelrStatus.state !== "ok" && (
                        <small className="sc-admin-subtext sc-admin-funnelr-problem">
                          {r.funnelrStatus.state === "failed"
                            ? "Funnelr failed"
                            : "Not in Funnelr"}
                        </small>
                      )}
                      <span
                        className="sc-admin-subtext sc-admin-clamp"
                        title={r.statusReason}
                      >
                        {r.statusReason}
                      </span>
                    </td>
                    <td>
                      <Qualified decision={r.qualifiedDecision} />
                    </td>
                    <td className="sc-admin-scorecell">
                      <strong className="sc-admin-bigscore">
                        {r.score ?? "n/a"}
                      </strong>
                      <span className="sc-admin-subtext">
                        {r.band ? `${r.band} gap` : ""}
                      </span>
                    </td>
                    <td>{r.adLabel || "none recorded"}</td>
                    <td>
                      {r.status === "failed" && !r.reportPath ? (
                        <Link
                          className="btn btn-primary"
                          href={`/audit/admin/manual?${new URLSearchParams({ url: r.host, contactName: r.firstName, contactEmail: r.email, failedLead: r.id })}`}
                        >
                          Run by hand
                        </Link>
                      ) : (
                        <div className="sc-admin-ops">
                          {r.reportPath && (
                            <Link href={r.reportPath}>Report</Link>
                          )}
                          <Link href={r.leadPath}>Details</Link>
                        </div>
                      )}
                    </td>
                  </LeadTableRow>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
