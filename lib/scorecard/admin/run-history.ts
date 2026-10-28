import { getKv } from "../kv";
import { prospectScores } from "../result";
import type { SharedScorecard } from "../share";
export interface RunHistoryEntry {
  at: string;
  score: number | null;
  band: string;
  by: "visitor" | "admin" | "manual";
  kind: "first run" | "re-run";
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
  return rows.length ? rows : shared ? [{ ...derivedRun(shared), by: fallbackBy }] : [];
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
      await kv.lpush(key, derivedRun(previous));
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
