// Direct web retrieval via Serper (Google results, ~$0.001/query) for the
// Scorecard's search-backed checks: LinkedIn presence, findable brochures and
// spec sheets, trade show mentions, and competitor name-to-site resolution.
// Fetching results ourselves and handing the model ONE compact, deduped
// evidence block keeps input tokens tiny; the model keeps the judgment role,
// only how the evidence arrives changes.
//
// Every caller must degrade gracefully: when SERPER_API_KEY is unset (or a
// query fails) callers receive null and must treat the check as not assessable,
// never as a negative finding. Mock mode returns canned, input-varying results
// with zero spend.
import { getKv } from "./kv";
import { currentEnvelope } from "./call-cache";
import { searchCacheKey, SCORECARD_RECORD_TTL_S } from "./determinism";
import { isMockMode } from "./env";
import { mockSearchResponse } from "./mock";

export const SEARCH_QUERY_COST_USD = 0.001;
const SERPER_TIMEOUT_MS = 10_000;

export interface WebResult {
  title: string;
  url: string;
  snippet: string;
}
export interface WebSearchResponse {
  query: string;
  organic: WebResult[];
  knowledgeGraph: string | null;
}

export function searchConfigured(): boolean {
  return isMockMode() || Boolean(process.env.SERPER_API_KEY);
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

async function serperSearch(query: string): Promise<WebSearchResponse | null> {
  if (isMockMode()) return mockSearchResponse(query);
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SERPER_TIMEOUT_MS);
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      signal: controller.signal,
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      // No gl pin: Nexubis prospects are European industrial manufacturers with
      // international buyers, so the neutral global result set is the right
      // ground truth (the snapshot pinned gl=za for local businesses).
      body: JSON.stringify({ q: query, num: 10 }),
    });
    if (!res.ok) {
      console.error(`[scorecard-search] serper ${res.status} for "${query}"`);
      return null;
    }
    const body = (await res.json()) as Record<string, unknown>;
    const organic = (Array.isArray(body.organic) ? body.organic : [])
      .slice(0, 10)
      .map((r) => {
        const o = r as Record<string, unknown>;
        return { title: str(o.title), url: str(o.link), snippet: str(o.snippet) };
      })
      .filter((r) => r.title && r.url);
    let knowledgeGraph: string | null = null;
    if (body.knowledgeGraph && typeof body.knowledgeGraph === "object") {
      const kg = body.knowledgeGraph as Record<string, unknown>;
      const bits = [str(kg.title), str(kg.type), str(kg.website)].filter(Boolean);
      knowledgeGraph = bits.length ? bits.join(", ") : null;
    }
    return { query, organic, knowledgeGraph };
  } catch (err) {
    console.error(`[scorecard-search] serper failed for "${query}":`, err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Memoized per generation envelope (same KV cost cache the model calls use), so
// a rerun of the same Scorecard replays identical search results: determinism
// and zero re-spend.
export async function searchWeb(query: string): Promise<WebSearchResponse | null> {
  const envelope = currentEnvelope();
  if (!envelope) return serperSearch(query);
  const key = searchCacheKey(envelope, "serper-search", query);
  try {
    const hit = await getKv().get<WebSearchResponse>(key);
    if (hit && Array.isArray(hit.organic)) return hit;
  } catch {
    // cache read failure is non-fatal
  }
  const res = await serperSearch(query);
  if (res) {
    getKv()
      .set(key, res, { ex: SCORECARD_RECORD_TTL_S })
      .catch(() => {});
  }
  return res;
}

// Host of a URL-ish string, or null. Shared by the competitor resolver and the
// self-match logic.
export function hostFromUrl(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  try {
    return new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

// One compact, deduped evidence block for the model: title + snippet + URL per
// result, sectioned per query, dedup across queries.
export function formatSearchBlock(responses: Array<WebSearchResponse | null>): string {
  const sections: string[] = [];
  const seenUrls = new Set<string>();
  for (const r of responses) {
    if (!r) continue;
    const lines: string[] = [];
    if (r.knowledgeGraph) lines.push(`Knowledge panel: ${r.knowledgeGraph}`);
    for (const o of r.organic) {
      if (seenUrls.has(o.url)) continue;
      seenUrls.add(o.url);
      lines.push(`- ${o.title}${o.snippet ? `: ${o.snippet}` : ""} (${o.url})`);
    }
    sections.push(`### Search: "${r.query}"\n${lines.length ? lines.join("\n") : "(no results)"}`);
  }
  return sections.join("\n\n");
}
