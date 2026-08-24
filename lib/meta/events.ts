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
  auditComplete: "AuditComplete", // custom, DIAGNOSIS ONLY: scan finished, teaser/gate rendered. Splits abandonment-during-wait from refusal-at-gate. NOT a custom conversion; never optimise on it.
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
//
// IMPORTANT when a value IS set: derive it from the EUR package economics and
// convert to ZAR — do NOT type a round rand number. The packages are priced
// EUR-first (Momentum ~EUR 3,500/mo, Partner ~EUR 6,000/mo) and the campaign is
// Europe-targeted; the ZAR figure only exists because the ad account bills in
// ZAR. It need not be exact, but a wrong ORDER OF MAGNITUDE distorts value
// optimisation later. Example basis: expected value = first-period EUR retainer ×
// realistic lead→close rate, then × the current EUR→ZAR rate. Left unset for now:
// we have no cold-lead close rate yet (growth to date has been warm word of
// mouth), and Meta ignores value unless value optimisation is switched on.
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
