import { test } from "vitest";
import assert from "node:assert/strict";
import {
  categoryTotal,
  overallScore,
  pageSpeedWeighted,
  pageSpeedPoints,
  pageSpeedCheck,
  verdictBand,
  computeBenchmark,
  firstFixCategory,
  assembleCompanyScores,
  unscoredCompany,
  type CheckScore,
  type CompanyScores,
  type RawCheck,
} from "./scoring";
import { RUBRIC, CATEGORY_KEYS, type CategoryKey } from "./rubric";

const check = (key: string, score: number | null, assessable = score !== null): CheckScore => ({
  key,
  score,
  assessable,
  evidence: "e",
});

// Build a CompanyScores with fixed category totals (bypassing checks).
function companyWith(totals: Partial<Record<CategoryKey, number | null>>, opts: { company?: string; isProspect?: boolean } = {}): CompanyScores {
  const categories = CATEGORY_KEYS.map((key) => ({
    key,
    checks: [],
    total: totals[key] ?? null,
    assessedChecks: totals[key] === null || totals[key] === undefined ? 0 : 5,
  }));
  return {
    company: opts.company ?? "Test Co",
    isProspect: opts.isProspect ?? true,
    scored: true,
    categories,
    overall: overallScore(categories),
  };
}

// ── Category and overall scaling ─────────────────────────────────────────────
test("category total scales over assessable checks only (null checks excluded from denominator)", () => {
  // 3 assessed of 5, scoring 4+2+2 = 8 of 12 -> 20 * 8/12 = 13.33 -> 13
  const { total, assessed } = categoryTotal([
    check("a", 4),
    check("b", 2),
    check("c", 2),
    check("d", null),
    check("e", null),
  ]);
  assert.equal(assessed, 3);
  assert.equal(total, 13);
});

test("a fully assessed category is a plain sum scaled to 20", () => {
  const { total } = categoryTotal([check("a", 4), check("b", 4), check("c", 4), check("d", 4), check("e", 4)]);
  assert.equal(total, 20);
  const { total: low } = categoryTotal([check("a", 0), check("b", 0), check("c", 0), check("d", 0), check("e", 0)]);
  assert.equal(low, 0);
});

test("a category with zero assessable checks has a null total, and the overall scales over scored categories", () => {
  const { total } = categoryTotal([check("a", null), check("b", null)]);
  assert.equal(total, null);
  // 4 categories at 15/20 plus one null -> overall = 100 * 60 / 80 = 75
  const c = companyWith({ "brand-identity": 15, website: 15, "product-visuals": 15, "trade-show-print": 15, "message-clarity": null });
  assert.equal(c.overall, 75);
});

// ── PageSpeed mapping table (deterministic, in code) ─────────────────────────
test("pageSpeed weighted average is mobile-weighted 60/40 with single-strategy fallback", () => {
  assert.equal(pageSpeedWeighted({ mobile: { performance: 50, seo: null, accessibility: null, bestPractices: null }, desktop: { performance: 100, seo: null, accessibility: null, bestPractices: null }, lcp: null }), 70);
  assert.equal(pageSpeedWeighted({ mobile: { performance: 40, seo: null, accessibility: null, bestPractices: null }, desktop: null, lcp: null }), 40);
  assert.equal(pageSpeedWeighted({ mobile: null, desktop: { performance: 80, seo: null, accessibility: null, bestPractices: null }, lcp: null }), 80);
  assert.equal(pageSpeedWeighted(null), null);
});

test("the points table maps the same numbers to the same points, always", () => {
  assert.equal(pageSpeedPoints(95), 4);
  assert.equal(pageSpeedPoints(90), 4);
  assert.equal(pageSpeedPoints(89), 3);
  assert.equal(pageSpeedPoints(75), 3);
  assert.equal(pageSpeedPoints(74), 2);
  assert.equal(pageSpeedPoints(50), 2);
  assert.equal(pageSpeedPoints(49), 1);
  assert.equal(pageSpeedPoints(25), 1);
  assert.equal(pageSpeedPoints(24), 0);
  assert.equal(pageSpeedPoints(0), 0);
  assert.equal(pageSpeedPoints(null), null);
});

test("missing PageSpeed renders as could-not-be-measured, never a zero", () => {
  const c = pageSpeedCheck(null);
  assert.equal(c.score, null);
  assert.equal(c.assessable, false);
  assert.ok(c.evidence.includes("could not be measured"));
});

// ── Verdict bands (the overall score sets the verdict, always) ───────────────
test("verdict bands: 80 to 100 narrow, 60 to 79 visible, below 60 wide", () => {
  assert.equal(verdictBand(100), "narrow");
  assert.equal(verdictBand(80), "narrow");
  assert.equal(verdictBand(79), "visible");
  assert.equal(verdictBand(60), "visible");
  assert.equal(verdictBand(59), "wide");
  assert.equal(verdictBand(0), "wide");
});

// ── The guardrail: benchmark adjusts wording, never the verdict ─────────────
test("GUARDRAIL: a score of 82 that trails one competitor stays narrow gap", () => {
  const prospect = companyWith({ "brand-identity": 16, website: 17, "product-visuals": 16, "trade-show-print": 16, "message-clarity": 17 });
  assert.equal(prospect.overall, 82);
  const rival = companyWith({ "brand-identity": 18, website: 18, "product-visuals": 18, "trade-show-print": 17, "message-clarity": 17 }, { company: "Rival", isProspect: false });
  assert.equal(rival.overall, 88);

  // The verdict comes from the prospect's own score. Full stop.
  assert.equal(verdictBand(prospect.overall!), "narrow");

  // The benchmark only sets the stance (wording emphasis).
  const bm = computeBenchmark(prospect, [rival]);
  assert.equal(bm.stance, "behind");
  assert.equal(bm.bestRival?.company, "Rival");
  assert.equal(bm.aheadRivals[0].company, "Rival");
  // Wide gap only ever comes from the prospect's own score: no combination of
  // rivals can produce it here.
  assert.notEqual(verdictBand(prospect.overall!), "wide");
});

