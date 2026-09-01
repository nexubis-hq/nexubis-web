import { createHash } from "node:crypto";
import { getKv } from "./kv";
import type { ProspectData } from "./types";

// One documented TTL for the persisted Scorecard record. Storage, pipeline code
// and client-facing copy all read this single constant so they can never
// disagree. 180 days, matching the proven snapshot.
export const SCORECARD_RECORD_TTL_DAYS = 180;
export const SCORECARD_RECORD_TTL_S = SCORECARD_RECORD_TTL_DAYS * 24 * 60 * 60;

// Normalise a URL so trivially different inputs collapse to one identity:
// scheme added, www and trailing slash stripped, host lowercased, query and
// hash dropped. "HTTP://WWW.Foo.de/" and "foo.de" hash to the same run.
export function normaliseUrl(raw: string | undefined | null): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    const host = u.hostname.replace(/^www\./i, "").replace(/\.$/, "").toLowerCase();
    const path = u.pathname.replace(/\/+$/, "");
    return `${host}${path}`.toLowerCase();
  } catch {
    return s.toLowerCase();
  }
}

function normaliseText(raw: string | undefined | null): string {
  return (raw ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

export interface DeterminismInput {
  /** The prospect's website. */
  url: string;
  /** Competitor entries as resolved URLs where known, else the raw entry.
   *  Sorted before hashing so entry order cannot split the cache. */
  competitors: string[];
  /** The product one-liner. Part of the identity: it steers scoring context,
   *  so a different one-liner is a different run. */
  productOneLiner: string;
}

// Stable, human-readable identity string for a Scorecard run. Keyed on the
// BUSINESS AND ITS NAMED RIVALS (prospect URL + sorted competitors + one-liner),
// deliberately NOT the contact person, so two people scoring the same company
// against the same rivals get the byte-identical cached report and we never pay
// to generate it twice.
// v3: reports now address the prospect by the company name read from its own
// site (v2 changed the rubric and added structured site facts). The name is
// not part of this identity, so the bump is what retires cached runs stamped
// with the old URL-derived placeholder name.
export function scorecardIdentity(input: DeterminismInput): string {
  const competitors = input.competitors
    .map((c) => normaliseUrl(c) || normaliseText(c))
    .filter(Boolean)
    .sort();
  return ["scorecard-v4", normaliseUrl(input.url), competitors.join(","), normaliseText(input.productOneLiner)].join("|");
}

// The KV key the full run result is cached under. Same inputs, same key,
// always. The hash keeps keys short and opaque; the identity above is the
// source of truth.
export function scorecardCacheKey(input: DeterminismInput): string {
  const h = createHash("sha256").update(scorecardIdentity(input)).digest("hex").slice(0, 24);
  return `scorecard-gen:${h}`;
}

// Map a ProspectData to the determinism identity. Lives here (not in the
// orchestrator) so callers can reuse it without dragging in the AI layer.
export function prospectDeterminismInput(p: ProspectData): DeterminismInput {
  return {
    url: p.url,
    competitors: p.competitors.map((c) => c.url ?? c.raw),
    productOneLiner: p.productOneLiner,
  };
}

// Sub-key for a single captured call (a web search or an AI turn) inside a
// run's envelope, namespaced under the run key and keyed by the exact query or
// prompt. Replaying this payload on a rerun is what makes the report
// byte-identical even though the underlying web search is live. It also means
// we never pay for the same call twice, so this doubles as the cost cache.
export function searchCacheKey(envelopeKey: string, label: string, query: string): string {
  const q = createHash("sha256").update(query).digest("hex").slice(0, 16);
  return `${envelopeKey}:call:${label}:${q}`;
}

// KV-backed memoizer used for both the full result and individual captured
// calls. First run stores the producer's output under the determinism envelope;
// reruns replay it. Cache read/write failures are non-fatal: we still produce a
// value, we just do not get the speed-up. `fresh` forces a recompute (used by
// the admin regenerate action).
export async function cachedJson<T>(
  key: string,
  ttlSeconds: number,
  producer: () => Promise<T>,
  opts: { fresh?: boolean } = {},
): Promise<T> {
  if (!opts.fresh) {
    try {
      const hit = await getKv().get<T>(key);
      if (hit !== null && hit !== undefined) return hit;
    } catch {
      // cache read failed, fall through to produce
    }
  }
  const value = await producer();
  try {
    await getKv().set(key, value, { ex: ttlSeconds });
  } catch {
    // cache write failed, non-fatal
  }
  return value;
}
