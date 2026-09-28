import { getKv } from "@/lib/scorecard/kv";
import { FUNNEL_STEPS, type FunnelSource, type FunnelStep } from "./steps";

const TTL_SECONDS = 400 * 24 * 60 * 60;
const TZ = "Africa/Johannesburg";
const dayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

export function funnelDay(date = new Date()): string {
  return dayFormatter.format(date);
}

export function funnelKey(day: string, step: FunnelStep, source: FunnelSource): string {
  return `audit-funnel:${day}:${step}:${source}`;
}

export async function bumpFunnel(step: FunnelStep, source: FunnelSource): Promise<void> {
  try {
    const kv = getKv();
    const key = funnelKey(funnelDay(), step, source);
    if ((await kv.incr(key)) === 1) await kv.expire(key, TTL_SECONDS);
  } catch (err) {
    console.error("[audit-funnel] bump failed:", err instanceof Error ? err.message : err);
  }
}

type FunnelCounts = Record<FunnelStep, Record<FunnelSource, number>>;
export interface FunnelDayRow { day: string; counts: FunnelCounts }

function emptyCounts(): FunnelCounts {
  return { arrived: { ad: 0, other: 0 }, touched: { ad: 0, other: 0 }, submitted: { ad: 0, other: 0 } };
}

export async function readFunnel(days = 14): Promise<FunnelDayRow[]> {
  const count = Math.max(0, Math.floor(days));
  const now = Date.now();
  const rows = Array.from({ length: count }, (_, i) => ({ day: funnelDay(new Date(now - i * 86_400_000)), counts: emptyCounts() }));
  try {
    const kv = getKv();
    await Promise.all(
      rows.flatMap((row) =>
        FUNNEL_STEPS.flatMap((step) =>
          (["ad", "other"] as const).map(async (source) => {
            row.counts[step][source] = Number((await kv.get<number>(funnelKey(row.day, step, source))) ?? 0);
          }),
        ),
      ),
    );
  } catch (err) {
    console.error("[audit-funnel] read failed:", err instanceof Error ? err.message : err);
  }
  return rows;
}
