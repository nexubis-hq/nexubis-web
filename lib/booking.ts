// Single source of truth for the booking target (cal.com/nexubis/30min).
// Every surface that links to "book a call" imports from here, so swapping the
// owner or event is a one-line change and there are no hardcoded cal.com URLs
// anywhere else (grep for "cal.com/"). See docs/funnel-audit-checklist.md §1–2.

export const CAL_USERNAME = "nexubis";
export const CAL_EVENT_SLUG = "30min";

// The cal.com embed namespace form ("<user>/<slug>") and the plain public URL.
export const CAL_LINK = `${CAL_USERNAME}/${CAL_EVENT_SLUG}`;
export const CAL_BOOKING_URL = `https://cal.com/${CAL_LINK}`;

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
