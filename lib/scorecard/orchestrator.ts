// The data-gathering orchestrator: one prospect plus up to 3 named
// competitors, all through the same pipeline. Companies run in parallel;
// steps within a company run in parallel where independent (crawl,
// screenshots + vision, PageSpeed, off-site retrieval). Everything lands in
// one EvidenceBundle per company. Scoring (Prompt 3) consumes the bundles.
//
// Determinism: the whole gather runs inside withCallEnvelope(cacheKey), so a
// re-run of the same inputs inside the TTL reuses every raw call (Serper and
// model calls memoize per envelope), and the assembled bundle set itself is
// cached under the run key.
import { fetchSite } from "./fetch-site";
import { captureFirstImpression } from "./screenshot";
import { runPageSpeed } from "./pagespeed";
import { gatherOffsiteEvidence, newQueryBudget, type QueryBudget } from "./offsite";
import { readFirstImpression, type Usage } from "./anthropic";
import { resolveCompetitors } from "./competitors";
import { scorecardCacheKey, prospectDeterminismInput, cachedJson, SCORECARD_RECORD_TTL_S } from "./determinism";
import { withCallEnvelope } from "./call-cache";
import { RUN_BUDGET, type CompanyEvidence, type EvidenceBundleSet } from "./evidence";
import type { CompetitorRef, ProspectData } from "./types";

// Coarse pipeline stages, emitted at real phase boundaries so the scan
// animation reflects what the server is actually doing (not a pure timer).
// The route maps these to the user-facing status lines.
export type ScanStage = "reading" | "impressions" | "competitors" | "scoring";
export interface GatherOptions {
  fresh?: boolean;
  onStage?: (stage: ScanStage) => void;
}

export function generateCacheKey(input: ProspectData): string {
  return scorecardCacheKey(prospectDeterminismInput(input));
}

interface CompanyTarget {
  company: string;
  url: string | null;
  isProspect: boolean;
  rawEntry?: string;
  resolved: boolean;
}

