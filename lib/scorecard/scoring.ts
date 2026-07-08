// Pure scoring logic: everything deterministic lives here in code, never in
// the model. Category totals with null-check scaling, the PageSpeed points
// table, verdict bands, the benchmark stance (wording only, never the band),
// and the first-place-to-fix rule with its tie-break order.
import { RUBRIC, FIRST_FIX_ORDER, type CategoryKey } from "./rubric";
import type { PageSpeedScores } from "./types";

// ── Shapes ───────────────────────────────────────────────────────────────────
export interface CheckScore {
  key: string;
  /** 0 to 4, or null when the check could not be assessed. */
  score: number | null;
  /** False when the evidence could not support an assessment. Null checks are
   *  excluded from the category denominator; the category scales to 20. */
  assessable: boolean;
  /** One sentence citing what was actually seen (screenshot, crawled page,
   *  PageSpeed number, web finding). For unassessable checks: why not. */
  evidence: string;
}

export interface CategoryScore {
  key: CategoryKey;
  checks: CheckScore[];
  /** 0 to 20, scaled over assessable checks only. Null when NO check in the
   *  category could be assessed. */
  total: number | null;
  assessedChecks: number;
}

export interface CompanyScores {
  company: string;
  isProspect: boolean;
  /** False when the company could not be scored at all (unresolved, site down
   *  with no usable evidence). */
  scored: boolean;
  categories: CategoryScore[];
  /** 0 to 100, scaled over scoreable categories. Null when not scored. */
  overall: number | null;
}

// ── Category and overall totals ──────────────────────────────────────────────
// Null checks are excluded from the category denominator and the category is
// scaled to 20: total = round(20 * sum(scores) / (4 * assessedCount)).
// A category with zero assessable checks has total null; the overall score
// scales over the categories that DO have totals, to keep 0 to 100 comparable:
// overall = round(100 * sum(categoryTotals) / (20 * scoredCategoryCount)).
export function categoryTotal(checks: CheckScore[]): { total: number | null; assessed: number } {
  const assessed = checks.filter((c) => c.assessable && c.score !== null);
  if (assessed.length === 0) return { total: null, assessed: 0 };
  const sum = assessed.reduce((s, c) => s + (c.score ?? 0), 0);
  return { total: Math.round((20 * sum) / (4 * assessed.length)), assessed: assessed.length };
}

export function overallScore(categories: CategoryScore[]): number | null {
  const scored = categories.filter((c) => c.total !== null);
  if (scored.length === 0) return null;
  const sum = scored.reduce((s, c) => s + (c.total ?? 0), 0);
  return Math.round((100 * sum) / (20 * scored.length));
}

// ── PageSpeed points table (deterministic, never the model) ──────────────────
// Mobile-weighted 60/40 average of the performance scores, then the table:
// 90+ = 4, 75 to 89 = 3, 50 to 74 = 2, 25 to 49 = 1, below 25 = 0.
// One missing strategy falls back to the other alone; both missing = null
// (rendered as "could not be measured", never guessed).
export function pageSpeedWeighted(ps: PageSpeedScores | null): number | null {
  if (!ps) return null;
  const mobile = ps.mobile?.performance ?? null;
  const desktop = ps.desktop?.performance ?? null;
  if (mobile === null && desktop === null) return null;
  if (mobile === null) return desktop;
  if (desktop === null) return mobile;
  return Math.round(mobile * 0.6 + desktop * 0.4);
}

export function pageSpeedPoints(weighted: number | null): number | null {
  if (weighted === null) return null;
  if (weighted >= 90) return 4;
  if (weighted >= 75) return 3;
  if (weighted >= 50) return 2;
  if (weighted >= 25) return 1;
  return 0;
}

export function pageSpeedCheck(ps: PageSpeedScores | null): CheckScore {
  const weighted = pageSpeedWeighted(ps);
  const points = pageSpeedPoints(weighted);
  if (points === null) {
    return {
      key: "pagespeed",
      score: null,
      assessable: false,
      evidence: "Loading speed could not be measured for this site.",
    };
  }
  const mobile = ps?.mobile?.performance;
  const desktop = ps?.desktop?.performance;
  const parts = [
    typeof mobile === "number" ? `mobile ${mobile}` : null,
    typeof desktop === "number" ? `desktop ${desktop}` : null,
  ].filter(Boolean);
  return {
    key: "pagespeed",
    score: points,
    assessable: true,
    evidence: `Measured PageSpeed: ${parts.join(", ")} (weighted ${weighted}).`,
  };
}

// ── Verdict logic ────────────────────────────────────────────────────────────
// The overall score sets the verdict, always: 80 to 100 narrow gap, 60 to 79
// visible gap, below 60 wide gap. The competitor benchmark adjusts wording
// INSIDE the verdict (the stance), never the verdict itself. Guardrail: a
// strong score that trails a rival stays narrow or visible; wide gap only ever
// comes from the prospect's own score.
export type VerdictBand = "narrow" | "visible" | "wide";

export function verdictBand(overall: number): VerdictBand {
  if (overall >= 80) return "narrow";
  if (overall >= 60) return "visible";
  return "wide";
}

