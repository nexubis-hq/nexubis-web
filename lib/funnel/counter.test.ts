import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetKvForTest } from "@/lib/scorecard/kv";
import { bumpFunnel, funnelDay, funnelKey, readFunnel } from "./counter";

type MemStore = { values: Map<string, unknown>; lists: Map<string, unknown[]>; expiries: Map<string, number> };
const memory = globalThis as typeof globalThis & { __scorecardMemKv?: MemStore };
const savedUrl = process.env.KV_REST_API_URL;
const savedToken = process.env.KV_REST_API_TOKEN;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-08T23:30:00.000Z"));
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  memory.__scorecardMemKv = undefined;
  __resetKvForTest();
});

afterEach(() => {
  vi.useRealTimers();
  if (savedUrl === undefined) delete process.env.KV_REST_API_URL;
  else process.env.KV_REST_API_URL = savedUrl;
  if (savedToken === undefined) delete process.env.KV_REST_API_TOKEN;
  else process.env.KV_REST_API_TOKEN = savedToken;
  memory.__scorecardMemKv = undefined;
  __resetKvForTest();
});

describe("audit funnel counter", () => {
  it("uses the Johannesburg day at 23:30 UTC", () => expect(funnelDay()).toBe("2026-09-09"));

  it("round-trips each step and source", async () => {
    await bumpFunnel("arrived", "ad");
    await bumpFunnel("touched", "other");
    await bumpFunnel("submitted", "ad");
    const [today] = await readFunnel(1);
    expect(today.counts).toEqual({ arrived: { ad: 1, other: 0 }, touched: { ad: 0, other: 1 }, submitted: { ad: 1, other: 0 } });
  });

  it("increments repeated counts", async () => {
    await bumpFunnel("arrived", "ad");
    await bumpFunnel("arrived", "ad");
    expect((await readFunnel(1))[0].counts.arrived.ad).toBe(2);
  });

  it("zero-fills the previous day", async () => {
    await bumpFunnel("arrived", "other");
    const rows = await readFunnel(2);
    expect(rows[1]).toEqual({ day: "2026-09-08", counts: { arrived: { ad: 0, other: 0 }, touched: { ad: 0, other: 0 }, submitted: { ad: 0, other: 0 } } });
  });

  it("uses the documented key format", () => expect(funnelKey("2026-09-09", "touched", "ad")).toBe("audit-funnel:2026-09-09:touched:ad"));
});
