// Server relay for Meta CAPI. Enriches every event with the client IP + UA from
// request HEADERS (never trusting the body), suppresses internal/test emails, and
// returns a clean 200 whether or not a token is configured — it must never error
// client-side (§3). The browser leg has already fired; this is the server pair.
import { NextRequest, NextResponse } from "next/server";
import { sendCapiEvent } from "@/lib/meta/capi";
import { isInternalEmail } from "@/lib/internal-emails";

export const dynamic = "force-dynamic";

// First hop in X-Forwarded-For is the real client on Vercel.
function clientIp(req: NextRequest): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { eventName?: string; eventId?: string; params?: Record<string, unknown>; email?: string; eventSourceUrl?: string }
    | null;

  if (!body?.eventName || !body.eventId) {
    // Malformed events are not an error the browser should see or retry.
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Suppress internal/test traffic on the conversions leg (§3).
  if (isInternalEmail(body.email)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const result = await sendCapiEvent({
    eventName: body.eventName,
    eventId: body.eventId,
    email: body.email ?? null,
    clientIp: clientIp(req),
    userAgent: req.headers.get("user-agent"),
    eventSourceUrl: body.eventSourceUrl ?? req.headers.get("referer"),
    customData: body.params,
  });

  // Always a clean 200 — even a CAPI failure is logged server-side, never
  // surfaced to the user's browser.
  return NextResponse.json({ ok: true, skipped: "skipped" in result ? result.skipped : false });
}
