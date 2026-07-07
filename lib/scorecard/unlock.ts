// Unlock logic: validates the gate submission, then promotes the short-lived
// run record to a permanent shared report. Pure orchestration over injected
// data where possible so every branch is unit-tested. The lead plumbing
// (Funnelr webhook, team notification, Email 1 fallback) extends onUnlocked
// in the lead-plumbing prompt.
import { readRunRecord } from "./run";
import { uniqueSlug, writeShared, type SharedScorecard } from "./share";
import { DISPOSABLE_DOMAINS } from "./disposable-domains";
import { roleSeniority } from "./routing";
import type { ScorecardResult } from "./result";
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

// Promote the run to its permanent shared report. Never emails or webhooks
// here; the caller chains the lead plumbing after (and never blocks the
// user's unlock on it).
export async function promoteRun(input: UnlockInput): Promise<UnlockOutcome> {
  const run = await readRunRecord<ScorecardResult>(input.runId);
  if (!run) {
    return {
      ok: false,
      status: 410,
      error: "This check has expired. Run a fresh one; it takes about a minute.",
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
