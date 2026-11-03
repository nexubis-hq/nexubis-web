// The site's link to the sequence app (nexubis-sequences), which replaces Funnelr.
//
// SEQUENCE_MODE decides who owns new leads:
//   funnelr (default)  nothing changes, the app is not called
//   shadow             Funnelr does the work, the app records the same events
//   app                the app owns new leads. Stop signals still reach Funnelr
//                      while its existing leads finish
//
// An event that cannot be delivered is queued and replayed, because a lost
// booking or reply would mean a lead keeps getting emails.
import { getKv } from "@/lib/scorecard/kv";

export type SequenceMode = "funnelr" | "shadow" | "app";

export function sequenceMode(): SequenceMode {
  const mode = process.env.SEQUENCE_MODE?.trim();
  return mode === "shadow" || mode === "app" ? mode : "funnelr";
}

export type SequenceEventType =
  | "audit_finished"
  | "contact_form"
  | "booking_created"
  | "booking_rescheduled"
  | "booking_cancelled"
  | "reply"
  | "admin_start"
  | "admin_stop";

export interface SequenceEventBody {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  website?: string;
  reportUrl?: string;
  source?: string;
  payload?: Record<string, unknown>;
}

interface QueuedEvent {
  type: SequenceEventType;
  body: SequenceEventBody;
  idemKey: string;
}

export interface SequenceResult {
  ok: boolean;
  outcome?: string;
  queued?: boolean;
}

const OUTBOX = "sequences:outbox";
const TIMEOUT_MS = 8000;

function config() {
  const url = process.env.SEQUENCES_URL?.trim().replace(/\/$/, "");
  const key = process.env.SEQUENCES_API_KEY?.trim();
  return url && key ? { url, key } : null;
}

async function post(event: QueuedEvent): Promise<SequenceResult> {
  const target = config();
  if (!target) return { ok: false };
  const res = await fetch(`${target.url}/api/v1/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${target.key}`,
      "Content-Type": "application/json",
      "Idempotency-Key": event.idemKey,
    },
    body: JSON.stringify({ type: event.type, ...event.body }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) return { ok: false };
  const data = (await res.json().catch(() => ({}))) as { outcome?: string };
  return { ok: true, outcome: data.outcome };
}

async function attempt(event: QueuedEvent): Promise<SequenceResult> {
  for (let i = 0; i < 2; i++) {
    try {
      const result = await post(event);
      if (result.ok) return result;
    } catch {
      // Network trouble: try once more, then queue.
    }
  }
  return { ok: false };
}

/** Never throws. The same idemKey is safe to send twice: the app ignores the repeat. */
export async function sendSequenceEvent(
  type: SequenceEventType,
  body: SequenceEventBody,
  idemKey: string,
): Promise<SequenceResult> {
  if (sequenceMode() === "funnelr") return { ok: true, outcome: "not-in-use" };
  const event: QueuedEvent = { type, body, idemKey };
  const result = await attempt(event);
  if (result.ok) return result;
  console.error(`[sequences] ${type} not delivered, queued for retry`);
  try {
    await getKv().lpush(OUTBOX, JSON.stringify(event));
    return { ok: false, queued: true };
  } catch {
    console.error(`[sequences] ${type} could not be queued either`);
    return { ok: false };
  }
}

/** Replays queued events oldest first. Runs from the daily cron and can be run by hand. */
export async function flushSequenceOutbox(): Promise<{ sent: number; left: number }> {
  if (sequenceMode() === "funnelr") return { sent: 0, left: 0 };
  const kv = getKv();
  const raw = await kv.lrange<string | QueuedEvent>(OUTBOX, 0, -1);
  if (!raw.length) return { sent: 0, left: 0 };
  let sent = 0;
  const failed: unknown[] = [];
  for (const item of [...raw].reverse()) {
    const event = (typeof item === "string" ? JSON.parse(item) : item) as QueuedEvent;
    if ((await attempt(event)).ok) sent += 1;
    else failed.push(JSON.stringify(event));
  }
  await kv.del(OUTBOX);
  if (failed.length) await kv.lpush(OUTBOX, ...failed.reverse());
  return { sent, left: failed.length };
}

export interface SequenceEnrolment {
  sequence: string;
  sequenceKey: string;
  group: string;
  status: string;
  origin: string;
  step: number;
  totalSteps: number;
  nextDueAt: string | null;
  startedAt: string;
}

export interface SequenceSend {
  sequence_key: string;
  step_index: number;
  subject: string;
  status: string;
  sent_at: string | null;
  claimed_at: string;
  delivered_at: string | null;
  error: string | null;
}

export interface SequenceStatus {
  found: boolean;
  email: string;
  suppressed: boolean;
  stopReason?: string | null;
  stoppedAt?: string | null;
  nurturePending?: boolean;
  enrolments: SequenceEnrolment[];
  sends: SequenceSend[];
}

export async function readSequenceStatus(email: string): Promise<SequenceStatus | null> {
  const target = config();
  if (!target) return null;
  try {
    const url = new URL(`${target.url}/api/v1/contacts`);
    url.searchParams.set("email", email);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${target.key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok ? ((await res.json()) as SequenceStatus) : null;
  } catch {
    return null;
  }
}
