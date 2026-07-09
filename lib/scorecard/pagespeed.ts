import { createHash } from "node:crypto";
import { getKv } from "./kv";
import { isMockMode } from "./env";
import { mockPageSpeed } from "./mock";
import type { PageSpeedScores, StrategyScores } from "./types";

export type { PageSpeedScores, StrategyScores };

const CACHE_TTL_S = 7 * 24 * 60 * 60; // 7 days
// Google's PageSpeed/Lighthouse API routinely needs 30-40s per strategy on
// slower sites. PageSpeed runs concurrently with the AI calls and is not
// awaited until well into the run, so a wide cap has headroom under the
// route's ceiling. Failures are tolerated: null scores render as "could not
// be measured", never guessed.
const CALL_TIMEOUT_MS = 55_000;

type Strategy = "mobile" | "desktop";

interface RawLighthouse {
  lighthouseResult?: {
    categories?: {
      performance?: { score?: number };
      seo?: { score?: number };
      accessibility?: { score?: number };
      "best-practices"?: { score?: number };
    };
    audits?: {
      "largest-contentful-paint"?: { displayValue?: string };
    };
  };
}

function pct(score: number | undefined | null): number | null {
  return typeof score === "number" ? Math.round(score * 100) : null;
}

async function runStrategy(url: string, strategy: Strategy, key: string): Promise<RawLighthouse | null> {
  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", strategy);
  endpoint.searchParams.append("category", "performance");
  endpoint.searchParams.append("category", "seo");
  endpoint.searchParams.append("category", "accessibility");
  endpoint.searchParams.append("category", "best-practices");
  endpoint.searchParams.set("key", key);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);
  try {
    const res = await fetch(endpoint.toString(), { signal: controller.signal });
    if (!res.ok) {
      console.error(`[scorecard-pagespeed] ${strategy} HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as RawLighthouse;
  } catch (err) {
    console.error(`[scorecard-pagespeed] ${strategy} error:`, err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function runPageSpeed(url: string, options: { fresh?: boolean } = {}): Promise<PageSpeedScores | null> {
  if (isMockMode()) return mockPageSpeed(url);
  const key = process.env.PAGESPEED_API_KEY;
  if (!key) {
    console.error("[scorecard-pagespeed] PAGESPEED_API_KEY not set");
    return null;
  }

  const cacheKey = `scorecard-pagespeed:v1:${createHash("sha256").update(url).digest("hex").slice(0, 24)}`;
  if (!options.fresh) {
    try {
      const cached = await getKv().get<PageSpeedScores>(cacheKey);
      if (cached) {
        console.log(`[scorecard-pagespeed] cache HIT for ${url}`);
        return cached;
      }
    } catch {
      // KV unavailable: continue without cache
    }
  } else {
    console.log(`[scorecard-pagespeed] fresh requested, bypassing cache for ${url}`);
  }

  const started = Date.now();
  const [mobileRaw, desktopRaw] = await Promise.all([
    runStrategy(url, "mobile", key),
    runStrategy(url, "desktop", key),
  ]);
  console.log(`[scorecard-pagespeed] both strategies in ${Date.now() - started}ms`);

  if (!mobileRaw && !desktopRaw) return null;

  const result: PageSpeedScores = {
    mobile: mobileRaw
      ? {
          performance: pct(mobileRaw.lighthouseResult?.categories?.performance?.score),
          seo: pct(mobileRaw.lighthouseResult?.categories?.seo?.score),
          accessibility: pct(mobileRaw.lighthouseResult?.categories?.accessibility?.score),
          bestPractices: pct(mobileRaw.lighthouseResult?.categories?.["best-practices"]?.score),
        }
      : null,
    desktop: desktopRaw
      ? {
          performance: pct(desktopRaw.lighthouseResult?.categories?.performance?.score),
          seo: pct(desktopRaw.lighthouseResult?.categories?.seo?.score),
          accessibility: pct(desktopRaw.lighthouseResult?.categories?.accessibility?.score),
          bestPractices: pct(desktopRaw.lighthouseResult?.categories?.["best-practices"]?.score),
        }
      : null,
    lcp: mobileRaw?.lighthouseResult?.audits?.["largest-contentful-paint"]?.displayValue ?? null,
  };

  try {
    await getKv().set(cacheKey, result, { ex: CACHE_TTL_S });
  } catch {
    // ignore cache write failures
  }
  return result;
}
