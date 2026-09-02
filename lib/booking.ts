// Single source of truth for the booking target (the 30-minute session).
// Every surface that links to the session (the report offer block and the
// Laine sidebar card, both via BookCallButton) imports from here, so swapping
// the owner or Cal.com event is one change and there are no hardcoded cal.com
// URLs anywhere else (grep for "cal.com/"). See docs/funnel-audit-checklist.md.
//
// Env-configurable so the Cal.com event can be swapped WITHOUT a code change:
//   NEXT_PUBLIC_CAL_BOOKING_URL   full public URL override (wins if set), or
//   NEXT_PUBLIC_CAL_USERNAME + NEXT_PUBLIC_CAL_EVENT_SLUG   parts.
// NEXT_PUBLIC_ so both the client BookCallButton and any server code get it.
//
// MINIMUM NOTICE (2 working days): this is NOT enforceable from the link or the
// UI and is deliberately not faked here. It lives on the Cal.com event type
// (Event Type -> Limits -> "Minimum Notice"). Set it there. Note Cal.com's
// minimum notice is a flat duration, not working-day aware, so pair a ~2 day
// (2880 min) minimum notice with Mon-Fri availability to approximate two
// working days; a strict working-day skip is not a native single setting.
export const CAL_USERNAME = process.env.NEXT_PUBLIC_CAL_USERNAME || "nexubis";
export const CAL_EVENT_SLUG = process.env.NEXT_PUBLIC_CAL_EVENT_SLUG || "30min";

// The cal.com embed namespace form ("<user>/<slug>") and the plain public URL.
export const CAL_LINK = `${CAL_USERNAME}/${CAL_EVENT_SLUG}`;
export const CAL_BOOKING_URL = (process.env.NEXT_PUBLIC_CAL_BOOKING_URL || `https://cal.com/${CAL_LINK}`).replace(/\/+$/, "");

// cal.com booking-field identifiers, confirmed live from the event's public API
// (2026-07-23). Prefill keys that do not match a real field identifier are silently
// ignored by cal.com, so these must stay in lockstep with the event config.
//   - Business Name: Laine mapped it onto cal.com's built-in meeting-title field, so
//     the identifier is "title" (the prospect's company becomes the meeting title).
//   - Report Link: a custom field with identifier "Report-Link".
export const CAL_FIELD_BUSINESS = "title";
export const CAL_FIELD_REPORT_LINK = "Report-Link";

export interface BookingPrefill {
  // The person's real name — NOT the business. cal.com's built-in "name" field.
  name?: string;
  // The business/company, into the custom Business-Name field.
  business?: string;
  // The unique report URL, into the custom link field. This is what powers
  // booking correlation back to the specific Scorecard (§1, §4).
  reportUrl?: string;
  // Optional prefilled notes.
  notes?: string;
}

// Build a prefilled cal.com booking URL. Empty/undefined values are dropped so
// we never send blank prefill params. Used by non-embed "book a call" CTAs on
// report pages and anywhere a link (not the embed) opens the calendar.
export function buildBookingUrl(prefill: BookingPrefill = {}): string {
  const url = new URL(CAL_BOOKING_URL);
  const set = (key: string, value: string | undefined) => {
    const clean = value?.trim();
    if (clean) url.searchParams.set(key, clean);
  };
  set("name", prefill.name);
  set(CAL_FIELD_BUSINESS, prefill.business);
  set(CAL_FIELD_REPORT_LINK, prefill.reportUrl);
  set("notes", prefill.notes);
  return url.toString();
}
