import { Redis } from "@upstash/redis";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { KvLike } from "../kv";
import { withProfileLock } from "./profiles";

const state = vi.hoisted(() => ({ client: null as KvLike | null }));
vi.mock("../kv", () => ({ getKv: () => state.client }));
const lock = "scorecard-lead-profile:/audit/admin/one:lock";
let redis: Redis;
beforeEach(() => {
  // Use the installed Redis class for capability detection; all IO is mocked.
  redis = new Redis({
    url: "https://redis.example",
    token: "fixture",
    enableAutoPipelining: false,
  });
  state.client = redis as unknown as KvLike;
  vi.spyOn(redis, "set").mockResolvedValue("OK");
  vi.spyOn(redis, "incr").mockResolvedValue(1);
  vi.spyOn(redis, "expire").mockResolvedValue(1);
  vi.spyOn(redis, "del").mockResolvedValue(1);
});
afterEach(() => vi.restoreAllMocks());
it("takes the supported Redis lock in one SET NX EX operation", async () => {
  const work = vi.fn(async () => "saved");
  expect(await withProfileLock("/audit/admin/one", work)).toBe("saved");
  expect(redis.set).toHaveBeenCalledExactlyOnceWith(lock, 1, {
    nx: true,
    ex: 30,
  });
  expect(work).toHaveBeenCalledOnce();
  expect(redis.incr).not.toHaveBeenCalled();
  expect(redis.expire).not.toHaveBeenCalled();
  expect(redis.del).toHaveBeenCalledExactlyOnceWith(lock);
});
it("does not run work or release another request's lock when NX fails", async () => {
  vi.mocked(redis.set).mockResolvedValue(null);
  const work = vi.fn();
  await expect(withProfileLock("/audit/admin/one", work)).rejects.toThrow(
    "update in progress"
  );
  expect(work).not.toHaveBeenCalled();
  expect(redis.del).not.toHaveBeenCalled();
  expect(redis.incr).not.toHaveBeenCalled();
});
it("releases an acquired Redis lock when work fails", async () => {
  await expect(
    withProfileLock("/audit/admin/one", async () => {
      throw new Error("save failed");
    })
  ).rejects.toThrow("save failed");
  expect(redis.del).toHaveBeenCalledExactlyOnceWith(lock);
});
it("does not run work or release a lock after a Redis SET failure", async () => {
  vi.mocked(redis.set).mockRejectedValue(new Error("store unavailable"));
  const work = vi.fn();
  await expect(withProfileLock("/audit/admin/one", work)).rejects.toThrow(
    "store unavailable"
  );
  expect(work).not.toHaveBeenCalled();
  expect(redis.del).not.toHaveBeenCalled();
});
it("retains INCR and EXPIRE for the memory adapter without NX support", async () => {
  const memory = {
    incr: vi.fn(async () => 1),
    expire: vi.fn(),
    del: vi.fn(),
    set: vi.fn(),
  };
  state.client = memory as unknown as KvLike;
  expect(await withProfileLock("/audit/admin/one", async () => "saved")).toBe(
    "saved"
  );
  expect(memory.set).not.toHaveBeenCalled();
  expect(memory.incr).toHaveBeenCalledExactlyOnceWith(lock);
  expect(memory.expire).toHaveBeenCalledExactlyOnceWith(lock, 30);
  expect(memory.del).toHaveBeenCalledExactlyOnceWith(lock);
});
it("retains fallback cleanup if the memory adapter's EXPIRE fails", async () => {
  const memory = {
    incr: vi.fn(async () => 1),
    expire: vi.fn(async () => {
      throw new Error("expire failed");
    }),
    del: vi.fn(),
  };
  state.client = memory as unknown as KvLike;
  const work = vi.fn();
  await expect(withProfileLock("/audit/admin/one", work)).rejects.toThrow(
    "expire failed"
  );
  expect(work).not.toHaveBeenCalled();
  expect(memory.del).toHaveBeenCalledExactlyOnceWith(lock);
});
