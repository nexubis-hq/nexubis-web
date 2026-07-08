// Content-safety utilities for the Scorecard. Because no human reviews a report
// before a stranger reads it, every string that reaches the renderer (static or
// AI-generated) passes through here at the boundary.
//
// This module is the single home for the em-dash rule. Other modules import
// from here rather than rolling their own replace, so the behaviour cannot
// drift. It also hosts the audit-word rule: that word never appears in
// anything client-facing. It is the Scorecard, the Credibility Check,
// everywhere.

// Replace em dashes (and en dashes used as sentence punctuation) with commas, so
// the long-dash character never reaches the page. A hyphen-minus "-" and an en
// dash inside a number range ("4-5") are left intact. We use a comma rather than
// a full stop to keep the clause flowing.
export function stripEmDashes(text: string): string {
  if (typeof text !== "string" || text.length === 0) return text;
  return text
    .replace(/\s*—\s*/g, ", ") // em dash, clause separator, em-dash-ok
    .replace(/\s+–\s+/g, ", ") // spaced en dash used as a dash, em-dash-ok
    .replace(/–/g, "-"); // bare en dash (number ranges) to hyphen, em-dash-ok
}

// Deep variant for AI output objects: strips em dashes from every string in a
// nested value, leaving structure intact. Applied to each AI call's parsed JSON.
export function stripEmDashesDeep<T>(value: T): T {
  if (typeof value === "string") return stripEmDashes(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => stripEmDashesDeep(v)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = stripEmDashesDeep(v);
    return out as T;
  }
  return value;
}

export type SanitizeCategory = "ai-tell" | "placeholder" | "provenance" | "banned-word";
export interface SanitizeHit {
  category: SanitizeCategory;
  match: string;
}
export interface SanitizeResult {
  clean: boolean;
  hits: SanitizeHit[];
}

// AI-tell phrases: the model breaking character. Any of these in a report is a
// hard fail, swap the section to its templated fallback.
const AI_TELL: RegExp[] = [
  /\bas an ai\b/i,
  /\bas a language model\b/i,
  /\blanguage model\b/i,
  /\bi cannot\b/i,
  /\bi can't\b/i,
  /\bi'm sorry\b/i,
  /\bi am sorry\b/i,
  /\bi apologi[sz]e\b/i,
];

// Placeholder/filler text that means generation went wrong.
const PLACEHOLDER: RegExp[] = [
  /lorem ipsum/i,
  /\byour company name\b/i,
  /\bexample\.com\b/i, // flagged unless it is the actual run target (opts.allow)
  /\bplaceholder\b/i,
];

// Provenance language: narrating the pipeline instead of stating a fact about
// the company. The one sanctioned exception is the fixed "could not be
// assessed" wording for null checks, which is rendered by the app from the
// structured flag, never free-written by the model into findings copy.
const PROVENANCE: RegExp[] = [
  /\bwas confirmed\b/i,
  /\bcould be read\b/i,
  /\bno readable\b/i,
  /\bno source (does|shows|confirms|lays|paints)\b/i,
  /\bappeared in search results\b/i,
  /\bthe crawl\b/i,
  /\bwe (found|could not)\b/i,
];

// House rule: the audit word never reaches a prospect. Client-facing copy
// says Scorecard or Credibility Check.
const BANNED_WORDS: RegExp[] = [/\baudits?\b/i, /\baudited\b/i, /\bauditing\b/i]; // audit-ok

// Detect unsafe copy. Returns every hit so the caller can log precisely which
// rule tripped, then swap that section to its templated fallback. `opts.allow`
// whitelists substrings (e.g. the real target domain so "example.com" is fine
// when example.com IS the scored site).
export function sanitizeCopy(text: string, opts?: { allow?: string[] }): SanitizeResult {
  const hits: SanitizeHit[] = [];
  if (typeof text !== "string" || text.length === 0) return { clean: true, hits };
  const allow = (opts?.allow ?? []).map((a) => a.toLowerCase());
  const scan = (patterns: RegExp[], category: SanitizeCategory) => {
    for (const re of patterns) {
      const m = text.match(re);
      if (!m) continue;
      const found = m[0].toLowerCase();
      if (allow.some((a) => a.length > 0 && found.includes(a))) continue;
      hits.push({ category, match: m[0] });
    }
  };
  scan(AI_TELL, "ai-tell");
  scan(PLACEHOLDER, "placeholder");
  scan(PROVENANCE, "provenance");
  scan(BANNED_WORDS, "banned-word");
  return { clean: hits.length === 0, hits };
}
