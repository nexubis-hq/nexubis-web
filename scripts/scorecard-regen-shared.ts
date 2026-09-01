// Regenerate a REAL report end to end (URL-only input, uncached detection,
// fresh generation) and store it as a shared report at a fixed slug, so the
// rendered page can be inspected locally. Costs roughly 25 cents. Run
// deliberately, never in CI.
//
// Run: npx tsx scripts/scorecard-regen-shared.ts <url> <slug>
import { config } from "dotenv";

config({ path: ".env.local" });
delete process.env.SCORECARD_MOCK;

async function main() {
  const [url, slug] = process.argv.slice(2);
  if (!url || !slug) {
    console.error("usage: npx tsx scripts/scorecard-regen-shared.ts <url> <slug>");
    process.exit(1);
  }
  const { prospectFromRunInput, runInputIsValid } = await import("../lib/scorecard/run");
  const { detectProspectContextUncached, applyDetection } = await import("../lib/scorecard/detect");
  const { generateScorecardUncached } = await import("../lib/scorecard/generate");
  const { writeShared } = await import("../lib/scorecard/share");

  const input = { url, productOneLiner: "", competitors: [] };
  if (!runInputIsValid(input)) throw new Error("run input invalid");
  const prospect = prospectFromRunInput(input);

  const started = Date.now();
  const detection = await detectProspectContextUncached(prospect);
  console.log(`detected: "${detection.productOneLiner}" vs ${detection.competitors.join(", ") || "(none)"}`);
  const enriched = applyDetection(prospect, detection);
  const result = await generateScorecardUncached(enriched, { fresh: true, onStage: (s) => console.log(`stage: ${s}`) });
  console.log(`generated in ${((Date.now() - started) / 1000).toFixed(1)}s, ~$${result.estimatedCostUsd}`);

  const now = new Date();
  await writeShared(slug, {
    prospectData: enriched,
    result,
    loomUrl: null,
    createdAt: now.toISOString(),
    lastEditedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 180 * 86_400_000).toISOString(),
    roleSeniority: result.routing.roleSeniority,
  });
  console.log(`shared report written: /audit/r/${slug}`);

  const d = result.deckCopy;
  console.log(`\nverdictLine: ${d.verdictLine}`);
  console.log(`fix items: ${d.categories.map((c) => `${c.key}:${c.fix?.length ?? "-"}`).join(" ")}`);
  console.log(`working items: ${d.categories.map((c) => `${c.key}:${c.working?.length ?? "-"}`).join(" ")}`);
  console.log(`topIssues: ${d.topIssues?.map((t) => `${t.title} [${t.impact}]`).join(" | ")}`);
  console.log(`startList (${d.startList?.length}): ${d.startList?.join(" / ")}`);
  console.log(`stayingSame: ${d.stayingSame}`);
  console.log(`bestRival: ${result.verdict.bestRival?.company ?? "(none)"}`);
  console.log(`flags: ${result.flags.join(" | ") || "none"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
