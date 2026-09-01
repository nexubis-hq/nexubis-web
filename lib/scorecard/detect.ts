// Website-only entry: turn a bare URL into a full ProspectData by reading the
// prospect's own site and inferring what they make and who they cross-shop
// against. This is what lets the public form ask for nothing but a website.
//
// The prospect names nothing, so the two things scoring needs (the product
// one-liner and 2 to 3 competitors) are detected here, once, up front:
//   1. Fetch the homepage text (same crawler the evidence pipeline uses).
//   2. One cheap model call reads that text and returns the one-liner plus up
//      to four candidate competitors (names or domains).
// The candidates stay as raw entries; the existing competitor resolver
// (Serper) validates each one during evidence gathering, so a shaky guess fails
// to resolve rather than poisoning the benchmark.
//
// Determinism: the whole detection runs inside a URL-keyed envelope and its
// result is cached under that URL, so the same website always yields the same
// detected inputs. That keeps the downstream generate cache key stable, so a
// re-run of the same site still replays the finished report for free.
import { fetchSite } from "./fetch-site";
import { detectProductContext, pickCompetitorsFromSearch, type DetectedContext } from "./anthropic";
import { searchWeb, formatSearchBlock, hostFromUrl } from "./web-search";
import { normaliseUrl, cachedJson, SCORECARD_RECORD_TTL_S } from "./determinism";
import { withCallEnvelope } from "./call-cache";
import { MIN_COMPETITORS, MAX_COMPETITORS } from "./run";
import type { CompetitorRef, DetectedFingerprint, ProspectData } from "./types";

export interface DetectionResult {
  productOneLiner: string;
  /** Raw competitor entries (names or domains) for the resolver to validate. */
  competitors: string[];
  /** The company's own name as written on its site. Empty when unknown; the
   *  URL-derived placeholder then stays in place. */
  companyName: string;
  /** Audience gate: "outside" is the only value the run route blocks on.
   *  Unreadable sites and failed detections come back "unclear" and proceed,
   *  so the gate can never lock out a real prospect on a bad crawl. */
  industryFit: "manufacturer" | "adjacent" | "outside" | "unclear";
  /** Industry fingerprint (extractive). Null when detection failed or the
   *  cached result predates the fingerprint. */
  fingerprint: DetectedFingerprint | null;
  /** Surfaced into the run flags so an empty detection is visible, never silent. */
  flags: string[];
}

// v3: companyName joined the detection (v2 added the fingerprint). Bumping the
// key retires older cached detections instead of replaying them for 180 days.
function detectEnvelopeKey(url: string): string {
  return `scorecard-detect:v3:${normaliseUrl(url)}`;
}

// Competitor rescue: niche industries can leave the site-only detection with
// too few rivals to benchmark (the model is told never to guess names, and in
// a narrow category it rightly returns none). Two live searches for the
// product category ground a second cheap pick in real results; the resolver
// still validates every candidate, so a wrong pick fails to resolve instead
// of poisoning the benchmark. Exported for tests.
export function filterRescuedCompetitors(candidates: string[], company: string, ownUrl: string): string[] {
  const ownHost = hostFromUrl(ownUrl) ?? "";
  const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const ownCore = compact(company);
  const seen = new Set<string>();
  return candidates
    .map((c) => c.trim())
    .filter((c) => c.length > 1 && c.length < 80)
    .filter((c) => {
      const cc = compact(c);
      if (!cc || (ownCore && cc.includes(ownCore)) || (ownHost && cc.includes(compact(ownHost)))) return false;
      if (seen.has(cc)) return false;
      seen.add(cc);
      return true;
    });
}

async function rescueCompetitors(company: string, productOneLiner: string, ownUrl: string): Promise<string[]> {
  if (!productOneLiner) return [];
  const [categoryRes, rivalRes] = await Promise.all([
    searchWeb(`${productOneLiner} manufacturers`),
    searchWeb(`"${company}" competitors OR alternatives`),
  ]);
  const searchBlock = formatSearchBlock([categoryRes, rivalRes]);
  const pick = await pickCompetitorsFromSearch({ company, productOneLiner, searchBlock });
  if (!pick.ok) return [];
  return filterRescuedCompetitors(pick.data.competitors, company, ownUrl);
}

