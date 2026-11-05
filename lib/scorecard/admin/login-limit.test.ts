import { test } from "vitest";
import assert from "node:assert/strict";
import {
  MAX_FAILURES,
  WINDOW_SECONDS,
  clearFailures,
  clientIpFrom,
  failureKey,
  isLockedOut,
  recordFailure,
  type LoginLimitKv,
} from "./login-limit";

function fakeKv() {
  const values = new Map<string, number>();
  const ttls = new Map<string, number>();
  const kv: LoginLimitKv = {
    async get(key) { return values.get(key) ?? null; },
    async incr(key) { const n = (values.get(key) ?? 0) + 1; values.set(key, n); return n; },
    async expire(key, s) { ttls.set(key, s); return 1; },
    async del(key) { const had = values.delete(key); return had ? 1 : 0; },
  };
  return { kv, values, ttls };
}

test("an IP is locked out after 5 wrong passwords, not before", async () => {
  const { kv } = fakeKv();
  for (let i = 1; i < MAX_FAILURES; i++) {
    await recordFailure(kv, "1.2.3.4");
    assert.equal(await isLockedOut(kv, "1.2.3.4"), false, `after ${i} failures`);
  }
  await recordFailure(kv, "1.2.3.4");
  assert.equal(await isLockedOut(kv, "1.2.3.4"), true);
  // Other visitors are unaffected.
  assert.equal(await isLockedOut(kv, "5.6.7.8"), false);
});

test("the lockout window is set once, on the first failure", async () => {
  const { kv, ttls } = fakeKv();
  await recordFailure(kv, "1.2.3.4");
  assert.equal(ttls.get(failureKey("1.2.3.4")), WINDOW_SECONDS);
  ttls.clear();
  await recordFailure(kv, "1.2.3.4");
  assert.equal(ttls.size, 0, "later failures must not extend the window");
});

test("a correct password clears the counter", async () => {
  const { kv } = fakeKv();
  for (let i = 0; i < MAX_FAILURES; i++) await recordFailure(kv, "1.2.3.4");
  await clearFailures(kv, "1.2.3.4");
  assert.equal(await isLockedOut(kv, "1.2.3.4"), false);
});

test("raw IPs are never stored", () => {
  assert.doesNotMatch(failureKey("1.2.3.4"), /1\.2\.3\.4/);
});

test("a KV outage never locks the team out", async () => {
  const broken: LoginLimitKv = {
    get: async () => { throw new Error("down"); },
    incr: async () => { throw new Error("down"); },
    expire: async () => { throw new Error("down"); },
    del: async () => { throw new Error("down"); },
  };
  assert.equal(await isLockedOut(broken, "1.2.3.4"), false);
  await recordFailure(broken, "1.2.3.4");
  await clearFailures(broken, "1.2.3.4");
});

test("client IP comes from the first x-forwarded-for entry", () => {
  const h = (m: Record<string, string>) => ({ get: (n: string) => m[n] ?? null });
  assert.equal(clientIpFrom(h({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" })), "9.9.9.9");
  assert.equal(clientIpFrom(h({ "x-real-ip": "8.8.8.8" })), "8.8.8.8");
  assert.equal(clientIpFrom(h({})), "unknown");
});
