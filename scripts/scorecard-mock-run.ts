// End-to-end smoke run of the Scorecard foundation in mock mode: zero API
// spend, no KV needed. Exercises input plumbing, competitor resolution, crawl,
// screenshots and PageSpeed for the prospect plus every resolved competitor.
// The orchestrator (Prompt 2) and scoring (Prompt 3) extend this script as
// they land.
//
// Run: npx tsx scripts/scorecard-mock-run.ts
process.env.SCORECARD_MOCK = "1";

import { prospectFromRunInput, runInputIsValid, runIdFor } from "../lib/scorecard/run";
import { resolveCompetitors } from "../lib/scorecard/competitors";
import { fetchSite } from "../lib/scorecard/fetch-site";
import { captureFirstImpression } from "../lib/scorecard/screenshot";
import { runPageSpeed } from "../lib/scorecard/pagespeed";
import { searchWeb, formatSearchBlock } from "../lib/scorecard/web-search";
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

  const competitors = await resolveCompetitors(prospect);
  for (const c of competitors) {
    console.log(`competitor: "${c.raw}" -> ${c.resolved ? c.url : "UNRESOLVED"} (${c.name ?? "?"})`);
  }

  const companies = [
    { name: prospect.company, url: prospect.url },
    ...competitors.filter((c) => c.resolved && c.url).map((c) => ({ name: c.name ?? c.raw, url: c.url! })),
  ];

  for (const company of companies) {
    const [site, shots, speed] = await Promise.all([
      fetchSite(company.url),
      captureFirstImpression(company.url),
      runPageSpeed(company.url),
    ]);
    if (!site.ok) throw new Error(`fetchSite failed for ${company.url}: ${site.reason}`);
    console.log(
      `${company.name}: crawl ${site.text.length} chars, shots ${shots.desktop ? "desktop" : "-"}/${shots.mobile ? "mobile" : "-"}, ` +
        `pagespeed mobile ${speed?.mobile?.performance ?? "n/a"} desktop ${speed?.desktop?.performance ?? "n/a"}`,
    );
  }

  const searches = await Promise.all([
    searchWeb(`${prospect.company} linkedin`),
    searchWeb(`${prospect.company} brochure filetype:pdf`),
  ]);
  const block = formatSearchBlock(searches);
  console.log(`search block: ${block.split("\n").length} lines`);

  console.log("mock run complete: all foundation modules executed with zero spend.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
