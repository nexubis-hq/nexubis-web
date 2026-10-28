import type { ScanRunLog } from "../diagnostics";
import type { LeadRow } from "./leads-view";
import { runLinkId } from "./run-identity";
import type { RunLinks } from "./run-links";
import { normalHost, inLeadWindow } from "./hosts";
export const isReplay = (run: ScanRunLog) =>
  run.outcome === "success" && (run.replay ?? run.ms < 2000);
export function linkRunToLead(
  run: ScanRunLog,
  rows: LeadRow[],
  links: RunLinks = {}
): LeadRow | undefined {
  if (!["success", "failed", "timeout"].includes(run.outcome)) return;
  const explicit = links[runLinkId(run)];
  if (explicit) return rows.find((row) => row.leadPath === explicit);
  if (isReplay(run)) {
    const host = normalHost(run.host || "");
    return host
      ? rows
          .filter(
            (row) =>
              row.host === host &&
              Date.parse(row.firstSeen) <= Date.parse(run.at)
          )
          .sort((a, b) => b.firstSeen.localeCompare(a.firstSeen))[0]
      : undefined;
  }
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
