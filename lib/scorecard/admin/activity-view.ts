import type { FunnelDayRow } from "@/lib/funnel/counter";
import { adLabel, type FunnelSource } from "@/lib/funnel/steps";
import type { ScanOutcome, ScanRunLog } from "../diagnostics";
import { inLeadWindow, normalHost, type LeadRow } from "./leads-view";
import { isTestContact } from "./test-contacts";
export const OUTCOME_LABELS: Record<ScanOutcome, string> = {
  success: "Report ready",
  failed: "Scan failed",
  timeout: "Took too long",
  invalid: "Stopped",
  limited: "Rate limit hit",
  "out-of-scope": "Rejected (old rule)",
};
export const isReplay = (run: ScanRunLog) =>
  run.outcome === "success" && (run.replay ?? run.ms < 2000);
export const runLabel = (run: ScanRunLog) =>
  isReplay(run) ? "Same report shown again" : OUTCOME_LABELS[run.outcome];
export const runWhy = (run: ScanRunLog) => {
  if (isReplay(run))
    return "Same email and website as an earlier run; their existing report was shown again.";
  if (run.outcome === "success") {
    const decision = run.qualifiedDecision;
    return decision
      ? decision.qualified
        ? "Qualified: yes"
        : `Qualified: no (${decision.reason})`
      : "";
  }
  return (
    run.reason ||
    run.siteRead ||
    (["failed", "timeout", "invalid", "limited"].includes(run.outcome)
      ? "reason not recorded (before this update)"
      : "")
  );
};
export function linkRunToLead(
  run: ScanRunLog,
  rows: LeadRow[]
): LeadRow | undefined {
  if (!["success", "failed", "timeout"].includes(run.outcome)) return;
  if (run.slug) {
    const lead = rows.find(
      (row) => row.kind === "report" && row.id === run.slug
    );
    if (lead) return lead;
  }
  const host = normalHost(run.host || "");
  if (!host) return;
  // An explicit email must never inherit a different person's test status or link.
  const candidates = rows.filter(
    (row) =>
      row.host === host &&
      (!run.email?.trim() ||
        row.email.trim().toLowerCase() === run.email.trim().toLowerCase())
  );
  const closest = (matches: LeadRow[]) =>
    matches.sort(
      (a, b) =>
        Math.abs(Date.parse(a.firstSeen) - Date.parse(run.at)) -
        Math.abs(Date.parse(b.firstSeen) - Date.parse(run.at))
    )[0];
  return (
    closest(
      candidates.filter(
        (row) =>
          row.kind === "failed" &&
          Math.abs(Date.parse(row.firstSeen) - Date.parse(run.at)) <= 2 * 60000
      )
    ) ||
    closest(candidates.filter((row) => inLeadWindow(run.at, row.firstSeen)))
  );
}
export function activityRun(run: ScanRunLog, rows: LeadRow[]) {
  const lead = linkRunToLead(run, rows);
  return {
    ...run,
    lead,
    isTest:
      isTestContact(run.email) || (!run.email?.trim() && Boolean(lead?.isTest)),
  };
}
export const runSource = (run: ScanRunLog): FunnelSource =>
  run.source ?? (adLabel(run.ad) ? "ad" : "other");
const dayOf = (at: string) =>
  new Date(Date.parse(at) + 7200000).toISOString().slice(0, 10);
export function buildActivityView(
  funnel: FunnelDayRow[],
  log: ScanRunLog[],
  days: 7 | 14 | 30 = 14,
  source: FunnelSource = "ad",
  showTests = false,
  now = Date.now(),
  leads: LeadRow[] = []
) {
  const today = dayOf(new Date(now).toISOString());
  const first = dayOf(new Date(now - (days - 1) * 86400000).toISOString());
  const allPeriodRuns = log
    .map((run) => activityRun(run, leads))
    .filter((r) => {
      const d = dayOf(r.at);
      return d >= first && d <= today && (showTests || !r.isTest);
    })
    .sort((a, b) => b.at.localeCompare(a.at));
  const periodRuns = allPeriodRuns.filter((run) => runSource(run) === source);
  const daily = Array.from({ length: days }, (_, i) => {
    const day = dayOf(new Date(now - i * 86400000).toISOString());
    const row = funnel.find((r) => r.day === day);
    return {
      day,
      visited: row?.counts.arrived[source] ?? 0,
      started: row?.counts.touched[source] ?? 0,
      submitted: row?.counts.submitted[source] ?? 0,
      ready: periodRuns.filter(
        (r) => r.outcome === "success" && !isReplay(r) && dayOf(r.at) === day
      ).length,
    };
  });
  const totals = daily.reduce(
    (a, r) => ({
      visited: a.visited + r.visited,
      started: a.started + r.started,
      submitted: a.submitted + r.submitted,
      ready: a.ready + r.ready,
    }),
    { visited: 0, started: 0, submitted: 0, ready: 0 }
  );
  const outcomes = Object.fromEntries(
    Object.keys(OUTCOME_LABELS).map((key) => [
      key,
      periodRuns.filter((r) => r.outcome === key && !isReplay(r)).length,
    ])
  ) as Record<ScanOutcome, number>;
  return {
    allPeriodRuns,
    repeatViews: periodRuns.filter(isReplay).length,
    daily,
    totals,
    outcomes,
    runs: periodRuns.sort((a, b) => b.at.localeCompare(a.at)),
  };
}
