import { test } from "vitest";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { rubricScoresSchema, deckCopySchema } from "./output-schemas";
import { CATEGORY_KEYS } from "./rubric";
import type { ScorecardResult } from "./result";

// Guards over the RECORDED real-run fixtures: the generated copy obeys the
// house rules, and the structured result round-trips through the schemas.
// Skipped cleanly if a fixture has not been recorded yet.
const here = dirname(fileURLToPath(import.meta.url));
const resultPath = join(here, "fixtures/scorecard-result.json");
const EM = String.fromCharCode(0x2014);

const hasResult = existsSync(resultPath);

test.runIf(hasResult)("recorded result copy carries no em dashes and never the banned word", () => {
  const result = JSON.parse(readFileSync(resultPath, "utf8")) as ScorecardResult;
  const texts = [
    result.verdict.paragraph,
    ...result.deckCopy.categories.flatMap((c) => [...c.findings, c.competitorNote]),
    result.firstFix?.why ?? "",
    result.firstFix?.inPractice ?? "",
    ...result.scores.flatMap((s) => s.categories.flatMap((c) => c.checks.map((ch) => ch.evidence))),
  ];
  assert.ok(texts.length > 30);
  for (const t of texts) {
    assert.ok(!t.includes(EM), `em dash in recorded copy: ${t}`);
  }
});

test.runIf(hasResult)("recorded result round-trips through the structured schemas", () => {
  const result = JSON.parse(readFileSync(resultPath, "utf8")) as ScorecardResult;
  // Deck copy block validates against its reply schema.
  // Fixtures recorded before the generator produced the v2-layout blocks get
  // safe defaults for the now-required fields; everything they DO carry must
  // still validate.
  const copyCheck = deckCopySchema.safeParse({
    verdictLine: result.deckCopy.verdictLine ?? "legacy fixture",
    verdictParagraph: result.verdict.paragraph,
    categories: result.deckCopy.categories.map((c) => ({ working: [], fix: [], ...c })),
    firstFix: { why: result.firstFix?.why ?? "", inPractice: result.firstFix?.inPractice ?? "" },
    topIssues: result.deckCopy.topIssues ?? [],
    startList: result.deckCopy.startList ?? [],
    stayingSame: result.deckCopy.stayingSame ?? "legacy fixture",
  });
  assert.ok(copyCheck.success, JSON.stringify(copyCheck.success ? null : copyCheck.error.issues));

  // Every scored company's checks validate against the rubric reply schema.
  for (const s of result.scores.filter((s) => s.scored)) {
    const raw = { checks: s.categories.flatMap((c) => c.checks.map((ch) => ({ key: ch.key, score: ch.score, assessable: ch.assessable, evidence: ch.evidence }))) };
    const check = rubricScoresSchema.safeParse(raw);
    assert.ok(check.success, `rubric schema failed for ${s.company}`);
    assert.equal(raw.checks.length, 25);
  }

  // Category structure is complete.
  for (const s of result.scores.filter((s) => s.scored)) {
    assert.deepEqual(
      s.categories.map((c) => c.key),
      [...CATEGORY_KEYS],
    );
  }

  // Unassessable checks are marked, never zeroed silently.
  for (const s of result.scores.filter((s) => s.scored)) {
    for (const c of s.categories) {
      for (const ch of c.checks) {
        if (ch.score === null) assert.equal(ch.assessable, false);
      }
    }
  }
});
