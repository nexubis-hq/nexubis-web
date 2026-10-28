import { getKv } from "../kv";
import { prospectScores } from "../result";
import type { SharedScorecard } from "../share";
export interface RunHistoryEntry {
  at: string;
  score: number | null;
  band: string;
  by: "visitor" | "admin" | "manual";
  kind: "first run" | "re-run" | "re-run (before history was kept)";
}
export const runHistoryKey = (slug: string) => `scorecard-run-history:${slug}`;
export function derivedRun(shared: SharedScorecard): RunHistoryEntry {
  return {
    at: shared.result.generatedAt || shared.createdAt,
    score: prospectScores(shared.result)?.overall ?? null,
    band: shared.result.verdict.band,
    by: "visitor",
    kind: "first run",
  };
}
export function derivedRunHistory(
  shared: SharedScorecard,
  fallbackBy: RunHistoryEntry["by"] = "visitor"
): RunHistoryEntry[] {
  const current = derivedRun(shared);
  if (Date.parse(current.at) - Date.parse(shared.createdAt) > 10 * 60000) {
    return [
      { ...current, by: "admin", kind: "re-run (before history was kept)" },
      {
        at: shared.createdAt,
        score: null,
        band: "",
        by: fallbackBy,
        kind: "first run",
      },
    ];
  }
  return [{ ...current, at: shared.createdAt, by: fallbackBy }];
}
export function reportRunCount(
  history: RunHistoryEntry[],
  storedCount: number,
  shared: SharedScorecard
): number {
  return Math.max(
    history.length,
    storedCount,
    derivedRunHistory(shared).length
  );
}
export async function readRunHistory(
  slug: string,
  shared?: SharedScorecard,
  fallbackBy: RunHistoryEntry["by"] = "visitor"
): Promise<RunHistoryEntry[]> {
  const rows = await getKv().lrange<RunHistoryEntry>(
    runHistoryKey(slug),
    0,
    49
  );
  return rows.length
    ? rows
    : shared
      ? derivedRunHistory(shared, fallbackBy)
      : [];
}
export async function appendRunHistory(
  slug: string,
  shared: SharedScorecard,
  by: RunHistoryEntry["by"],
  kind: RunHistoryEntry["kind"],
  previous?: SharedScorecard
): Promise<void> {
  try {
    const kv = getKv();
    const key = runHistoryKey(slug);
    const ttl = Math.max(
      1,
      Math.ceil((Date.parse(shared.expiresAt) - Date.now()) / 1000)
    );
    if (previous && !(await kv.lrange(key, 0, 0)).length)
      for (const entry of derivedRunHistory(previous).reverse())
        await kv.lpush(key, entry);
    await kv.lpush(key, {
      ...derivedRun(shared),
      at: new Date().toISOString(),
      by,
      kind,
    });
    await kv.ltrim(key, 0, 49);
    await kv.expire(key, ttl);
  } catch (error) {
    console.error("[audit-admin] run history failed:", error);
  }
}
