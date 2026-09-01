// Lead capture and report promotion for the gateless flow. The landing form
// collects the URL and the email up front; when generation finishes the run
// route promotes the result STRAIGHT to its permanent shared report (no
// unlock step exists any more) and chains the lead plumbing. Pure
// orchestration over injected data where possible so every branch is
// unit-tested.
import { createHash } from "node:crypto";
import { uniqueSlug, writeShared, type SharedScorecard } from "./share";
import { DISPOSABLE_DOMAINS } from "./disposable-domains";
import { firstNameFromEmail } from "./lead-name";
import { getKv } from "./kv";
import { pushLead, type LeadRecord } from "./leads";
import { notifyTeam, sendFallbackEmail1 } from "./notify";
import { prospectScores, type ScorecardResult } from "./result";
import type { ProspectData } from "./types";

export interface LeadCaptureInput {
  email: string;
  honeypot?: string;
  turnstileToken?: string;
  elapsedMs?: number;
}

export function emailDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase().trim() ?? "";
}

export function isDisposableEmail(email: string): boolean {
  return DISPOSABLE_DOMAINS.has(emailDomain(email));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// A human types a URL and an email before submitting; anything faster than
// this is a bot ripping through the form.
const MIN_ELAPSED_MS = 2000;

export interface CaptureValidation {
  ok: boolean;
  status: number;
  error: string;
  reason: string;
}

export function validateCaptureInput(input: LeadCaptureInput): CaptureValidation {
  const bad = (status: number, error: string, reason: string): CaptureValidation => ({ ok: false, status, error, reason });
  if (input.honeypot && input.honeypot.trim().length > 0) {
    // Bots fill the invisible field; answer like a validation error, not a tell.
    return bad(400, "Something went wrong with the form. Reload and try again.", "honeypot");
  }
  if (typeof input.elapsedMs === "number" && input.elapsedMs >= 0 && input.elapsedMs < MIN_ELAPSED_MS) {
    return bad(400, "Something went wrong with the form. Reload and try again.", "too-fast");
  }
  if (!input.email || !EMAIL_RE.test(input.email.trim())) {
    return bad(400, "That email address does not look right.", "email");
  }
  if (isDisposableEmail(input.email.trim())) {
    return bad(400, "Use your work email. Your audit link lands there and stays live for 180 days.", "disposable");
  }
  return { ok: true, status: 200, error: "", reason: "" };
}

// Cloudflare Turnstile verification. Skips (open) only when the secret is not
// configured, so dev keeps working before the nexubis.io keys exist; with a
// secret set, a missing or bad token fails closed.
export async function verifyTurnstile(token: string | undefined, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
    });
    const body = (await res.json()) as { success?: boolean };
    return body.success === true;
  } catch {
    // Verification outage: fail open rather than lock every real prospect out.
    console.error("[scorecard-capture] Turnstile verify unreachable, failing open");
    return true;
  }
}

// Fill the contact fields the generation left empty. The form no longer asks
// for a name or role, so the name is a best-effort read of the email's local
// part (empty when the mailbox is generic) and the role stays unknown; the
// Loom decision falls back to the verdict band alone.
export function applyContact(prospect: ProspectData, result: ScorecardResult, email: string): { prospect: ProspectData; result: ScorecardResult } {
  const name = firstNameFromEmail(email.trim()) ?? "";
  return {
    prospect: { ...prospect, name },
    result: {
      ...result,
      meta: { ...result.meta, contactName: name },
      routing: {
        ...result.routing,
        loomCandidate: result.verdict.band !== "narrow",
      },
    },
  };
}

// Idempotency: the same email re-running the same site returns the SAME
// report link and never double-fires the emails. The dedupe key stores the
// slug for 7 days.
export function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 24);
}
export function dedupeKey(email: string, runId: string): string {
  return `scorecard-unlock:${hashEmail(email)}:${runId}`;
}
const DEDUPE_TTL_S = 7 * 24 * 60 * 60;

export async function readExistingCapture(email: string, runId: string): Promise<string | null> {
  try {
    return (await getKv().get<string>(dedupeKey(email, runId))) ?? null;
  } catch {
    return null;
  }
}

export async function markCaptured(email: string, runId: string, slug: string): Promise<void> {
  try {
    await getKv().set(dedupeKey(email, runId), slug, { ex: DEDUPE_TTL_S });
  } catch {
    // Dedupe is best-effort; a lost marker only risks a duplicate email.
  }
}

export interface PromoteOutcome {
  slug: string;
  reportUrl: string;
  record: SharedScorecard;
}

// Promote a finished generation straight to its permanent shared report.
// Never emails here; the caller chains the lead plumbing after.
export async function promoteResult(prospectData: ProspectData, rawResult: ScorecardResult, email: string): Promise<PromoteOutcome> {
  const { prospect, result } = applyContact(prospectData, rawResult, email);
  const slug = await uniqueSlug();
  const now = new Date();
  const record: SharedScorecard = {
    prospectData: prospect,
    result,
    loomUrl: null,
    createdAt: now.toISOString(),
    lastEditedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 180 * 86_400_000).toISOString(),
    roleSeniority: result.routing.roleSeniority,
  };
  await writeShared(slug, record);
  return { slug, reportUrl: `/audit/r/${slug}`, record };
}

// ── The lead plumbing, in order ──────────────────────────────────────────────
// 1. Persist the lead in KV (queryable: powers admin + the Loom selection).
// 2. Resend internal notification to the team.
// 3. Fallback Email 1 to the lead, only while SCORECARD_SEND_EMAIL1=true.
//    (Funnelr capture stays browser-fired from the flow, as before.)
// The run route awaits this before sending "done": ~1-2s at the end of a scan
// that already ran for a minute, in exchange for never losing a lead to a
// frozen serverless instance.
export function buildLeadRecord(record: SharedScorecard, email: string, slug: string): LeadRecord {
  const result = record.result;
  const overall = prospectScores(result)?.overall ?? 0;
  const now = new Date().toISOString();
  return {
    name: firstNameFromEmail(email.trim()) ?? "",
    email: email.trim(),
    role: "",
    company: result.meta.company,
    url: record.prospectData.url,
    productOneLiner: result.meta.productOneLiner,
    competitors: result.meta.competitors,
    credibilityScore: overall,
    verdict: result.verdict.band,
    firstFixCategory: result.firstFix?.category ?? null,
    reportSlug: slug,
    routing: result.routing,
    webhookStatus: "skipped",
    note: "",
    loomStatus: "none",
    createdAt: now,
    updatedAt: now,
  };
}

export async function runLeadPlumbing(record: SharedScorecard, email: string, slug: string, origin: string): Promise<LeadRecord> {
  const lead = buildLeadRecord(record, email, slug);
  const absoluteReportUrl = `${origin}/audit/r/${slug}`;
  const adminUrl = `${origin}/audit/admin/${slug}`;

  // 1. The lead record lands first, so even a total email outage leaves the
  //    lead queryable in admin.
  try {
    await pushLead(lead);
  } catch (err) {
    console.error("[scorecard-capture] lead persist failed:", err instanceof Error ? err.message : err);
  }

  // 2. Team notification.
  await notifyTeam(lead, absoluteReportUrl, adminUrl);

  // 3. Email 1 fallback, flag-gated. Funnelr owns Email 1 once live.
  await sendFallbackEmail1(lead, absoluteReportUrl);

  return lead;
}
