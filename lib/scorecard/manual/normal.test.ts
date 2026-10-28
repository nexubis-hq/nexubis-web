import { afterEach, beforeEach, expect, it, vi } from "vitest";
import fixture from "../fixtures/scorecard-result.json";
import type { ScorecardResult } from "../result";
import type { SharedScorecard } from "../share";
import type { DetectionResult } from "../detect";
import type { EvidenceBundleSet } from "../evidence";
import { detectProspectContext } from "../detect";
import { gatherEvidenceUncached } from "../orchestrator";
import { generateScorecardUncached } from "../generate";
import { runNormalManualAudit, NormalSiteReadError } from "./normal";
import { rerunManualAudit, readManualAudit, listManualAudits } from "./run";
import { pushLead } from "../leads";
import { notifyTeam, notifyFailedScan, sendFallbackEmail1 } from "../notify";
import { sendResendEmail } from "@/lib/resend";
import { createFunnelrClient } from "@/lib/funnelr/client";
import { submitScorecardLeadToFunnelr } from "../lead-funnelr";
import { sendCapiEvent } from "@/lib/meta/capi";
import { trackMeta } from "@/lib/meta/track";
import { bumpFunnel } from "@/lib/funnel/counter";
import { recordScanOutcome } from "../diagnostics";
import {
  createNormalManualAudit,
  rerunManualAudit as rerunAction,
} from "@/app/audit/admin/manual/actions";
import { isValidSession } from "../auth";
import { redirect } from "next/navigation";

vi.mock("../detect", async (original) => ({
  ...(await original<typeof import("../detect")>()),
  detectProspectContext: vi.fn(),
}));
vi.mock("../orchestrator", () => ({ gatherEvidenceUncached: vi.fn() }));
vi.mock("../generate", () => ({ generateScorecardUncached: vi.fn() }));
vi.mock("../leads", () => ({ pushLead: vi.fn() }));
vi.mock("../notify", () => ({
  notifyTeam: vi.fn(),
  notifyFailedScan: vi.fn(),
  sendFallbackEmail1: vi.fn(),
}));
vi.mock("@/lib/resend", () => ({ sendResendEmail: vi.fn() }));
vi.mock("@/lib/funnelr/client", () => ({ createFunnelrClient: vi.fn() }));
vi.mock("../lead-funnelr", () => ({ submitScorecardLeadToFunnelr: vi.fn() }));
vi.mock("@/lib/meta/capi", () => ({ sendCapiEvent: vi.fn() }));
vi.mock("@/lib/meta/track", () => ({ trackMeta: vi.fn() }));
vi.mock("@/lib/funnel/counter", () => ({ bumpFunnel: vi.fn() }));
vi.mock("../diagnostics", () => ({ recordScanOutcome: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "test-session" }) }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("../auth", () => ({
  SESSION_COOKIE: "test-session",
  isValidSession: vi.fn(() => true),
}));
const values = new Map<string, unknown>();
const lists = new Map<string, unknown[]>();
vi.mock("../kv", () => ({
  getKv: () => ({
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      values.set(key, structuredClone(value));
    }),
    expire: vi.fn(),
    lpush: vi.fn(async (key: string, value: unknown) => {
      lists.set(key, [value, ...(lists.get(key) ?? [])]);
    }),
    lrange: vi.fn(async (key: string) => lists.get(key) ?? []),
    ltrim: vi.fn(async (key: string, start: number, end: number) => {
      lists.set(key, (lists.get(key) ?? []).slice(start, end + 1));
    }),
  }),
}));
const detection: DetectionResult = {
  companyName: "Jeka",
  productOneLiner: "Makes industrial labels",
  competitors: ["rival.example", "other.example"],
  industryFit: "manufacturer",
  flags: [],
  fingerprint: {
    industries: ["industrial"],
    productFamilies: ["Label X"],
    certifications: [],
    salesModel: "direct",
    buyerPersona: "Factories",
  },
};
const input = {
  url: "https://jekashop.com",
  contactName: "PRIVATE_CONTACT",
  contactEmail: "private@example.org",
};
const bundle = (): EvidenceBundleSet => ({
  companies: [
    {
      company: "Jeka",
      url: "https://jekashop.com",
      isProspect: true,
      resolved: true,
      fetched: true,
      siteText: "PRIVATE_CRAWLED_TEXT",
      siteTitle: "Jeka",
      finalUrl: "https://jekashop.com",
      screenshots: {
        desktopUrl: "https://shots.example/desktop",
        mobileUrl: "https://shots.example/mobile",
      },
      pageSpeed: null,
      offsiteFacts: [],
      searchBlock: "",
      firstImpression: null,
      flags: [],
    },
  ],
  flags: [],
  estimatedCostUsd: 0,
  searchQueriesUsed: 0,
  gatheredAt: new Date().toISOString(),
});
beforeEach(() => {
  values.clear();
  lists.clear();
  vi.clearAllMocks();
  vi.mocked(isValidSession).mockReturnValue(true);
  vi.mocked(detectProspectContext).mockResolvedValue(
    structuredClone(detection)
  );
  vi.mocked(gatherEvidenceUncached).mockResolvedValue(bundle());
  vi.mocked(generateScorecardUncached).mockImplementation(
    async () => structuredClone(fixture) as unknown as ScorecardResult
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
  expect(lists.has("scorecard-leads")).toBe(false);
  for (const key of values.keys())
    expect(
      key.startsWith("scorecard-manual:") || key.startsWith("scorecard:") || key.startsWith("scorecard-failed-lead:")
    ).toBe(true);
}

it("runs fresh detection, normal evidence including competitor handling and generation, saving a crawl record without contact leakage or side effects", async () => {
  const { slug } = await runNormalManualAudit(input);
  expect(detectProspectContext).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "",
      role: "",
      url: input.url,
      competitors: [],
    }),
    { fresh: true }
  );
  const prospect = expect.objectContaining({
    name: "",
    role: "",
    company: "Jeka",
    competitors: detection.competitors.map((raw) => ({ raw })),
    fingerprint: detection.fingerprint,
  });
  expect(gatherEvidenceUncached).toHaveBeenCalledExactlyOnceWith(prospect, {
    fresh: true,
  });
  expect(generateScorecardUncached).toHaveBeenCalledWith(prospect, {
    fresh: true,
    evidenceOverride: expect.objectContaining({ companies: expect.any(Array) }),
  });
  const record = await readManualAudit(slug);
  expect(record).toMatchObject({
    source: "crawl",
    pastedText: "",
    contactName: input.contactName,
    contactEmail: input.contactEmail,
    runCount: 1,
    qualifiedDecision: { qualified: true },
  });
  expect(await listManualAudits()).toEqual([record]);
  expect(lists.get("scorecard-manual-audits")).toEqual([slug]);
  expect(lists.get(`scorecard-run-history:${slug}`)).toEqual([expect.objectContaining({by:"manual",kind:"first run"})]);
  const shared = values.get(`scorecard:${slug}`) as SharedScorecard;
  expect(shared.prospectData.name).toBe("");
  expect(shared.result.meta.contactName).toBe("");
  expect(shared.loomUrl).toBeNull();
  for (const secret of [
    input.contactName,
    input.contactEmail,
    "PRIVATE_CRAWLED_TEXT",
  ])
    expect(JSON.stringify(shared)).not.toContain(secret);
  noSideEffects();
});

