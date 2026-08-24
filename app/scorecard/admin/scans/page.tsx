import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, isValidSession } from "@/lib/scorecard/auth";
import { readRecentScanLog, readScanCounts, type ScanOutcome } from "@/lib/scorecard/diagnostics";

export const dynamic = "force-dynamic";

// Scan diagnostics: every run's outcome, target host, detected fit and duration.
// This is what splits the funnel that used to be invisible between AuditStart
// and Lead: an abandoned wait, a broken scan, and (historically) a rejected
// link all looked identical. The audience gate is gone, so nothing is turned
// away; the "fit" column is insight only, flagging links a classifier thought
// were off-topic that we scanned anyway.

const OUTCOME_LABEL: Record<ScanOutcome, string> = {
  success: "reached teaser",
  failed: "broke",
  invalid: "bad URL",
  limited: "rate-limited",
  "out-of-scope": "rejected (legacy)",
};

function outcomeClass(o: ScanOutcome): string {
  if (o === "success") return "sc-admin-band sc-admin-band-narrow";
  if (o === "failed" || o === "out-of-scope") return "sc-admin-band sc-admin-band-wide";
  return "sc-admin-band sc-admin-band-visible";
}

export default async function ScansPage() {
  const jar = await cookies();
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value)) redirect("/scorecard/admin");

  const [log, counts] = await Promise.all([readRecentScanLog(300), readScanCounts()]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const flaggedFits = log.filter((e) => e.fit === "outside" || e.fit === "unclear");

  return (
    <section className="section">
      <div className="site-container">
        <header className="sc-admin-head">
          <h1>Scans</h1>
          <p className="sc-admin-dim">
            Every run, newest first. Links are never rejected; the fit column only flags what a classifier guessed, for
            insight. Only the most recent 300 runs are shown (counters are all-time).
          </p>
        </header>

        <div className="sc-admin-filters" style={{ marginBottom: "1.4rem" }}>
          <span>All-time:</span>
          <span>{total} runs</span>
          <span className="sc-admin-dim">reached teaser {counts.success}</span>
          <span className="sc-admin-dim">broke {counts.failed}</span>
          <span className="sc-admin-dim">rate-limited {counts.limited}</span>
          <span className="sc-admin-dim">bad URL {counts.invalid}</span>
          <span className="sc-admin-dim">rejected (legacy) {counts["out-of-scope"]}</span>
        </div>

        {flaggedFits.length > 0 ? (
          <p className="sc-admin-dim" style={{ marginBottom: "1rem" }}>
            {flaggedFits.length} recent {flaggedFits.length === 1 ? "link" : "links"} read as off-topic or unclear but were
            still scanned (no lost clicks). They are highlighted below.
          </p>
        ) : null}

        {log.length === 0 ? (
          <p className="sc-admin-empty">No scans logged yet.</p>
        ) : (
          <div className="sc-admin-tablewrap">
            <table className="sc-admin-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Website</th>
                  <th>Detected fit</th>
                  <th>Outcome</th>
                  <th>Took</th>
                </tr>
              </thead>
              <tbody>
                {log.map((e, i) => {
                  const flagged = e.fit === "outside" || e.fit === "unclear";
                  return (
                    <tr key={`${e.at}-${i}`} className={flagged ? "sc-row-hot" : undefined}>
                      <td className="sc-admin-dim">{e.at.replace("T", " ").slice(0, 16)}</td>
                      <td>
                        {e.host ? (
                          <a href={`https://${e.host}`} target="_blank" rel="noreferrer noopener">
                            {e.host}
                          </a>
                        ) : (
                          <span className="sc-admin-dim">unknown</span>
                        )}
                      </td>
                      <td className={flagged ? "sc-admin-warn" : "sc-admin-dim"}>{e.fit ?? "n/a"}</td>
                      <td>
                        <span className={outcomeClass(e.outcome)}>{OUTCOME_LABEL[e.outcome] ?? e.outcome}</span>
                      </td>
                      <td className="sc-admin-dim">{e.ms > 0 ? `${(e.ms / 1000).toFixed(1)}s` : "n/a"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
