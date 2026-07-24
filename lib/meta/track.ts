"use client";

// The ONE way the browser fires a Meta event. Every event (including PageView)
// goes through here so that (a) it fires the browser pixel AND a server CAPI
// relay, and (b) both legs share one event_id for dedup (§3, §9). Never call
// window.fbq directly elsewhere.
import { isStandardMetaEvent } from "./events";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export interface TrackMetaOptions {
  // Supply a deterministic id when a matching server event exists (e.g. the
  // cal.com booking's `cal_<uid>`), so the two Schedule events dedupe. Otherwise
  // a fresh id is generated and shared between this pixel call and the relay.
  eventId?: string;
  // Raw email for the server CAPI leg only. NEVER sent to the browser pixel in
  // the clear — it is POSTed to our own relay, which hashes it server-side.
  email?: string;
}

function newEventId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `evt_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
  }
}

export function trackMeta(
  eventName: string,
  params: Record<string, unknown> = {},
  opts: TrackMetaOptions = {},
): void {
  if (typeof window === "undefined") return;
  const eventId = opts.eventId ?? newEventId();

  // Browser pixel leg. Standard events use 'track'; custom use 'trackCustom'.
  try {
    if (typeof window.fbq === "function") {
      const method = isStandardMetaEvent(eventName) ? "track" : "trackCustom";
      window.fbq(method, eventName, params, { eventID: eventId });
    }
  } catch {
    // A pixel hiccup must never break the page or block the server leg.
  }

  // Server CAPI leg — fire-and-forget; the relay no-ops without a token.
  try {
    const payload = JSON.stringify({
      eventName,
      eventId,
      params,
      email: opts.email,
      eventSourceUrl: window.location.href,
    });
    // keepalive so the POST survives a navigation right after the event.
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
