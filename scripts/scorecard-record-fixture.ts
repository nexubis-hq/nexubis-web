// Records a REAL EvidenceBundleSet into lib/scorecard/fixtures/ for tests and
// report-UI development. Uses live keys (Serper, ScreenshotOne, PageSpeed,
// Anthropic vision) against a public industrial manufacturer, never a client.
// Cost: a few cents. Run deliberately, not in CI.
//
// Run: npx tsx scripts/scorecard-record-fixture.ts
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { prospectFromRunInput, runInputIsValid } = await import("../lib/scorecard/run");
  const { gatherEvidenceUncached } = await import("../lib/scorecard/orchestrator");

  // A public Dutch food-equipment manufacturer plus two real rivals in the
  // same niche (depositing / bakery equipment). Not clients.
  const input = {
    url: "bakon.com",
    productOneLiner: "Depositing, spraying and cutting equipment for bakery production lines",
    competitors: ["unifiller.com", "rademaker.com"],
  };
  if (!runInputIsValid(input)) throw new Error("run input invalid");
  const prospect = prospectFromRunInput(input);

  const started = Date.now();
  const set = await gatherEvidenceUncached(prospect, { onStage: (s) => console.log(`stage: ${s}`) });
  console.log(`gathered in ${((Date.now() - started) / 1000).toFixed(1)}s, ~$${set.estimatedCostUsd}, ${set.searchQueriesUsed} searches`);

  for (const c of set.companies) {
    console.log(
      `${c.isProspect ? "PROSPECT " : "rival    "}${c.company}: fetched=${c.fetched} crawl=${c.siteText?.length ?? 0} ` +
        `shots=${c.screenshots.desktopUrl ? "d" : "-"}${c.screenshots.mobileUrl ? "m" : "-"} ` +
        `ps=${c.pageSpeed?.mobile?.performance ?? "n/a"}/${c.pageSpeed?.desktop?.performance ?? "n/a"} ` +
        `offsite=[${c.offsiteFacts.map((f) => `${f.key}:${f.present ? "y" : "n"}`).join(" ")}] ` +
        `vision=${c.firstImpression?.designEra ?? "none"}${c.flags.length ? ` flags: ${c.flags.join(" | ")}` : ""}`,
    );
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const outDir = join(here, "../lib/scorecard/fixtures");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "evidence-bundle.json");
  writeFileSync(outPath, JSON.stringify(set, null, 2));
  console.log(`fixture written: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
