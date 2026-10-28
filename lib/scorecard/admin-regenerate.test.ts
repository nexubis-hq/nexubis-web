import { afterEach, beforeEach, expect, it, vi } from "vitest";
import fixture from "./fixtures/scorecard-result.json";
import type { ScorecardResult } from "./result";
import { rerunAudit, regenerateReport } from "@/app/audit/admin/actions";
import { readShared, patchShared } from "./share";
import { detectProspectContext } from "./detect";
import { generateScorecardUncached } from "./generate";
import { gatherEvidenceUncached } from "./orchestrator";
import { readManualAudit, rerunManualAudit } from "./manual/run";
import { notifyTeam, notifyFailedScan, sendFallbackEmail1 } from "./notify";
import { pushLead, updateLead } from "./leads";
import { bumpFunnel } from "@/lib/funnel/counter";
import { recordScanOutcome } from "./diagnostics";
import { redirect } from "next/navigation";
import { sendResendEmail } from "@/lib/resend";
import { createFunnelrClient } from "@/lib/funnelr/client";
import { submitScorecardLeadToFunnelr } from "./lead-funnelr";
import { sendCapiEvent } from "@/lib/meta/capi";
import { trackMeta } from "@/lib/meta/track";
import type { SharedScorecard } from "./share";
import type { DetectionResult } from "./detect";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "test-session" }) }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("./auth", () => ({
  SESSION_COOKIE: "test-session",
  isValidSession: vi.fn(() => true),
}));
vi.mock("./share", () => ({
  readShared: vi.fn(),
  patchShared: vi.fn(),
  SHARE_TTL_S: 180 * 86_400,
}));
vi.mock("./leads", () => ({ updateLead: vi.fn(), pushLead: vi.fn() }));
vi.mock("./notify", () => ({
  notifyTeam: vi.fn(),
  notifyFailedScan: vi.fn(),
  sendFallbackEmail1: vi.fn(),
}));
vi.mock("@/lib/funnel/counter", () => ({ bumpFunnel: vi.fn() }));
vi.mock("./diagnostics", () => ({ recordScanOutcome: vi.fn() }));
vi.mock("./manual/run", () => ({
  readManualAudit: vi.fn(),
  rerunManualAudit: vi.fn(),
}));
const lists = new Map<string, unknown[]>();
const writes = new Map<string, unknown>();
const set = vi.fn(async (key: string, value: unknown) => {
  writes.set(key, value);
});
vi.mock("./kv", () => ({
  getKv: () => ({
    get: vi.fn(async (key: string) => writes.get(key) ?? null),
    set,
    lpush: vi.fn(async (k: string, v: unknown) =>
      lists.set(k, [v, ...(lists.get(k) ?? [])])
    ),
    lrange: vi.fn(async (k: string) => lists.get(k) ?? []),
    ltrim: vi.fn(),
    expire: vi.fn(),
  }),
}));
vi.mock("./orchestrator", () => ({ gatherEvidenceUncached: vi.fn() }));
vi.mock("./detect", async (original) => ({
  ...(await original<typeof import("./detect")>()),
  detectProspectContext: vi.fn(),
}));
vi.mock("./generate", () => ({ generateScorecardUncached: vi.fn() }));
vi.mock("@/lib/resend", () => ({ sendResendEmail: vi.fn() }));
vi.mock("@/lib/funnelr/client", () => ({ createFunnelrClient: vi.fn() }));
vi.mock("./lead-funnelr", () => ({ submitScorecardLeadToFunnelr: vi.fn() }));
vi.mock("@/lib/meta/capi", () => ({ sendCapiEvent: vi.fn() }));
vi.mock("@/lib/meta/track", () => ({ trackMeta: vi.fn() }));