// Gather everything about one company. Never throws: a company whose site is
// down produces a bundle with fetched:false and the run completes.
async function gatherCompanyEvidence(
  target: CompanyTarget,
  budget: QueryBudget,
  usages: Usage[],
  /** Product one-liner, prospect only: powers the category-findability search. */
  categoryTerm?: string,
): Promise<CompanyEvidence> {
  const flags: string[] = [];
  const base: CompanyEvidence = {
    company: target.company,
    url: target.url,
    isProspect: target.isProspect,
    rawEntry: target.rawEntry,
    resolved: target.resolved,
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
  if (!target.resolved || !target.url) {
    flags.push("Competitor could not be resolved to a website");
    // Off-site checks can still run on the name alone: a company with no
    // findable site can still have LinkedIn and trade show mentions.
    try {
      const offsite = await gatherOffsiteEvidence(target.company, null, budget);
      base.offsiteFacts = offsite.facts;
      base.searchBlock = offsite.searchBlock;
    } catch (err) {
      flags.push(`Off-site retrieval failed (${err instanceof Error ? err.message : "error"})`);
    }
    return base;
  }

  const url = target.url;
  // All four evidence streams fire together. Each is individually best-effort.
  const sitePromise = fetchSite(url).catch((err) => ({ ok: false as const, reason: err instanceof Error ? err.message : "fetch failed" }));
  const shotsAndVisionPromise = (async () => {
    try {
      const shots = await captureFirstImpression(url);
      if (!shots.desktop && !shots.mobile) {
        return { shots, vision: null as Awaited<ReturnType<typeof readFirstImpression>> | null };
      }
      const vision = await readFirstImpression({
        desktopBase64: shots.desktop,
        mobileBase64: shots.mobile,
        company: target.company,
      });
      return { shots, vision };
    } catch (err) {
      flags.push(`Screenshots failed (${err instanceof Error ? err.message : "error"})`);
      return { shots: { desktop: null, mobile: null, desktopUrl: null, mobileUrl: null }, vision: null };
    }
  })();
  const pageSpeedPromise = runPageSpeed(url).catch(() => null);
  const offsitePromise = gatherOffsiteEvidence(target.company, url, budget, {
    categoryTerm: target.isProspect ? categoryTerm : undefined,
  }).catch((err) => {
    flags.push(`Off-site retrieval failed (${err instanceof Error ? err.message : "error"})`);
    return { facts: [], searchBlock: "", queriesUsed: 0 };
  });

  const [site, shotsAndVision, pageSpeed, offsite] = await Promise.all([
    sitePromise,
    shotsAndVisionPromise,
    pageSpeedPromise,
    offsitePromise,
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
  if (!shotsAndVision.shots.desktopUrl && !shotsAndVision.shots.mobileUrl) {
    flags.push("First-impression screenshots unavailable");
  }
  if (shotsAndVision.vision) {
    if (shotsAndVision.vision.ok) {
      usages.push(shotsAndVision.vision.usage);
      base.firstImpression = shotsAndVision.vision.data;
    } else {
      flags.push(`Vision read failed (${shotsAndVision.vision.reason})`);
    }
  }

  base.pageSpeed = pageSpeed;
  if (!pageSpeed) flags.push("PageSpeed could not be measured");

  base.offsiteFacts = offsite.facts;
  base.searchBlock = offsite.searchBlock;

  return base;
}

// Assemble the run's company list: the prospect plus every named competitor
// (resolved or not; unresolved ones stay for honest reporting), capped at the
// budget's company maximum.
function companyTargets(prospect: ProspectData, competitors: CompetitorRef[]): CompanyTarget[] {
  const targets: CompanyTarget[] = [
    { company: prospect.company, url: prospect.url, isProspect: true, resolved: true },
  ];
  for (const c of competitors) {
    targets.push({
      company: c.name ?? c.raw,
      url: c.url ?? null,
      isProspect: false,
      rawEntry: c.raw,
      resolved: c.resolved === true && Boolean(c.url),
    });
  }
  return targets.slice(0, RUN_BUDGET.maxCompanies);
}

// The full evidence gather, uncached. Exported for tests; production goes
// through gatherEvidence (envelope + KV cache).
export async function gatherEvidenceUncached(
  input: ProspectData,
  options: GatherOptions = {},
): Promise<EvidenceBundleSet> {
  const stage = (s: ScanStage) => options.onStage?.(s);
  const usages: Usage[] = [];
  const flags: string[] = [];
  const budget = newQueryBudget(RUN_BUDGET.maxSerperQueries);

  // 1. Resolve competitors (names -> sites). Cheap, must precede the fan-out.
  stage("reading");
  const competitors = await resolveCompetitors(input);
  for (const c of competitors) {
    if (!c.resolved) flags.push(`Competitor "${c.raw}" could not be resolved to a website`);
  }

  // 2. Fan out: every company through the identical pipeline, in parallel.
  stage("impressions");
  const targets = companyTargets(input, competitors);
  if (input.competitors.length + 1 > RUN_BUDGET.maxCompanies) {
    flags.push(`Company list capped at ${RUN_BUDGET.maxCompanies}`);
  }
  const gatherAll = Promise.all(targets.map((t) => gatherCompanyEvidence(t, budget, usages, input.productOneLiner)));
  // The competitor stage is cosmetic for the scan animation: flip to it once
  // the prospect's own gather has had a head start.
  const staged = gatherAll.then((companies) => {
    stage("scoring");
    return companies;
  });
  stage("competitors");
  const companies = await staged;

  const aiCost = usages.reduce((s, u) => s + u.estimatedCostUsd, 0);
  const searchCost = budget.used * 0.001;
  const estimatedCostUsd = Number((aiCost + searchCost).toFixed(4));
  if (estimatedCostUsd > RUN_BUDGET.targetMaxCostUsd) {
    flags.push(`Estimated gather cost $${estimatedCostUsd} exceeded the $${RUN_BUDGET.targetMaxCostUsd} target`);
  }
  console.log(
    `[scorecard-orch] ${input.company}: ${companies.length} companies, ~$${estimatedCostUsd} (${usages.length} AI calls, ${budget.used} searches), ${flags.length} flags`,
  );

  return {
    companies,
    estimatedCostUsd,
    searchQueriesUsed: budget.used,
    flags,
    gatheredAt: new Date().toISOString(),
  };
}

// Production entry: the gather runs inside its determinism envelope, and the
// assembled bundle set is cached under the run key with the evidence suffix.
// A re-run of the same inputs inside the TTL replays for free.
export async function gatherEvidence(input: ProspectData, options: GatherOptions = {}): Promise<EvidenceBundleSet> {
  const envelopeKey = generateCacheKey(input);
  return withCallEnvelope(envelopeKey, () =>
    cachedJson(
      `${envelopeKey}:evidence`,
      SCORECARD_RECORD_TTL_S,
      () => gatherEvidenceUncached(input, options),
      { fresh: options.fresh },
    ),
  );
}
