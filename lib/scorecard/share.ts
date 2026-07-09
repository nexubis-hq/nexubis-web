// Shareable report storage. A successful unlock writes one of these to KV at
// scorecard:{slug}; the public report route reads it. Decoupled from the
// generation cache (a regen of the source run does not change a previously
// shared snapshot). The record lifetime is the single documented constant
// SCORECARD_RECORD_TTL_DAYS (180), so storage, code and client copy never
// disagree. Slugs are unguessable 8-char strings over an ambiguity-free
// alphabet; report pages are noindex, so a slug is shareable but unlisted.
import { getKv } from "./kv";
import { SCORECARD_RECORD_TTL_S, SCORECARD_RECORD_TTL_DAYS } from "./determinism";
import type { ScorecardResult } from "./result";
import type { ProspectData } from "./types";
import type { RoleSeniority } from "./routing";

export const SHARE_TTL_S = SCORECARD_RECORD_TTL_S;
export const SHARE_TTL_DAYS = SCORECARD_RECORD_TTL_DAYS;
const SHARE_PREFIX = "scorecard:";
const VIEW_PREFIX = "scorecard:views:";
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export interface SharedScorecard {
  prospectData: ProspectData;
  result: ScorecardResult;
  /** Selective, attached from admin. When set, the report's walkthrough video
   *  slot renders; when null the slot does not render at all. */
  loomUrl: string | null;
  createdAt: string;
  lastEditedAt: string;
  expiresAt: string;
  /** Routing summary at unlock, so the admin list shows what the team was
   *  notified with. */
  roleSeniority?: RoleSeniority;
}

export function makeSlug(len = 8): string {
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

export const shareKey = (slug: string) => SHARE_PREFIX + slug;
export const viewKey = (slug: string) => VIEW_PREFIX + slug;

export async function writeShared(slug: string, data: SharedScorecard): Promise<void> {
  await getKv().set(shareKey(slug), data, { ex: SHARE_TTL_S });
}

export async function readShared(slug: string): Promise<SharedScorecard | null> {
  return (await getKv().get<SharedScorecard>(shareKey(slug))) ?? null;
}

// A slug not already taken in KV. Tries a handful of times before giving up.
export async function uniqueSlug(maxTries = 6): Promise<string> {
  for (let i = 0; i < maxTries; i++) {
    const candidate = makeSlug();
    if (!(await readShared(candidate))) return candidate;
  }
  throw new Error("Could not generate a unique slug");
}

export async function patchShared(
  slug: string,
  patch: Partial<Omit<SharedScorecard, "createdAt" | "expiresAt">>,
): Promise<SharedScorecard | null> {
  const cur = await readShared(slug);
  if (!cur) return null;
  const next: SharedScorecard = { ...cur, ...patch, lastEditedAt: new Date().toISOString() };
  await getKv().set(shareKey(slug), next, { ex: SHARE_TTL_S });
  return next;
}

export async function incrementViews(slug: string): Promise<number | null> {
  try {
    return await getKv().incr(viewKey(slug));
  } catch {
    return null;
  }
}
