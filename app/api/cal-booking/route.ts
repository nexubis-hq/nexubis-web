// cal.com booking webhook relay. The ONLY source of the Meta `Schedule` event —
// a CONFIRMED booking, never a click (§3). Verifies the HMAC signature, ignores
// non-BOOKING_CREATED events, suppresses internal emails, and keeps every leg
// independent (one failing never blocks the others). Returns 200 unless the
// signature check fails (then 401). See docs/funnel-audit-checklist.md §1, §5.
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { sendCapiEvent } from "@/lib/meta/capi";
import { META_EVENTS } from "@/lib/meta/events";
import { isInternalEmail } from "@/lib/internal-emails";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Timing-safe comparison of the hex signature cal.com sends against our own
// HMAC of the raw body. Both must be the same length or timingSafeEqual throws.
function signatureValid(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

interface CalAttendee {
  email?: string;
  name?: string;
}
interface CalResponseField {
  value?: unknown;
}
interface CalPayload {
  uid?: string;
  booking?: { uid?: string };
  attendees?: CalAttendee[];
  responses?: Record<string, CalResponseField | string>;
  // "Business Name" is cal.com's built-in title field, so it also surfaces as the
  // top-level booking title — read it there if the response entry is absent.
  title?: string;
}

// cal.com sends custom fields either as { value } objects or plain strings.
function responseValue(responses: CalPayload["responses"], key: string): string | undefined {
  const raw = responses?.[key];
  if (typeof raw === "string") return raw.trim() || undefined;
  const v = raw?.value;
  return typeof v === "string" ? v.trim() || undefined : undefined;
}

export async function POST(req: NextRequest) {
  const secret = process.env.CAL_WEBHOOK_SECRET;
  const rawBody = await req.text();

  // Signature is the one thing that fails CLOSED — a bad signature is the only
  // 401. If no secret is configured we cannot verify, so reject rather than
  // trust an unsigned booking.
  if (!secret || !signatureValid(rawBody, req.headers.get("x-cal-signature-256"), secret)) {
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
  }

  const parsed = (() => {
    try {
      return JSON.parse(rawBody) as { triggerEvent?: string; payload?: CalPayload };
    } catch {
      return null;
    }
  })();

  // Non-BOOKING_CREATED (reschedule, cancel, ping, etc.): acknowledge and ignore.
  if (!parsed || parsed.triggerEvent !== "BOOKING_CREATED") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const payload = parsed.payload ?? {};
  const uid = payload.uid ?? payload.booking?.uid ?? "";
  const attendeeEmail = payload.attendees?.[0]?.email ?? null;
  const business =
    responseValue(payload.responses, "title") ??
    (typeof payload.title === "string" ? payload.title.trim() || undefined : undefined);
  const reportUrl = responseValue(payload.responses, "Report-Link");

  // Internal/test bookings never fire a conversion or a CRM change (§3).
  if (isInternalEmail(attendeeEmail)) {
    return NextResponse.json({ ok: true, skipped: "internal" });
  }

  // Leg 1 — Meta Schedule. event_id `cal_<uid>` so it dedupes against any
  // embed-side Schedule that shares the same id (§1). No-ops without a CAPI token.
  if (uid) {
    await sendCapiEvent({
      eventName: META_EVENTS.schedule,
      eventId: `cal_${uid}`,
      email: attendeeEmail,
      clientIp: null, // server-to-server webhook; no meaningful client IP.
      userAgent: null,
      eventSourceUrl: reportUrl ?? null,
      customData: { content_name: "Nexubis Scorecard", ...(business ? { business } : {}) },
    }).catch((err) => {
      console.error("[cal-booking] Schedule CAPI failed:", err instanceof Error ? err.message : err);
    });
  }

  // Leg 2 — Funnelr "Call Booked" exit tag. HELD for Shannah's Nexubis tag names
  // (docs/funnel-audit-checklist.md §5 "Booked exit"). Once the booked-tag name
  // lands, apply it to the attendee email (and the correlated audit email) via the
  // tag-only Funnelr bridge here. The website only tags; the Funnelr automation
  // does the list/sequence cleanup.
  // TODO(shannah-names): applyBookedTag({ email: attendeeEmail, reportUrl });

  return NextResponse.json({ ok: true });
}
