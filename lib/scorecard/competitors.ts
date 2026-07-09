// Competitor resolution: the form accepts names or URLs (2 minimum, 3 maximum).
// A URL/domain entry normalises straight to https with a derived display name.
// A name resolves to its official site via Serper, with the prospect's product
// one-liner as context. Self-matches (the prospect entering themselves, or a
// reseller page of their own site) are rejected. A competitor that cannot be
// resolved stays in the run with resolved:false so the report can say so
// honestly, never silently dropping a rival the prospect named.
import { deriveCompanyFromUrl, normaliseToHttps } from "./run";
import { searchWeb, hostFromUrl } from "./web-search";
import type { CompetitorRef, ProspectData } from "./types";

function normaliseCompanyName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Ported from the snapshot orchestrator: host containment plus squashed-name
// and token-overlap checks, so "Ilovemelkies" matches "I Love Melkies" and
// sub/parent domains match each other.
export function isSelfMatch(candidate: { name: string; url: string | null }, prospect: ProspectData): boolean {
  const ownHost = hostFromUrl(prospect.url) ?? "";
  const ownTokens = new Set(normaliseCompanyName(prospect.company).split(" ").filter((t) => t.length >= 3));
  const compHost = candidate.url ? hostFromUrl(candidate.url) ?? "" : "";
  if (ownHost && compHost && (compHost === ownHost || compHost.endsWith(`.${ownHost}`) || ownHost.endsWith(`.${compHost}`))) {
    return true;
  }
  // Squashed comparison catches URL-derived names, which token overlap cannot see.
  const ownSquash = normaliseCompanyName(prospect.company).replace(/ /g, "");
  const compSquash = normaliseCompanyName(candidate.name).replace(/ /g, "");
  if (ownSquash.length >= 5 && compSquash.length >= 5 && (ownSquash.includes(compSquash) || compSquash.includes(ownSquash))) {
    return true;
  }
  const compTokens = normaliseCompanyName(candidate.name).split(" ").filter((t) => t.length >= 3);
  if (compTokens.length > 0 && ownTokens.size > 0) {
    const overlap = compTokens.filter((t) => ownTokens.has(t)).length;
    if (overlap >= 2 || (compTokens.length === 1 && overlap === 1)) return true;
  }
  return false;
}

// Does the raw entry parse as a URL or bare domain (has a dot and no spaces)?
export function looksLikeUrl(raw: string): boolean {
  const s = raw.trim();
  if (!s || /\s/.test(s)) return false;
  if (/^https?:\/\//i.test(s)) return true;
  // A bare domain: at least one dot with a plausible TLD, no @ (email).
  return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(\/\S*)?$/i.test(s) && !s.includes("@");
}

// Hosts that are never a competitor's own site: marketplaces, directories,
// social networks. If name resolution lands on one of these, keep looking.
const NON_COMPANY_HOSTS = [
  "linkedin.com", "facebook.com", "instagram.com", "youtube.com", "x.com", "twitter.com",
  "wikipedia.org", "crunchbase.com", "bloomberg.com", "alibaba.com", "amazon.",
  "directindustry.com", "europages.", "kompass.com", "yellowpages", "glassdoor.",
  "indeed.", "trustpilot.", "clutch.co",
];
function isNonCompanyHost(host: string): boolean {
  return NON_COMPANY_HOSTS.some((h) => host.includes(h));
}

// Resolve one raw competitor entry. URL entries resolve locally; name entries
// go through Serper with the one-liner as industry context. Best-effort: on any
// doubt the entry survives with resolved:false.
export async function resolveCompetitor(
  raw: string,
  prospect: ProspectData,
): Promise<CompetitorRef> {
  const entry = raw.trim();
  if (!entry) return { raw, resolved: false };

  if (looksLikeUrl(entry)) {
    const url = normaliseToHttps(entry);
    const candidate = { name: deriveCompanyFromUrl(url), url };
    if (isSelfMatch(candidate, prospect)) return { raw, name: candidate.name, resolved: false };
    return { raw, name: candidate.name, url, resolved: true };
  }

  // Name entry: find the official site. The one-liner scopes the query to the
  // prospect's industry so "FlowServe Dosing" does not drift to a namesake.
  const query = `${entry} ${prospect.productOneLiner} official website`;
  const res = await searchWeb(query);
  for (const hit of res?.organic ?? []) {
    const host = hostFromUrl(hit.url);
    if (!host || isNonCompanyHost(host)) continue;
    const candidate = { name: entry, url: `https://${host}` };
    if (isSelfMatch(candidate, prospect)) continue;
    // Weak sanity check: the entry's strongest token should appear in the host
    // or the result title, so an unrelated top result cannot claim the slot.
    const tokens = normaliseCompanyName(entry).split(" ").filter((t) => t.length >= 3);
    const haystack = `${host} ${hit.title.toLowerCase()}`;
    if (tokens.length > 0 && !tokens.some((t) => haystack.includes(t))) continue;
    return { raw, name: entry, url: candidate.url, resolved: true };
  }
  return { raw, name: entry, resolved: false };
}

// Resolve every entry in parallel, preserving form order. Self-matching or
// unresolvable entries keep their slot with resolved:false.
export async function resolveCompetitors(prospect: ProspectData): Promise<CompetitorRef[]> {
  return Promise.all(prospect.competitors.map((c) => resolveCompetitor(c.raw, prospect)));
}