test("benchmark stances: ahead, level (within 2), behind, and no-benchmark", () => {
  const p = companyWith({ "brand-identity": 14, website: 14, "product-visuals": 14, "trade-show-print": 14, "message-clarity": 14 });
  assert.equal(p.overall, 70);
  const rival = (overall20: number, name: string) =>
    companyWith({ "brand-identity": overall20, website: overall20, "product-visuals": overall20, "trade-show-print": overall20, "message-clarity": overall20 }, { company: name, isProspect: false });

  assert.equal(computeBenchmark(p, [rival(12, "Weak")]).stance, "ahead");
  const level = computeBenchmark(p, [rival(14, "Even")]);
  assert.equal(level.stance, "level");
  assert.equal(computeBenchmark(p, [rival(17, "Strong")]).stance, "behind");
  assert.equal(computeBenchmark(p, []).stance, "no-benchmark");

  const unscored = unscoredCompany("Ghost", false);
  assert.equal(computeBenchmark(p, [unscored]).stance, "no-benchmark");
});

test("behind rivals carry the category where they pull ahead the furthest", () => {
  const p = companyWith({ "brand-identity": 14, website: 10, "product-visuals": 14, "trade-show-print": 14, "message-clarity": 14 });
  const r = companyWith({ "brand-identity": 15, website: 18, "product-visuals": 14, "trade-show-print": 14, "message-clarity": 15 }, { company: "R", isProspect: false });
  const bm = computeBenchmark(p, [r]);
  assert.equal(bm.stance, "behind");
  assert.equal(bm.aheadRivals[0].leadCategory, "website");
  assert.equal(bm.aheadRivals[0].leadMargin, 8);
});

// ── First place to fix ───────────────────────────────────────────────────────
test("first fix is the lowest prospect category", () => {
  const p = companyWith({ "brand-identity": 15, website: 16, "product-visuals": 8, "trade-show-print": 12, "message-clarity": 14 });
  assert.equal(firstFixCategory(p), "product-visuals");
});

test("ties break by buyer visibility order: website, message clarity, product visuals, brand identity, trade show and print", () => {
  const tie = companyWith({ "brand-identity": 10, website: 12, "product-visuals": 10, "trade-show-print": 10, "message-clarity": 10 });
  // brand-identity, product-visuals, trade-show-print and message-clarity all
  // tie at 10; message clarity outranks the others in the fix order.
  assert.equal(firstFixCategory(tie), "message-clarity");

  const tie2 = companyWith({ "brand-identity": 10, website: 10, "product-visuals": 10, "trade-show-print": 10, "message-clarity": 10 });
  assert.equal(firstFixCategory(tie2), "website");
});

test("an unassessable category can never be the first fix", () => {
  const p = companyWith({ "brand-identity": 15, website: 16, "product-visuals": null, "trade-show-print": 12, "message-clarity": 14 });
  assert.equal(firstFixCategory(p), "trade-show-print");
});

// ── Assembly ────────────────────────────────────────────────────────────────
test("assembleCompanyScores overrides the pagespeed check deterministically and tolerates missing checks", () => {
  const raw: RawCheck[] = RUBRIC.flatMap((cat) =>
    cat.checks
      .filter((c) => c.key !== "outdated-signals") // deliberately omitted
      .map((c) => ({
        key: c.key,
        // The model is told to null the pagespeed check; simulate it trying to
        // score it anyway: assembly must still override.
        score: c.key === "pagespeed" ? 1 : 3,
        assessable: true,
        evidence: "seen",
      })),
  );
  const scores = assembleCompanyScores({
    company: "X",
    isProspect: true,
    rawChecks: raw,
    pageSpeed: { mobile: { performance: 95, seo: null, accessibility: null, bestPractices: null }, desktop: { performance: 92, seo: null, accessibility: null, bestPractices: null }, lcp: "1.0 s" },
  });
  const website = scores.categories.find((c) => c.key === "website")!;
  const ps = website.checks.find((c) => c.key === "pagespeed")!;
  assert.equal(ps.score, 4); // weighted 94 -> 4, NOT the model's 1
  assert.ok(ps.evidence.includes("Measured PageSpeed"));
  const missing = website.checks.find((c) => c.key === "outdated-signals")!;
  assert.equal(missing.assessable, false);
  assert.equal(missing.score, null);
});

test("scores outside 0..4 are clamped, and null-with-assessable is normalised to unassessable", () => {
  const raw: RawCheck[] = RUBRIC.flatMap((cat) =>
    cat.checks.map((c) => ({ key: c.key, score: c.key === "worth-more" ? 9 : c.key === "quote-path" ? -2 : 2, assessable: true, evidence: "e" })),
  );
  const scores = assembleCompanyScores({ company: "X", isProspect: true, rawChecks: raw, pageSpeed: null });
  const mc = scores.categories.find((c) => c.key === "message-clarity")!;
  assert.equal(mc.checks.find((c) => c.key === "worth-more")!.score, 4);
  assert.equal(mc.checks.find((c) => c.key === "quote-path")!.score, 0);
});
