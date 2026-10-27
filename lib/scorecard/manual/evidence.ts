import { fetchSite } from "../fetch-site";
import { captureFirstImpression } from "../screenshot";
import { runPageSpeed } from "../pagespeed";
import {
  gatherOffsiteEvidence,
  newQueryBudget,
  type QueryBudget,
} from "../offsite";
import { readFirstImpression, type Usage } from "../anthropic";
import { isSelfMatch } from "../competitors";
import {
  RUN_BUDGET,
  type CompanyEvidence,
  type EvidenceBundleSet,
} from "../evidence";
import type { ProspectData } from "../types";
import { pastedSiteTitle } from "./paste";

export const MANUAL_LIMITATION =
  "The prospect site could not be crawled automatically. Site text was pasted by hand, homepage first. Visual, screenshot, first-impression and speed checks were not run. Mark checks requiring these observations not assessable (null); do not infer design, imagery, layout, mobile usability, language coverage or loading speed from pasted text or competitor observations.";

type Target = Pick<
  CompanyEvidence,
  "company" | "url" | "isProspect" | "resolved" | "rawEntry" | "contextMatch"
>;

// Copied from orchestrator.gatherCompanyEvidence. The prospect returns before
// any on-site stream starts; rivals retain crawl, desktop vision, speed and search.
async function gatherCompanyEvidence(
  target: Target,
  budget: QueryBudget,
  usages: Usage[],
  input: ProspectData,
  pastedText: string
): Promise<CompanyEvidence> {
  const flags: string[] = [];
  const base: CompanyEvidence = {
    ...target,
    fetched: false,
    siteText: null,
    siteTitle: null,
    finalUrl: null,
    screenshots: { desktopUrl: null, mobileUrl: null },
    pageSpeed: null,
    offsiteFacts: [],
    searchBlock: "",
    firstImpression: null,
    flags,
  };
  const offsite = async (url: string | null) => {
    try {
      const result = await gatherOffsiteEvidence(target.company, url, budget, {
        categoryTerm: target.isProspect ? input.productOneLiner : undefined,
      });
      base.offsiteFacts = result.facts;
      base.searchBlock = result.searchBlock;
    } catch (err) {
      flags.push(
        `Off-site retrieval failed (${err instanceof Error ? err.message : "error"})`
      );
    }
  };
  if (target.isProspect) {
    base.fetched = true;
    base.siteText = pastedText;
    base.siteTitle = pastedSiteTitle(pastedText);
    base.finalUrl = target.url;
    flags.push(MANUAL_LIMITATION);
    await offsite(target.url);
    // The existing scorer does not include CompanyEvidence.flags in its prompt.
    // Put provenance in the search block too, which it DOES read, before search
    // snippets so its 2,500-character budget can never truncate the limitation.
    base.searchBlock = `## MANUAL EVIDENCE LIMITATIONS\n${MANUAL_LIMITATION}\n\n${base.searchBlock}`;
    // Deliberately no siteFacts: missing observations are not negative facts.
    return base;
  }
  if (!target.resolved || !target.url) {
    flags.push("Competitor could not be resolved to a website");
    await offsite(null);
    return base;
  }
  const url = target.url;
  const sitePromise = fetchSite(url).catch((err) => ({
    ok: false as const,
    reason: err instanceof Error ? err.message : "fetch failed",
  }));
  const shotsAndVisionPromise = (async () => {
    try {
      const shots = await captureFirstImpression(url, { includeMobile: false });
      const vision =
        shots.desktop || shots.mobile
          ? await readFirstImpression({
              desktopBase64: shots.desktop,
              mobileBase64: shots.mobile,
              company: target.company,
            })
          : null;
      return { shots, vision };
    } catch (err) {
      flags.push(
        `Screenshots failed (${err instanceof Error ? err.message : "error"})`
      );
      return { shots: { desktopUrl: null, mobileUrl: null }, vision: null };
    }
  })();
  const [site, shotsAndVision, pageSpeed] = await Promise.all([
    sitePromise,
    shotsAndVisionPromise,
    runPageSpeed(url).catch(() => null),
    offsite(url),
  ]);
  if (site.ok) {
    base.fetched = true;
    base.siteText = site.text;
    base.siteTitle = site.title;
    base.finalUrl = site.finalUrl;
    base.siteFacts = site.facts;
  } else {
    base.fetchReason = site.reason;
    flags.push(`Site fetch failed: ${site.reason}`);
  }
  base.screenshots = {
    desktopUrl: shotsAndVision.shots.desktopUrl,
    mobileUrl: shotsAndVision.shots.mobileUrl,
  };
  if (!base.screenshots.desktopUrl && !base.screenshots.mobileUrl)
    flags.push("First-impression screenshots unavailable");
  if (shotsAndVision.vision?.ok) {
    usages.push(shotsAndVision.vision.usage);
    base.firstImpression = shotsAndVision.vision.data;
  } else if (shotsAndVision.vision)
    flags.push(`Vision read failed (${shotsAndVision.vision.reason})`);
  base.pageSpeed = pageSpeed;
  if (!pageSpeed) flags.push("PageSpeed could not be measured");
  return base;
}

export async function gatherManualEvidence(
  input: ProspectData,
  pastedText: string
): Promise<EvidenceBundleSet> {
  const usages: Usage[] = [];
  const flags: string[] = [MANUAL_LIMITATION];
  const budget = newQueryBudget(RUN_BUDGET.maxSerperQueries);
  const targets: Target[] = [
    {
      company: input.company,
      url: input.url,
      isProspect: true,
      resolved: true,
    },
    ...input.competitors.slice(0, 3).map((c) => {
      // Defence in depth even if a future caller bypasses resolveCompetitors.
      const self = isSelfMatch(
        { name: c.name ?? c.raw, url: c.url ?? null },
        input
      );
      const resolved = !self && c.resolved === true && Boolean(c.url);
      if (!resolved)
        flags.push(`Competitor "${c.raw}" could not be resolved to a website`);
      return {
        company: c.name ?? c.raw,
        url: self ? null : (c.url ?? null),
        isProspect: false,
        rawEntry: c.raw,
        resolved,
        contextMatch: c.contextMatch === true,
      };
    }),
  ];
  const companies = await Promise.all(
    targets.map((target) =>
      gatherCompanyEvidence(target, budget, usages, input, pastedText)
    )
  );
  const estimatedCostUsd = Number(
    (
      usages.reduce((sum, usage) => sum + usage.estimatedCostUsd, 0) +
      budget.used * 0.001
    ).toFixed(4)
  );
  if (estimatedCostUsd > RUN_BUDGET.targetMaxCostUsd)
    flags.push(
      `Estimated gather cost $${estimatedCostUsd} exceeded the $${RUN_BUDGET.targetMaxCostUsd} target`
    );
  return {
    companies,
    estimatedCostUsd,
    searchQueriesUsed: budget.used,
    flags,
    gatheredAt: new Date().toISOString(),
  };
}