const saved = {
  prospectData: {
    name: "  Original Contact  ",
    role: "CEO",
    company: "Example",
    url: "https://example.com",
    productOneLiner: "",
    competitors: [],
  },
  result: {
    ...fixture,
    meta: { ...fixture.meta, contactName: "  Original Contact  ", role: "CEO" },
    routing: { ...fixture.routing, roleSeniority: "ceo" },
  },
  loomUrl: "https://www.loom.com/share/keepme",
  roleSeniority: "ceo",
  createdAt: "2026-10-01T10:00:00Z",
} as unknown as SharedScorecard;
const detection: DetectionResult = {
  companyName: "Example Machines",
  industryFit: "manufacturer",
  productOneLiner: "Makes magnetic drilling machines",
  competitors: ["rival.example"],
  flags: [],
  fingerprint: {
    industries: ["metalworking"],
    productFamilies: ["Magnetic drills"],
    certifications: [],
    salesModel: "direct",
    buyerPersona: "metal fabricators and contractors",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  writes.clear();
  lists.clear();
  vi.mocked(readManualAudit).mockResolvedValue(null);
  vi.mocked(readShared).mockResolvedValue(saved);
  vi.mocked(patchShared).mockResolvedValue(saved);
  vi.mocked(detectProspectContext).mockResolvedValue(detection);
  vi.mocked(gatherEvidenceUncached).mockResolvedValue({
    companies: [
      {
        company: "Example",
        isProspect: true,
        resolved: true,
        fetched: true,
        flags: [],
      },
    ],
    flags: [],
  } as unknown as Awaited<ReturnType<typeof gatherEvidenceUncached>>);
  vi.mocked(generateScorecardUncached).mockResolvedValue(
    structuredClone(fixture) as unknown as ScorecardResult
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Unexpected external request");
    })
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function noSideEffects() {
  for (const fn of [
    pushLead,
    updateLead,
    notifyTeam,
    notifyFailedScan,
    sendFallbackEmail1,
    sendResendEmail,
    createFunnelrClient,
    submitScorecardLeadToFunnelr,
    sendCapiEvent,
    trackMeta,
    bumpFunnel,
    recordScanOutcome,
    fetch,
  ])
    expect(fn).not.toHaveBeenCalled();
  expect(
    [...writes.keys()].every((key) => key.startsWith("scorecard-admin-run:"))
  ).toBe(true);
}

function confirmed() {
  const form = new FormData();
  form.set("confirm", "example");
  return form;
}

it("the shared action and compatibility wrapper use fresh guarded scoring, preserve lead contact/role/seniority/Loom and slug, and record run history", async () => {
  await rerunAudit("existing123", "report", confirmed());
  const form = new FormData();
  form.set("slug", "existing123");
  form.set("confirm", "example");
  await regenerateReport(form);
  expect(detectProspectContext).toHaveBeenCalledTimes(2);
  expect(detectProspectContext).toHaveBeenCalledWith(saved.prospectData, {
    fresh: true,
  });
  expect(gatherEvidenceUncached).toHaveBeenCalledWith(
    expect.objectContaining({ fingerprint: detection.fingerprint }),
    { fresh: true }
  );
  expect(generateScorecardUncached).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "  Original Contact  ",
      role: "CEO",
      competitors: [{ raw: "rival.example" }],
    }),
    expect.objectContaining({
      fresh: true,
      evidenceOverride: expect.anything(),
    })
  );
  expect(patchShared).toHaveBeenCalledWith(
    "existing123",
    expect.objectContaining({
      prospectData: expect.objectContaining({
        name: "  Original Contact  ",
        role: "CEO",
      }),
      qualifiedDecision: {
        qualified: true,
        reason: "manufacturer with named products",
      },
      result: expect.objectContaining({
        meta: expect.objectContaining({
          contactName: "  Original Contact  ",
          role: "CEO",
        }),
        routing: expect.objectContaining({ roleSeniority: "ceo" }),
      }),
    })
  );
  for (const [, patch] of vi.mocked(patchShared).mock.calls) {
    expect(patch).not.toHaveProperty("loomUrl");
    expect(patch).not.toHaveProperty("roleSeniority");
  }
  expect(writes.get("scorecard-admin-run:existing123")).toMatchObject({
    lastRunAt: expect.any(String),
    runCount: 3,
  });
  expect(redirect).toHaveBeenCalledWith(
    "/audit/admin/existing123?updated=existing123"
  );
  expect(lists.get("scorecard-run-history:existing123")).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ by: "admin", kind: "re-run" }),
    ])
  );
  noSideEffects();
});

