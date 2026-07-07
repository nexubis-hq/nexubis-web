// The full Scorecard generation: evidence gather, 25-check scoring per
// company, verdict and first fix in code, the copy pass, and assembly into the
// Section 15 structured result. The whole run lives inside its determinism
// envelope and the finished result is cached under the run key, so identical
// inputs replay for free.
import { gatherEvidenceUncached, generateCacheKey, type GatherOptions } from "./orchestrator";
import { scoreCompanyRubric, writeDeckCopy, competitorContextBlock, type Usage, type DeckCopyInput } from "./anthropic";
import {
  assembleCompanyScores,
  unscoredCompany,
  computeBenchmark,
  verdictBand,
  firstFixCategory,
  type CompanyScores,
} from "./scoring";
import { categoryLabel } from "./rubric";
import { computeRouting } from "./routing";
import { fallbackDeckCopy } from "./templates";
import { clampDeckCopy } from "./clamp";
import { sanitizeCopy } from "./content-safety";
import { withCallEnvelope } from "./call-cache";
import { cachedJson, SCORECARD_RECORD_TTL_S } from "./determinism";
import { hostFromUrl } from "./web-search";
import type { CompanyEvidence, EvidenceBundleSet } from "./evidence";
import type { DeckCopy, ScorecardResult } from "./result";
import type { ProspectData } from "./types";

export type GenerateOutcome = { result: ScorecardResult; cached: boolean };

// Compact per-category summary handed to the copy pass: totals plus the
// evidence sentences, prospect first, rival totals inline.
function scoreSummaryBlock(prospect: CompanyScores, rivals: CompanyScores[]): string {
  const lines: string[] = [];
  for (const cat of prospect.categories) {
    lines.push(`### ${categoryLabel(cat.key)} (key: ${cat.key}): ${prospect.company} ${cat.total ?? "not assessable"}/20`);
    for (const check of cat.checks) {
      lines.push(`- [${check.score ?? "null"}] ${check.evidence}`);
    }
    const rivalTotals = rivals
      .filter((r) => r.scored)
      .map((r) => {
        const rc = r.categories.find((c) => c.key === cat.key);
        return rc?.total != null ? `${r.company} ${rc.total}/20` : `${r.company} not assessable`;
      });
    if (rivalTotals.length) lines.push(`Competitors: ${rivalTotals.join(", ")}`);
  }
  return lines.join("\n");
}

// A copy block is only accepted if every string passes the content-safety
// scan; one dirty string swaps the WHOLE deck copy to the templated fallback
// (a mixed report would read inconsistently).
function deckCopyIsClean(copy: DeckCopy, allow: string[]): boolean {
  const texts = [
    copy.verdictParagraph,
    ...copy.categories.flatMap((c) => [...c.findings, c.competitorNote]),
    copy.firstFix.why,
    copy.firstFix.inPractice,
  ];
  return texts.every((t) => {
    const check = sanitizeCopy(t, { allow });
    if (!check.clean) {
      console.warn(`[scorecard-gen] copy block failed safety scan: ${check.hits.map((h) => `${h.category}:${h.match}`).join(", ")}`);
    }
    return check.clean;
  });
}

export interface GenerateOptions extends GatherOptions {
  /** Score a pre-gathered bundle set instead of gathering (fixture replay,
   *  admin regenerate-copy-only). */
  evidenceOverride?: EvidenceBundleSet;
}

