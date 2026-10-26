import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { detectProspectContext } from "./detect";
import { generateScorecard } from "./generate";
import { fetchSite } from "./fetch-site";
import { detectProductContext, scoreCompanyRubric } from "./anthropic";
import { currentEnvelope } from "./call-cache";
import { generateCacheKey, gatherEvidence } from "./orchestrator";
import { prospectFromRunInput, runIdFor } from "./run";

const { store, contexts } = vi.hoisted(() => ({ store: new Map<string, unknown>(), contexts: [] as Array<string | null> }));
vi.mock("./kv", () => ({ getKv: () => ({ get: async (key: string) => store.get(key) ?? null, set: async (key: string, value: unknown) => { store.set(key, value); } }) }));
vi.mock("./fetch-site", async (original) => {
  const actual = await original<typeof import("./fetch-site")>();
  return { ...actual, fetchSite: vi.fn(actual.fetchSite) };
});
vi.mock("./anthropic", async (original) => {
  const actual = await original<typeof import("./anthropic")>();
  const { currentEnvelope } = await import("./call-cache");
  return { ...actual,
    detectProductContext: vi.fn(async (...args: Parameters<typeof actual.detectProductContext>) => { contexts.push(currentEnvelope()); return actual.detectProductContext(...args); }),
    scoreCompanyRubric: vi.fn(async (...args: Parameters<typeof actual.scoreCompanyRubric>) => { contexts.push(currentEnvelope()); return actual.scoreCompanyRubric(...args); }),
  };
});
const prospect = prospectFromRunInput({ url: "example.com", productOneLiner: "Industrial machines", competitors: ["rival.example"] });
beforeEach(() => { store.clear(); contexts.length = 0; vi.clearAllMocks(); vi.stubEnv("SCORECARD_MOCK", "1"); });
afterEach(() => vi.unstubAllEnvs());

it("fresh detection re-fetches despite a saved detection and disables raw-call memoization", async () => {
  await detectProspectContext(prospect);
  await detectProspectContext(prospect);
  expect(fetchSite).toHaveBeenCalledTimes(1);
  expect(detectProductContext).toHaveBeenCalledTimes(1);
  await detectProspectContext(prospect, { fresh: true });
  expect(fetchSite).toHaveBeenCalledTimes(2);
  expect(detectProductContext).toHaveBeenCalledTimes(2);
  expect(contexts[0]).toMatch(/^scorecard-detect:v5:/);
  expect(contexts[1]).toBeNull();
  expect(currentEnvelope()).toBeNull();
});

it("fresh generation re-gathers pages and scores despite a cached report", async () => {
  await generateScorecard(prospect);
  const firstFetches = vi.mocked(fetchSite).mock.calls.length;
  const firstScores = vi.mocked(scoreCompanyRubric).mock.calls.length;
  expect(firstFetches).toBeGreaterThan(0);
  await generateScorecard(prospect);
  expect(fetchSite).toHaveBeenCalledTimes(firstFetches);
  contexts.length = 0;
  await generateScorecard(prospect, { fresh: true });
  expect(fetchSite).toHaveBeenCalledTimes(firstFetches * 2);
  expect(scoreCompanyRubric).toHaveBeenCalledTimes(firstScores * 2);
  expect(contexts.length).toBeGreaterThan(0);
  expect(contexts.every((envelope) => envelope === null)).toBe(true);
});

it("retires old evidence and finished-report cache entries without changing capture identity", async () => {
  const captureId = runIdFor(prospect);
  const oldKey = `scorecard-gen:${captureId}`;
  store.set(oldKey, { old: true });
  store.set(`${oldKey}:evidence`, { old: true });
  const evidence = await gatherEvidence(prospect);
  expect(evidence.companies[0].fetched).toBe(true);
  const result = await generateScorecard(prospect);
  expect(result.cached).toBe(false);
  expect(result.result.meta.company).toBe(prospect.company);
  expect(generateCacheKey(prospect)).toBe(`${oldKey}:site-read:v2`);
  expect(runIdFor(prospect)).toBe(captureId);
});
