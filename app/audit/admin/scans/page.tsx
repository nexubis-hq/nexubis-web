import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, isValidSession } from "@/lib/scorecard/auth";
import { readRecentScanLog, readScanCounts } from "@/lib/scorecard/diagnostics";
import { readFunnel } from "@/lib/funnel/counter";
import { adLabel } from "@/lib/funnel/steps";
import {
  buildActivityView,
  OUTCOME_LABELS,
  runWhy,
  runSource,
  runLabel,
  isReplay,
} from "@/lib/scorecard/admin/activity-view";
import { loadLeadsView } from "@/lib/scorecard/admin/data";
import { formatSast } from "@/components/scorecard/admin/date";
export const dynamic = "force-dynamic";
export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const jar = await cookies();
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value)) redirect("/audit/admin");
  const q = await searchParams;
  const days = q.period === "7" ? 7 : q.period === "30" ? 30 : 14;
  const source = q.source === "other" ? "other" : "ad";
  const showTests = q.showTests === "1";
  const [log, counts, funnel, leads] = await Promise.all([
    readRecentScanLog(500),
    readScanCounts(),
    readFunnel(days),
    loadLeadsView({ period: "all", showTests: true }),
  ]);
  const view = buildActivityView(
    funnel,
    log,
    days,
    source,
    showTests,
    leads.now,
    leads.allRows
  );
  const periodLog = view.allPeriodRuns;
  const runs = periodLog.filter((r) =>
    q.runs === "problems"
      ? r.outcome !== "success"
      : q.runs === "ad"
        ? runSource(r) === "ad"
        : true
  );
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...q, ...patch })) if (v) p.set(k, v);
    return `/audit/admin/scans?${p}`;
  };
  const ratio = (n: number, d: number) =>
    d ? `${Math.round((n / d) * 100)}%` : "0%";
  const topReasons = (outcomes: string[]) => {
    const map = new Map<string, number>();
    for (const r of view.runs.filter((r) => outcomes.includes(r.outcome)))
      map.set(runWhy(r), (map.get(runWhy(r)) || 0) + 1);
    return [...map]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([reason, n]) => `${n}: ${reason}`)
      .join("; ");
  };
  return (
    <section className="section">
      <div className="site-container">
        <header className="sc-admin-head">
          <div>
            <h1>Activity</h1>
            <p>
              What happens on nexubis.io/audit. Leads are the people. This page
              is the traffic: how many came, how far they got, and every audit
              run with what happened to it.
            </p>
          </div>
        </header>
        <div className="sc-admin-explainers">
          {[
            [
              "Visited",
              "Opened the audit page; for ads, compare with Meta link clicks.",
            ],
            [
              "Started the form / Submitted",
              "Clicked into the form / pressed Run with a valid email.",
            ],
            [
              "Report ready",
              "The scan finished and the person got their report.",
            ],
          ].map(([h, t]) => (
            <div className="sc-admin-card" key={h}>
              <h2>{h}</h2>
              <p className="sc-admin-dim">{t}</p>
            </div>
          ))}
        </div>
        <div className="sc-admin-filters">
          <span>Traffic</span>
          {[
            ["ad", "From ads"],
            ["other", "Other"],
          ].map(([v, t]) => (
            <Link
              key={v}
              className={source === v ? "is-active" : ""}
              href={href({ source: v })}
            >
              {t}
            </Link>
          ))}
          <span>Period</span>
          {[7, 14, 30].map((v) => (
            <Link
              key={v}
              href={href({ period: String(v) })}
              className={days === v ? "is-active" : ""}
            >
              {v} days
            </Link>
          ))}
        </div>
        <section className="sc-admin-card">
          <h2>Audit funnel</h2>
          <div className="sc-admin-funnel">
            {[
              ["Visited", view.totals.visited, "Opened the audit page"],
              [
                "Started the form",
                view.totals.started,
                `${ratio(view.totals.started, view.totals.visited)} of visitors`,
              ],
              [
                "Submitted",
                view.totals.submitted,
                `${ratio(view.totals.submitted, view.totals.started)} of starters`,
              ],
              [
                "Report ready",
                view.totals.ready,
                `${view.outcomes.failed + view.outcomes.timeout} failed (see below)`,
              ],
            ].map(([label, n, text]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{n}</strong>
                <div className="sc-admin-bar">
                  <span
                    style={{
                      width: `${view.totals.visited ? Math.min(100, (Number(n) / view.totals.visited) * 100) : 0}%`,
                    }}
                  />
                </div>
                <small>{text}</small>
              </div>
            ))}
          </div>
          <details>
            <summary>Daily numbers</summary>
            <div className="sc-admin-tablewrap">
              <table className="sc-admin-table">
                <thead>
                  <tr>
                    {[
                      "Day (SAST)",
                      "Visited",
                      "Started",
                      "Submitted",
                      "Report ready",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {view.daily.map((r) => (
                    <tr key={r.day}>
                      <td>{r.day}</td>
                      <td>{r.visited}</td>
                      <td>{r.started}</td>
                      <td>{r.submitted}</td>
                      <td>{r.ready}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
        <header className="sc-admin-toolbar">
          <h2>Audit runs</h2>
          <div className="sc-admin-filters">
            {[
              ["all", "All"],
              ["problems", "Problems only"],
              ["ad", "From ads"],
            ].map(([v, t]) => (
              <Link
                className={(q.runs || "all") === v ? "is-active" : ""}
                href={href({ runs: v })}
                key={v}
              >
                {t}
              </Link>
            ))}
            <Link
              href={href({ showTests: showTests ? undefined : "1" })}
              aria-pressed={showTests}
            >
              Show tests {showTests ? "on" : "off"}
            </Link>
          </div>
        </header>
        <div className="sc-admin-tiles">
          {[
            ["Report ready", view.outcomes.success, ""],
            [
              "Scan failed",
              view.outcomes.failed + view.outcomes.timeout,
              topReasons(["failed", "timeout"]),
            ],
            [
              "Stopped before scanning",
              view.outcomes.invalid + view.outcomes["out-of-scope"],
              topReasons(["invalid", "out-of-scope"]),
            ],
            ["Rate limit hit", view.outcomes.limited, ""],
          ].map(([label, n, why], i) => (
            <div
              key={label}
              className={`sc-admin-card sc-admin-tile ${i === 1 && Number(n) > 0 ? "sc-admin-danger" : ""}`}
            >
              <span>{label}</span>
              <strong>{n}</strong>
              <small>{why}</small>
            </div>
          ))}
        </div>
        <p className="sc-admin-dim">
          {view.repeatViews} repeat views not counted
        </p>
        <p className="sc-admin-dim">
          Tiles and funnel: {source === "ad" ? "from ads" : "other traffic"},
          last {days} days. Run filters below cover all traffic. Visited,
          Started and Submitted are anonymous totals and include tests.
        </p>
        <div className="sc-admin-card sc-admin-tablewrap">
          <table className="sc-admin-table sc-admin-runs-table">
            <thead>
              <tr>
                {[
                  "When (SAST)",
                  "Website",
                  "Result",
                  "Why",
                  "Lead",
                  "From ad",
                  "Took",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.map((r, i) => {
                const lead = r.lead;
                const leadPath = lead?.leadPath;
                return (
                  <tr key={i} className={r.isTest ? "sc-admin-testrow" : ""}>
                    <td>{formatSast(r.at)}</td>
                    <td>{r.host || "unknown"}</td>
                    <td>
                      <span
                        className={`sc-admin-chip sc-admin-status-${isReplay(r) ? "hand" : r.outcome === "success" ? "ready" : r.outcome === "failed" || r.outcome === "timeout" ? "failed" : "hand"}`}
                      >
                        {runLabel(r)}
                      </span>
                    </td>
                    <td>{runWhy(r)}</td>
                    <td>
                      {leadPath ? (
                        <Link href={leadPath}>
                          {lead?.firstName || lead?.company || "Lead"}
                        </Link>
                      ) : (
                        "no lead"
                      )}
                    </td>
                    <td>{adLabel(r.ad) || "none recorded"}</td>
                    <td>{(r.ms / 1000).toFixed(1)}s</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!runs.length && (
            <p className="sc-admin-empty">No runs match these filters.</p>
          )}
        </div>
        <p className="sc-admin-dim">
          Runs are kept for 30 days. All-time (includes tests and repeat views):{" "}
          {Object.entries(OUTCOME_LABELS)
            .map(
              ([key, label]) =>
                `${label}: ${counts[key as keyof typeof counts] || 0}`
            )
            .join(", ")}
        </p>
      </div>
    </section>
  );
}