export const VERDICT_LABELS: Record<VerdictBand, string> = {
  narrow: "Narrow gap",
  visible: "Visible gap",
  wide: "Wide gap",
};

export type BenchmarkStance = "ahead" | "level" | "behind" | "no-benchmark";

export interface RivalGap {
  company: string;
  overall: number;
  /** The category where this rival pulls ahead the furthest. */
  leadCategory: CategoryKey | null;
  leadMargin: number;
}

export interface Benchmark {
  stance: BenchmarkStance;
  /** The strongest scored rival. */
  bestRival: { company: string; overall: number } | null;
  /** Rivals scoring above the prospect, strongest first. */
  aheadRivals: RivalGap[];
}

// Level means within 2 points of the best rival: at that distance the honest
// story is a tie-breaker, not a lead or a deficit.
const LEVEL_MARGIN = 2;

function categoryLead(rival: CompanyScores, prospect: CompanyScores): { key: CategoryKey | null; margin: number } {
  let best: CategoryKey | null = null;
  let margin = 0;
  for (const rc of rival.categories) {
    const pc = prospect.categories.find((c) => c.key === rc.key);
    if (rc.total === null || !pc || pc.total === null) continue;
    const lead = rc.total - pc.total;
    if (lead > margin) {
      margin = lead;
      best = rc.key;
    }
  }
  return { key: best, margin };
}

export function computeBenchmark(prospect: CompanyScores, rivals: CompanyScores[]): Benchmark {
  const scored = rivals.filter((r) => r.scored && r.overall !== null);
  if (prospect.overall === null || scored.length === 0) {
    return { stance: "no-benchmark", bestRival: null, aheadRivals: [] };
  }
  const best = scored.reduce((a, b) => ((a.overall ?? 0) >= (b.overall ?? 0) ? a : b));
  const diff = prospect.overall - (best.overall ?? 0);
  const aheadRivals: RivalGap[] = scored
    .filter((r) => (r.overall ?? 0) > (prospect.overall ?? 0))
    .sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0))
    .map((r) => {
      const lead = categoryLead(r, prospect);
      return { company: r.company, overall: r.overall ?? 0, leadCategory: lead.key, leadMargin: lead.margin };
    });
  const stance: BenchmarkStance = diff > LEVEL_MARGIN ? "ahead" : diff >= -LEVEL_MARGIN ? "level" : "behind";
  return { stance, bestRival: { company: best.company, overall: best.overall ?? 0 }, aheadRivals };
}

// ── First place to fix ───────────────────────────────────────────────────────
// Lowest prospect category; ties broken by buyer visibility order (website,
// message clarity, product visuals, brand identity, trade show and print).
// Categories with null totals cannot be the first fix: an unassessable
// category is a data gap, not a diagnosed weakness.
export function firstFixCategory(prospect: CompanyScores): CategoryKey | null {
  const scored = prospect.categories.filter((c) => c.total !== null);
  if (scored.length === 0) return null;
  const lowest = Math.min(...scored.map((c) => c.total ?? 20));
  const tied = scored.filter((c) => c.total === lowest).map((c) => c.key);
  for (const key of FIRST_FIX_ORDER) {
    if (tied.includes(key)) return key;
  }
  return tied[0] ?? null;
}

// ── Assembly ────────────────────────────────────────────────────────────────
// Build a CompanyScores from the model's 25 raw checks plus the company's
// PageSpeed data. The deterministic PageSpeed check ALWAYS overrides whatever
// the model returned for that slot.
export interface RawCheck {
  key: string;
  score: number | null;
  assessable: boolean;
  evidence: string;
}

export function assembleCompanyScores(args: {
  company: string;
  isProspect: boolean;
  rawChecks: RawCheck[];
  pageSpeed: PageSpeedScores | null;
}): CompanyScores {
  const byKey = new Map(args.rawChecks.map((c) => [c.key, c]));
  const categories: CategoryScore[] = RUBRIC.map((cat) => {
    const checks: CheckScore[] = cat.checks.map((def) => {
      if (def.key === "pagespeed") return pageSpeedCheck(args.pageSpeed);
      const raw = byKey.get(def.key);
      if (!raw) {
        return { key: def.key, score: null, assessable: false, evidence: "This check was not returned by the scorer." };
      }
      // Clamp to the 0..4 integer range; a null score is only valid when
      // marked unassessable.
      const score = raw.score === null || !raw.assessable ? null : Math.max(0, Math.min(4, Math.round(raw.score)));
      return { key: def.key, score, assessable: raw.assessable && score !== null, evidence: raw.evidence };
    });
    const { total, assessed } = categoryTotal(checks);
    return { key: cat.key, checks, total, assessedChecks: assessed };
  });
  return {
    company: args.company,
    isProspect: args.isProspect,
    scored: true,
    categories,
    overall: overallScore(categories),
  };
}

export function unscoredCompany(company: string, isProspect: boolean): CompanyScores {
  return { company, isProspect, scored: false, categories: [], overall: null };
}