it.each([
  "Site returned an access challenge instead of content",
  "Site responded with status 429",
])(
  "preserves the exact detection fetch reason: %s, and writes nothing",
  async (reason) => {
    vi.mocked(detectProspectContext).mockResolvedValue({
      ...detection,
      flags: [`Auto-detect could not read the site (${reason})`],
    });
    await expect(runNormalManualAudit(input)).rejects.toMatchObject({
      reason,
      message: reason,
      code: "failed",
    });
    expect(gatherEvidenceUncached).not.toHaveBeenCalled();
    expect(generateScorecardUncached).not.toHaveBeenCalled();
    expect(values.size).toBe(0);
    expect(lists.size).toBe(0);
    noSideEffects();
  }
);

it("also catches a crawl that becomes blocked during evidence collection, before scoring or saving", async () => {
  const evidence = bundle();
  evidence.companies[0].fetched = false;
  evidence.companies[0].flags = [
    "Site fetch failed: Site responded with status 429",
  ];
  vi.mocked(gatherEvidenceUncached).mockResolvedValue(evidence);
  await expect(runNormalManualAudit(input)).rejects.toMatchObject({
    reason: "Site responded with status 429",
  });
  expect(generateScorecardUncached).not.toHaveBeenCalled();
  expect(values.size).toBe(0);
  expect(lists.size).toBe(0);
  noSideEffects();
});

it("writes nothing if fewer than three pillars are scored", async () => {
  const result = structuredClone(fixture) as unknown as ScorecardResult;
  result.scores
    .find((score) => score.isProspect)!
    .categories.forEach((category, index) => {
      if (index >= 2) category.total = null;
    });
  vi.mocked(generateScorecardUncached).mockResolvedValue(result);
  await expect(runNormalManualAudit(input)).rejects.toThrow("notready");
  expect(values.size).toBe(0);
  expect(lists.size).toBe(0);
  noSideEffects();
});

