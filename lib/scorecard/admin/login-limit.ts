import { createHash } from "node:crypto";

// Brute-force guard for the admin login (/audit/admin). Counts wrong passwords
// per visitor IP in KV (Upstash in production): after MAX_FAILURES wrong tries
// in WINDOW_SECONDS, that IP is locked out until the window expires. A correct
// password clears the counter. Pure over an injected KV so it is unit-tested.
//
// Fail-open on a KV outage: the password check still runs and the outage is
// logged, so an Upstash hiccup never locks the team out of their own admin.

export const MAX_FAILURES = 5;
export const WINDOW_SECONDS = 15 * 60;

export interface LoginLimitKv {
  get(key: string): Promise<unknown>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
  del(key: string): Promise<number>;
}

// The IP is hashed so raw visitor IPs are never stored.
export function failureKey(ip: string): string {
  return `admin-login-fail:${createHash("sha256").update(ip).digest("hex").slice(0, 32)}`;
}

export async function isLockedOut(kv: LoginLimitKv, ip: string): Promise<boolean> {
  try {
    return (Number(await kv.get(failureKey(ip))) || 0) >= MAX_FAILURES;
  } catch (err) {
    console.error("[admin-login-limit] KV read failed, allowing attempt", err);
    return false;
  }
}

export async function recordFailure(kv: LoginLimitKv, ip: string): Promise<void> {
  try {
    const key = failureKey(ip);
    if ((await kv.incr(key)) === 1) await kv.expire(key, WINDOW_SECONDS);
  } catch (err) {
    console.error("[admin-login-limit] KV write failed", err);
  }
}

export async function clearFailures(kv: LoginLimitKv, ip: string): Promise<void> {
  try {
    await kv.del(failureKey(ip));
  } catch (err) {
    console.error("[admin-login-limit] KV delete failed", err);
  }
}

// First address in x-forwarded-for (set by Vercel), else x-real-ip.
export function clientIpFrom(headers: { get(name: string): string | null }): string {
  const fwd = headers.get("x-forwarded-for");
  const first = fwd?.split(",")[0]?.trim();
  return first || headers.get("x-real-ip")?.trim() || "unknown";
}
