// Presentation-layer derivations for the report: everything here is computed
// from the stored ScorecardResult (rubric check scores + evidence sentences),
// never generated, so reports created long before this layout existed render
// the same sections. Client-safe: types and pure functions only.
import { RUBRIC, FIRST_FIX_ORDER, categoryLabel, type CategoryKey, type CheckDef } from "./rubric";
import { VERDICT_LINES } from "./copy";
import { prospectScores, type ScorecardResult, type CategoryCopy } from "./result";
import type { CategoryScore, CheckScore, CompanyScores, VerdictBand } from "./scoring";

export interface ReportListItem {
  key: string;
  /** Short bold title: the check's label. */
  title: string;
  /** One-sentence explanation: the check's evidence sentence. */
  body: string;
  score: number;
}

/** What the list components render: generated claim items and rubric-derived
 *  items both reduce to this. */
export interface DisplayListItem {
  key: string;
  title: string;
  body: string;
}

function checkDef(catKey: CategoryKey, checkKey: string): CheckDef | null {
  return RUBRIC.find((c) => c.key === catKey)?.checks.find((ch) => ch.key === checkKey) ?? null;
}

function itemFrom(catKey: CategoryKey, check: CheckScore): ReportListItem | null {
  if (!check.assessable || check.score === null) return null;
  const def = checkDef(catKey, check.key);
  return {
    key: check.key,
    title: def?.label ?? check.key,
    body: check.evidence,
    score: check.score,
  };
}

/** Checks that scored well (3-4): the "What is working" list, best first. */
export function workingItems(cat: CategoryScore): ReportListItem[] {
  return cat.checks
    .map((ch) => itemFrom(cat.key, ch))
    .filter((i): i is ReportListItem => i !== null && i.score >= 3)
    .sort((a, b) => b.score - a.score);
}

/** Checks that scored 0-2: the "What to fix" list, worst first. */
export function fixItems(cat: CategoryScore): ReportListItem[] {
  return cat.checks
    .map((ch) => itemFrom(cat.key, ch))
    .filter((i): i is ReportListItem => i !== null && i.score <= 2)
    .sort((a, b) => a.score - b.score);
}

/** Every assessable check scoring 0-2 counts as one issue. */
export function issuesCount(result: ScorecardResult): number {
  const p = prospectScores(result);
  if (!p) return 0;
  return p.categories.reduce((n, cat) => n + fixItems(cat).length, 0);
}

// One-line pillar summaries, three tiers per pillar. Plain and calm; the
// specifics live in the lists underneath.
const PILLAR_SUMMARY: Record<CategoryKey, { high: string; mid: string; low: string }> = {
  "brand-identity": {
    high: "The brand holds together and reads like it belongs at the front of the market.",
    mid: "The brand holds together in places, but it undersells the company in others.",
    low: "The brand reads smaller and older than the company behind it.",
  },
  website: {
    high: "The site does its job: a stranger quickly sees what you make and why it matters.",
    mid: "The site works, but it makes a buyer do more work than it should.",
    low: "The site is costing you buyers before they ever reach a conversation.",
  },
  "product-visuals": {
    high: "The product is shown properly, at a level buyers will compare favourably.",
    mid: "The product is visible, but not shown at the level the machines deserve.",
    low: "Buyers cannot see the product working, and that gap decides shortlists.",
  },
  "trade-show-print": {
    high: "A researching buyer finds proper documents that match the brand.",
    mid: "Some material exists, but a researching buyer has to dig for it.",
    low: "A buyer doing homework finds little to take to their team.",
  },
  "message-clarity": {
    high: "The message lands: a buyer can tell why this is worth more.",
    mid: "Parts of the story land, but the value case is not immediate.",
    low: "The words never make the case for why this is worth more.",
  },
};

export function pillarSummary(cat: CategoryScore): string {
  const t = PILLAR_SUMMARY[cat.key];
  if (cat.total === null) return "This pillar could not be fully assessed from what is publicly visible.";
  if (cat.total >= 14) return t.high;
  if (cat.total >= 9) return t.mid;
  return t.low;
}

// Short pillar chip labels (same set the homepage radar uses).
export const PILLAR_CHIP_LABELS: Record<CategoryKey, string> = {
  "brand-identity": "Brand",
  website: "Website",
  "product-visuals": "Visuals",
  "trade-show-print": "Print",
  "message-clarity": "Message",
};

export interface TopIssue {
  rank: number;
  title: string;
  body: string;
  impact: string;
}

// Deterministic impact estimates per pillar. Deliberately ranges and
// "likely", never a precise claim; the wording names the mechanism the
// pillar controls.
const IMPACT_LINES: Record<CategoryKey, string> = {
  website: "Likely 30-50% of warm visitors lost before they read a word",
  "message-clarity": "Likely a meaningful share of serious enquiries never sent",
  "product-visuals": "Likely losing shortlists to rivals who show their machines working",
  "brand-identity": "Likely compared on price rather than capability",
  "trade-show-print": "Likely dropped early by buyers who research before they call",
};

// Buyer-visibility priority for ranking equal scores: same order the
// first-fix tie-break uses.
function visibilityRank(key: CategoryKey): number {
  return FIRST_FIX_ORDER.indexOf(key);
}

