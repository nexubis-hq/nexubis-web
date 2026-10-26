import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/scorecard/run/route";
import { notifyFailedScan } from "./notify";
import { promoteResult } from "./unlock";

const { state } = vi.hoisted(() => ({ state: { scoredPillars: 3 } }));
const flag = "Auto-detect could not read the site (Site responded with status 403.)";
vi.mock("./detect", () => ({
  detectProspectContext: async () => ({ industryFit: "unclear", flags: ["Auto-detect could not read the site (Site responded with status 403.)"] }),
  applyDetection: (prospect: unknown) => prospect,
}));
vi.mock("./generate", () => ({ generateScorecard: async () => ({ result: { flags: ["Other evidence warning"] } }) }));
vi.mock("./share", () => ({ uniqueSlug: async () => "audit123" }));
vi.mock("./unlock", () => ({
  validateCaptureInput: () => ({ ok: true }), verifyEmailMx: async () => ({ ok: true }),
  verifyTurnstile: async () => true, readExistingCapture: async () => null,
  promoteResult: vi.fn(async () => ({ slug: "audit123", reportUrl: "/audit/r/audit123", record: {} })),
  markCaptured: vi.fn(), runLeadPlumbing: vi.fn(),
}));
vi.mock("./fetch-site", () => ({ validateUrl: () => ({ ok: true }) }));
vi.mock("./result", () => ({ prospectScores: () => ({ categories: Array.from({ length: state.scoredPillars }, () => ({ total: 1 })) }) }));
vi.mock("./notify", () => ({ notifyFailedScan: vi.fn(async () => true), notifyBreakerTripped: vi.fn() }));
vi.mock("./limits", () => ({
  checkGeneration: async () => ({ allow: true }), bumpCounters: vi.fn(), markIpGenerated: vi.fn(),
  ipLastKey: () => "test-ip", shouldNotifyBreaker: vi.fn(), limitsConfigFromEnv: () => ({ windowDays: 1 }), targetHash: () => "test-target",
}));
vi.mock("./kv", () => ({ getKv: () => ({ set: vi.fn() }) }));
vi.mock("./diagnostics", () => ({ recordScanOutcome: vi.fn(), scanTargetHost: () => "example.com" }));
vi.mock("@/lib/funnel/counter", () => ({ bumpFunnel: vi.fn() }));

beforeEach(() => { vi.useFakeTimers(); state.scoredPillars = 3; });
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

async function run() {
  const response = await POST(new NextRequest("https://www.nexubis.io/api/scorecard/run", {
    method: "POST", body: JSON.stringify({ url: "example.com", firstName: "Test", email: "qa@example.com", elapsedMs: 30_000 }),
  }));
  return response.text();
}

it("preserves detection failures alongside evidence flags on a completed report", async () => {
  expect(await run()).toContain('"type":"done"');
  expect(promoteResult).toHaveBeenCalledWith(
    expect.objectContaining({ url: "https://example.com" }),
    expect.objectContaining({ flags: ["Other evidence warning", flag] }),
    "qa@example.com", "Test", "audit123",
  );
  expect(notifyFailedScan).not.toHaveBeenCalled();
});

it("retains the readiness guard and forwards the same detection reason to the failed-scan alert", async () => {
  state.scoredPillars = 2;
  expect(await run()).toContain('"type":"error"');
  expect(promoteResult).not.toHaveBeenCalled();
  expect(notifyFailedScan).toHaveBeenCalledExactlyOnceWith(
    "qa@example.com", "https://example.com", "report-not-ready: only 2 of 5 pillars scored", [flag],
  );
});
