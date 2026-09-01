// The structured Scorecard result (Part 2B Section 15): the one object the
// report renders from. Everything client-facing in it has passed the clamp
// and the content-safety scan; anything that failed swapped to its templated
// fallback. Client-safe types only; assembly lives in generate.ts.
import type { CategoryKey } from "./rubric";
import type { CompanyScores, VerdictBand, BenchmarkStance, RivalGap } from "./scoring";
import type { RoutingFlags } from "./routing";
import type { PageSpeedScores } from "./types";

export interface ResultMeta {
  company: string;
  /** Contact fields stay empty until the unlock gate. */
  contactName: string;
  role: string;
  date: string;
  productOneLiner: string;
  competitors: Array<{ name: string; url: string | null; resolved: boolean }>;
}

export interface ResultVerdict {
  band: VerdictBand;
  /** Wording emphasis from the benchmark; never changes the band. */
  stance: BenchmarkStance;
  paragraph: string;
  bestRival: { company: string; overall: number } | null;
  aheadRivals: RivalGap[];
}

export interface ResultFirstFix {
  category: CategoryKey;
  categoryLabel: string;
  why: string;
  inPractice: string;
}

export interface CompanyExhibit {
  company: string;
  isProspect: boolean;
  resolved: boolean;
  fetched: boolean;
  desktopUrl: string | null;
  mobileUrl: string | null;
  pageSpeed: PageSpeedScores | null;
}

export interface CategoryCopy {
  key: CategoryKey;
  findings: string[];
  competitorNote: string;
}

export interface DeckCopy {
  verdictParagraph: string;
  categories: CategoryCopy[];
  firstFix: { why: string; inPractice: string };
}

export interface ScorecardResult {
  meta: ResultMeta;
  /** Prospect first, then competitors in form order. */
  scores: CompanyScores[];
  verdict: ResultVerdict;
  firstFix: ResultFirstFix | null;
  exhibits: CompanyExhibit[];
  deckCopy: DeckCopy;
  routing: RoutingFlags;
  flags: string[];
  estimatedCostUsd: number;
  generatedAt: string;
}

export function prospectScores(result: ScorecardResult): CompanyScores | null {
  return result.scores.find((s) => s.isProspect) ?? null;
}

