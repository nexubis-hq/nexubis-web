import { test, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";
import { generateScorecardUncached } from "./generate";
import { RUBRIC, CATEGORY_KEYS } from "./rubric";
import { prospectScores } from "./result";
import type { ProspectData } from "./types";

// Full generation round-trip in mock mode: evidence, scoring, verdict, copy,
// routing, all with zero spend. Mock scores are deterministic per company and
// check, so totals must be stable across runs.
const prospect: ProspectData = {
  name: "",
  role: "",
  company: "Veltkamp Dosing",
  url: "https://veltkamp-dosing.nl",
  productOneLiner: "Precision dosing equipment for food production lines",
  competitors: [{ raw: "dosatech.de" }, { raw: "flowserve-dosing.com" }],
};

beforeEach(() => {
  process.env.SCORECARD_MOCK = "1";
});
afterEach(() => {
  delete process.env.SCORECARD_MOCK;
});

test("generation produces the Section 15 structured result from end to end", async () => {
  const result = await generateScorecardUncached(prospect);

  // meta
  assert.equal(result.meta.company, "Veltkamp Dosing");
  assert.equal(result.meta.contactName, ""); // unlock gate fills this later
  assert.equal(result.meta.competitors.length, 2);

  // scores: prospect first, identical rubric shape per company
  assert.equal(result.scores.length, 3);
  const p = prospectScores(result);
  assert.ok(p && p.scored);
  assert.equal(p.categories.length, 5);
  for (const cat of p.categories) {
    assert.equal(cat.checks.length, 5);
    assert.ok(CATEGORY_KEYS.includes(cat.key));
    for (const check of cat.checks) {
      assert.ok(typeof check.evidence === "string" && check.evidence.length > 0);
      if (check.score !== null) {
        assert.ok(check.score >= 0 && check.score <= 4);
      } else {
        assert.equal(check.assessable, false);
      }
    }
  }
  assert.ok(p.overall !== null && p.overall >= 0 && p.overall <= 100);

  // verdict + first fix
  assert.ok(["narrow", "visible", "wide"].includes(result.verdict.band));
  assert.ok(result.verdict.paragraph.length > 0);
  assert.ok(result.firstFix);
  assert.ok(CATEGORY_KEYS.includes(result.firstFix.category));

  // exhibits: one per company, prospect first
  assert.equal(result.exhibits.length, 3);
  assert.equal(result.exhibits[0].isProspect, true);

  // deck copy: every category present with 2-3 findings
  assert.equal(result.deckCopy.categories.length, 5);
  for (const c of result.deckCopy.categories) {
    assert.ok(c.findings.length >= 1 && c.findings.length <= 3);
  }

  // routing
  assert.equal(result.routing.verticalGuess, "food-processing");
  assert.equal(result.routing.geoGuess, "Netherlands");
  assert.equal(result.routing.roleSeniority, "unknown");
});

test("scoring a fixture prospect yields stable totals across runs (determinism)", async () => {
  const a = await generateScorecardUncached(prospect);
  const b = await generateScorecardUncached(prospect);
  const pa = prospectScores(a)!;
  const pb = prospectScores(b)!;
  assert.equal(pa.overall, pb.overall);
  assert.deepEqual(
    pa.categories.map((c) => c.total),
    pb.categories.map((c) => c.total),
  );
  assert.equal(a.verdict.band, b.verdict.band);
  assert.equal(a.firstFix?.category, b.firstFix?.category);
});

test("generated copy carries no em dashes and never the banned client-facing word", async () => {
  const result = await generateScorecardUncached(prospect);
  const EM = String.fromCharCode(0x2014);
  const texts = [
    result.verdict.paragraph,
    ...result.deckCopy.categories.flatMap((c) => [...c.findings, c.competitorNote]),
    result.firstFix?.why ?? "",
    result.firstFix?.inPractice ?? "",
    ...result.scores.flatMap((s) => s.categories.flatMap((c) => c.checks.map((ch) => ch.evidence))),
  ];
  for (const t of texts) {
    assert.ok(!t.includes(EM), `em dash in: ${t}`);
    assert.ok(!/\baudit/i.test(t), `banned word in: ${t}`); // audit-ok
  }
});

test("the first fix matches the lowest scored category under the tie-break order", async () => {
  const result = await generateScorecardUncached(prospect);
  const p = prospectScores(result)!;
  const scored = p.categories.filter((c) => c.total !== null);
  const lowest = Math.min(...scored.map((c) => c.total!));
  assert.equal(p.categories.find((c) => c.key === result.firstFix!.category)!.total, lowest);
});

test("rubric integrity: 5 categories x 5 checks, pagespeed marked deterministic", () => {
  assert.equal(RUBRIC.length, 5);
  for (const cat of RUBRIC) assert.equal(cat.checks.length, 5);
  const ps = RUBRIC.flatMap((c) => c.checks).find((c) => c.key === "pagespeed");
  assert.ok(ps?.deterministic);
  const keys = RUBRIC.flatMap((c) => c.checks.map((ch) => ch.key));
  assert.equal(new Set(keys).size, 25);
});
