// Sales -> nurture handoff (Shannah's handover doc, ISSUE 2 + "SCORECARD-TO-NURTURE
// HANDOFF DILEMMA"). Funnelr has no reliable "sequence completed" trigger, so a
// daily server job moves eligible non-booked / non-replied leads into The
// Credibility Brief by applying ONE tag: Trigger: Nexubis | Start Credibility Brief
// Nurture. Funnelr's automation does the list/sequence work; this code only tags.
//
// Timing is driven from OUR OWN leads KV (lead.createdAt = unlock = sales entry),
// which is the reliable source — not Funnelr, which does not expose per-contact
// sequence timestamps. Idempotent, sequential (Funnelr throttles bursts), and it
// NEVER touches lists/sequences/History tags. See docs/funnel-audit-checklist.md
// §5 and Shannah's handover doc.
import { NEXUBIS_TAG_IDS, NEXUBIS_TAGS } from "./nexubis-tags";

// Nexubis' final sales email is Day 13; eligibility from Day 14 (doc default).
export const DEFAULT_NURTURE_AFTER_DAYS = 14;
const DAY_MS = 86_400_000;

export interface NurtureLead {
  email: string;
  createdAt: string;
  reportSlug: string;
}

export interface NurtureConfig {
  afterDays: number;
  // Cutover floor: leads created before this are never back-tagged (set FROM=<now>
  // at go-live so old shadow/test leads are not swept into nurture).
  from: Date | null;
}

// Minimal Funnelr surface the scheduler needs — an interface, not the concrete
// client, so it is unit-testable and survives client refactors.
export interface NurtureFunnelrClient {
  findContactByEmail(email: string): Promise<{ userId?: number; isUnsubscribed?: boolean } | null>;
  getContactTags(userId: number): Promise<Array<{ tagId: string; name?: string | null }>>;
  findTagById(tagId: string): Promise<{ tagId: string } | null>;
  findTagByName(name: string): Promise<{ tagId: string } | null>;
  addTagToContact(userId: number, tagId: string): Promise<void>;
}

export type SkipReason =
  | "already-handed-off"
  | "not-in-funnelr"
  | "unsubscribed"
  | "not-in-sales"
  | "booked"
  | "replied"
  | "already-nurture"
  | "trigger-pending";

export interface NurtureRunResult {
  scanned: number;
  dateEligible: number;
  handedOff: number;
  skipped: Record<SkipReason, number>;
  errors: number;
  dryRun: boolean;
}

// Pure: old enough (past the sales window) AND after the cutover floor?
export function isNurtureDateEligible(lead: NurtureLead, now: Date, config: NurtureConfig): boolean {
  const created = new Date(lead.createdAt);
  if (Number.isNaN(created.getTime())) return false;
  if (config.from && created < config.from) return false;
  return now.getTime() - created.getTime() >= config.afterDays * DAY_MS;
}

function hasTag(tags: Array<{ name?: string | null }>, name: string): boolean {
  return tags.some((t) => (t.name ?? "").trim() === name);
}

function emptySkips(): Record<SkipReason, number> {
  return {
    "already-handed-off": 0,
    "not-in-funnelr": 0,
    unsubscribed: 0,
    "not-in-sales": 0,
    booked: 0,
    replied: 0,
    "already-nurture": 0,
    "trigger-pending": 0,
  };
}

async function resolveTag(client: NurtureFunnelrClient, tagId: string, name: string): Promise<{ tagId: string }> {
  const tag = (await client.findTagById(tagId)) ?? (await client.findTagByName(name));
  if (!tag) throw new Error(`Nurture Trigger tag not found in Funnelr: ${name}`);
  return tag;
}

export interface NurtureRunDeps {
  client: NurtureFunnelrClient;
  listLeads: () => Promise<NurtureLead[]>;
  now: Date;
  config: NurtureConfig;
  // Per-lead handoff memo (keyed off the lead), so we don't re-hit Funnelr every
  // day in the window between applying the Trigger and the automation consuming it.
  alreadyHandedOff: (lead: NurtureLead) => Promise<boolean>;
  markHandedOff: (lead: NurtureLead) => Promise<void>;
  // dryRun reports what WOULD happen without applying any tag (used while sequences
  // are paused / before go-live).
  dryRun: boolean;
}

export async function runNurtureHandoff(deps: NurtureRunDeps): Promise<NurtureRunResult> {
  const { client, now, config, dryRun } = deps;
  const result: NurtureRunResult = {
    scanned: 0,
    dateEligible: 0,
    handedOff: 0,
    skipped: emptySkips(),
    errors: 0,
    dryRun,
  };

  const leads = await deps.listLeads();
  // Resolve the nurture Trigger tag GUID once (names -> id differ per account).
  let triggerTagId: string | null = null;

  for (const lead of leads) {
    result.scanned++;
    if (!isNurtureDateEligible(lead, now, config)) continue;
    result.dateEligible++;

    try {
      if (await deps.alreadyHandedOff(lead)) {
        result.skipped["already-handed-off"]++;
        continue;
      }

      const contact = await client.findContactByEmail(lead.email);
      if (!contact || typeof contact.userId !== "number") {
        result.skipped["not-in-funnelr"]++;
        continue;
      }
      if (contact.isUnsubscribed) {
        result.skipped.unsubscribed++;
        continue;
      }

      const tags = await client.getContactTags(contact.userId);
      // Must actually be in sales; must not be booked / replied / already nurturing.
      if (!hasTag(tags, NEXUBIS_TAGS.historyScorecardSalesStarted)) {
        result.skipped["not-in-sales"]++;
        continue;
      }
      if (hasTag(tags, NEXUBIS_TAGS.pipelineCallBooked)) {
        result.skipped.booked++;
        continue;
      }
      if (hasTag(tags, NEXUBIS_TAGS.pipelineReplied)) {
        result.skipped.replied++;
        continue;
      }
      if (hasTag(tags, NEXUBIS_TAGS.historyNurtureStarted)) {
        result.skipped["already-nurture"]++;
        continue;
      }
      if (hasTag(tags, NEXUBIS_TAGS.triggerStartNurture)) {
        // Already tagged, automation just hasn't consumed it yet — memo it so we
        // stop re-checking, but do not double-apply.
        await deps.markHandedOff(lead);
        result.skipped["trigger-pending"]++;
        continue;
      }

      if (dryRun) {
        result.handedOff++;
        continue;
      }

      if (!triggerTagId) {
        const tag = await resolveTag(client, NEXUBIS_TAG_IDS.triggerStartNurture, NEXUBIS_TAGS.triggerStartNurture);
        triggerTagId = tag.tagId;
      }
      await client.addTagToContact(contact.userId, triggerTagId);
      await deps.markHandedOff(lead);
      result.handedOff++;
    } catch (err) {
      result.errors++;
      // Redact the email from logs; the slug is safe to log.
      console.error(`[nurture-handoff] lead ${lead.reportSlug} failed:`, err instanceof Error ? err.message : err);
    }
  }

  return result;
}
