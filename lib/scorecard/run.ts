import { scorecardCacheKey, prospectDeterminismInput } from "./determinism";
import type { CompetitorRef, ProspectData } from "./types";

// Public-run plumbing: turn the step-1 form (website, one-liner, competitors)
// into a ProspectData, and hold the freshly generated result in a short-lived
// run record that the teaser reads and the unlock gate promotes to a permanent
// shared report. Pure helpers here are unit-tested; KV access is thin.

export interface RunInput {
  url?: string;
  productOneLiner?: string;
  /** Raw competitor entries, names or URLs, as typed. 2 required, 3rd optional. */
  competitors?: string[];
}

export function normaliseToHttps(url: string): string {
  // Drop trailing dots/slashes so "example.com." (a valid FQDN) or "example.com/"
  // collapse to the same clean host the validator and cache key expect.
  const s = (url ?? "").trim().replace(/[./]+$/, "");
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

// Provisional company name from the domain, so the pipeline has a name before
// the unlock gate collects the real contact. "example-machinery.de" becomes
// "Example Machinery". The gate stores the authoritative details later.
export function deriveCompanyFromUrl(url: string): string {
  const withScheme = normaliseToHttps(url);
  if (!withScheme) return "";
  try {
    const host = new URL(withScheme).hostname.replace(/^www\./i, "");
    const core = host.split(".")[0] ?? host;
    const titled = core
      .split(/[-_]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return titled || host;
  } catch {
    return url.trim();
  }
}

export const MIN_COMPETITORS = 2;
export const MAX_COMPETITORS = 3;

// Build the ProspectData. The contact name and role are intentionally empty:
// they are collected at the unlock gate, after the scan.
export function prospectFromRunInput(input: RunInput): ProspectData {
  const competitors: CompetitorRef[] = (input.competitors ?? [])
    .map((raw) => raw.trim())
    .filter(Boolean)
    .slice(0, MAX_COMPETITORS)
    .map((raw) => ({ raw }));
  return {
    name: "",
    role: "",
    company: deriveCompanyFromUrl(input.url ?? ""),
    url: normaliseToHttps(input.url ?? ""),
    productOneLiner: (input.productOneLiner ?? "").trim(),
    competitors,
  };
}

// Enough to run: a website. The product one-liner and competitors are no longer
// asked for; they are detected from the site before generation (see detect.ts),
// so the only thing a prospect must give is a valid-looking web address.
export function runInputIsValid(input: RunInput): boolean {
  return Boolean(input.url && input.url.trim());
}

export function runIdFor(prospect: ProspectData): string {
  return scorecardCacheKey(prospectDeterminismInput(prospect)).replace(/^scorecard-gen:/, "");
}

// Run records (the short-lived KV hop between scan and unlock) are gone: the
// gateless flow promotes a finished generation straight to its permanent
// shared slug, so there is nothing to park in between. runIdFor stays as the
// stable per-site key for capture dedupe.
