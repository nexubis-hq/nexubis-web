// End-to-end smoke run of the Scorecard foundation in mock mode: zero API
// spend, no KV needed. Exercises input plumbing, competitor resolution, crawl,
// screenshots and PageSpeed for the prospect plus every resolved competitor.
// The orchestrator (Prompt 2) and scoring (Prompt 3) extend this script as
// they land.
//
// Run: npx tsx scripts/scorecard-mock-run.ts
process.env.SCORECARD_MOCK = "1";

import { prospectFromRunInput, runInputIsValid, runIdFor } from "../lib/scorecard/run";
import { gatherEvidenceUncached } from "../lib/scorecard/orchestrator";
import { checkEnv } from "../lib/scorecard/env";

async function main() {
  const input = {
    url: "veltkamp-dosing.nl",
    productOneLiner: "Precision dosing equipment for food production lines",
    competitors: ["DosaTech GmbH", "flowserve-dosing.com"],
  };
  if (!runInputIsValid(input)) throw new Error("run input invalid");

  const prospect = prospectFromRunInput(input);
  console.log(`prospect: ${prospect.company} (${prospect.url})`);
  console.log(`run id:   ${runIdFor(prospect)}`);
  console.log(`env ok:   ${JSON.stringify(checkEnv("ai", "retrieval", "screenshots", "pagespeed"))}`);

  const set = await gatherEvidenceUncached(prospect, { onStage: (s) => console.log(`stage: ${s}`) });
  for (const c of set.companies) {
    console.log(
      `${c.isProspect ? "PROSPECT " : "rival    "}${c.company}: resolved=${c.resolved} fetched=${c.fetched} ` +
        `crawl=${c.siteText?.length ?? 0} chars, shots=${c.screenshots.desktopUrl ? "d" : "-"}${c.screenshots.mobileUrl ? "m" : "-"}, ` +
        `pagespeed=${c.pageSpeed?.mobile?.performance ?? "n/a"}/${c.pageSpeed?.desktop?.performance ?? "n/a"}, ` +
        `offsite=[${c.offsiteFacts.map((f) => `${f.key}:${f.present ? "y" : "n"}`).join(" ")}], ` +
        `vision=${c.firstImpression ? c.firstImpression.designEra : "none"}${c.flags.length ? `, flags: ${c.flags.join(" | ")}` : ""}`,
    );
  }
  console.log(`cost ~$${set.estimatedCostUsd}, searches ${set.searchQueriesUsed}, flags: ${set.flags.length}`);
  console.log("mock run complete: evidence pipeline executed with zero spend.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
