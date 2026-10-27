import { afterEach, beforeEach, expect, it, vi } from "vitest";
import fixture from "../fixtures/scorecard-result.json";
import type { ScorecardResult } from "../result";
import type { SharedScorecard } from "../share";

import {
  runManualAudit,
  rerunManualAudit,
  listManualAudits,
  readManualAudit,
} from "./run";
import { cleanPastedText } from "./paste";
import { MANUAL_LIMITATION } from "./evidence";
import { fetchSite } from "../fetch-site";
import { captureFirstImpression } from "../screenshot";
import { runPageSpeed } from "../pagespeed";
import { gatherOffsiteEvidence } from "../offsite";
import {
  detectProductContext,
  readFirstImpression,
  scoreCompanyRubric,
  writeDeckCopy,
} from "../anthropic";
import { RUBRIC } from "../rubric";
import { generateScorecardUncached } from "../generate";
import { getKv } from "../kv";
import { pushLead } from "../leads";
import { notifyTeam, notifyFailedScan, sendFallbackEmail1 } from "../notify";
import { sendResendEmail } from "@/lib/resend";
import { createFunnelrClient } from "@/lib/funnelr/client";
import { submitScorecardLeadToFunnelr } from "../lead-funnelr";
import { sendCapiEvent } from "@/lib/meta/capi";
import { trackMeta } from "@/lib/meta/track";
import { bumpFunnel } from "@/lib/funnel/counter";
import { recordScanOutcome } from "../diagnostics";
import { currentEnvelope } from "../call-cache";
import {
  createManualAudit,
  rerunManualAudit as rerunAction,
} from "@/app/audit/admin/manual/actions";
import { isValidSession } from "../auth";

vi.mock("../fetch-site", async (original) => ({
  ...(await original<typeof import("../fetch-site")>()),
  fetchSite: vi.fn(),
}));
vi.mock("../screenshot", () => ({ captureFirstImpression: vi.fn() }));
vi.mock("../pagespeed", () => ({ runPageSpeed: vi.fn() }));
vi.mock("../offsite", async (original) => ({
  ...(await original<typeof import("../offsite")>()),
  gatherOffsiteEvidence: vi.fn(),
}));
vi.mock("../anthropic", async (original) => ({
  ...(await original<typeof import("../anthropic")>()),
  detectProductContext: vi.fn(),
  readFirstImpression: vi.fn(),
  scoreCompanyRubric: vi.fn(),
  writeDeckCopy: vi.fn(),
}));
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
    lpush: vi.fn(async (key: string, value: unknown) => {
      lists.set(key, [value, ...(lists.get(key) ?? [])]);
    }),
    lrange: vi.fn(async (key: string) => lists.get(key) ?? []),
    ltrim: vi.fn(async (key: string, start: number, end: number) => {
      lists.set(key, (lists.get(key) ?? []).slice(start, end + 1));
    }),
  }),
}));
const paste = `PRIVATE_PASTE_MARKER Homepage makes industrial pumps. ${"Product technical description and company facts. ".repeat(30)}\n---\nContact our factory.`;
const input = {
  url: "https://blocked.example",
  pasteRaw: paste,
  competitorsRaw: "rival.example",
  contactName: "PRIVATE_CONTACT",
  contactEmail: "private-contact@example.org",
};
const usage = {
  inputTokens: 0,
  outputTokens: 0,
  estimatedCostUsd: 0,
  model: "test",
  latencyMs: 0,
};