it.each(["paste", "crawl"] as const)(
  "dispatches %s manual reports through the existing manual handler, without calling the lead crawl path",
  async (source) => {
    vi.mocked(readManualAudit).mockResolvedValue({
      slug: "manual123",
      source,
    } as unknown as NonNullable<Awaited<ReturnType<typeof readManualAudit>>>);
    vi.mocked(rerunManualAudit).mockResolvedValue({
      slug: "manual123",
      reportUrl: "/audit/r/manual123",
    });
    await rerunAudit("manual123", "manual", confirmed());
    expect(rerunManualAudit).toHaveBeenCalledExactlyOnceWith("manual123");
    expect(detectProspectContext).not.toHaveBeenCalled();
    expect(generateScorecardUncached).not.toHaveBeenCalled();
    expect(patchShared).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith(
      "/audit/admin/manual?updated=manual123"
    );
    noSideEffects();
  }
);

it("stops a failed site read and displays the fetch reason without saving anything", async () => {
  vi.mocked(detectProspectContext).mockResolvedValue({
    ...detection,
    flags: [
      "Auto-detect could not read the site (Site responded with status 429)",
    ],
  });
  await rerunAudit("existing123", "report", confirmed());
  expect(generateScorecardUncached).not.toHaveBeenCalled();
  expect(patchShared).not.toHaveBeenCalled();
  expect(set).not.toHaveBeenCalled();
  expect(redirect).toHaveBeenCalledWith(
    "/audit/admin/existing123?error=failed&reason=Site%20responded%20with%20status%20429"
  );
  noSideEffects();
});

it("stops if the prospect becomes blocked during evidence gathering", async () => {
  vi.mocked(gatherEvidenceUncached).mockResolvedValue({
    companies: [
      {
        isProspect: true,
        fetched: false,
        fetchReason: "Access challenge",
        flags: [],
      },
    ],
  } as unknown as Awaited<ReturnType<typeof gatherEvidenceUncached>>);
  await rerunAudit("existing123", "report", confirmed());
  expect(generateScorecardUncached).not.toHaveBeenCalled();
  expect(patchShared).not.toHaveBeenCalled();
  expect(set).not.toHaveBeenCalled();
  noSideEffects();
});

it("stops a report with fewer than three scored pillars without changing the report or history", async () => {
  const result = structuredClone(fixture) as unknown as ScorecardResult;
  result.scores
    .find((score) => score.isProspect)!
    .categories.forEach((category, i) => {
      if (i >= 2) category.total = null;
    });
  vi.mocked(generateScorecardUncached).mockResolvedValue(result);
  await rerunAudit("existing123", "report", confirmed());
  expect(patchShared).not.toHaveBeenCalled();
  expect(set).not.toHaveBeenCalled();
  expect(redirect).toHaveBeenCalledWith(
    "/audit/admin/existing123?error=notready"
  );
  noSideEffects();
});

it("does not save a timed-out lead run even if scoring finishes later", async () => {
  vi.useFakeTimers();
  let finish!: (result: ScorecardResult) => void;
  vi.mocked(generateScorecardUncached).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const pending = rerunAudit("existing123", "report", confirmed());
  await vi.advanceTimersByTimeAsync(270_000);
  await pending;
  finish(structuredClone(fixture) as unknown as ScorecardResult);
  await vi.advanceTimersByTimeAsync(1);
  expect(patchShared).not.toHaveBeenCalled();
  expect(set).not.toHaveBeenCalled();
  expect(redirect).toHaveBeenCalledWith(
    "/audit/admin/existing123?error=timeout"
  );
  noSideEffects();
});

it.each([undefined, "", "wrong"])(
  "refuses confirmation %s without any KV writes or generation",
  async (value) => {
    const form = new FormData();
    if (value !== undefined) form.set("confirm", value);
    await rerunAudit("existing123", "report", form);
    expect(redirect).toHaveBeenCalledWith(
      "/audit/admin/existing123?error=confirm"
    );
    expect(set).not.toHaveBeenCalled();
    expect(lists.size).toBe(0);
    expect(patchShared).not.toHaveBeenCalled();
    expect(detectProspectContext).not.toHaveBeenCalled();
    noSideEffects();
  }
);