export async function generateScorecardUncached(
  input: ProspectData,
  options: GenerateOptions = {},
): Promise<ScorecardResult> {
  const usages: Usage[] = [];
  const flags: string[] = [];

  // 1. Evidence: prospect + competitors through the identical pipeline.
  const evidence: EvidenceBundleSet = options.evidenceOverride ?? (await gatherEvidenceUncached(input, options));
  flags.push(...evidence.flags);

  // 2. Score every resolved company in parallel, identical rubric. The
  //    PageSpeed check is overridden deterministically inside assembly.
  const scoreOne = async (e: CompanyEvidence): Promise<CompanyScores> => {
    if (!e.resolved) return unscoredCompany(e.company, e.isProspect);
    const others = evidence.companies.filter((o) => o !== e && o.resolved);
    const res = await scoreCompanyRubric({
      evidence: e,
      productOneLiner: input.productOneLiner,
      competitorContext: competitorContextBlock(others),
    });
    if (!res.ok) {
      flags.push(`Scoring failed for ${e.company} (${res.reason})`);
      return unscoredCompany(e.company, e.isProspect);
    }
    usages.push(res.usage);
    return assembleCompanyScores({
      company: e.company,
      isProspect: e.isProspect,
      rawChecks: res.data.checks,
      pageSpeed: e.pageSpeed,
    });
  };
  const scores = await Promise.all(evidence.companies.map(scoreOne));

  const prospect = scores.find((s) => s.isProspect);
  if (!prospect || !prospect.scored || prospect.overall === null) {
    throw new Error("The prospect could not be scored; the run cannot produce a result.");
  }
  const rivals = scores.filter((s) => !s.isProspect);

  // 3. Verdict, benchmark stance and first fix: pure code, never the model.
  const band = verdictBand(prospect.overall);
  const benchmark = computeBenchmark(prospect, rivals);
  const firstFix = firstFixCategory(prospect);

  // 4. Copy pass, then clamp, then the safety scan; fall back to templates on
  //    any failure. The prospect's own domains are allowlisted so a real
  //    "example.com"-like domain never trips the placeholder rule.
  const allow = [input.url, ...input.competitors.map((c) => c.url ?? "")]
    .map((u) => hostFromUrl(u) ?? "")
    .filter(Boolean);
  const copyInput: DeckCopyInput = {
    company: prospect.company,
    productOneLiner: input.productOneLiner,
    verdictBand: band,
    stance: benchmark.stance,
    overall: prospect.overall,
    bestRival: benchmark.bestRival,
    aheadRivals: benchmark.aheadRivals.map((r) => ({
      company: r.company,
      overall: r.overall,
      leadCategory: r.leadCategory ? categoryLabel(r.leadCategory) : null,
    })),
    firstFixCategory: firstFix ?? "website",
    firstFixLabel: firstFix ? categoryLabel(firstFix) : "Website",
    scoreSummary: scoreSummaryBlock(prospect, rivals),
  };
  const fallback = fallbackDeckCopy({
    company: prospect.company,
    overall: prospect.overall,
    band,
    benchmark,
    firstFix,
    prospect,
    rivals,
  });
  let deckCopy: DeckCopy = fallback;
  const copyRes = await writeDeckCopy(copyInput);
  if (copyRes.ok) {
    usages.push(copyRes.usage);
    const clamped = clampDeckCopy({
      verdictParagraph: copyRes.data.verdictParagraph,
      categories: copyRes.data.categories.map((c) => ({
        key: c.key as DeckCopy["categories"][number]["key"],
        findings: c.findings,
        competitorNote: c.competitorNote,
      })),
      firstFix: copyRes.data.firstFix,
    });
    if (deckCopyIsClean(clamped, allow)) {
      deckCopy = clamped;
    } else {
      flags.push("Generated copy failed the safety scan; templated fallback used");
    }
  } else {
    flags.push(`Copy pass failed (${copyRes.reason}); templated fallback used`);
  }

  // 5. Assemble the Section 15 structured result.
  const aiCost = usages.reduce((s, u) => s + u.estimatedCostUsd, 0);
  const estimatedCostUsd = Number((evidence.estimatedCostUsd + aiCost).toFixed(4));
  console.log(`[scorecard-gen] ${prospect.company}: ${prospect.overall}/100 (${band}), first fix ${firstFix}, ~$${estimatedCostUsd} total`);

  const result: ScorecardResult = {
    meta: {
      company: prospect.company,
      contactName: input.name,
      role: input.role,
      date: new Date().toISOString().slice(0, 10),
      productOneLiner: input.productOneLiner,
      competitors: evidence.companies
        .filter((c) => !c.isProspect)
        .map((c) => ({ name: c.company, url: c.url, resolved: c.resolved })),
    },
    scores,
    verdict: {
      band,
      stance: benchmark.stance,
      paragraph: deckCopy.verdictParagraph,
      bestRival: benchmark.bestRival,
      aheadRivals: benchmark.aheadRivals,
    },
    firstFix: firstFix
      ? {
          category: firstFix,
          categoryLabel: categoryLabel(firstFix),
          why: deckCopy.firstFix.why,
          inPractice: deckCopy.firstFix.inPractice,
        }
      : null,
    exhibits: evidence.companies.map((c) => ({
      company: c.company,
      isProspect: c.isProspect,
      resolved: c.resolved,
      fetched: c.fetched,
      desktopUrl: c.screenshots.desktopUrl,
      mobileUrl: c.screenshots.mobileUrl,
      pageSpeed: c.pageSpeed,
    })),
    deckCopy,
    routing: computeRouting({
      role: input.role,
      productOneLiner: input.productOneLiner,
      url: input.url,
      band,
    }),
    flags,
    estimatedCostUsd,
    generatedAt: new Date().toISOString(),
  };
  return result;
}

// Production entry: envelope + KV cache. Identical inputs inside the TTL
// replay the finished result; `fresh` regenerates (admin action) while still
// reusing raw call memoizations where valid.
export async function generateScorecard(input: ProspectData, options: GatherOptions = {}): Promise<GenerateOutcome> {
  const envelopeKey = generateCacheKey(input);
  let cached = true;
  const result = await withCallEnvelope(envelopeKey, () =>
    cachedJson(
      envelopeKey,
      SCORECARD_RECORD_TTL_S,
      () => {
        cached = false;
        return generateScorecardUncached(input, options);
      },
      { fresh: options.fresh },
    ),
  );
  return { result, cached };
}
