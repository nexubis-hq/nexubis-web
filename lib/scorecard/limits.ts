import { createHash } from "node:crypto";
import { normaliseUrl } from "./determinism";
import type { ProspectData } from "./types";

// Abuse + cost failsafes for the public generation endpoint. All counters live
// in KV (no external service). The logic is pure over an injected KV interface
// so every branch is unit-tested without a live store; the route wires the real
// Upstash client in. Re-VIEWING a report never touches any of this.

export interface LimitsKv {
  get(key: string): Promise<unknown>;
  incr(key: string): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<void>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
}

export interface LimitsConfig {
  windowDays: number; // SCORECARD_IP_WINDOW_DAYS
  targetDailyCap: number; // SCORECARD_TARGET_DAILY_CAP
  globalHourlyCap: number; // SCORECARD_GLOBAL_HOURLY_CAP
  nowMs: number; // injected so tests are deterministic
  // IPs that bypass every limit (the team testing internally). Optional;
  // empty when unset. SCORECARD_UNLIMITED_IPS.
  unlimitedIps?: ReadonlySet<string>;
}

// True when this IP is allowlisted for unlimited runs.
export function isUnlimitedIp(ip: string, cfg: LimitsConfig): boolean {
  return cfg.unlimitedIps?.has(ip) ?? false;
}

export type LimitReason = "ip" | "target" | "global";
export type LimitDecision = { allow: true } | { allow: false; reason: LimitReason; lastRef?: string };

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const hourBucket = (nowMs: number) => Math.floor(nowMs / HOUR_MS);
const dayBucket = (nowMs: number) => Math.floor(nowMs / DAY_MS);

export const ipKey = (ip: string) => `scorecard-iplimit:${ip}`;
export const ipLastKey = (ip: string) => `scorecard-iplast:${ip}`;
export const globalKey = (hour: number) => `scorecard-global:${hour}`;
export const targetKey = (hash: string, day: number) => `scorecard-target:${hash}:${day}`;

// A stable hash of the TARGET company (the prospect URL, not the competitors or
// the one-liner), so changing a competitor entry cannot dodge the per-target
// throttle.
export function targetHash(prospect: ProspectData): string {
  const basis = `website|${normaliseUrl(prospect.url)}`;
  return createHash("sha256").update(basis).digest("hex").slice(0, 24);
}

// READ-ONLY pre-check. Order matters: the global breaker first (cheapest way to
// shed load under attack), then the per-IP limit, then the per-target cap.
export async function checkGeneration(ip: string, target: string, kv: LimitsKv, cfg: LimitsConfig): Promise<LimitDecision> {
  // Allowlisted IPs skip every limit.
  if (isUnlimitedIp(ip, cfg)) return { allow: true };

  const globalCount = Number(await kv.get(globalKey(hourBucket(cfg.nowMs)))) || 0;
  if (globalCount >= cfg.globalHourlyCap) return { allow: false, reason: "global" };

  const marker = await kv.get(ipKey(ip));
  if (marker != null) return { allow: false, reason: "ip", lastRef: String(marker) };

  const targetCount = Number(await kv.get(targetKey(target, dayBucket(cfg.nowMs)))) || 0;
  if (targetCount >= cfg.targetDailyCap) return { allow: false, reason: "target" };

  return { allow: true };
}

// Count an attempt (global + target) BEFORE generation so a spike is throttled
// even if generation later fails. The per-IP marker is set separately, only
// after a real generation succeeds (markIpGenerated), so a failed run does not
// lock a real prospect out.
export async function bumpCounters(target: string, kv: LimitsKv, cfg: LimitsConfig): Promise<void> {
  const h = hourBucket(cfg.nowMs);
  const d = dayBucket(cfg.nowMs);
  const g = await kv.incr(globalKey(h));
  if (g === 1) await kv.expire(globalKey(h), Math.ceil(HOUR_MS / 1000));
  const t = await kv.incr(targetKey(target, d));
  if (t === 1) await kv.expire(targetKey(target, d), Math.ceil(DAY_MS / 1000));
}

export async function markIpGenerated(ip: string, runId: string, kv: LimitsKv, cfg: LimitsConfig): Promise<void> {
  await kv.set(ipKey(ip), runId, cfg.windowDays * 86_400);
}

// Should the team be told the breaker tripped? True at most once per hour, so a
// sustained spike does not spam the inbox.
export async function shouldNotifyBreaker(kv: LimitsKv, cfg: LimitsConfig): Promise<boolean> {
  const key = `scorecard-breaker-notified:${hourBucket(cfg.nowMs)}`;
  const already = await kv.get(key);
  if (already != null) return false;
  await kv.set(key, "1", Math.ceil(HOUR_MS / 1000));
  return true;
}

// Env-driven config, so thresholds tune without a deploy. Unlike the snapshot,
// there is no hardcoded owner IP: SCORECARD_UNLIMITED_IPS is the single
// mechanism.
export function limitsConfigFromEnv(nowMs: number): LimitsConfig {
  const num = (v: string | undefined, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  const unlimitedIps = new Set(
    (process.env.SCORECARD_UNLIMITED_IPS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  return {
    windowDays: num(process.env.SCORECARD_IP_WINDOW_DAYS, 7),
    targetDailyCap: num(process.env.SCORECARD_TARGET_DAILY_CAP, 2),
    globalHourlyCap: num(process.env.SCORECARD_GLOBAL_HOURLY_CAP, 200),
    nowMs,
    unlimitedIps,
  };
}
