// Scores the recorded evidence fixture through the REAL rubric scorer and
// copy pass (live Anthropic calls, roughly 15 to 25 cents), and records the
// resulting ScorecardResult as a fixture for report-UI development and the
// acceptance tests. Run deliberately, not in CI.
//
// Run: npx tsx scripts/scorecard-score-fixture.ts
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { generateScorecardUncached } = await import("../lib/scorecard/generate");
  const { prospectFromRunInput } = await import("../lib/scorecard/run");

  const here = dirname(fileURLToPath(import.meta.url));
  const fixturesDir = join(here, "../lib/scorecard/fixtures");
  const evidence = JSON.parse(readFileSync(join(fixturesDir, "evidence-bundle.json"), "utf8"));

  const prospect = prospectFromRunInput({
    url: "bakon.com",
    productOneLiner: "Depositing, spraying and cutting equipment for bakery production lines",
    competitors: ["unifiller.com", "rademaker.com"],
  });

  const started = Date.now();
  const result = await generateScorecardUncached(prospect, { evidenceOverride: evidence });
  console.log(`scored in ${((Date.now() - started) / 1000).toFixed(1)}s, ~$${result.estimatedCostUsd} (incl. recorded evidence cost)`);

  for (const s of result.scores) {
    console.log(
      `${s.isProspect ? "PROSPECT " : "rival    "}${s.company}: overall ${s.overall ?? "n/a"} | ` +
        s.categories.map((c) => `${c.key}:${c.total ?? "null"}`).join(" "),
    );
  }
  console.log(`verdict: ${result.verdict.band} (stance ${result.verdict.stance})`);
  console.log(`verdict paragraph: ${result.verdict.paragraph}`);
  console.log(`first fix: ${result.firstFix?.categoryLabel}`);
  console.log(`why: ${result.firstFix?.why}`);
  console.log(`flags: ${result.flags.join(" | ") || "none"}`);

  const outPath = join(fixturesDir, "scorecard-result.json");
  writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`fixture written: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
