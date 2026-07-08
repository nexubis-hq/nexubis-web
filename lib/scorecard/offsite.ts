// Off-site retrieval per company (Serper): the rubric's away-from-the-website
// checks. LinkedIn presence, findable brochures and spec sheets, trade show or
// exhibition mentions. Facts are extracted deterministically in code from the
// search results and stored as VerifiedFact entries with evidence strings,
// following the snapshot's verified-facts pattern, so the scorer never
// false-negates what the crawl missed. The raw search block rides along for
// the scorer's context.
import { searchWeb, formatSearchBlock, hostFromUrl, type WebSearchResponse } from "./web-search";
import type { VerifiedFact } from "./types";

export interface OffsiteEvidence {
  facts: VerifiedFact[];
  /** Compact deduped evidence block for the scorer's prompt. */
  searchBlock: string;
  /** How many Serper queries this company consumed (budget accounting). */
  queriesUsed: number;
}

// Budget guard: shared mutable counter across all companies in one run. When
// the cap is hit, remaining queries are skipped and their checks surface as
// not assessable rather than silently negative.
export interface QueryBudget {
  used: number;
  max: number;
}
export function newQueryBudget(max: number): QueryBudget {
  return { used: 0, max };
}

async function budgetedSearch(query: string, budget: QueryBudget): Promise<WebSearchResponse | null> {
  if (budget.used >= budget.max) {
    console.warn(`[scorecard-offsite] query budget exhausted (${budget.max}), skipping: ${query}`);
    return null;
  }
  budget.used += 1;
  return searchWeb(query);
}

function fact(key: string, present: boolean, evidence: string): VerifiedFact {
  return { key, present, evidence };
}

// LinkedIn: does a company page show up, and does the snippet suggest a real
// presence (followers, description)?
function linkedinFact(company: string, res: WebSearchResponse | null): VerifiedFact {
  if (!res) return fact("linkedin-page", false, "LinkedIn presence could not be checked.");
  const hit = res.organic.find((o) => {
    const host = hostFromUrl(o.url) ?? "";
    return host.includes("linkedin.com") && /\/company\//i.test(o.url);
  });
  if (!hit) return fact("linkedin-page", false, "No LinkedIn company page shows up in search results for the company name.");
  const detail = hit.snippet ? ` Snippet: ${hit.snippet.slice(0, 180)}` : "";
  return fact("linkedin-page", true, `LinkedIn company page found: ${hit.url}.${detail}`);
}

// Brochures / spec sheets: PDF results on the company's own domain or clearly
// theirs by title.
function brochureFact(company: string, host: string | null, responses: Array<WebSearchResponse | null>): VerifiedFact {
  const hits: string[] = [];
  for (const res of responses) {
    for (const o of res?.organic ?? []) {
      const isPdf = /\.pdf(\?|$)/i.test(o.url);
      const onOwnSite = host !== null && (hostFromUrl(o.url) ?? "").endsWith(host);
      if (isPdf || (onOwnSite && /brochure|datasheet|spec|catalog|download/i.test(`${o.title} ${o.url}`))) {
        hits.push(`${o.title} (${o.url})`);
      }
    }
  }
  if (hits.length === 0) {
    if (responses.every((r) => r === null)) return fact("brochures", false, "Brochures and spec sheets could not be checked.");
    return fact("brochures", false, "No downloadable brochure or spec sheet shows up in search results for the company.");
  }
  return fact("brochures", true, `Findable documents: ${hits.slice(0, 3).join("; ")}.`);
}

// Trade shows / exhibitions: mentions of the company at fairs, exhibitions or
// industry events (English, German and Dutch fair vocabulary).
function tradeShowFact(company: string, res: WebSearchResponse | null): VerifiedFact {
  if (!res) return fact("trade-shows", false, "Trade show presence could not be checked.");
  const hit = res.organic.find((o) => /exhibit|trade ?show|trade ?fair|\bmesse\b|\bbeurs\b|\bstand\b|\bbooth\b|expo\b/i.test(`${o.title} ${o.snippet}`));
  if (!hit) return fact("trade-shows", false, "No trade show or exhibition mention shows up in search results for the company.");
  return fact("trade-shows", true, `Trade show mention found: ${hit.title} (${hit.url}).${hit.snippet ? ` Snippet: ${hit.snippet.slice(0, 160)}` : ""}`);
}

// Gather the off-site evidence for one company. 3 queries when in budget.
// Null responses (budget out, key missing, query failed) surface as
// present:false facts whose evidence says the check could not run; the scorer
// maps those to not-assessable, never to a zero.
export async function gatherOffsiteEvidence(
  company: string,
  url: string | null,
  budget: QueryBudget,
): Promise<OffsiteEvidence> {
  const host = hostFromUrl(url);
  const before = budget.used;
  const [linkedinRes, pdfRes, siteDocsRes, tradeRes] = [
    await budgetedSearch(`"${company}" site:linkedin.com/company`, budget),
    await budgetedSearch(`"${company}" brochure OR "spec sheet" OR datasheet filetype:pdf`, budget),
    host ? await budgetedSearch(`site:${host} filetype:pdf`, budget) : null,
    await budgetedSearch(`"${company}" exhibition OR "trade show" OR messe OR beurs`, budget),
  ];
  const facts = [
    linkedinFact(company, linkedinRes),
    brochureFact(company, host, [pdfRes, siteDocsRes]),
    tradeShowFact(company, tradeRes),
  ];
  return {
    facts,
    searchBlock: formatSearchBlock([linkedinRes, pdfRes, siteDocsRes, tradeRes]),
    queriesUsed: budget.used - before,
  };
}

// The scorer's VERIFIED BY WEB SEARCH block: confirmed-present facts are
// binding evidence; could-not-check facts are explicit so the model marks the
// check not assessable instead of guessing.
export function verifiedFactsBlock(facts: VerifiedFact[]): string {
  if (facts.length === 0) return "";
  const lines = facts.map((f) => `- ${f.key}: ${f.present ? "PRESENT" : "not found"}. ${f.evidence}`);
  return `## VERIFIED BY WEB SEARCH\n${lines.join("\n")}`;
}
