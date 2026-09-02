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
  /** The audited website URL (https-normalised). Prefills the booking link's
   *  Website field. Optional so reports stored before this field still load. */
  websiteUrl?: string;
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

/** A working/fix list entry: short bold title plus one-sentence explanation. */
export interface ClaimItem {
  title: string;
  body: string;
}

export interface TopIssueCopy {
  title: string;
  body: string;
  /** Defensible range, e.g. "Likely 20-40% of undecided buyers lost". */
  impact: string;
}

export interface CategoryCopy {
  key: CategoryKey;
  findings: string[];
  competitorNote: string;
  /** Generated working/fix lists. Optional: reports stored before the
   *  generator produced them fall back to the rubric-derived lists. */
  working?: ClaimItem[];
  fix?: ClaimItem[];
}

export interface DeckCopy {
  /** One-line verdict for the report header, naming the biggest leak. */
  verdictLine?: string;
  verdictParagraph: string;
  categories: CategoryCopy[];
  firstFix: { why: string; inPractice: string };
  /** The three highest-impact problems across all pillars. */
  topIssues?: TopIssueCopy[];
  /** Prioritised fix list, written as outcomes. */
  startList?: string[];
  /** One sentence naming what stays broken if they do nothing. */
  stayingSame?: string;
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

