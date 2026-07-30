"use client";

// The ONE way the browser fires a Meta event. Every event (including PageView)
// goes through here so that (a) it fires the browser pixel AND a server CAPI
// relay, (b) both legs share one event_id for dedup, and (c) both legs carry the
// self-minted fbc / fbp / external_id so match quality does not depend on
// fbevents.js loading. Never call window.fbq directly elsewhere.
import { isStandardMetaEvent } from "./events";
import { ensureMetaIdentity } from "./ids";
import { clientTrackingHost, isTrackingHost } from "./config";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export interface TrackMetaOptions {
  // Supply a deterministic id when a matching server event exists (e.g. the
  // cal.com booking's `cal_<uid>`), so the two events dedupe. Otherwise a fresh
  // id is generated and shared between this pixel call and the relay.
  eventId?: string;
  // Raw email for the server CAPI leg only. NEVER sent to the browser pixel in
  // the clear — it is POSTed to our own relay, which hashes it server-side.
  email?: string;
  // Raw first name, same handling as email: hashed server-side only.
  firstName?: string;
}

function newEventId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `evt_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
  }
}

// Idempotency: one emit per event_id. React strict-mode double-invokes and
// double-clicks that reuse a stable id therefore cannot double-count.
const firedEventIds = new Set<string>();

let warnedInert = false;

export function trackMeta(
  eventName: string,
  params: Record<string, unknown> = {},
  opts: TrackMetaOptions = {},
): void {
  if (typeof window === "undefined") return;

  // Host gate: inert on localhost and preview so test traffic never reaches the
  // live dataset. Log exactly once so it is discoverable without being noisy.
  if (!isTrackingHost(clientTrackingHost())) {
    if (!warnedInert) {
      warnedInert = true;
      console.info("[meta] tracking is inert on this host; no events are sent.");
    }
    return;
  }

  const eventId = opts.eventId ?? newEventId();
  if (firedEventIds.has(eventId)) return;
  firedEventIds.add(eventId);

  // Guarantee fbc / fbp / external_id exist before either leg fires. fbevents
  // reads _fbc / _fbp from the cookies we set here.
  const identity = ensureMetaIdentity();

  // Browser pixel leg. Standard events use 'track'; custom use 'trackCustom'.
  try {
    if (typeof window.fbq === "function") {
      const method = isStandardMetaEvent(eventName) ? "track" : "trackCustom";
      window.fbq(method, eventName, params, { eventID: eventId });
    }
  } catch {
    // A pixel hiccup must never break the page or block the server leg.
  }

  // Server CAPI leg — fire-and-forget; the relay no-ops (and logs) without a
  // token. keepalive so the POST survives a navigation right after the event.
  try {
    const payload = JSON.stringify({
      eventName,
      eventId,
      params,
      email: opts.email,
      firstName: opts.firstName,
      fbc: identity.fbc,
      fbp: identity.fbp,
      externalId: identity.externalId,
      eventSourceUrl: window.location.href,
    });
    void fetch("/api/meta-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore — analytics must never throw into the UI.
  }
}
