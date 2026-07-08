import { test } from "vitest";
import assert from "node:assert/strict";
import {
  checkGeneration,
  bumpCounters,
  markIpGenerated,
  shouldNotifyBreaker,
  targetHash,
  type LimitsKv,
  type LimitsConfig,
} from "./limits";
import type { ProspectData } from "./types";

// In-memory KV that honours incr and overwrite-on-set (TTL is irrelevant for the
// logic under test, since we drive time via cfg.nowMs).
function memKv(): LimitsKv {
  const m = new Map<string, string>();
  return {
    get: async (k) => (m.has(k) ? m.get(k)! : null),
    incr: async (k) => {
      const next = (Number(m.get(k)) || 0) + 1;
      m.set(k, String(next));
      return next;
    },
    expire: async () => undefined,
    set: async (k, v) => {
      m.set(k, v);
    },
  };
}

const cfg: LimitsConfig = { windowDays: 7, targetDailyCap: 2, globalHourlyCap: 3, nowMs: 1_750_000_000_000 };
const prospect: ProspectData = {
  name: "",
  role: "",
  company: "Example Machinery",
  url: "https://example-machinery.de",
  productOneLiner: "Dosing systems",
  competitors: [{ raw: "dosatech.de" }, { raw: "flowserve-dosing.com" }],
};

test("targetHash is stable for the same company and ignores competitors and one-liner", () => {
  const a = targetHash({ ...prospect, productOneLiner: "Dosing systems" });
  const b = targetHash({ ...prospect, productOneLiner: "Other words", url: "http://www.example-machinery.de/", competitors: [{ raw: "x.com" }, { raw: "y.com" }] });
  assert.equal(a, b);
  const other = targetHash({ ...prospect, url: "https://other.de" });
  assert.notEqual(a, other);
});

test("a fresh IP is allowed; a second generation within the window is blocked, but viewing is untouched", async () => {
  const kv = memKv();
  const ip = "102.0.0.1";
  const target = targetHash(prospect);

  const first = await checkGeneration(ip, target, kv, cfg);
  assert.equal(first.allow, true);

  await bumpCounters(target, kv, cfg);
  await markIpGenerated(ip, "run-1", kv, cfg);

  const second = await checkGeneration(ip, target, kv, cfg);
  assert.equal(second.allow, false);
  if (!second.allow) {
    assert.equal(second.reason, "ip");
    assert.equal(second.lastRef, "run-1"); // the limit response can link to it
  }
  // Viewing a report does not go through limits at all: a different IP for the
  // same company is still allowed (subject only to the per-target cap).
  const otherIp = await checkGeneration("203.0.0.9", target, kv, cfg);
  assert.equal(otherIp.allow, true);
});

test("the same target is capped per day (third attempt blocked)", async () => {
  const kv = memKv();
  const target = targetHash(prospect);
  // two genuine generations from two different IPs
  assert.equal((await checkGeneration("ip-a", target, kv, cfg)).allow, true);
  await bumpCounters(target, kv, cfg);
  assert.equal((await checkGeneration("ip-b", target, kv, cfg)).allow, true);
  await bumpCounters(target, kv, cfg);
  // third different IP, same company, same day: target cap hit
  const third = await checkGeneration("ip-c", target, kv, cfg);
  assert.equal(third.allow, false);
  if (!third.allow) assert.equal(third.reason, "target");
});

test("the global breaker trips past the hourly cap", async () => {
  const kv = memKv();
  // cap is 3: three generations of distinct targets from distinct IPs
  for (let i = 0; i < 3; i++) {
    const target = targetHash({ ...prospect, url: `https://biz-${i}.de` });
    const d = await checkGeneration(`ip-${i}`, target, kv, cfg);
    assert.equal(d.allow, true);
    await bumpCounters(target, kv, cfg);
  }
  const blocked = await checkGeneration("ip-x", targetHash({ ...prospect, url: "https://biz-x.de" }), kv, cfg);
  assert.equal(blocked.allow, false);
  if (!blocked.allow) assert.equal(blocked.reason, "global");
});

test("an allowlisted IP bypasses every limit", async () => {
  const kv = memKv();
  const target = targetHash(prospect);
  const unlimited: LimitsConfig = { ...cfg, unlimitedIps: new Set(["41.10.10.10"]) };
  // Conditions that would block any normal IP: the IP's own marker is set, and
  // the target is at its daily cap.
  await markIpGenerated("41.10.10.10", "prev", kv, unlimited);
  await bumpCounters(target, kv, unlimited);
  await bumpCounters(target, kv, unlimited);
  assert.equal((await checkGeneration("9.9.9.9", target, kv, unlimited)).allow, false);
  assert.equal((await checkGeneration("41.10.10.10", target, kv, unlimited)).allow, true);
});

test("breaker notification fires at most once per hour", async () => {
  const kv = memKv();
  assert.equal(await shouldNotifyBreaker(kv, cfg), true);
  assert.equal(await shouldNotifyBreaker(kv, cfg), false);
  // next hour: allowed again
  assert.equal(await shouldNotifyBreaker(kv, { ...cfg, nowMs: cfg.nowMs + 3_600_000 }), true);
});
