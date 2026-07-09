import { test, vi, beforeEach } from "vitest";
import assert from "node:assert/strict";

// Every evidence stream is mocked at module level so the orchestrator's
// behaviour (fan-out, parallelism, failure tolerance, budget accounting) is
// tested without network, KV or model access.
const mocks = vi.hoisted(() => ({
  fetchSite: vi.fn(),
  captureFirstImpression: vi.fn(),
  runPageSpeed: vi.fn(),
  readFirstImpression: vi.fn(),
  searchWeb: vi.fn(),
}));

vi.mock("./fetch-site", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./fetch-site")>();
  return { ...actual, fetchSite: mocks.fetchSite };
});
vi.mock("./screenshot", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./screenshot")>();
  return { ...actual, captureFirstImpression: mocks.captureFirstImpression };
});
vi.mock("./pagespeed", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./pagespeed")>();
  return { ...actual, runPageSpeed: mocks.runPageSpeed };
});
vi.mock("./anthropic", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./anthropic")>();
  return { ...actual, readFirstImpression: mocks.readFirstImpression };
});
vi.mock("./web-search", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./web-search")>();
  return { ...actual, searchWeb: mocks.searchWeb };
});

import { gatherEvidenceUncached, type ScanStage } from "./orchestrator";
import type { ProspectData } from "./types";

const prospect: ProspectData = {
  name: "",
  role: "",
  company: "Veltkamp Dosing",
  url: "https://veltkamp-dosing.nl",
  productOneLiner: "Precision dosing equipment for food production lines",
  competitors: [{ raw: "dosatech.de" }, { raw: "flowserve-dosing.com" }],
};

const okSite = (url: string) => ({ ok: true as const, text: `content of ${url}`, title: "t", finalUrl: url });
const okShots = {
  desktop: "b64",
  mobile: "b64",
  desktopUrl: "https://shots.test/d",
  mobileUrl: "https://shots.test/m",
};
const okVision = {
  ok: true as const,
  data: {
    apparentOffer: "dosing machines",
    offerClearInFiveSeconds: true,
    designEra: "current",
    premiumFeel: "solid",
    imageryQuality: "mixed",
    threeDOrCgi: false,
    videoPresent: false,
    productVisualsPresent: true,
    notes: [],
  },
  usage: { model: "test", inputTokens: 100, outputTokens: 50, webSearchRequests: 0, estimatedCostUsd: 0.01, latencyMs: 5 },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fetchSite.mockImplementation(async (url: string) => okSite(url));
  mocks.captureFirstImpression.mockResolvedValue(okShots);
  mocks.runPageSpeed.mockResolvedValue({ mobile: { performance: 60, seo: 80, accessibility: 70, bestPractices: 75 }, desktop: { performance: 80, seo: 82, accessibility: 72, bestPractices: 78 }, lcp: "2.1 s" });
  mocks.readFirstImpression.mockResolvedValue(okVision);
  mocks.searchWeb.mockResolvedValue({ query: "q", organic: [], knowledgeGraph: null });
});

test("prospect plus every competitor goes through the identical pipeline", async () => {
  const set = await gatherEvidenceUncached(prospect);
  assert.equal(set.companies.length, 3);
  assert.equal(set.companies[0].isProspect, true);
  assert.equal(set.companies[0].company, "Veltkamp Dosing");
  for (const c of set.companies) {
    assert.equal(c.fetched, true);
    assert.equal(c.pageSpeed?.mobile?.performance, 60);
    assert.ok(c.firstImpression);
    assert.equal(c.screenshots.desktopUrl, "https://shots.test/d");
    // Prospect gets the extra category-findability fact; rivals do not.
    assert.equal(c.offsiteFacts.length, c.isProspect ? 4 : 3);
  }
  // 1 crawl per company
  assert.equal(mocks.fetchSite.mock.calls.length, 3);
  // vision once per company (budget: maxVisionReadsPerCompany = 1)
  assert.equal(mocks.readFirstImpression.mock.calls.length, 3);
});

test("companies run in parallel, not sequentially", async () => {
  let inFlight = 0;
  let maxInFlight = 0;
  mocks.fetchSite.mockImplementation(async (url: string) => {
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((r) => setTimeout(r, 20));
    inFlight--;
    return okSite(url);
  });
  await gatherEvidenceUncached(prospect);
  assert.ok(maxInFlight >= 2, `expected concurrent crawls, saw max ${maxInFlight}`);
});

test("a competitor whose site is down produces fetched:false and the run completes", async () => {
  mocks.fetchSite.mockImplementation(async (url: string) => {
    if (url.includes("dosatech")) return { ok: false as const, reason: "Site responded with status 503." };
    return okSite(url);
  });
  const set = await gatherEvidenceUncached(prospect);
  assert.equal(set.companies.length, 3);
  const down = set.companies.find((c) => c.url?.includes("dosatech"));
  assert.ok(down);
  assert.equal(down.fetched, false);
  assert.equal(down.fetchReason, "Site responded with status 503.");
  assert.ok(down.flags.some((f) => f.includes("Site fetch failed")));
  // The rest of the down company's evidence still gathered.
  assert.equal(down.pageSpeed?.mobile?.performance, 60);
  assert.equal(down.offsiteFacts.length, 3);
});

test("an unresolved competitor stays in the run with resolved:false and off-site facts only", async () => {
  // Name entry that resolution cannot place (searchWeb returns nothing).
  const withName: ProspectData = {
    ...prospect,
    competitors: [{ raw: "dosatech.de" }, { raw: "Completely Unknown Rival" }],
  };
  const set = await gatherEvidenceUncached(withName);
  assert.equal(set.companies.length, 3);
  const unresolved = set.companies.find((c) => c.rawEntry === "Completely Unknown Rival");
  assert.ok(unresolved);
  assert.equal(unresolved.resolved, false);
  assert.equal(unresolved.fetched, false);
  assert.equal(unresolved.url, null);
  assert.equal(unresolved.offsiteFacts.length, 3);
  assert.ok(set.flags.some((f) => f.includes("Completely Unknown Rival")));
  // No crawl, screenshot or PageSpeed spent on it.
  assert.equal(mocks.fetchSite.mock.calls.length, 2);
});

test("stage callbacks fire in pipeline order", async () => {
  const stages: ScanStage[] = [];
  await gatherEvidenceUncached(prospect, { onStage: (s) => stages.push(s) });
  assert.deepEqual(stages, ["reading", "impressions", "competitors", "scoring"]);
});

test("search query usage is counted and capped", async () => {
  const set = await gatherEvidenceUncached(prospect);
  // 3 companies x 4 off-site queries (linkedin, pdf, site-pdf, trade shows)
  // + 1 category-findability query for the prospect.
  assert.equal(set.searchQueriesUsed, 13);
  assert.ok(set.searchQueriesUsed <= 24);
});

test("estimated cost sums AI usage plus search spend", async () => {
  const set = await gatherEvidenceUncached(prospect);
  // 3 vision reads x $0.01 + 13 searches x $0.001 = 0.043
  assert.equal(set.estimatedCostUsd, 0.043);
});
