// Server relay for Meta CAPI. Enriches every event with the client IP + UA from
// request HEADERS (never trusting the body), forwards the self-minted fbc / fbp /
// external_id, suppresses internal/test emails, gates on host, and returns a
// clean 200 whether or not a token is configured — it must never error
// client-side. The browser leg has already fired; this is the server pair.
import { NextRequest, NextResponse } from "next/server";
import { sendCapiEvent } from "@/lib/meta/capi";
import { isInternalEmail } from "@/lib/internal-emails";
import { isTrackingHost, normaliseHost } from "@/lib/meta/config";

export const dynamic = "force-dynamic";

// First hop in X-Forwarded-For is the real client on Vercel.
function clientIp(req: NextRequest): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

// event_source_url MUST be a real public page URL, never an /api/ path — three
// live Meta custom conversions match on "URL contains nexubis" and silently
// count zero without it. Prefer the page URL the browser sent; fall back to the
// referer; reject anything pointing at our own API.
function eventSourceUrl(req: NextRequest, fromBody: string | undefined): string | null {
  for (const candidate of [fromBody, req.headers.get("referer")]) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if (url.pathname.startsWith("/api/")) continue;
      return url.toString();
    } catch {
      // ignore an unparseable candidate and try the next.
    }
  }
  return null;
}

// Host the event originated on, taken from the page URL (or referer). Used for
// the gate so preview/localhost traffic never reaches the live dataset.
function originHost(req: NextRequest, sourceUrl: string | null): string {
  if (sourceUrl) {
    try {
      return normaliseHost(new URL(sourceUrl).host);
    } catch {
      /* fall through */
    }
  }
  return normaliseHost(req.headers.get("host"));
}

let warnedInert = false;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | {
        eventName?: string;
        eventId?: string;
        params?: Record<string, unknown>;
        email?: string;
        firstName?: string;
        fbc?: string | null;
        fbp?: string | null;
        externalId?: string | null;
        eventSourceUrl?: string;
      }
    | null;

  if (!body?.eventName || !body.eventId) {
    // Malformed events are not an error the browser should see or retry.
    return NextResponse.json({ ok: true, skipped: true });
  }

  const sourceUrl = eventSourceUrl(req, body.eventSourceUrl);

  // Host gate (§8): inert unless the event came from the production site.
  if (!isTrackingHost(originHost(req, sourceUrl))) {
    if (!warnedInert) {
      warnedInert = true;
      console.info("[meta] server relay inert on this host; no events are sent.");
    }
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Suppress internal/test traffic on the conversions leg.
  if (isInternalEmail(body.email)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const result = await sendCapiEvent({
    eventName: body.eventName,
    eventId: body.eventId,
    email: body.email ?? null,
    firstName: body.firstName ?? null,
    fbc: body.fbc ?? null,
    fbp: body.fbp ?? null,
    externalId: body.externalId ?? null,
    clientIp: clientIp(req),
    userAgent: req.headers.get("user-agent"),
    eventSourceUrl: sourceUrl,
    customData: body.params,
  });

  // Always a clean 200 — even a CAPI failure is logged server-side, never
  // surfaced to the user's browser.
  return NextResponse.json({ ok: true, skipped: "skipped" in result ? result.skipped : false });
}
