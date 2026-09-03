import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createFunnelrClient, type FunnelrTag, type FunnelrUser } from "@/lib/funnelr/client";
import { getKv } from "@/lib/scorecard/kv";
import { sendCapiEvent } from "@/lib/meta/capi";
import { META_EVENTS, LEAD_CONTENT_NAME, scheduleValue } from "@/lib/meta/events";
import { isInternalEmail } from "@/lib/internal-emails";

const CALL_BOOKED_TAG_NAME = "Pipeline: Nexubis | Call Booked";

export type CalTriggerEvent = "BOOKING_CREATED" | "BOOKING_RESCHEDULED" | "BOOKING_CANCELLED";

export interface CalWebhookEnv {
  CAL_WEBHOOK_SECRET?: string;
  CAL_APPLICATION_EVENT_SLUG?: string;
}

export interface CalWebhookResult {
  status: number;
  body: {
    ok: boolean;
    ignored?: boolean;
    action?: string;
    error?: string;
  };
}

export interface CalFunnelrClient {
  findContactByEmail(email: string): Promise<FunnelrUser | null>;
  createContact(input: { email: string; firstName?: string; lastName?: string }): Promise<FunnelrUser>;
  findTagByName(name: string): Promise<FunnelrTag | null>;
  contactHasTag(userId: number, tagId: string): Promise<boolean>;
  addTagToContact(userId: number, tagId: string): Promise<void>;
  removeTagFromContact(userId: number, tagId: string): Promise<void>;
}

type CalLogger = Pick<typeof console, "info" | "warn" | "error">;

interface CalWebhookPayload {
  triggerEvent?: string;
  payload?: {
    type?: string;
    eventType?: { slug?: string } | string;
    eventTypeSlug?: string;
    uid?: string;
    startTime?: string;
    endTime?: string;
    email?: string;
    attendeeEmail?: string;
    attendee?: { email?: string; name?: string };
    attendees?: Array<{ email?: string; name?: string }> | { email?: string; name?: string };
    responses?: {
      email?: { value?: string } | string;
      name?: { value?: string } | string;
    };
  };
}

export function signCalWebhookBody(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

function normalizeSignature(signature: string): string {
  return signature.trim().replace(/^sha256=/i, "");
}

export function verifyCalSignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader || !secret) return false;
  const provided = normalizeSignature(signatureHeader);
  const expected = signCalWebhookBody(rawBody, secret);
  const providedBuffer = Buffer.from(provided, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (providedBuffer.length !== expectedBuffer.length || providedBuffer.length === 0) return false;
  return timingSafeEqual(providedBuffer, expectedBuffer);
}

function jsonResult(status: number, body: CalWebhookResult["body"]): CalWebhookResult {
  return { status, body };
}

function parseJson(rawBody: string): CalWebhookPayload | null {
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as CalWebhookPayload) : null;
  } catch {
    return null;
  }
}

