// Reply detection -> Funnelr (Shannah's handover doc, ISSUE 1 + tag #7). When a
// lead replies to an automated email, the contact must get Pipeline: Nexubis |
// Replied so Funnelr's Replied-exit automation stops ALL further automated sales
// and nurture comms. The website/server ONLY applies the tag — Funnelr does the
// list/sequence cleanup.
//
// This module is the reusable, tag-only heart. HOW a reply is detected (Gmail
// poller, an inbound-parse service, a Cloudflare/Apps-Script forwarder, or a manual
// call) is pluggable: each just POSTs the sender address to /api/inbound/reply,
// which calls applyRepliedTag(). Idempotent, and never touches lists/sequences.
import { NEXUBIS_TAG_IDS, NEXUBIS_TAGS } from "./nexubis-tags";
import { isInternalEmail } from "@/lib/internal-emails";

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

// Pull the address out of "Name <email>", "<email>", or a bare email. Returns
// lowercase, or null if there's no valid address.
export function extractEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const m = input.match(EMAIL_RE);
  return m ? m[0].toLowerCase() : null;
}

export interface ReplyFunnelrClient {
  findContactByEmail(email: string): Promise<{ userId?: number } | null>;
  getContactTags(userId: number): Promise<Array<{ tagId: string; name?: string | null }>>;
  findTagById(tagId: string): Promise<{ tagId: string } | null>;
  findTagByName(name: string): Promise<{ tagId: string } | null>;
  addTagToContact(userId: number, tagId: string): Promise<void>;
}

export type ReplyReason = "internal" | "not-a-contact" | "already-replied" | "applied" | "dry-run";

export interface ReplyResult {
  ok: boolean;
  applied: boolean;
  reason?: ReplyReason;
  error?: string;
}

async function resolveTag(client: ReplyFunnelrClient, tagId: string, name: string): Promise<{ tagId: string }> {
  const tag = (await client.findTagById(tagId)) ?? (await client.findTagByName(name));
  if (!tag) throw new Error(`Replied tag not found in Funnelr: ${name}`);
  return tag;
}

export async function applyRepliedTag(
  rawEmail: string,
  opts: { client: ReplyFunnelrClient; dryRun?: boolean },
): Promise<ReplyResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!email) return { ok: false, applied: false, error: "email is required" };
  // A reply FROM our own team/test address is us, not a lead — never self-tag.
  if (isInternalEmail(email)) return { ok: true, applied: false, reason: "internal" };

  try {
    const contact = await opts.client.findContactByEmail(email);
    if (!contact || typeof contact.userId !== "number") {
      // Reply from someone who is not a Funnelr contact: nothing to exit.
      return { ok: true, applied: false, reason: "not-a-contact" };
    }

    const tags = await opts.client.getContactTags(contact.userId);
    if (tags.some((t) => (t.name ?? "").trim() === NEXUBIS_TAGS.pipelineReplied)) {
      // Idempotent: already replied, the exit automation has it.
      return { ok: true, applied: false, reason: "already-replied" };
    }

    if (opts.dryRun) return { ok: true, applied: false, reason: "dry-run" };

    const tag = await resolveTag(opts.client, NEXUBIS_TAG_IDS.pipelineReplied, NEXUBIS_TAGS.pipelineReplied);
    await opts.client.addTagToContact(contact.userId, tag.tagId);
    return { ok: true, applied: true, reason: "applied" };
  } catch (err) {
    return { ok: false, applied: false, error: err instanceof Error ? err.message.slice(0, 200) : "reply tagging failed" };
  }
}
