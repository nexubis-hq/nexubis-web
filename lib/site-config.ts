/**
 * Central site configuration.
 *
 * Every call-to-action and cross-site link on the homepage reads from here,
 * so booking, scorecard and contact destinations are set in exactly one place.
 *
 * BOOKING_URL is interim: it points at the existing contact page until a real
 * application-call booking link exists. Swap the value here and every CTA updates.
 */

// Primary conversion target. Interim value points at the contact page.
export const BOOKING_URL = "https://www.nexubis.io/contact";

// Contact destination (used by footer + header + "learn more" links).
export const CONTACT_URL = "https://www.nexubis.io/contact";

// Lead-generator tool. The tool itself ships later; the route is reserved now.
export const SCORECARD_URL = "/scorecard";

// Packages page.
export const PACKAGES_URL = "/packages";

// Oxipack case study, per the locked homepage copy.
export const OXIPACK_CASE_URL = "/work/oxipack";

// "Learn more" micro-CTAs on the Solutions accordion route to contact for now.
export const LEARN_MORE_URL = CONTACT_URL;

/**
 * Feature flag for everything Scorecard-related (hero transitional CTA + support
 * line, the full lead-generator block, the header link, and the footer link).
 *
 * NEXT_PUBLIC_ so it is inlined into both Server and Client Components at build.
 * On by default so the full Scorecard is visible on the testing deploy; set
 * NEXT_PUBLIC_SHOW_SCORECARD to "false" to hide everything Scorecard-related.
 */
export const SHOW_SCORECARD = process.env.NEXT_PUBLIC_SHOW_SCORECARD !== "false";

// Footer navigation. Scorecard is filtered out at render time when the flag is off.
export const FOOTER_LINKS = [
  { label: "About", href: "https://www.nexubis.io/about" },
  { label: "What we do", href: "/#what-we-do" },
  { label: "Work / Case studies", href: "https://www.nexubis.io/work" },
  { label: "Brand Credibility Scorecard", href: SCORECARD_URL, scorecard: true },
  { label: "Contact", href: CONTACT_URL },
  { label: "Privacy & terms", href: "https://www.nexubis.io/privacy" },
] as const;

// Footer social links.
export const SOCIAL_LINKS = [
  { label: "LinkedIn", href: "https://www.linkedin.com/company/nexubis/" },
  { label: "Instagram", href: "https://www.instagram.com/nexubis.design/" },
] as const;