beforeEach(() => {
  values.clear();
  lists.clear();
  vi.clearAllMocks();
  vi.mocked(isValidSession).mockReturnValue(true);
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Unexpected external request");
    })
  );
  vi.mocked(detectProductContext).mockResolvedValue({
    ok: true,
    usage,
    data: {
      companyName: "Factory",
      productOneLiner: "Manufactures industrial pumps",
      competitors: ["rival.example", "second.example", "third.example"],
      industryFit: "manufacturer",
      productFamilies: ["Pump X"],
      industries: [],
      certifications: [],
      salesModel: "direct",
      buyerPersona: "Factories",
    },
  });
  vi.mocked(fetchSite).mockResolvedValue({
    ok: false,
    reason: "competitor unavailable",
  });
  vi.mocked(captureFirstImpression).mockResolvedValue({
    desktop: "base64",
    mobile: null,
    desktopUrl: "https://shots.example/rival",
    mobileUrl: null,
  });
  vi.mocked(readFirstImpression).mockResolvedValue({
    ok: false,
    reason: "test",
  });
  vi.mocked(runPageSpeed).mockResolvedValue(null);
  vi.mocked(gatherOffsiteEvidence).mockResolvedValue({
    facts: [],
    searchBlock: "Search evidence",
    queriesUsed: 0,
  });
  vi.mocked(generateScorecardUncached).mockImplementation(
    async () => structuredClone(fixture) as unknown as ScorecardResult
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function assertNoSideEffects() {
  for (const forbidden of [
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
    expect(forbidden).not.toHaveBeenCalled();
  expect(lists.has("scorecard-leads")).toBe(false);
  for (const key of values.keys())
    expect(
      key.startsWith("scorecard-manual:") || key.startsWith("scorecard:")
    ).toBe(true);
}

it("scores pasted evidence with global fetch throwing, only collects on-site evidence for competitors, and saves isolated private data", async () => {
  const { slug } = await runManualAudit(input);
  for (const fn of [fetchSite, captureFirstImpression, runPageSpeed]) {
    expect(fn).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fn).mock.calls[0][0]).toBe("https://rival.example");
  }
  expect(readFirstImpression).toHaveBeenCalledTimes(1);
  expect(gatherOffsiteEvidence).toHaveBeenCalledWith(
    "Factory",
    "https://blocked.example/",
    expect.anything(),
    { categoryTerm: "Manufactures industrial pumps" }
  );
  expect(detectProductContext).toHaveBeenCalledWith(
    expect.objectContaining({ siteText: cleanPastedText(paste) })
  );
  const [prospect, options] = vi.mocked(generateScorecardUncached).mock
    .calls[0];
  expect(prospect.name).toBe("");
  const evidence = options!.evidenceOverride!.companies[0];
  expect(evidence).toMatchObject({
    fetched: true,
    siteText: cleanPastedText(paste),
    firstImpression: null,
    pageSpeed: null,
    screenshots: { desktopUrl: null, mobileUrl: null },
    flags: [MANUAL_LIMITATION],
  });
  expect(evidence.siteFacts).toBeUndefined();
  expect(
    evidence.searchBlock.startsWith(
      `## MANUAL EVIDENCE LIMITATIONS\n${MANUAL_LIMITATION}`
    )
  ).toBe(true);
  const record = await readManualAudit(slug);
  expect(record).toMatchObject({
    slug,
    pastedText: cleanPastedText(paste),
    contactName: input.contactName,
    contactEmail: input.contactEmail,
    runCount: 1,
    qualifiedDecision: { qualified: true },
  });
  expect(lists.get("scorecard-manual-audits")).toEqual([slug]);
  expect(await listManualAudits()).toEqual([record]);
  const shared = values.get(`scorecard:${slug}`) as SharedScorecard;
  expect(shared.loomUrl).toBeNull();
  expect(
    new Date(shared.expiresAt).getTime() - new Date(shared.createdAt).getTime()
  ).toBeCloseTo(180 * 86_400_000, -2);
  expect(shared.prospectData.name).toBe("");
  expect(shared.result.meta.contactName).toBe("");
  for (const secret of [
    "PRIVATE_PASTE_MARKER",
    input.contactName,
    input.contactEmail,
    "pastedText",
    "pasteRaw",
  ])
    expect(JSON.stringify(shared)).not.toContain(secret);
  assertNoSideEffects();
});

it("re-runs stored text and competitors into the SAME slug, also accepting replacement text", async () => {
  const { slug } = await runManualAudit(input);
  const original = values.get(`scorecard:${slug}`) as SharedScorecard;
  await rerunManualAudit(slug);
  expect(vi.mocked(detectProductContext).mock.calls[1][0].siteText).toBe(
    cleanPastedText(paste)
  );
  expect(await readManualAudit(slug)).toMatchObject({
    runCount: 2,
    pastedText: cleanPastedText(paste),
  });
  const updatedText = "Updated pump models and factory information. ".repeat(
    25
  );
  expect(await rerunManualAudit(slug, { newPasteRaw: updatedText })).toEqual({
    slug,
    reportUrl: `/audit/r/${slug}`,
  });
  expect(await readManualAudit(slug)).toMatchObject({
    runCount: 3,
    pastedText: cleanPastedText(updatedText),
  });
  expect(lists.get("scorecard-manual-audits")).toEqual([slug]);
  expect((values.get(`scorecard:${slug}`) as SharedScorecard).createdAt).toBe(
    original.createdAt
  );
  expect(
    [...values.keys()].filter((key) => key.startsWith("scorecard:"))
  ).toEqual([`scorecard:${slug}`]);
  assertNoSideEffects();
});

it("writes nothing when fewer than three pillars are scored, including on re-run", async () => {
  const poor = structuredClone(fixture) as unknown as ScorecardResult;
  poor.scores
    .find((s) => s.isProspect)!
    .categories.forEach((category, i) => {
      if (i >= 2) category.total = null;
    });
  vi.mocked(generateScorecardUncached).mockResolvedValue(poor);
  await expect(runManualAudit(input)).rejects.toThrow("notready");
  expect(values.size).toBe(0);
  expect(lists.size).toBe(0);
  vi.mocked(generateScorecardUncached).mockResolvedValue(
    structuredClone(fixture) as unknown as ScorecardResult
  );
  const { slug } = await runManualAudit(input);
  const snapshot = JSON.stringify([...values]);
  vi.mocked(generateScorecardUncached).mockResolvedValue(poor);
  await expect(rerunManualAudit(slug)).rejects.toThrow("notready");
  expect(JSON.stringify([...values])).toBe(snapshot);
  assertNoSideEffects();
});

it("rejects bad inputs without detecting or writing", async () => {
  for (const [fields, code] of [
    [{ url: "http://localhost" }, "url"],
    [{ pasteRaw: "" }, "nopaste"],
    [{ pasteRaw: "short" }, "short"],
    [{ pasteRaw: "Just a moment" }, "challenge"],
  ] as const) {
    await expect(runManualAudit({ ...input, ...fields })).rejects.toThrow(code);
  }
  expect(detectProductContext).not.toHaveBeenCalled();
  expect(values.size).toBe(0);
  expect(lists.size).toBe(0);
});

it("uses detected competitors when none were typed, while preventing a prospect self-match", async () => {
  await runManualAudit({ ...input, competitorsRaw: "" });
  expect(fetchSite).toHaveBeenCalledTimes(3);
  vi.mocked(fetchSite).mockClear();
  await runManualAudit({ ...input, competitorsRaw: "https://blocked.example" });
  expect(fetchSite).not.toHaveBeenCalled();
  assertNoSideEffects();
});

it("times out without saving, even if background generation completes later", async () => {
  vi.useFakeTimers();
  let finish!: (result: ScorecardResult) => void;
  vi.mocked(generateScorecardUncached).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const pending = runManualAudit(input);
  const assertion = expect(pending).rejects.toThrow("timeout");
  await vi.advanceTimersByTimeAsync(270_000);
  await assertion;
  finish(structuredClone(fixture) as unknown as ScorecardResult);
  await vi.advanceTimersByTimeAsync(1);
  expect(values.size).toBe(0);
  expect(lists.size).toBe(0);
  assertNoSideEffects();
});

it("rejects unauthenticated create and re-run server actions before any work", async () => {
  vi.mocked(isValidSession).mockReturnValue(false);
  await expect(createManualAudit(new FormData())).rejects.toThrow(
    "Not signed in"
  );
  await expect(rerunAction(new FormData())).rejects.toThrow("Not signed in");
  expect(detectProductContext).not.toHaveBeenCalled();
  expect(values.size).toBe(0);
});

it("does not reuse public call caches", async () => {
  vi.mocked(generateScorecardUncached).mockImplementation(async () => {
    expect(currentEnvelope()).toBeNull(); // fresh manual attempt bypasses raw-call memoization
    return structuredClone(fixture) as unknown as ScorecardResult;
  });
  await runManualAudit(input);
  expect(getKv).toBeDefined();
  assertNoSideEffects();
});

it("runs the real generator with manual evidence, preserving unassessable checks without a fallback crawl", async () => {
  const real =
    await vi.importActual<typeof import("../generate")>("../generate");
  vi.mocked(generateScorecardUncached).mockImplementation(
    real.generateScorecardUncached
  );
  vi.mocked(scoreCompanyRubric).mockImplementation(async ({ evidence }) => {
    if (evidence.isProspect) {
      expect(evidence.flags).toContain(MANUAL_LIMITATION);
      expect(evidence.searchBlock).toContain(MANUAL_LIMITATION);
      expect(evidence.siteFacts).toBeUndefined();
    }
    return {
      ok: true,
      usage,
      data: {
        checks: RUBRIC.flatMap((category) =>
          category.checks.map((check) => {
            const assessable =
              check.key !== "pagespeed" &&
              category.key !== "brand-identity" &&
              category.key !== "product-visuals";
            return {
              key: check.key,
              score: assessable ? 2 : null,
              assessable,
              evidence: assessable
                ? "Text supports this check."
                : "Visual or measured evidence was not collected.",
            };
          })
        ),
      },
    };
  });
  vi.mocked(writeDeckCopy).mockResolvedValue({
    ok: false,
    reason: "use templated copy",
  });
  const { slug } = await runManualAudit(input);
  const shared = values.get(`scorecard:${slug}`) as SharedScorecard;
  const prospect = shared.result.scores.find((company) => company.isProspect)!;
  expect(
    prospect.categories.filter((category) => category.total !== null)
  ).toHaveLength(3);
  expect(
    prospect.categories
      .find((category) => category.key === "website")!
      .checks.find((check) => check.key === "pagespeed")
  ).toMatchObject({ score: null, assessable: false });
  expect(shared.result.flags).toContain(MANUAL_LIMITATION);
  for (const secret of [
    "PRIVATE_PASTE_MARKER",
    input.contactName,
    input.contactEmail,
  ])
    expect(JSON.stringify(shared)).not.toContain(secret);
  for (const fn of [fetchSite, captureFirstImpression, runPageSpeed])
    expect(fn).toHaveBeenCalledTimes(1);
  assertNoSideEffects();
});
