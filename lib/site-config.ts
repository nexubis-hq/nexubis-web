/**
 * Central site configuration.
 *
 * Every call-to-action and cross-site link on the homepage reads from here,
 * so booking, audit and contact destinations are set in exactly one place.
 *
 * BOOKING_URL is the primary conversion target for generic "book a call" CTAs.
 * It routes through /contact, where the booking embed and message form both live.
 */

// Contact destination (used by footer + header + "learn more" links).
export const CONTACT_URL = "/contact";

// Primary conversion target for generic booking CTAs.
export const BOOKING_URL = CONTACT_URL;

// Lead-generator tool: The Online Credibility Audit. The old /scorecard URL
// 301-redirects here (see next.config.ts), so shared links keep working.
export const SCORECARD_URL = "/audit";

// Packages page.
export const PACKAGES_URL = "/packages";

// Oxipack case study, per the locked homepage copy.
export const OXIPACK_CASE_URL = "/work/oxipack";

// "Learn more" micro-CTAs on the Solutions accordion route to contact for now.
export const LEARN_MORE_URL = CONTACT_URL;

// Main Nexubis agency showreel.
export const NEXUBIS_SHOWREEL_URL =
  "https://pub-d0adc0fc26c84d8e8c8db97d1ab2d30f.r2.dev/nexubis/nexubis-showreel-2026-07.mp4";

/**
 * Feature flag for everything audit-related (hero transitional CTA + support
 * line, the full lead-generator block, the header link, and the footer link).
 *
 * NEXT_PUBLIC_ so it is inlined into both Server and Client Components at build.
 * On by default so the full audit is visible on the testing deploy; set
 * NEXT_PUBLIC_SHOW_SCORECARD to "false" to hide everything audit-related.
 */
export const SHOW_SCORECARD = process.env.NEXT_PUBLIC_SHOW_SCORECARD !== "false";

// Footer navigation. The audit link is filtered out at render time when the flag is off.
export const FOOTER_LINKS = [
  { label: "About", href: "/about" },
  { label: "What we do", href: "/#what-we-do" },
  { label: "Work / Case studies", href: "/work" },
  { label: "Online Credibility Audit", href: SCORECARD_URL, scorecard: true },
  { label: "Contact", href: CONTACT_URL },
] as const;

// Footer social links.
export const SOCIAL_LINKS = [
  { label: "LinkedIn", href: "https://www.linkedin.com/company/nexubis/" },
  { label: "Instagram", href: "https://www.instagram.com/nexubis.design/" },
] as const;
