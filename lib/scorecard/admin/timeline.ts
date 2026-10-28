import type { ScanRunLog } from "../diagnostics";
import type { FailedLead } from "./failed-leads";
import type { RunHistoryEntry } from "./run-history";
import { isReplay, runLabel, runWhy } from "./activity-view";
import { adLabel } from "@/lib/funnel/steps";
export interface TimelineItem {
  at: string;
  text: string;
}
export function auditTimeline(
  history: RunHistoryEntry[],
  logs: ScanRunLog[],
  failure?: FailedLead
): TimelineItem[] {
  const consumed = new Set<ScanRunLog>();
  const sameRun = (a: string, b: string) =>
    Math.abs(Date.parse(a) - Date.parse(b)) <= 2 * 60000;
  const ready = (run: ScanRunLog) =>
    `Ran the audit${adLabel(run.ad) ? `, from ${adLabel(run.ad)}` : ""}: report ready in ${(run.ms / 1000).toFixed(1)}s`;
  const items = history.map((entry, i) => {
    const run =
      entry.kind === "first run" && entry.by === "visitor"
        ? logs
            .filter(
              (run) =>
                run.outcome === "success" &&
                !isReplay(run) &&
                !consumed.has(run) &&
                sameRun(run.at, entry.at)
            )
            .sort(
              (a, b) =>
                Math.abs(Date.parse(a.at) - Date.parse(entry.at)) -
                Math.abs(Date.parse(b.at) - Date.parse(entry.at))
            )[0]
        : undefined;
    if (run) {
      consumed.add(run);
      return { at: run.at, text: ready(run) };
    }
    return {
      at: entry.at,
      text:
        entry.kind === "re-run (before history was kept)"
          ? `Re-run (before history was kept): ${entry.score ?? "n/a"}/100`
          : entry.by === "manual" && entry.kind === "first run"
            ? "Manual audit made"
            : entry.kind === "first run"
              ? `First run by ${entry.by}${entry.score === null ? " (score not recorded)" : ""}`
              : `Audit re-run from ${entry.by}: ${history[i + 1]?.score ?? "n/a"} to ${entry.score ?? "n/a"}`,
    };
  });
  for (const run of logs)
    if (!consumed.has(run))
      items.push({
        at: run.at,
        text: isReplay(run)
          ? `Came back via ${adLabel(run.ad) || "no ad recorded"} and saw their existing report again`
          : run.outcome === "success"
            ? ready(run)
            : `${runLabel(run)}${runWhy(run) ? `: ${runWhy(run)}` : ""}`,
      });
  if (
    failure &&
    !logs.some(
      (run) => run.outcome === failure.outcome && sameRun(run.at, failure.at)
    )
  )
    items.push({
      at: failure.at,
      text: `Scan failed: ${failure.reason || failure.siteRead || "site could not be read"}`,
    });
  return items.sort((a, b) => b.at.localeCompare(a.at));
}
