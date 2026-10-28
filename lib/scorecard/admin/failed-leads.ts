import { randomBytes } from "node:crypto";
import { getKv } from "../kv";
import type { AdSource, FunnelSource } from "@/lib/funnel/steps";
import type { QualifiedAuditDecision } from "../qualified-audit";
export interface FailedLead {
  id: string;
  at: string;
  firstName: string;
  email: string;
  url: string;
  host: string | null;
  outcome: "failed" | "timeout";
  reason: string;
  siteRead: string;
  ad: AdSource | null;
  source: FunnelSource;
  qualifiedDecision?: QualifiedAuditDecision;
  linkedSlug: string | null;
  note?: string;
  updatedAt?: string;
}
const TTL = 180 * 86400;
export const failedLeadKey = (id: string) => `scorecard-failed-lead:${id}`;
export async function saveFailedLead(
  input: Omit<FailedLead, "id" | "linkedSlug">
): Promise<void> {
  const kv = getKv();
  const record: FailedLead = {
    ...input,
    email: input.email.trim().toLowerCase(),
    id: randomBytes(8).toString("hex"),
    linkedSlug: null,
  };
  await kv.set(failedLeadKey(record.id), record, { ex: TTL });
  await kv.lpush("scorecard-failed-leads", record.id);
  await kv.ltrim("scorecard-failed-leads", 0, 499);
  await kv.expire("scorecard-failed-leads", TTL);
}
export async function readFailedLead(id: string): Promise<FailedLead | null> {
  return getKv().get<FailedLead>(failedLeadKey(id));
}
export async function listFailedLeads(): Promise<FailedLead[]> {
  const ids = await getKv().lrange<string>("scorecard-failed-leads", 0, 499);
  const records = await Promise.all([...new Set(ids)].map(readFailedLead));
  return records.filter((r): r is FailedLead => Boolean(r));
}
export async function updateFailedLead(
  id: string,
  patch: Pick<Partial<FailedLead>, "note" | "linkedSlug">
): Promise<void> {
  const record = await readFailedLead(id);
  if (!record) return;
  const ttl = Math.ceil(
    (Date.parse(record.at) + TTL * 1000 - Date.now()) / 1000
  );
  if (ttl <= 0) return;
  await getKv().set(
    failedLeadKey(id),
    { ...record, ...patch, updatedAt: new Date().toISOString() },
    { ex: ttl }
  );
}
