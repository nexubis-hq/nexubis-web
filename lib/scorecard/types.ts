// Client-safe shared types for the Scorecard engine. No server-only imports.
// One mode only: every Nexubis prospect has a website. The presence-mode
// machinery from the LekkeWeb snapshot is deliberately not ported.

/** A competitor exactly as the prospect typed it (a name or a URL), plus what
 *  the resolver made of it. `resolved: false` entries stay in the run so the
 *  report can say, honestly, that the competitor could not be found. */
export interface CompetitorRef {
  /** The raw form-field entry: "DosaTech GmbH" or "dosatech.de". */
  raw: string;
  /** Display name, once known ("DosaTech"). */
  name?: string;
  /** Normalised https URL of the competitor's site, once known. */
  url?: string;
  /** True when we located a real site to run the pipeline on. */
  resolved?: boolean;
}

export interface ProspectData {
  /** Contact first name. Empty until the unlock gate collects it. */
  name: string;
  /** Company display name. Derived from the URL host until the unlock gate. */
  company: string;
  /** The prospect's website, normalised to https. Always present. */
  url: string;
  /** Contact role (dropdown at the unlock gate). Empty until then. */
  role: string;
  /** "What do you make, in one line". Context for scoring and message clarity. */
  productOneLiner: string;
  /** 2 or 3 competitors the prospect keeps running into. */
  competitors: CompetitorRef[];
}

export type GenerationStatus = "idle" | "in-progress" | "done" | "failed";

/** One web-verified fact with its evidence string, following the snapshot's
 *  verified-facts pattern so the scorer never false-negates what the crawl
 *  missed. `key` is a stable slug like "linkedin-page", "brochure-pdf",
 *  "trade-show". */
export interface VerifiedFact {
  key: string;
  present: boolean;
  evidence: string;
}

export interface StrategyScores {
  performance: number | null;
  seo: number | null;
  accessibility: number | null;
  bestPractices: number | null;
}

export interface PageSpeedScores {
  mobile: StrategyScores | null;
  desktop: StrategyScores | null;
  lcp: string | null;
}

export function hasProspect(data: ProspectData | null): data is ProspectData {
  if (!data) return false;
  if (data.url.trim().length === 0) return false;
  if (data.productOneLiner.trim().length === 0) return false;
  return data.competitors.length >= 2;
}
