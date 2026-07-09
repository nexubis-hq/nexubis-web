// Lead records: the queryable store behind the admin view, Part 2C
// personalisation and the weekly Loom selection. Funnelr stays the CRM source
// of truth; this is the working view. Each lead lives at its own key (keyed by
// report slug, so admin updates are cheap) with a slug index list for the
// newest-first table.
import { getKv } from "./kv";
import { SCORECARD_RECORD_TTL_S } from "./determinism";
import type { RoutingFlags } from "./routing";
import type { VerdictBand } from "./scoring";

export type LoomStatus = "none" | "selected" | "recorded" | "sent";
export type WebhookStatus = "sent" | "failed" | "skipped";

export interface LeadRecord {
  name: string;
  email: string;
  role: string;
  company: string;
  url: string;
  productOneLiner: string;
  competitors: Array<{ name: string; url: string | null; resolved: boolean }>;
  credibilityScore: number;
  verdict: VerdictBand;
  firstFixCategory: string | null;
  reportSlug: string;
  routing: RoutingFlags;
  webhookStatus: WebhookStatus;
  /** Admin working notes. */
  note: string;
  loomStatus: LoomStatus;
  createdAt: string;
  updatedAt: string;
}

const LEAD_PREFIX = "scorecard-lead:";
const INDEX_KEY = "scorecard-leads";
const MAX_LEADS = 10_000;

export const leadKey = (slug: string) => LEAD_PREFIX + slug;

export async function pushLead(lead: LeadRecord): Promise<void> {
  const kv = getKv();
  await kv.set(leadKey(lead.reportSlug), lead, { ex: SCORECARD_RECORD_TTL_S });
  await kv.lpush(INDEX_KEY, lead.reportSlug);
  await kv.ltrim(INDEX_KEY, 0, MAX_LEADS - 1);
}

export async function readLead(slug: string): Promise<LeadRecord | null> {
  return (await getKv().get<LeadRecord>(leadKey(slug))) ?? null;
}

export async function updateLead(slug: string, patch: Partial<LeadRecord>): Promise<LeadRecord | null> {
  const cur = await readLead(slug);
  if (!cur) return null;
  const next: LeadRecord = { ...cur, ...patch, reportSlug: cur.reportSlug, updatedAt: new Date().toISOString() };
  await getKv().set(leadKey(slug), next, { ex: SCORECARD_RECORD_TTL_S });
  return next;
}

// Newest first. Expired leads (KV TTL passed) drop out naturally.
export async function listLeads(limit = 200): Promise<LeadRecord[]> {
  const kv = getKv();
  const slugs = await kv.lrange<string>(INDEX_KEY, 0, limit - 1);
  const out: LeadRecord[] = [];
  const seen = new Set<string>();
  for (const slug of slugs) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    const lead = await kv.get<LeadRecord>(leadKey(slug));
    if (lead) out.push(lead);
  }
  return out;
}
