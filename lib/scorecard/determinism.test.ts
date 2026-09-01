import { test } from "vitest";
import assert from "node:assert/strict";
import {
  scorecardCacheKey,
  scorecardIdentity,
  normaliseUrl,
  SCORECARD_RECORD_TTL_DAYS,
  SCORECARD_RECORD_TTL_S,
  type DeterminismInput,
} from "./determinism";

const base: DeterminismInput = {
  url: "https://www.Example-Machinery.de/",
  competitors: ["https://dosatech.de", "flowserve-dosing.com"],
  productOneLiner: "Leak detection systems for packaging lines",
};

test("normaliseUrl collapses scheme, www, case and trailing slash", () => {
  assert.equal(normaliseUrl("https://www.Example.de/"), "example.de");
  assert.equal(normaliseUrl("example.de"), "example.de");
  assert.equal(normaliseUrl("HTTP://Example.de"), "example.de");
});

test("normaliseUrl keeps a meaningful path, drops query and hash", () => {
  assert.equal(normaliseUrl("https://foo.de/about/?x=1#top"), "foo.de/about");
});

test("normaliseUrl returns empty for blank input", () => {
  assert.equal(normaliseUrl(""), "");
  assert.equal(normaliseUrl(undefined), "");
  assert.equal(normaliseUrl(null), "");
});

test("scorecardCacheKey is deterministic: identical inputs give the identical key", () => {
  assert.equal(scorecardCacheKey(base), scorecardCacheKey({ ...base }));
});

test("scorecardCacheKey is stable across trivial URL, case and whitespace differences", () => {
  const k1 = scorecardCacheKey(base);
  const k2 = scorecardCacheKey({
    url: "example-machinery.de",
    competitors: ["dosatech.de", "https://www.flowserve-dosing.com/"],
    productOneLiner: "  Leak detection systems   for packaging lines ",
  });
  assert.equal(k1, k2);
});

test("competitor order does not change the key", () => {
  const k1 = scorecardCacheKey(base);
  const k2 = scorecardCacheKey({ ...base, competitors: [...base.competitors].reverse() });
  assert.equal(k1, k2);
});

test("scorecardCacheKey changes when the run identity changes", () => {
  assert.notEqual(scorecardCacheKey(base), scorecardCacheKey({ ...base, url: "other.de" }));
  assert.notEqual(scorecardCacheKey(base), scorecardCacheKey({ ...base, competitors: ["dosatech.de", "somebody-else.com"] }));
  assert.notEqual(scorecardCacheKey(base), scorecardCacheKey({ ...base, productOneLiner: "Dosing pumps" }));
});

test("scorecardIdentity is business-keyed and normalised", () => {
  const id = scorecardIdentity(base);
  assert.ok(id.startsWith("scorecard-v4|example-machinery.de|"));
  assert.ok(id.includes("dosatech.de"));
  assert.ok(id.includes("leak detection systems for packaging lines"));
});

test("key has the scorecard-gen prefix and a fixed-length hex hash", () => {
  assert.match(scorecardCacheKey(base), /^scorecard-gen:[0-9a-f]{24}$/);
});

test("TTL constant is 180 days and the seconds value is in sync", () => {
  assert.equal(SCORECARD_RECORD_TTL_DAYS, 180);
  assert.equal(SCORECARD_RECORD_TTL_S, 180 * 24 * 60 * 60);
});
