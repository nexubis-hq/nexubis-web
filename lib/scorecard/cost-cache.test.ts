import { test, vi, beforeEach } from "vitest";
import assert from "node:assert/strict";

// In-memory KV so cachedJson (the cost-cache primitive threaded through the AI
// wrapper) can be tested without a live store. vi.hoisted keeps the map
// available to the hoisted mock factory.
const { store } = vi.hoisted(() => ({ store: new Map<string, unknown>() }));
vi.mock("./kv", () => ({
  getKv: () => ({
    get: async (k: string) => (store.has(k) ? store.get(k) : null),
    set: async (k: string, v: unknown) => {
      store.set(k, v);
    },
  }),
}));

import { cachedJson, searchCacheKey } from "./determinism";

beforeEach(() => store.clear());

test("identical inputs hit the cache: the producer (pipeline) runs once", async () => {
  let calls = 0;
  const produce = async () => {
    calls++;
    return { n: 42 };
  };
  const a = await cachedJson("call-1", 100, produce);
  const b = await cachedJson("call-1", 100, produce);
  assert.deepEqual(a, { n: 42 });
  assert.deepEqual(b, { n: 42 });
  assert.equal(calls, 1);
});

test("a different call key re-runs the producer", async () => {
  let calls = 0;
  await cachedJson("call-1", 100, async () => {
    calls++;
    return 1;
  });
  await cachedJson("call-2", 100, async () => {
    calls++;
    return 2;
  });
  assert.equal(calls, 2);
});

test("fresh bypasses the cache (forced regeneration)", async () => {
  let calls = 0;
  const produce = async () => {
    calls++;
    return calls;
  };
  await cachedJson("call", 100, produce);
  await cachedJson("call", 100, produce, { fresh: true });
  assert.equal(calls, 2);
});

test("searchCacheKey namespaces a call under its run envelope and exact query", () => {
  const k1 = searchCacheKey("scorecard-gen:abc", "linkedin", "example machinery linkedin");
  const k2 = searchCacheKey("scorecard-gen:abc", "linkedin", "example machinery linkedin");
  const k3 = searchCacheKey("scorecard-gen:abc", "linkedin", "other query");
  assert.equal(k1, k2);
  assert.notEqual(k1, k3);
  assert.ok(k1.startsWith("scorecard-gen:abc:call:linkedin:"));
});
