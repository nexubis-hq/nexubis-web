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

// Expected lead value model: value = package price × close rate, one documented
// constant. Nexubis prices in EUR (industrial), unlike the LekkeWeb ZAR model, so
// the number is a business input — set META_LEAD_VALUE + META_CURRENCY to include
// it. Omitted entirely when unset (never send a guessed value).
export function leadValue(): { value: number; currency: string } | null {
  const raw = process.env.META_LEAD_VALUE;
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return { value, currency: process.env.META_CURRENCY || "EUR" };
}
