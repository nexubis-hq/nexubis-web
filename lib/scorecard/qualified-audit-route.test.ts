import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/scorecard/run/route";
import { detectProspectContext } from "./detect";
import { generateScorecard } from "./generate";
import { promoteResult, readExistingCapture } from "./unlock";
import type { DetectionResult } from "./detect";

vi.mock("./detect", () => ({ detectProspectContext: vi.fn(), applyDetection: (prospect: unknown) => prospect }));
vi.mock("./generate", () => ({ generateScorecard: vi.fn() }));
vi.mock("./share", () => ({ uniqueSlug: vi.fn(async () => "audit123") }));
vi.mock("./unlock", () => ({
  validateCaptureInput: () => ({ ok: true }), verifyEmailMx: async () => ({ ok: true }),
  verifyTurnstile: async () => true, readExistingCapture: vi.fn(),
  promoteResult: vi.fn(), markCaptured: vi.fn(), runLeadPlumbing: vi.fn(),
}));
vi.mock("./fetch-site", () => ({ validateUrl: () => ({ ok: true }) }));
vi.mock("./result", () => ({ prospectScores: () => ({ categories: [{ total: 1 }, { total: 1 }, { total: 1 }] }) }));
vi.mock("./notify", () => ({ notifyFailedScan: vi.fn(), notifyBreakerTripped: vi.fn() }));
vi.mock("./limits", () => ({
  checkGeneration: async () => ({ allow: true }), bumpCounters: vi.fn(), markIpGenerated: vi.fn(),
  ipLastKey: () => "test-ip", shouldNotifyBreaker: vi.fn(), limitsConfigFromEnv: () => ({ windowDays: 1 }), targetHash: () => "test-target",
}));
vi.mock("./kv", () => ({ getKv: () => ({ set: vi.fn() }) }));
vi.mock("./diagnostics", () => ({ recordScanOutcome: vi.fn(), scanTargetHost: () => "example.com" }));
vi.mock("@/lib/funnel/counter", () => ({ bumpFunnel: vi.fn() }));

const read: DetectionResult = {
  industryFit: "manufacturer", companyName: "Example", productOneLiner: "Makes industrial machinery", competitors: [], flags: [],
  fingerprint: { industries: ["food"], productFamilies: ["PX line"], certifications: [], salesModel: "direct", buyerPersona: "Factory engineers" },
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(detectProspectContext).mockResolvedValue(read);
  vi.mocked(readExistingCapture).mockResolvedValue(null);
  vi.mocked(generateScorecard).mockResolvedValue({ result: {} } as Awaited<ReturnType<typeof generateScorecard>>);
  vi.mocked(promoteResult).mockResolvedValue({ slug: "audit123", reportUrl: "/audit/r/audit123", record: {} } as Awaited<ReturnType<typeof promoteResult>>);
});
afterEach(() => { vi.useRealTimers(); vi.resetAllMocks(); });

function request(consent?: boolean, decided = true) {
  const cookie = consent === undefined ? "" : `nx_consent=${encodeURIComponent(JSON.stringify({ analytics: false, marketing: consent, decided, ts: Date.now() }))}`;
  return new NextRequest("https://www.nexubis.io/api/scorecard/run", {
    method: "POST", headers: { cookie },
    body: JSON.stringify({ url: "example.com", firstName: "Test", email: "qa@example.com", elapsedMs: 30_000 }),
  });
}
async function events(req: NextRequest) {
  const response = await POST(req);
  return (await response.text()).split("\n\n").filter((line) => line.startsWith("data:")).map((line) => JSON.parse(line.slice(5)));
}

it("signals once at classification, before generation, using the permanent audit ID", async () => {
  vi.mocked(generateScorecard).mockImplementationOnce(async () => {
    expect(detectProspectContext).toHaveBeenCalledOnce();
    return { result: {} } as Awaited<ReturnType<typeof generateScorecard>>;
  });
  const emitted = await events(request(true));
  expect(emitted.filter((event) => event.type === "qualified")).toEqual([{ type: "qualified", auditId: "audit123" }]);
  expect(emitted.findIndex((event) => event.type === "qualified")).toBeLessThan(emitted.findIndex((event) => event.type === "done"));
  expect(promoteResult).toHaveBeenCalledWith(expect.anything(), expect.anything(), "qa@example.com", "Test", "audit123");
});

it.each([undefined, false])("does not signal without marketing consent (%s)", async (consent) => {
  expect((await events(request(consent))).some((event) => event.type === "qualified")).toBe(false);
});
it("does not signal an undecided consent cookie", async () => {
  expect((await events(request(true, false))).some((event) => event.type === "qualified")).toBe(false);
});
it("does not signal a non-manufacturer or failed read", async () => {
  vi.mocked(detectProspectContext).mockResolvedValue({ ...read, industryFit: "unclear", fingerprint: null });
  expect((await events(request(true))).some((event) => event.type === "qualified")).toBe(false);
});
it("returning to an existing audit only returns the report; it never replays qualification", async () => {
  vi.mocked(readExistingCapture).mockResolvedValue("audit123");
  for (let visit = 0; visit < 2; visit++) {
    expect(await events(request(true))).toEqual([{ type: "done", reportUrl: "/audit/r/audit123", slug: "audit123" }]);
  }
  expect(detectProspectContext).not.toHaveBeenCalled();
  expect(promoteResult).not.toHaveBeenCalled();
});