// Normalise the model reply into a fingerprint with hard caps, so a runaway
// list can never bloat downstream prompts. Missing fields (old cached
// payloads) become safe empties.
export function fingerprintFromDetect(d: DetectedContext): DetectedFingerprint {
  const clean = (list: string[] | undefined, cap: number) =>
    (list ?? []).map((s) => s.trim()).filter((s) => s.length > 0 && s.length < 60).slice(0, cap);
  return {
    industries: clean(d.industries, 5),
    certifications: clean(d.certifications, 6),
    productFamilies: clean(d.productFamilies, 6),
    salesModel: d.salesModel ?? "unclear",
    buyerPersona: (d.buyerPersona ?? "").trim().slice(0, 120),
  };
}

// Uncached detection: fetch the site, read it, return the inferred inputs.
// Never throws: a site that will not load yields an empty detection with a
// flag, and the run can still proceed (the pipeline reports honestly on the
// thin evidence).
export async function detectProspectContextUncached(prospect: ProspectData): Promise<DetectionResult> {
  const flags: string[] = [];
  const t0 = Date.now();
  const mark = (label: string) => console.log(`[scorecard-timing] detect ${label} ${Date.now() - t0}ms`);
  const site = await fetchSite(prospect.url).catch((err) => ({
    ok: false as const,
    reason: err instanceof Error ? err.message : "fetch failed",
  }));
  mark("site-fetched");

  if (!site.ok) {
    flags.push(`Auto-detect could not read the site (${site.reason})`);
    return { productOneLiner: "", competitors: [], companyName: "", industryFit: "unclear", fingerprint: null, flags };
  }

  const detect = await detectProductContext({
    company: prospect.company,
    url: prospect.url,
    siteText: site.text,
    siteTitle: site.title,
  });
  mark("model-read");

  if (!detect.ok) {
    flags.push(`Auto-detect of product and competitors failed (${detect.reason})`);
    return { productOneLiner: "", competitors: [], companyName: "", industryFit: "unclear", fingerprint: null, flags };
  }

  const companyName = (detect.data.companyName ?? "").trim().slice(0, 60);
  const oneLiner = detect.data.productOneLiner.trim();
  let competitors = detect.data.competitors
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, MAX_COMPETITORS);

  // Too few rivals to benchmark: rescue from live search before giving up.
  // The route no longer blocks any site, so every thin read gets the rescue.
  if (competitors.length < MIN_COMPETITORS) {
    const rescued = await rescueCompetitors(companyName || prospect.company, oneLiner, prospect.url).catch(() => []);
    competitors = filterRescuedCompetitors([...competitors, ...rescued], companyName || prospect.company, prospect.url).slice(
      0,
      MAX_COMPETITORS,
    );
    mark("competitor-rescue");
  }
  if (competitors.length === 0) flags.push("Auto-detect found no competitors to benchmark against");

  return {
    productOneLiner: oneLiner,
    competitors,
    companyName,
    industryFit: detect.data.industryFit ?? "unclear",
    fingerprint: fingerprintFromDetect(detect.data),
    flags,
  };
}

// Production entry: URL-keyed envelope + cache so the same site detects
// identically on every run.
export async function detectProspectContext(prospect: ProspectData): Promise<DetectionResult> {
  const key = detectEnvelopeKey(prospect.url);
  return withCallEnvelope(key, () =>
    cachedJson(key, SCORECARD_RECORD_TTL_S, () => detectProspectContextUncached(prospect)),
  );
}

// Fold a detection back into the prospect: fill the one-liner, turn the raw
// competitor entries into unresolved CompetitorRefs (the evidence pipeline's
// resolver upgrades them to resolved sites), carry the fingerprint for the
// scoring and copy prompts, and replace the URL-derived company placeholder
// with the real name the site states. Fingerprint and name are context, not
// identity: both are deliberately excluded from the determinism input.
export function applyDetection(prospect: ProspectData, detection: DetectionResult): ProspectData {
  const competitors: CompetitorRef[] = detection.competitors.map((raw) => ({ raw }));
  return {
    ...prospect,
    productOneLiner: detection.productOneLiner,
    competitors,
    ...(detection.companyName ? { company: detection.companyName } : {}),
    ...(detection.fingerprint ? { fingerprint: detection.fingerprint } : {}),
  };
}
