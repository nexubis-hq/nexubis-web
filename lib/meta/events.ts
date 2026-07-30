// Shared Meta pixel constants — import-safe in BOTH client and server code
// (only references NEXT_PUBLIC_*, which is inlined at build). The four funnel
// events and their strict semantics live in docs/funnel-audit-checklist.md §3.

// Public pixel id. Pixel ids are not secret (they ship in page source); the env
// is the canonical source and this literal is a resilient fallback.
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "885652097948360";

// The funnel events. Intent (AuditStart, AuditBookClick) and confirmation (Lead,
// Schedule) are DIFFERENT events — a click is never a booking (§3, §9).
export const META_EVENTS = {
  pageView: "PageView",
  auditStart: "AuditStart", // custom: scan started (website submitted). Once per visit.
  lead: "Lead", // standard: email gate success.
  auditBookClick: "AuditBookClick", // custom: clicked a book CTA. NOT a booking.
  schedule: "Schedule", // standard: CONFIRMED booking only (cal.com webhook).
  contact: "Contact", // standard: contact-form message. Kept distinct from Lead.
} as const;

export type MetaEventName = (typeof META_EVENTS)[keyof typeof META_EVENTS] | (string & {});

// Standard events fire via fbq('track'); everything else via fbq('trackCustom').
const STANDARD_META_EVENTS = new Set<string>([
  "PageView",
  "Lead",
  "Schedule",
  "Purchase",
  "CompleteRegistration",
  "Contact",
]);

export function isStandardMetaEvent(name: string): boolean {
  return STANDARD_META_EVENTS.has(name);
}

// Distinct content_name so Scorecard leads never blend with contact-form leads
// in Meta's custom conversions (§3).
export const LEAD_CONTENT_NAME = "Nexubis Scorecard";

// Expected value model: value = deal size × close rate, one documented constant
// per event. The Meta ad account reports in ZAR, so currency defaults to ZAR
// (override with META_CURRENCY). Values are a business input — set the env var to
// include one; omitted entirely when unset, so we never send a guessed value.
const DEFAULT_CURRENCY = "ZAR";

function eventValue(raw: string | undefined): { value: number; currency: string } | null {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return { value, currency: process.env.META_CURRENCY || DEFAULT_CURRENCY };
}

// Lead: a gated scorecard email. Set NEXT_PUBLIC_META_LEAD_VALUE (client, so the
// pixel leg can send it too) and/or META_LEAD_VALUE.
export function leadValue(): { value: number; currency: string } | null {
  return eventValue(process.env.NEXT_PUBLIC_META_LEAD_VALUE || process.env.META_LEAD_VALUE);
}

// Schedule: a confirmed booking, worth more than a lead. Server-only event, so a
// plain (non-public) env var is fine.
export function scheduleValue(): { value: number; currency: string } | null {
  return eventValue(process.env.META_SCHEDULE_VALUE);
}
