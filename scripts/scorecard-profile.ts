// Profile a REAL end-to-end run exactly as the public route executes it:
// URL-only input -> uncached detection -> uncached generation. Prints the
// phase timeline the [scorecard-timing] logs produce plus a summary.
// Costs roughly 20 to 30 cents per run. Run deliberately, never in CI.
//
// Run: npx tsx scripts/scorecard-profile.ts <url>
import { config } from "dotenv";

config({ path: ".env.local" });
// .env.local keeps mock mode ON for the dev preview; a profile must be real.
delete process.env.SCORECARD_MOCK;

async function main() {
  const [url] = process.argv.slice(2);
  if (!url) {
    console.error("usage: npx tsx scripts/scorecard-profile.ts <url>");
    process.exit(1);
  }
  const { prospectFromRunInput, runInputIsValid } = await import("../lib/scorecard/run");
  const { detectProspectContextUncached, applyDetection } = await import("../lib/scorecard/detect");
  const { generateScorecardUncached } = await import("../lib/scorecard/generate");

  const input = { url, productOneLiner: "", competitors: [] };
  if (!runInputIsValid(input)) throw new Error("run input invalid");
  const prospect = prospectFromRunInput(input);

  const t0 = Date.now();
  const stamp = (label: string) => console.log(`[profile] ${label} at ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  stamp("detection start");
  const detection = await detectProspectContextUncached(prospect);
  stamp(`detection done (one-liner: "${detection.productOneLiner}", competitors: ${detection.competitors.join(", ") || "none"})`);

  const enriched = applyDetection(prospect, detection);
  const result = await generateScorecardUncached(enriched, {
    fresh: true,
    onStage: (s) => stamp(`stage ${s}`),
  });
  stamp("generation done");

  const total = (Date.now() - t0) / 1000;
  console.log(`\n===== ${result.meta.company}: ${result.scores.find((s) => s.isProspect)?.overall}/100, ${result.verdict.band} gap =====`);
  console.log(`TOTAL ${total.toFixed(1)}s, cost ~$${result.estimatedCostUsd}`);
  console.log(`flags: ${result.flags.join(" | ") || "none"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
