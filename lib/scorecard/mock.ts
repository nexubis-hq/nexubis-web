// Canned, input-varying content for mock mode (SCORECARD_MOCK=1): the whole
// pipeline runs locally with zero API spend. Values derive deterministically
// from the input string, so different companies get different-but-stable
// numbers and the UI/QA path exercises real variation.
import { createHash } from "node:crypto";
import type { WebSearchResponse } from "./web-search";
import type { SitePageFacts } from "./fetch-site";
import type { PageSpeedScores } from "./types";

// Stable small integer derived from a seed string. Range [0, mod).
export function mockInt(seed: string, mod: number): number {
  const h = createHash("sha256").update(seed).digest();
  return h[0] % mod;
}

export function mockSearchResponse(query: string): WebSearchResponse {
  const n = mockInt(query, 3) + 1;
  const organic = Array.from({ length: n }, (_, i) => ({
    title: `Mock result ${i + 1} for ${query.slice(0, 40)}`,
    url: `https://mock-results.test/${mockInt(query + i, 1000)}`,
    snippet: `Deterministic mock snippet ${i + 1} for query "${query.slice(0, 60)}".`,
  }));
  return { query, organic, knowledgeGraph: null };
}

// A valid 1x1 grey PNG, small enough to inline. Stands in for ScreenshotOne
// bytes so vision plumbing has real base64 to carry.
export const MOCK_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

export function mockPageSpeed(url: string): PageSpeedScores {
  const base = 35 + mockInt(`ps:${url}`, 60); // 35..94, stable per site
  const scores = (offset: number) => ({
    performance: Math.min(99, base + offset),
    seo: Math.min(99, base + 10),
    accessibility: Math.min(99, base + 5),
    bestPractices: Math.min(99, base + 8),
  });
  return { mobile: scores(0), desktop: scores(12), lcp: `${(1.2 + mockInt(url, 30) / 10).toFixed(1)} s` };
}

// Deterministic mock page facts, varying per company so the code-side
// competitor comparison exercises real asymmetries in local QA.
export function mockSiteFacts(company: string): SitePageFacts {
  const langs = [["en"], ["en", "de"], ["de", "en", "fr", "nl"]][mockInt(`langs:${company}`, 3)];
  const hasTech = mockInt(`tech:${company}`, 2) === 0;
  return {
    languages: langs,
    languageSource: langs.length > 1 ? "hreflang" : "none",
    copyrightYear: 2018 + mockInt(`year:${company}`, 9),
    pdfLinkCount: mockInt(`pdf:${company}`, 6),
    techDocLinks: hasTech ? ["Datasheet (PDF)", "CAD files"] : [],
    videoCount: mockInt(`vidc:${company}`, 3),
    contactForm: mockInt(`form:${company}`, 3) === 0 ? null : { fieldCount: 3 + mockInt(`formn:${company}`, 6), fields: ["name", "email", "message"] },
  };
}

export function mockSiteText(url: string, company: string): string {
  return [
    `# ${company}`,
    `Industrial equipment manufacturer. Mock crawl content for ${url}.`,
    `## What we make`,
    `Machines, systems and service for production lines. Precision engineering since 19${70 + mockInt(url, 30)}.`,
    `[link] Products`,
    `[link] About us`,
    `[link] Downloads`,
    `[link] Contact`,
    `## [navigation links observed on the site]`,
    `- Products (${url}/products)`,
    `- About (${url}/about)`,
    `- Downloads (${url}/downloads)`,
    `- Contact (${url}/contact)`,
  ].join("\n");
}
