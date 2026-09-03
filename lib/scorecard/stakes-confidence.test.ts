import { test, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";
import { generateScorecardUncached } from "./generate";
import { gatherEvidenceUncached } from "./orchestrator";
import { stayingSameLine } from "./report-derive";
import type { ProspectData } from "./types";

// The auto-detected top rival is only NAMED in the high-stakes narrative when it
// cleared the confidence bar (resolver Pass 1 / a given URL). Below the bar the
// report falls back to a generic line that can never be wrong. Both paths run
// through the real generator + the real render helper here.
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

test("above the bar: the top rival is named in the staying-same line", async () => {
  const evidence = await gatherEvidenceUncached(prospect);
  assert.ok(
    evidence.companies.some((c) => !c.isProspect && c.contextMatch === true),
    "mock competitors should resolve as context matches",
  );

  const result = await generateScorecardUncached(prospect, { evidenceOverride: evidence });
  assert.ok(result.verdict.bestRival, "expected a scored best rival");
  assert.equal(result.verdict.namedRival, result.verdict.bestRival!.company);

  const line = stayingSameLine(result);
  assert.ok(line.includes(result.verdict.bestRival!.company), `named path should merge the rival: ${line}`);
});

test("below the bar: falls back to the generic line, never a name", async () => {
  const evidence = await gatherEvidenceUncached(prospect);
  // Push every competitor below the confidence bar; scoring is untouched, so a
  // bestRival still exists, it just is not trusted enough to name.
  const lowConfidence = {
    ...evidence,
    companies: evidence.companies.map((c) => (c.isProspect ? c : { ...c, contextMatch: false })),
  };

  const result = await generateScorecardUncached(prospect, { evidenceOverride: lowConfidence });
  assert.ok(result.verdict.bestRival, "best rival still exists (scored), just not named");
  assert.equal(result.verdict.namedRival, null);

  const line = stayingSameLine(result);
  assert.ok(line.includes("the companies in this report"), `fallback wording expected: ${line}`);
  assert.ok(!line.includes(result.verdict.bestRival!.company), `fallback must not name the rival: ${line}`);
});
