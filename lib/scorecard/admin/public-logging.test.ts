import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/scorecard/run/route";
import { notifyFailedScan } from "../notify";
import { recordScanOutcome } from "../diagnostics";
import { runLeadPlumbing } from "../unlock";
import { listFailedLeads } from "./failed-leads";
import fixture from "../fixtures/scorecard-result.json";
const { state, values, lists } = vi.hoisted(() => ({
  state: { mode: "success", valid: true, kvError: false, limited: false },
  values: new Map<string, unknown>(),
  lists: new Map<string, unknown[]>(),
}));
vi.mock("../detect", () => ({
  detectProspectContext: async () => ({
    industryFit: "unclear",
    flags: ["Auto-detect could not read the site (403 blocked)"],
  }),
  applyDetection: (p: unknown) => p,
}));
vi.mock("../generate", () => ({
  generateScorecard: async () => {
    if (state.mode === "failed") throw new Error("generation failed");
    if (state.mode === "timeout") return new Promise(() => {});
    return { result: structuredClone(fixture) };
  },
}));
vi.mock("../share", () => ({ uniqueSlug: async () => "audit123" }));
vi.mock("../unlock", () => ({
  validateCaptureInput: () => ({ ok: state.valid, error: "Invalid input" }),
  verifyEmailMx: async () => ({ ok: true }),
  verifyTurnstile: async () => true,
  readExistingCapture: async () => null,
  markCaptured: vi.fn(),
  runLeadPlumbing: vi.fn(),
  promoteResult: async () => ({
    slug: "audit123",
    reportUrl: "/audit/r/audit123",
    record: {
      result: structuredClone(fixture),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    },
  }),
}));
vi.mock("../notify", () => ({
  notifyFailedScan: vi.fn(async () => true),
  notifyBreakerTripped: vi.fn(),
}));
vi.mock("../limits", () => ({
  checkGeneration: async () =>
    state.limited ? { allow: false, reason: "target" } : { allow: true },
  bumpCounters: vi.fn(),
  markIpGenerated: vi.fn(),
  ipLastKey: () => "ip",
  shouldNotifyBreaker: vi.fn(),
  limitsConfigFromEnv: () => ({ windowDays: 1 }),
  targetHash: () => "target",
}));
vi.mock("../diagnostics", () => ({
  recordScanOutcome: vi.fn(),
  scanTargetHost: () => "example.com",
}));
vi.mock("@/lib/funnel/counter", () => ({ bumpFunnel: vi.fn() }));
vi.mock("../kv", () => ({
  getKv: () => ({
    get: async (k: string) => values.get(k) ?? null,
    set: async (k: string, v: unknown) => {
      if (state.kvError && k.startsWith("scorecard-failed"))
        throw new Error("kv offline");
      values.set(k, v);
    },
    lpush: async (k: string, v: unknown) =>
      lists.set(k, [v, ...(lists.get(k) ?? [])]),
    lrange: async (k: string, a: number, b: number) =>
      (lists.get(k) ?? []).slice(a, b + 1),
    ltrim: async (k: string, a: number, b: number) =>
      lists.set(k, (lists.get(k) ?? []).slice(a, b + 1)),
    expire: async () => 1,
  }),
}));
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  values.clear();
  lists.clear();
  state.mode = "success";
  state.valid = true;
  state.kvError = false;
  state.limited = false;
});
afterEach(() => vi.useRealTimers());
async function run(email = " QA@Example.com ") {
  const res = await POST(
    new NextRequest("https://www.nexubis.io/api/scorecard/run", {
      method: "POST",
      body: JSON.stringify({
        url: "example.com",
        firstName: "Alex",
        email,
        elapsedMs: 30000,
        funnelSource: "ad",
        adSource: { utm_source: "facebook" },
      }),
    })
  );
  const text = await res.text();
  await vi.advanceTimersByTimeAsync(0);
  return text;
}
it.each(["failed", "timeout"])(
  "saves %s after capture and records failure detail",
  async (mode) => {
    state.mode = mode;
    const pending = run();
    if (mode === "timeout") await vi.advanceTimersByTimeAsync(240000);
    const text = await pending;
    expect(text).toContain(
      "we will run your audit ourselves and email you the report."
    );
    expect(notifyFailedScan).toHaveBeenCalledOnce();
    const records = await listFailedLeads();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      email: "qa@example.com",
      outcome: mode,
      firstName: "Alex",
      siteRead: "403 blocked",
      source: "ad",
      linkedSlug: null,
    });
    expect(recordScanOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: mode,
        email: "qa@example.com",
        reason:
          mode === "timeout"
            ? "generation exceeded the deadline"
            : "generation failed",
        siteRead: "403 blocked",
        source: "ad",
      })
    );
  }
);
it("KV failure preserves the exact stream and does not skip the alert", async () => {
  state.mode = "failed";
  const baseline = await run();
  values.clear();
  lists.clear();
  state.kvError = true;
  expect(await run()).toBe(baseline);
  expect(notifyFailedScan).toHaveBeenCalledTimes(2);
  expect(await listFailedLeads()).toEqual([]);
});
it("success logs slug, attribution and visitor history with no failed lead", async () => {
  expect(await run()).toContain('"type":"done"');
  expect(await listFailedLeads()).toEqual([]);
  expect(notifyFailedScan).not.toHaveBeenCalled();
  expect(recordScanOutcome).toHaveBeenCalledWith(
    expect.objectContaining({
      outcome: "success",
      slug: "audit123",
      email: "qa@example.com",
      source: "ad",
      siteRead: "403 blocked",
    })
  );
  expect(lists.get("scorecard-run-history:audit123")).toEqual([
    expect.objectContaining({ by: "visitor", kind: "first run" }),
  ]);
  expect(runLeadPlumbing).toHaveBeenCalledWith(
    expect.anything(),
    "QA@Example.com",
    "audit123",
    expect.any(String),
    "Alex",
    expect.objectContaining({
      source: "ad",
      ad: { utm_source: "facebook" },
      qualifiedDecision: expect.anything(),
    })
  );
});
it("pre-capture invalid input and rate limits never save failed leads", async () => {
  state.valid = false;
  await run("not-email");
  expect(await listFailedLeads()).toEqual([]);
  expect(recordScanOutcome).toHaveBeenLastCalledWith(
    expect.objectContaining({
      outcome: "invalid",
      reason: "Invalid input",
      email: undefined,
    })
  );
  state.valid = true;
  state.limited = true;
  await run();
  expect(await listFailedLeads()).toEqual([]);
  expect(notifyFailedScan).not.toHaveBeenCalled();
  expect(recordScanOutcome).toHaveBeenLastCalledWith(
    expect.objectContaining({
      outcome: "limited",
      reason:
        "This company has been checked a few times today already. Try again tomorrow.",
    })
  );
});

it("outcome telemetry failure cannot change the failure stream or skip the failed lead",async()=>{
 state.mode="failed";vi.mocked(recordScanOutcome).mockRejectedValueOnce(new Error("telemetry unavailable"));
 expect(await run()).toContain("we will run your audit ourselves and email you the report.");
 expect(notifyFailedScan).toHaveBeenCalledOnce();expect(await listFailedLeads()).toHaveLength(1);
});
