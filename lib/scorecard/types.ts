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
  /** Confidence that this really is a competitor in the prospect's space, not a
   *  namesake. True when the site was a given URL or matched the name WITHIN the
   *  prospect's product context (resolver Pass 1); false when it only matched on
   *  name alone (relaxed Pass 2). Gates whether the name is safe to merge into
   *  high-stakes narrative copy. See resolveCompetitor. */
  contextMatch?: boolean;
}

/** Industry fingerprint extracted from the prospect's own site text during
 *  auto-detect. Every field is EXTRACTIVE: it may only contain what the site
 *  itself states, never inference, so downstream prompts can treat it as
 *  ground truth. All fields optional and empty-safe: an old cached detection
 *  or a thin site simply yields less context, never wrong context. */
export interface DetectedFingerprint {
  /** Industries the site names serving (e.g. "dairy", "pharma"). */
  industries: string[];
  /** Certification names literally present on the site (e.g. "ATEX", "EHEDG"). */
  certifications: string[];
  /** Named product families or model series as written on the site. */
  productFamilies: string[];
  /** How they sell, only when the site says so. */
  salesModel: "direct" | "distributors" | "mixed" | "unclear";
  /** One line describing the likely buyer, grounded in who the site addresses. */
  buyerPersona: string;
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
  /** Industry fingerprint from auto-detect. Optional: absent on old records
   *  and when detection failed; prompts simply omit the context block.
   *  Deliberately NOT part of the determinism identity. */
  fingerprint?: DetectedFingerprint;
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
