// Unlock logic: validates the gate submission, then promotes the short-lived
// run record to a permanent shared report. Pure orchestration over injected
// data where possible so every branch is unit-tested. The lead plumbing
// persists/admin-notifies after unlock; Funnelr capture is triggered by the
// browser once this route returns the permanent report URL.
import { createHash } from "node:crypto";
import { readRunRecord } from "./run";
import { uniqueSlug, writeShared, type SharedScorecard } from "./share";
import { DISPOSABLE_DOMAINS } from "./disposable-domains";
import { roleSeniority } from "./routing";
import { getKv } from "./kv";
import { pushLead, type LeadRecord } from "./leads";
import { notifyTeam, sendFallbackEmail1 } from "./notify";
import { prospectScores, type ScorecardResult } from "./result";
import type { ProspectData } from "./types";

export interface UnlockInput {
  runId: string;
  firstName: string;
  email: string;
  role: string;
  honeypot?: string;
  turnstileToken?: string;
  elapsedMs?: number;
}

export type UnlockOutcome =
  | { ok: true; slug: string; reportUrl: string; record: SharedScorecard }
  | { ok: false; status: number; error: string; reason: string };

export function emailDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase().trim() ?? "";
}

export function isDisposableEmail(email: string): boolean {
  return DISPOSABLE_DOMAINS.has(emailDomain(email));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// A human reads the teaser before unlocking; anything faster than this is a
// bot ripping through the form.
const MIN_ELAPSED_MS = 2000;

export interface UnlockValidation {
  ok: boolean;
  status: number;
  error: string;
  reason: string;
}

export function validateUnlockInput(input: UnlockInput): UnlockValidation {
  const bad = (status: number, error: string, reason: string): UnlockValidation => ({ ok: false, status, error, reason });
  if (input.honeypot && input.honeypot.trim().length > 0) {
    // Bots fill the invisible field; answer like a validation error, not a tell.
    return bad(400, "Something went wrong with the form. Reload and try again.", "honeypot");
  }
  if (typeof input.elapsedMs === "number" && input.elapsedMs >= 0 && input.elapsedMs < MIN_ELAPSED_MS) {
    return bad(400, "Something went wrong with the form. Reload and try again.", "too-fast");
  }
  if (!input.firstName || input.firstName.trim().length === 0 || input.firstName.trim().length > 80) {
    return bad(400, "Add your first name.", "name");
  }
  if (!input.email || !EMAIL_RE.test(input.email.trim())) {
    return bad(400, "That email address does not look right.", "email");
  }
  if (isDisposableEmail(input.email.trim())) {
    return bad(400, "Use your work email. Your Scorecard link lands there and stays live for 180 days.", "disposable");
  }
  if (!input.role || input.role.trim().length === 0 || input.role.trim().length > 60) {
    return bad(400, "Choose your role.", "role");
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
    console.error("[scorecard-unlock] Turnstile verify unreachable, failing open");
    return true;
  }
}

// Fill the contact fields the run intentionally left empty, everywhere they
// live in the record.
export function applyContact(prospect: ProspectData, result: ScorecardResult, input: UnlockInput): { prospect: ProspectData; result: ScorecardResult } {
  const name = input.firstName.trim();
  const role = input.role.trim();
  const seniority = roleSeniority(role);
  return {
    prospect: { ...prospect, name, role },
    result: {
      ...result,
      meta: { ...result.meta, contactName: name, role },
      routing: {
        ...result.routing,
        roleSeniority: seniority,
        loomCandidate: result.verdict.band !== "narrow" || seniority === "ceo" || seniority === "director",
      },
    },
  };
}

// Idempotency: a double submit (same email, same run) returns the SAME report
// link and never double-fires the webhook or the emails. The dedupe key stores
// the slug for 7 days.
export function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 24);
}
export function dedupeKey(email: string, runId: string): string {
  return `scorecard-unlock:${hashEmail(email)}:${runId}`;
}
const DEDUPE_TTL_S = 7 * 24 * 60 * 60;

export async function readExistingUnlock(input: UnlockInput): Promise<string | null> {
  try {
    return (await getKv().get<string>(dedupeKey(input.email, input.runId))) ?? null;
  } catch {
    return null;
  }
}

export async function markUnlocked(input: UnlockInput, slug: string): Promise<void> {
  try {
    await getKv().set(dedupeKey(input.email, input.runId), slug, { ex: DEDUPE_TTL_S });
  } catch {
    // Dedupe is best-effort; a lost marker only risks a duplicate webhook.
  }
}

// Promote the run to its permanent shared report. Never emails or webhooks
// here; the caller chains the lead plumbing after (and never blocks the
// user's unlock on it).
export async function promoteRun(input: UnlockInput): Promise<UnlockOutcome> {
  const run = await readRunRecord<ScorecardResult>(input.runId);
  if (!run) {
    return {
      ok: false,
      status: 410,
      error: "This check has expired. Run a fresh one; it takes under 2 minutes.",
      reason: "run-expired",
    };
  }
  const { prospect, result } = applyContact(run.prospectData, run.result as ScorecardResult, input);
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
  return { ok: true, slug, reportUrl: `/scorecard/r/${slug}`, record };
}

// ── The lead plumbing, in order (Part 2B / build pack Prompt 6) ──────────────
// 1. Persist the lead in KV (queryable: powers admin + the Loom selection).
// 2. Resend internal notification to the team.
// 3. Fallback Email 1 to the lead, only while SCORECARD_SEND_EMAIL1=true.
// Runs AFTER the unlock response (the route uses after()); nothing here can
// block or fail the user's unlock.
export function buildLeadRecord(record: SharedScorecard, input: UnlockInput, slug: string): LeadRecord {
  const result = record.result;
  const overall = prospectScores(result)?.overall ?? 0;
  const now = new Date().toISOString();
  return {
    name: input.firstName.trim(),
    email: input.email.trim(),
    role: input.role.trim(),
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

export async function runLeadPlumbing(record: SharedScorecard, input: UnlockInput, slug: string, origin: string): Promise<LeadRecord> {
  const lead = buildLeadRecord(record, input, slug);
  const absoluteReportUrl = `${origin}/scorecard/r/${slug}`;
  const adminUrl = `${origin}/scorecard/admin/${slug}`;

  // 1. The lead record lands first, so even a total email/webhook outage
  //    leaves the lead queryable in admin.
  try {
    await pushLead(lead);
  } catch (err) {
    console.error("[scorecard-unlock] lead persist failed:", err instanceof Error ? err.message : err);
  }

  // 2. Team notification.
  await notifyTeam(lead, absoluteReportUrl, adminUrl);

  // 3. Email 1 fallback, flag-gated. Funnelr owns Email 1 once live.
  await sendFallbackEmail1(lead, absoluteReportUrl);

  return lead;
}
