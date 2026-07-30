// Server-side Meta Conversions API (CAPI) relay. Server-only.
//
// Clean no-op when META_CAPI_TOKEN is unset: the whole pixel pipeline ships and
// the browser leg tracks immediately, while the server leg stays dormant until a
// token is added — it NEVER errors client-side (§3). When the token is present,
// each event is sent with the SAME event_id the browser used, so Meta dedupes
// the pixel + CAPI pair into one conversion (§9: dedup is designed, not hoped for).
import { createHash } from "node:crypto";
import { META_PIXEL_ID, isStandardMetaEvent } from "./events";

const GRAPH_VERSION = "v19.0";

export interface CapiEventInput {
  eventName: string;
  eventId: string;
  // Enrichment pulled from request HEADERS by the caller, never from the body.
  clientIp?: string | null;
  userAgent?: string | null;
  eventSourceUrl?: string | null;
  // Raw email — hashed here, never sent or logged in the clear.
  email?: string | null;
  // Raw first name — hashed here, same handling as email.
  firstName?: string | null;
  // Meta click/browser ids and our stable pseudonymous id. Sent RAW (never
  // hashed; §7) — this is the single biggest lever on match quality.
  fbc?: string | null;
  fbp?: string | null;
  externalId?: string | null;
  // Custom data; whitelisted to strings/numbers before it leaves the server.
  customData?: Record<string, unknown>;
}

export type CapiResult =
  | { ok: true; skipped: true }
  | { ok: true; skipped: false }
  | { ok: false; error: string };

export function isCapiConfigured(): boolean {
  return Boolean(process.env.META_CAPI_TOKEN);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

// Meta wants PII normalised (trim + lowercase) then SHA-256 hashed.
function hashPii(value: string): string | null {
  const clean = value.trim().toLowerCase();
  return clean ? sha256(clean) : null;
}

// Only strings and finite numbers survive into custom_data — no objects, no
// leaking of arbitrary payload shape to Meta.
function whitelistCustomData(data: Record<string, unknown> | undefined): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (!data) return out;
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string" && value.length <= 500) out[key] = value;
    else if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
  }
  return out;
}

export async function sendCapiEvent(input: CapiEventInput, now = new Date()): Promise<CapiResult> {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) {
    // Loud, never a silent no-op (§7). A missing token in production means the
    // whole server leg is dark and dedup is impossible — that must be visible.
    console.warn(`[meta-capi] META_CAPI_TOKEN is not set; server event "${input.eventName}" was NOT sent.`);
    return { ok: true, skipped: true };
  }

  // Hashed PII (§7: only PII is hashed).
  const emailHash = input.email ? hashPii(input.email) : null;
  const firstNameHash = input.firstName ? hashPii(input.firstName) : null;

  const userData: Record<string, unknown> = {};
  if (emailHash) userData.em = [emailHash];
  if (firstNameHash) userData.fn = [firstNameHash];
  // Raw, unhashed identifiers — the highest-signal match keys.
  if (input.fbc) userData.fbc = input.fbc;
  if (input.fbp) userData.fbp = input.fbp;
  if (input.externalId) userData.external_id = input.externalId;
  if (input.clientIp) userData.client_ip_address = input.clientIp;
  if (input.userAgent) userData.client_user_agent = input.userAgent;

  const event = {
    event_name: input.eventName,
    event_time: Math.floor(now.getTime() / 1000),
    event_id: input.eventId,
    action_source: "website",
    ...(input.eventSourceUrl ? { event_source_url: input.eventSourceUrl } : {}),
    user_data: userData,
    custom_data: whitelistCustomData(input.customData),
    // Custom events must not be flagged as standard; harmless for standard ones.
    ...(isStandardMetaEvent(input.eventName) ? {} : {}),
  };

  // A test_event_code routes this server event into Events Manager > Test Events
  // so the browser + server pair can be confirmed as deduplicated. Read from
  // either env name (NEXT_PUBLIC_* is a convenience so one value can be set for
  // both legs). The browser pixel has no test_event_code parameter — Meta's Test
  // Events tool captures browser events automatically by pixel id — so setting
  // the code here is all that is needed to see the deduplicated pair. Temporary/
  // testing only: leave unset in production, where it diverts real events.
  const testEventCode = (process.env.META_TEST_EVENT_CODE || process.env.NEXT_PUBLIC_META_TEST_EVENT_CODE)?.trim();

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [event], ...(testEventCode ? { test_event_code: testEventCode } : {}) }),
      },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      // Redact the token if the URL ever echoes back in an error body.
      const safe = body.replace(/access_token=[^&\s"']+/gi, "access_token=[redacted]").slice(0, 300);
      console.error(`[meta-capi] ${input.eventName} failed HTTP ${res.status}: ${safe}`);
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return { ok: true, skipped: false };
  } catch (err) {
    console.error("[meta-capi] send failed:", err instanceof Error ? err.message : err);
    return { ok: false, error: "request failed" };
  }
}
