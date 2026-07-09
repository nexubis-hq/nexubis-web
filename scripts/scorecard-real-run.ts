// A REAL full generation against a live prospect + competitors (live crawl,
// screenshots, PageSpeed, Serper, Claude scoring and copy). Prints the whole
// client-facing copy for hand review and records the run as a fixture under
// lib/scorecard/fixtures/real-runs/. Costs roughly 20 to 30 cents. Run
// deliberately, never in CI.
//
// Run: npx tsx scripts/scorecard-real-run.ts <name> <url> "<one-liner>" <rival1> <rival2>
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

config({ path: ".env.local" });
// .env.local keeps mock mode ON for the dev preview; a real run must be real.
delete process.env.SCORECARD_MOCK;

async function main() {
  const [name, url, oneLiner, ...rivals] = process.argv.slice(2);
  if (!name || !url || !oneLiner || rivals.length < 2) {
    console.error('usage: npx tsx scripts/scorecard-real-run.ts <name> <url> "<one-liner>" <rival1> <rival2> [rival3]');
    process.exit(1);
  }
  const { prospectFromRunInput, runInputIsValid } = await import("../lib/scorecard/run");
  const { generateScorecardUncached } = await import("../lib/scorecard/generate");

  const input = { url, productOneLiner: oneLiner, competitors: rivals };
  if (!runInputIsValid(input)) throw new Error("run input invalid");
  const prospect = prospectFromRunInput(input);

  const started = Date.now();
  const result = await generateScorecardUncached(prospect, { onStage: (s) => console.log(`stage: ${s}`) });
  const seconds = (Date.now() - started) / 1000;

  console.log(`\n===== ${result.meta.company}: ${result.scores[0].overall}/100, ${result.verdict.band} gap (stance ${result.verdict.stance}) =====`);
  console.log(`duration ${seconds.toFixed(1)}s, cost ~$${result.estimatedCostUsd}`);
  for (const s of result.scores) {
    console.log(`${s.isProspect ? "PROSPECT " : "rival    "}${s.company}: ${s.overall ?? "n/a"} | ${s.categories.map((c) => `${c.key}:${c.total ?? "-"}`).join(" ")}`);
  }
  console.log(`\nVERDICT: ${result.verdict.paragraph}`);
  for (const cat of result.deckCopy.categories) {
    console.log(`\n[${cat.key}]`);
    for (const f of cat.findings) console.log(`  - ${f}`);
    console.log(`  competitors: ${cat.competitorNote}`);
  }
  console.log(`\nFIRST FIX (${result.firstFix?.categoryLabel}):\n  why: ${result.firstFix?.why}\n  practice: ${result.firstFix?.inPractice}`);
  console.log(`\nflags: ${result.flags.join(" | ") || "none"}`);

  const here = dirname(fileURLToPath(import.meta.url));
  const outDir = join(here, "../lib/scorecard/fixtures/real-runs");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `${name}.json`);
  writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`\nfixture written: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
