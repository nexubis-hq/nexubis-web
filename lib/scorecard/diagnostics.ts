import { getKv } from "./kv";

// Diagnosis-only scan telemetry. The Meta side only has AuditStart (scan began)
// and Lead (gate converted); everything between is invisible, so we cannot tell
// an abandoned wait from a broken scan. This records, per run, the outcome and
// how long it took, server-side. It is internal only: never a Meta event, never
// a custom conversion. Failures here must never break a real scan.

export type ScanOutcome = "success" | "invalid" | "out-of-scope" | "limited" | "failed";

export interface ScanRunLog {
  outcome: ScanOutcome;
  /** Wall-clock milliseconds from scan start to this terminal state. */
  ms: number;
  /** Target host only (no path, no query): the public domain that was checked. */
  host: string | null;
  /** What the classifier thought the site was (manufacturer/adjacent/outside/
   *  unclear). Recorded for insight only; it no longer gates anything. Null when
   *  detection did not run (e.g. an invalid URL). */
  fit?: string | null;
  /** ISO timestamp of the terminal state. */
  at: string;
}

const LOG_KEY = "scorecard-scan-log";
const LOG_CAP = 500; // keep the most recent N runs
const LOG_TTL_S = 30 * 24 * 60 * 60; // 30 days
const COUNT_PREFIX = "scorecard-scan-count:";

// The host of the checked site, for grouping (one site failing repeatedly reads
// very differently from every site failing). Never the full URL: keep it lean.
export function scanTargetHost(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(withScheme).hostname.replace(/^www\./i, "") || null;
  } catch {
    return null;
  }
}

export async function recordScanOutcome(entry: ScanRunLog): Promise<void> {
  try {
    const kv = getKv();
    await kv.lpush(LOG_KEY, entry);
    await kv.ltrim(LOG_KEY, 0, LOG_CAP - 1);
    await kv.expire(LOG_KEY, LOG_TTL_S);
    await kv.incr(COUNT_PREFIX + entry.outcome);
  } catch (err) {
    // Telemetry is best-effort: a broken store must never take the scan down.
    console.error("[scorecard-diag] outcome log failed:", err instanceof Error ? err.message : err);
  }
}

export async function readRecentScanLog(limit = 100): Promise<ScanRunLog[]> {
  try {
    return await getKv().lrange<ScanRunLog>(LOG_KEY, 0, Math.max(0, limit - 1));
  } catch {
    return [];
  }
}

export async function readScanCounts(): Promise<Record<ScanOutcome, number>> {
  const outcomes: ScanOutcome[] = ["success", "invalid", "out-of-scope", "limited", "failed"];
  const counts = {} as Record<ScanOutcome, number>;
  await Promise.all(
    outcomes.map(async (o) => {
      counts[o] = Number((await getKv().get<number>(COUNT_PREFIX + o).catch(() => 0)) ?? 0);
    }),
  );
  return counts;
}