function valueOfResponse(value: { value?: string } | string | undefined): string {
  if (typeof value === "string") return value;
  return typeof value?.value === "string" ? value.value : "";
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function firstAttendee(event: CalWebhookPayload): { email?: string; name?: string } | undefined {
  const attendees = event.payload?.attendees;
  if (Array.isArray(attendees)) return attendees[0];
  return attendees ?? event.payload?.attendee;
}

export function calEventSlug(event: CalWebhookPayload): string {
  const eventType = event.payload?.eventType;
  const eventTypeSlug = typeof eventType === "object" ? cleanString(eventType.slug) : cleanString(eventType);
  return eventTypeSlug || cleanString(event.payload?.eventTypeSlug) || cleanString(event.payload?.type);
}

export function attendeeEmail(event: CalWebhookPayload): string {
  const attendee = firstAttendee(event);
  const fallback = valueOfResponse(event.payload?.responses?.email);
  const email = attendee?.email || event.payload?.attendeeEmail || event.payload?.email || fallback;
  return cleanString(email).toLowerCase();
}

function attendeeName(event: CalWebhookPayload): { firstName?: string; lastName?: string } {
  const raw = firstAttendee(event)?.name || valueOfResponse(event.payload?.responses?.name);
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return {};
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") || undefined };
}

function isSupportedTrigger(value: string | undefined): value is CalTriggerEvent {
  return value === "BOOKING_CREATED" || value === "BOOKING_RESCHEDULED" || value === "BOOKING_CANCELLED";
}

function requireUserId(contact: FunnelrUser): number {
  if (typeof contact.userId !== "number") throw new Error("Funnelr contact did not include a userId.");
  return contact.userId;
}

async function findOrCreateContactWithState(
  client: CalFunnelrClient,
  event: CalWebhookPayload,
  email: string,
): Promise<{ contact: FunnelrUser; created: boolean }> {
  const existing = await client.findContactByEmail(email);
  if (existing) return { contact: existing, created: false };
  return { contact: await client.createContact({ email, ...attendeeName(event) }), created: true };
}

async function resolveTag(client: CalFunnelrClient, name: string): Promise<FunnelrTag> {
  const tag = await client.findTagByName(name);
  if (!tag) throw new Error(`Required Funnelr tag was not found: ${name}`);
  return tag;
}

async function ensureTag(client: CalFunnelrClient, userId: number, tagId: string): Promise<void> {
  if (await client.contactHasTag(userId, tagId)) return;
  await client.addTagToContact(userId, tagId);
  if (!(await client.contactHasTag(userId, tagId))) {
    throw new Error("Funnelr tag application could not be verified.");
  }
}

async function removeTagIfPresent(client: CalFunnelrClient, userId: number, tagId: string): Promise<void> {
  if (!(await client.contactHasTag(userId, tagId))) return;
  await client.removeTagFromContact(userId, tagId);
}

export async function handleCalWebhook(
  rawBody: string,
  signatureHeader: string | null,
  options: {
    env?: CalWebhookEnv;
    client?: CalFunnelrClient;
    dedupe?: boolean;
    logger?: CalLogger;
  } = {},
): Promise<CalWebhookResult> {
  const env = options.env ?? process.env;
  const logger = options.logger ?? console;
  const secret = env.CAL_WEBHOOK_SECRET?.trim();
  if (!secret) return jsonResult(500, { ok: false, error: "Webhook secret is not configured." });
  if (!verifyCalSignature(rawBody, signatureHeader, secret)) {
    return jsonResult(401, { ok: false, error: "Invalid webhook signature." });
  }

  const event = parseJson(rawBody);
  if (!event) return jsonResult(400, { ok: false, error: "Invalid JSON." });

  const expectedSlug = env.CAL_APPLICATION_EVENT_SLUG?.trim();
  if (!expectedSlug) return jsonResult(500, { ok: false, error: "Cal.com event slug is not configured." });
  const receivedSlug = calEventSlug(event);
  if (receivedSlug !== expectedSlug) {
    logger.info("[cal-webhook]", {
      reason: "ignored_event_type",
      triggerEvent: event.triggerEvent ?? null,
      expectedSlug,
      receivedSlug: receivedSlug || null,
      attendeeEmailPresent: Boolean(attendeeEmail(event)),
      contactLookupAttempted: false,
      funnelrRequestAttempted: false,
    });
    return jsonResult(200, { ok: true, ignored: true, action: "ignored_event_type" });
  }

  if (!isSupportedTrigger(event.triggerEvent)) {
    logger.info("[cal-webhook]", {
      reason: "ignored_trigger",
      triggerEvent: event.triggerEvent ?? null,
      expectedSlug,
      receivedSlug,
      attendeeEmailPresent: Boolean(attendeeEmail(event)),
      contactLookupAttempted: false,
      funnelrRequestAttempted: false,
    });
    return jsonResult(200, { ok: true, ignored: true, action: "ignored_trigger" });
  }

  const email = attendeeEmail(event);
  if (!email) return jsonResult(400, { ok: false, error: "Missing attendee email." });

  const client = options.client ?? createFunnelrClient();
  const dedupeKey = event.payload?.uid ? calWebhookDedupeKey(event.payload.uid, event.triggerEvent) : null;
  if (options.dedupe !== false && dedupeKey && (await wasCalWebhookProcessed(dedupeKey))) {
    logger.info("[cal-webhook]", {
      reason: "duplicate_event",
      triggerEvent: event.triggerEvent,
      expectedSlug,
      receivedSlug,
      attendeeEmailPresent: true,
      contactLookupAttempted: false,
      funnelrRequestAttempted: false,
      dedupeMatched: true,
    });
    return jsonResult(200, { ok: true, ignored: true, action: "duplicate_event" });
  }

  try {
    if (event.triggerEvent === "BOOKING_CREATED" || event.triggerEvent === "BOOKING_RESCHEDULED") {
      const { contact, created } = await findOrCreateContactWithState(client, event, email);
      const callBookedTag = await resolveTag(client, CALL_BOOKED_TAG_NAME);
      logger.info("[cal-webhook]", {
        reason: "funnelr_update_attempt",
        triggerEvent: event.triggerEvent,
        expectedSlug,
        receivedSlug,
        attendeeEmailPresent: true,
        contactLookupAttempted: true,
        contactFound: !created,
        tagLookupSucceeded: true,
        funnelrRequestAttempted: true,
      });
      await ensureTag(client, requireUserId(contact), callBookedTag.tagId);
      // Meta Schedule — a CONFIRMED booking (created only, not reschedule). event_id
      // cal_<uid> dedupes against any embed-side Schedule. No-ops without a CAPI
      // token, skips internal/test emails, and never fails the webhook.
      if (event.triggerEvent === "BOOKING_CREATED" && event.payload?.uid && !isInternalEmail(email)) {
        const schedValue = scheduleValue();
        await sendCapiEvent({
          eventName: META_EVENTS.schedule,
          eventId: `cal_${event.payload.uid}`,
          email,
          clientIp: null,
          userAgent: null,
          eventSourceUrl: "https://nexubis.io/audit",
          customData: {
            content_name: LEAD_CONTENT_NAME,
            ...(schedValue ? { value: schedValue.value, currency: schedValue.currency } : {}),
          },
        }).catch((err) => console.error("[cal-webhook] Schedule CAPI failed:", err instanceof Error ? err.message : err));
      }
      if (options.dedupe !== false && dedupeKey) await markCalWebhookProcessed(dedupeKey);
      logger.info("[cal-webhook]", {
        reason: "funnelr_update_succeeded",
        triggerEvent: event.triggerEvent,
        expectedSlug,
        receivedSlug,
        attendeeEmailPresent: true,
        contactLookupAttempted: true,
        contactFound: !created,
        tagLookupSucceeded: true,
        funnelrRequestAttempted: true,
      });
      return jsonResult(200, { ok: true, action: event.triggerEvent === "BOOKING_CREATED" ? "booking_created" : "booking_rescheduled" });
    }

    const contact = await client.findContactByEmail(email);
    if (!contact) {
      if (options.dedupe !== false && dedupeKey) await markCalWebhookProcessed(dedupeKey);
      logger.info("[cal-webhook]", {
        reason: "booking_cancelled_contact_not_found",
        triggerEvent: event.triggerEvent,
        expectedSlug,
        receivedSlug,
        attendeeEmailPresent: true,
        contactLookupAttempted: true,
        matchingContactCount: 0,
        funnelrRequestAttempted: true,
      });
      return jsonResult(200, { ok: true, ignored: true, action: "booking_cancelled_contact_not_found" });
    }

    const userId = requireUserId(contact);
    const callBookedTag = await resolveTag(client, CALL_BOOKED_TAG_NAME);
    await removeTagIfPresent(client, userId, callBookedTag.tagId);

    if (options.dedupe !== false && dedupeKey) await markCalWebhookProcessed(dedupeKey);
    logger.info("[cal-webhook]", {
      reason: "booking_cancelled_succeeded",
      triggerEvent: event.triggerEvent,
      expectedSlug,
      receivedSlug,
      attendeeEmailPresent: true,
      contactLookupAttempted: true,
      matchingContactCount: 1,
      tagLookupSucceeded: true,
      funnelrRequestAttempted: true,
    });
    return jsonResult(200, { ok: true, action: "booking_cancelled" });
  } catch (err) {
    logger.error("[cal-webhook]", {
      reason: "funnelr_update_failed",
      triggerEvent: event.triggerEvent,
      expectedSlug,
      receivedSlug,
      attendeeEmailPresent: true,
      contactLookupAttempted: true,
      funnelrRequestAttempted: true,
      errorType: err instanceof Error ? err.name : "UnknownError",
    });
    return jsonResult(500, { ok: false, error: err instanceof Error ? err.message : "Funnelr update failed." });
  }
}

function calWebhookDedupeKey(uid: string, triggerEvent: CalTriggerEvent): string {
  const hash = createHash("sha256").update(`${triggerEvent}:${uid}`).digest("hex");
  return `cal:webhook:${hash}`;
}

async function wasCalWebhookProcessed(key: string): Promise<boolean> {
  try {
    return Boolean(await getKv().get(key));
  } catch {
    return false;
  }
}

async function markCalWebhookProcessed(key: string): Promise<void> {
  try {
    await getKv().set(key, true, { ex: 60 * 60 * 24 * 30 });
  } catch {
    // Duplicate detection is best-effort; Funnelr state checks keep operations idempotent.
  }
}