/** The three worst assessable checks across all pillars, ranked by score then
 *  buyer visibility, each with its pillar's impact estimate. */
export function deriveTopIssues(p: CompanyScores): TopIssue[] {
  const all: Array<ReportListItem & { cat: CategoryKey }> = p.categories.flatMap((cat) =>
    fixItems(cat).map((i) => ({ ...i, cat: cat.key })),
  );
  all.sort((a, b) => a.score - b.score || visibilityRank(a.cat) - visibilityRank(b.cat));
  return all.slice(0, 3).map((i, idx) => ({
    rank: idx + 1,
    title: i.title,
    body: i.body,
    impact: IMPACT_LINES[i.cat],
  }));
}

export function topIssues(result: ScorecardResult): TopIssue[] {
  const p = prospectScores(result);
  return p ? deriveTopIssues(p) : [];
}

// One action line per pillar for the "where we would start" list.
const START_ACTIONS: Record<CategoryKey, string> = {
  website: "Make the homepage pass the five-second test, so a stranger instantly sees what you make and for whom",
  "message-clarity": "Rewrite the core message around why the product is worth more, backed by the proof you already have",
  "product-visuals": "Show the machines working, in video and 3D, at the level buyers expect from a leader",
  "brand-identity": "Tighten the brand so every touchpoint reads premium and consistent",
  "trade-show-print": "Give researching buyers proper brochures and spec sheets that match the brand",
};

/** Prioritised fix list: the first fix leads, then the remaining pillars from
 *  weakest up, capped at 4 lines. */
export function deriveStartList(p: CompanyScores, firstFix: CategoryKey | null): string[] {
  const rest = p.categories
    .filter((c) => c.key !== firstFix && c.total !== null && c.total < 14)
    .sort((a, b) => (a.total ?? 20) - (b.total ?? 20))
    .map((c) => c.key);
  const order: CategoryKey[] = [...(firstFix ? [firstFix] : []), ...rest];
  return order.slice(0, 4).map((k) => START_ACTIONS[k]);
}

export function startList(result: ScorecardResult): string[] {
  const p = prospectScores(result);
  return p ? deriveStartList(p, result.firstFix?.category ?? null) : [];
}

/** The one-line cost of doing nothing, from the verdict band and benchmark. */
export function deriveStayingSame(band: VerdictBand, rivalName: string | null): string {
  const against = rivalName ? `${rivalName} keeps winning the comparisons buyers run` : "the competitors keep winning the comparisons buyers run";
  switch (band) {
    case "wide":
      return `What staying the same costs you: every week, buyers who need exactly what you make judge you on this and ${against}.`;
    case "visible":
      return `What staying the same costs you: the gaps above stay visible to every buyer who compares, and ${against}.`;
    default:
      return `What staying the same costs you: the few specifics above stay the difference between shortlisted and chosen.`;
  }
}

export function stayingSameLine(result: ScorecardResult): string {
  return deriveStayingSame(result.verdict.band, result.verdict.bestRival?.company ?? null);
}

// ── Resolved sections: prefer what the generator wrote, fall back to the
//    rubric-derived versions for reports stored before the generator
//    produced these fields ─────────────────────────────────────────────────
function toDisplay(items: Array<{ title: string; body: string }>): DisplayListItem[] {
  return items.map((i, idx) => ({ key: `${idx}:${i.title}`, title: i.title, body: i.body }));
}

export function resolvedWorking(copy: CategoryCopy | undefined, cat: CategoryScore): DisplayListItem[] {
  if (copy?.working) return toDisplay(copy.working);
  return workingItems(cat);
}

export function resolvedFix(copy: CategoryCopy | undefined, cat: CategoryScore): DisplayListItem[] {
  if (copy?.fix) return toDisplay(copy.fix);
  return fixItems(cat);
}

export function resolvedIssuesCount(result: ScorecardResult): number {
  const generated = result.deckCopy.categories.every((c) => c.fix !== undefined);
  if (generated) return result.deckCopy.categories.reduce((n, c) => n + (c.fix?.length ?? 0), 0);
  return issuesCount(result);
}

export function resolvedTopIssues(result: ScorecardResult): TopIssue[] {
  if (result.deckCopy.topIssues?.length) {
    return result.deckCopy.topIssues.map((t, i) => ({ rank: i + 1, title: t.title, body: t.body, impact: t.impact }));
  }
  return topIssues(result);
}

export function resolvedStartList(result: ScorecardResult): string[] {
  return result.deckCopy.startList?.length ? result.deckCopy.startList : startList(result);
}

export function resolvedStayingSame(result: ScorecardResult): string {
  return result.deckCopy.stayingSame || stayingSameLine(result);
}

export function resolvedVerdictLine(result: ScorecardResult): string {
  return result.deckCopy.verdictLine || VERDICT_LINES[result.verdict.band];
}

/** "For a [industry descriptor], here is where [Company] stands online." */
export function industryDescriptor(result: ScorecardResult): string {
  const one = result.meta.productOneLiner.trim().replace(/\.$/, "");
  if (!one) return "European industrial manufacturer";
  const lower = one.charAt(0).toLowerCase() + one.slice(1);
  return `maker of ${lower}`;
}

/** One-line verdict under the gauge: the fixed band lines. */
export { categoryLabel };