it("dispatches crawl re-runs through fresh detection/evidence/scoring, preserving the slug, contacts, creation date and list entry", async () => {
  const { slug } = await runNormalManualAudit(input);
  const original = values.get(`scorecard:${slug}`) as SharedScorecard;
  expect(await rerunManualAudit(slug)).toEqual({
    slug,
    reportUrl: `/audit/r/${slug}`,
  });
  expect(detectProspectContext).toHaveBeenCalledTimes(2);
  expect(gatherEvidenceUncached).toHaveBeenCalledTimes(2);
  expect(generateScorecardUncached).toHaveBeenCalledTimes(2);
  expect(await readManualAudit(slug)).toMatchObject({
    source: "crawl",
    runCount: 2,
    contactName: input.contactName,
    pastedText: "",
  });
  expect(lists.get("scorecard-manual-audits")).toEqual([slug]);
  expect((values.get(`scorecard:${slug}`) as SharedScorecard).createdAt).toBe(
    original.createdAt
  );
  expect(
    [...values.keys()].filter((key) => key.startsWith("scorecard:"))
  ).toEqual([`scorecard:${slug}`]);
  const snapshot = JSON.stringify([...values]);
  vi.mocked(detectProspectContext).mockResolvedValue({
    ...detection,
    flags: ["Auto-detect could not read the site (blocked again)"],
  });
  await expect(rerunManualAudit(slug)).rejects.toBeInstanceOf(
    NormalSiteReadError
  );
  expect(JSON.stringify([...values])).toBe(snapshot);
  noSideEffects();
});

it("does not save a report when timed-out work later finishes", async () => {
  vi.useFakeTimers();
  let finish!: (value: ScorecardResult) => void;
  vi.mocked(generateScorecardUncached).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const pending = runNormalManualAudit(input);
  const assertion = expect(pending).rejects.toThrow("timeout");
  await vi.advanceTimersByTimeAsync(270_000);
  await assertion;
  finish(structuredClone(fixture) as unknown as ScorecardResult);
  await vi.advanceTimersByTimeAsync(1);
  expect(values.size).toBe(0);
  expect(lists.size).toBe(0);
  noSideEffects();
});

it("checks the normal action's session before doing work", async () => {
  vi.mocked(isValidSession).mockReturnValue(false);
  await expect(createNormalManualAudit(new FormData())).rejects.toThrow(
    "Not signed in"
  );
  expect(detectProspectContext).not.toHaveBeenCalled();
  expect(values.size).toBe(0);
});

it("URL-encodes and caps the blocked reason on create and re-run redirects", async () => {
  const { slug } = await runNormalManualAudit(input);
  const reason = `Site responded with status 429 & <blocked> ${"x".repeat(220)}`;
  vi.mocked(detectProspectContext).mockResolvedValue({
    ...detection,
    flags: [`Auto-detect could not read the site (${reason})`],
  });
  const form = new FormData();
  form.set("url", input.url);
  form.set("slug", slug);
  await createNormalManualAudit(form);
  form.set("confirm", new URL(input.url).hostname.replace(/^www\./, "").split(".")[0]);
  await rerunAction(form);
  expect(redirect).toHaveBeenNthCalledWith(
    1,
    `/audit/admin/manual?error=failed&reason=${encodeURIComponent(reason.slice(0, 200))}`
  );
  expect(redirect).toHaveBeenNthCalledWith(
    2,
    `/audit/admin/manual?error=failed&reason=${encodeURIComponent(reason.slice(0, 200))}`
  );
  expect(
    [...values.keys()].filter((key) => key.startsWith("scorecard:"))
  ).toEqual([`scorecard:${slug}`]);
  noSideEffects();
});

it("links a failed lead to a manual report without lead plumbing",async()=>{
 values.set("scorecard-failed-lead:failed123",{id:"failed123",at:new Date().toISOString(),linkedSlug:null,email:input.contactEmail});
 const form=new FormData();form.set("url",input.url);form.set("contactName",input.contactName!);form.set("contactEmail",input.contactEmail!);form.set("failedLead","failed123");
 await createNormalManualAudit(form);
 const slug=(lists.get("scorecard-manual-audits") as string[])[0];
 expect(values.get("scorecard-failed-lead:failed123")).toMatchObject({linkedSlug:slug});
 noSideEffects();
});
