// Client-facing Scorecard copy, locked from Part 2B (Sections 4, 7, 10, 13).
// English only at launch; keeping every string here is what lets Dutch and
// German arrive later without touching components. House rules apply to every
// string in this file: no em dashes, never the banned word, no hype.

export const SCORECARD_NAME = "The Industrial Brand Credibility Scorecard";
export const POWERED_BY = "Powered by Nexubis AI";

// ── Landing (Section 13 / Prompt 5 locked copy) ──────────────────────────────
export const LANDING = {
  headline: "How credible is your brand, really?",
  subheadline:
    "Run the Industrial Brand Credibility Scorecard, powered by Nexubis AI. Enter your website and see, on the spot, how well your brand represents your product, how you benchmark against competitors you name, and the first place to fix.",
  bullets: [
    "Your Credibility Score across the five places buyers look",
    "A side-by-side benchmark against two or three competitors you choose",
    "The first place to fix, explained in a short personal video",
  ],
  formHeadline: "Check your brand's credibility",
  formIntro: "Tell us where to look. You'll see your result on the spot.",
  submitButton: "Check my brand's credibility",
  expectationLine: "You see your result on the spot. Unlock the full report by email, no waiting.",
  microProof: "Free, no obligations. We take on two new partners a month; the Scorecard is where most start.",
} as const;

export const FORM_FIELDS = {
  website: { label: "Company website", helper: "We assess what buyers actually see." },
  oneLiner: { label: "What do you make, in one line", helper: "Example: leak detection systems for packaging lines." },
  competitors: { label: "Two or three competitors you keep running into", helper: "Names or websites. We benchmark you against them." },
  firstName: { label: "First name", helper: "" },
  workEmail: { label: "Work email", helper: "Your Scorecard link lands here." },
  role: { label: "Role", options: ["Marketing manager", "Marketing director", "Brand or comms manager", "CEO or MD", "Other"] },
} as const;

// ── Unlock gate ──────────────────────────────────────────────────────────────
export const UNLOCK = {
  headline: "Unlock your full report",
  intro: "Your full report has every category, the findings behind the scores, and the first place to fix.",
  submitButton: "Unlock the full report",
  afterSubmit:
    "Here's your result. Your full report has your Credibility Score, the competitor comparison, and the first place to fix. We'll also email you the link so you have it.",
  // TODO CONFIRM WITH LEON: exact EU privacy wording. Placeholder kept plain
  // and honest until confirmed; the link target is the site privacy page.
  privacyNotice: "We use these details to send your report link and follow up about your results. See our privacy policy.",
  privacyUrl: "https://www.nexubis.io/privacy",
} as const;

// ── Report surfaces (Section 7) ──────────────────────────────────────────────
export const REPORT = {
  coverTitlePrefix: "The Industrial Brand Credibility Scorecard for",
  loomLine: (name: string) => `Watch this first. ${name} walks you through your results.`,
  firstImpressionTitle: "First impression",
  firstImpressionLine: "This is what a buyer sees before reading a single word.",
  scoreTitle: "Your Credibility Score",
  whatWeLookedAt: "What we looked at",
  whereCompetitorsStand: "Where the competitors stand",
  couldNotAssess: "Could not be assessed",
  firstFixTitle: "The first place to fix",
  proofTitle: "What a closed credibility gap looks like",
  proofBody:
    "One year with Oxipack: 35% more output at a 33% lower effective rate, and the scope kept expanding without a single re-quote.",
  proofLink: "Read the case study",
  nextStepTitle: "Recommended next step",
  nextStepButton: "Book an application call",
  nextStepSteps: [
    { title: "Book the call", body: "A short application call. We look at your Scorecard together and decide if there is a fit." },
    { title: "See it before you commit", body: "We build something real for your brand first, so you judge work, not promises." },
    { title: "Our team becomes your team", body: "Brand, web, 3D, video and print, one in-house-style team on one flat retainer." },
  ],
  softClose: "You've done good work to get here. This is about taking it further.",
  contactEmail: "hello@nexubis.io",
  contactSite: "www.nexubis.io",
} as const;

// Fixed one-line verdict meanings (Section 5), used where the full paragraph
// does not fit (teaser, OG image, admin list).
export const VERDICT_LINES: Record<"narrow" | "visible" | "wide", string> = {
  narrow: "Your brand largely matches your product. Sharpen the specifics.",
  visible: "You are undersold where buyers look first. The fixes are specific and contained.",
  wide: "Your brand is costing you sales. The first fix is clear.",
};

// ── Scan stages (Prompt 5) ───────────────────────────────────────────────────
export const SCAN_STAGES: Record<"reading" | "impressions" | "competitors" | "scoring", string> = {
  reading: "Reading your site",
  impressions: "Capturing first impressions",
  competitors: "Checking your competitors",
  scoring: "Scoring 25 checks",
};

// ── Email 1 fallback (Section 10, exact copy; used only while
//    SCORECARD_SEND_EMAIL1=true, before Funnelr owns the sequence) ────────────
export const EMAIL_1 = {
  subject: (name: string) => `Your Brand Credibility Scorecard is ready, ${name}`,
  body: (name: string, reportUrl: string, senderFirstName: string) =>
    [
      `Hi ${name},`,
      ``,
      `Your Scorecard is ready: ${reportUrl}`,
      ``,
      `Inside you'll find your Credibility Score, how your brand compares against the competitors you named, and the first place to fix.`,
      ``,
      `Your report stays at this link, so you can come back to it or share it with your team.`,
      ``,
      `Take a few minutes with it. The first place to fix is the place to start.`,
      ``,
      `If anything raises questions, just reply to this email.`,
      ``,
      `${senderFirstName}, Nexubis`,
    ].join("\n"),
} as const;
