import type { FunnelDayRow } from "@/lib/funnel/counter";
import { adLabel, type FunnelSource } from "@/lib/funnel/steps";
import type { ScanOutcome, ScanRunLog } from "../diagnostics";
import { isTestContact } from "./test-contacts";
export const OUTCOME_LABELS: Record<ScanOutcome, string> = {
  success: "Report ready",
  failed: "Scan failed",
  timeout: "Took too long",
  invalid: "Stopped",
  limited: "Rate limit hit",
  "out-of-scope": "Rejected (old rule)",
};
export const runWhy = (run: ScanRunLog) =>
  run.reason || run.siteRead || "reason not recorded (before this update)";
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
  now = Date.now()
) {
  const today = dayOf(new Date(now).toISOString());
  const first = dayOf(new Date(now - (days - 1) * 86400000).toISOString());
  const periodRuns = log.filter((r) => {
    const d = dayOf(r.at);
    return (
      d >= first &&
      d <= today &&
      runSource(r) === source &&
      (showTests || !isTestContact(r.email))
    );
  });
  const daily = Array.from({ length: days }, (_, i) => {
    const day = dayOf(new Date(now - i * 86400000).toISOString());
    const row = funnel.find((r) => r.day === day);
    return {
      day,
      visited: row?.counts.arrived[source] ?? 0,
      started: row?.counts.touched[source] ?? 0,
      submitted: row?.counts.submitted[source] ?? 0,
      ready: periodRuns.filter(
        (r) => r.outcome === "success" && dayOf(r.at) === day
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
      periodRuns.filter((r) => r.outcome === key).length,
    ])
  ) as Record<ScanOutcome, number>;
  return {
    daily,
    totals,
    outcomes,
    runs: periodRuns.sort((a, b) => b.at.localeCompare(a.at)),
  };
}
