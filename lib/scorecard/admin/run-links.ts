import { getKv } from "../kv";
import type { ScanRunLog } from "../diagnostics";
export type RunLinks = Record<string, string>;
export const runLinkId = (run: Pick<ScanRunLog, "at" | "host">) =>
  `${run.at}|${run.host || ""}`;
export const runLinkKey = (run: Pick<ScanRunLog, "at" | "host">) =>
  `scorecard-run-link:${runLinkId(run)}`;
export async function readRunLinks(log: ScanRunLog[]): Promise<RunLinks> {
  const kv = getKv();
  return Object.fromEntries(
    (
      await Promise.all(
        log
          .filter(
            (run) => run.outcome === "failed" || run.outcome === "timeout"
          )
          .map(
            async (run) =>
              [runLinkId(run), await kv.get<string>(runLinkKey(run))] as const
          )
      )
    ).filter((entry): entry is readonly [string, string] => Boolean(entry[1]))
  );
}
export async function saveRunLink(
  run: ScanRunLog,
  leadPath: string | null
): Promise<void> {
  if (!["failed", "timeout"].includes(run.outcome))
    throw new Error("Only failed or timeout runs can be linked.");
  const remaining = Math.min(
    30 * 86400,
    Math.ceil((Date.parse(run.at) + 30 * 86400000 - Date.now()) / 1000)
  );
  if (!Number.isFinite(remaining) || remaining <= 0)
    throw new Error("This run is older than 30 days.");
  if (
    leadPath &&
    !/^\/audit\/admin\/(?:failed\/)?[a-zA-Z0-9_-]+$/.test(leadPath)
  )
    throw new Error("Invalid lead.");
  if (leadPath)
    await getKv().set(runLinkKey(run), leadPath, { ex: 30 * 86400 });
  else await getKv().del(runLinkKey(run));
}
