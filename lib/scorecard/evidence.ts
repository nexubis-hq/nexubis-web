// The EvidenceBundle: everything the pipeline gathered about one company,
// typed and JSON-serialisable, stored in KV under the run id. One bundle per
// company (the prospect and each named competitor), all through the identical
// pipeline. The scorer (Prompt 3) consumes bundles; it never fetches anything
// itself.
import type { FirstImpressionRead } from "./anthropic";
import type { SitePageFacts } from "./fetch-site";
import type { PageSpeedScores, VerifiedFact } from "./types";

export interface CompanyEvidence {
  /** Display name ("DosaTech"). */
  company: string;
  /** The site the pipeline ran on. Null when the competitor never resolved. */
  url: string | null;
  isProspect: boolean;
  /** The raw form entry, for honest reporting on unresolved competitors. */
  rawEntry?: string;
  /** False when the competitor could not be resolved to a site at all. */
  resolved: boolean;
  /** False when the site was resolved but could not be fetched (down, blocked,
   *  not HTML). The run still completes; the report says so plainly. */
  fetched: boolean;
  fetchReason?: string;
  /** Crawled text: homepage + up to 5 key inner pages + nav vocabulary +
   *  page signals. Null when fetch failed. */
  siteText: string | null;
  siteTitle: string | null;
  finalUrl: string | null;
  /** Deterministic facts read from the HTML (languages, footer year, PDF and
   *  technical-document links, enquiry-form depth). Powers the code-side
   *  competitor comparison. Optional: absent on bundles cached before this
   *  field existed and when the fetch failed. */
  siteFacts?: SitePageFacts;
  /** Stable ScreenshotOne URLs for the report exhibits. Null when capture
   *  failed; the report renders an honest placeholder, never a guess. */
  screenshots: {
    desktopUrl: string | null;
    mobileUrl: string | null;
  };
  /** Null scores are allowed and render as "could not be measured". */
  pageSpeed: PageSpeedScores | null;
  /** Off-site retrieval: LinkedIn, brochures/spec sheets, trade shows. */
  offsiteFacts: VerifiedFact[];
  /** Raw deduped search block for the scorer's context. */
  searchBlock: string;
  /** Vision read of the first-impression screenshots. Describes, never scores. */
  firstImpression: FirstImpressionRead | null;
  /** Anything that went wrong for this company, in pipeline terms. */
  flags: string[];
}

export interface EvidenceBundleSet {
  /** Prospect first, then competitors in form order. */
  companies: CompanyEvidence[];
  /** Total estimated cost of gathering (AI + search), USD. */
  estimatedCostUsd: number;
  /** Serper queries consumed across the run. */
  searchQueriesUsed: number;
  flags: string[];
  gatheredAt: string;
}

// Hard per-run budget caps. 4 companies x (1 crawl + 2 screenshots +
// 1 PageSpeed + up to 4 Serper queries + 1 vision read), plus up to 3 name
// resolution queries. The caps sit above normal usage; hitting one is logged
// and the affected checks surface as not assessable.
export const RUN_BUDGET = {
  maxCompanies: 4,
  maxSerperQueries: 24,
  maxScreenshotsPerCompany: 2,
  maxVisionReadsPerCompany: 1,
  /** Abort-level ceiling for the estimated run cost log (USD). */
  targetMaxCostUsd: 0.4,
} as const;
