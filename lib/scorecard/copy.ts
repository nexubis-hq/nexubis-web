// Client-facing Scorecard copy, locked from Part 2B (Sections 4, 7, 10, 13).
// English only at launch; keeping every string here is what lets Dutch and
// German arrive later without touching components. House rules apply to every
// string in this file: no em dashes, never the banned word, no hype.

export const SCORECARD_NAME = "The Industrial Brand Credibility Scorecard";
export const POWERED_BY = "Powered by Nexubis AI";

// ── Landing (Section 13 / Prompt 5 locked copy) ──────────────────────────────
export const LANDING = {
  headline: "How Credible Is Your Brand, Really?",
  subheadline:
    "Run the Industrial Brand Credibility Scorecard, powered by Nexubis AI. Enter your website and see, on the spot, how well your brand represents your product, how you benchmark against the competitors you cross-shop with, and the first place to fix.",
  bullets: [
    "Your Credibility Score across the five places buyers look",
    "A side-by-side benchmark against the competitors buyers weigh you against",
    "The first place to fix, explained in a short personal video",
  ],
  formHeadline: "Check Your Brand's Credibility",
  formIntro: "Enter your website. We read the rest ourselves, and you'll see your result on the spot.",
  submitButton: "Check my brand's credibility",
  expectationLine: "You see your result on the spot. Unlock the full report by email, no waiting.",
  microProof: "Free, no obligations. We take on two new partners a month; the Scorecard is where most start.",
} as const;

export const FORM_FIELDS = {
  website: { label: "Company website", helper: "That's all we need. We read your site and work out the rest." },
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
  // and honest until confirmed.
  privacyNotice: "We use these details to send your report link and follow up about your results. See our privacy policy.",
} as const;

// ── Report navigation + share ────────────────────────────────────────────────
// The full report carries a sticky nav with two actions: book a call, and
// share the report with a colleague. Share opens a prefilled email compose so
// the sender only adds recipients. Never the banned word: this is the
// Scorecard, never an audit.
export const REPORT_NAV = {
  book: "Book an application call",
  share: "Share with your team",
} as const;

export const SHARE = {
  subject: (company: string) => `Our Brand Credibility Scorecard: ${company}`,
  body: (company: string, overall: number | null): string => {
    const score = overall !== null ? `We scored ${overall} out of 100, ` : "";
    return [
      `Take a look at our Industrial Brand Credibility Scorecard for ${company}.`,
      "",
      `${score}benchmarked against the competitors buyers weigh us against. The full report has every category, the findings behind the scores, and the first place to fix:`,
      "",
    ].join("\n");
  },
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

// Rotating ticker under the scan checklist: what the pipeline is genuinely
// doing, in buyer terms, with a couple of clearly-labelled waiting jokes mixed
// in so the minute feels shorter. The detected line lands the moment the
// server has read the site: the first personal touch.
export const SCAN_TICKER = {
  detected: (oneLiner: string) => `So you make ${oneLiner}. Good. Now we know exactly what to benchmark.`,
  lines: (company: string) => [
    `Loading ${company} on a desktop and a phone, the way a buyer first sees it.`,
    "Running the five-second test: can a stranger tell what you make, for whom, and why it is worth more?",
    "Measuring your loading speed with Google PageSpeed, mobile and desktop.",
    "Searching the web for your brochures, spec sheets and trade show presence.",
    "Dad joke while you wait: we asked your website to open up. It said it had too many tabs.",
    "Checking how your competitors show up when the same buyer looks at them.",
    "Counting the languages your site speaks to its export markets.",
    "Dad joke while you wait: the scan wanted a coffee break. We told it to filter faster.",
    "Scoring all 25 checks across the five places buyers look.",
  ],
} as const;

// ── Verdict band scale (teaser + report) ─────────────────────────────────────
// Where the score sits on the 0 to 100 scale, so a band name like "Visible
// gap" carries its meaning instead of floating as a label.
export const BAND_SCALE = [
  { band: "wide", label: "Wide gap", range: "0-59" },
  { band: "visible", label: "Visible gap", range: "60-79" },
  { band: "narrow", label: "Narrow gap", range: "80-100" },
] as const;

// ── Audience gate ────────────────────────────────────────────────────────────
// Shown when the entered site is clearly outside the Scorecard's audience.
// Warm and honest: the tool is for industrial manufacturers, and the reader
// gets a way to object if we misread their site.
export const OUT_OF_SCOPE_MESSAGE =
  "The Scorecard is built for industrial manufacturers and machine builders, and this site does not look like one, so we did not run the check. If we have that wrong, email hello@nexubis.io and we will run it for you.";

// ── Teaser nudges (locked sections + sticky unlock bar) ──────────────────────
export const TEASER = {
  chipsLabel: "Overall scores, you and the competitors buyers weigh you against:",
  rivalNotScored: "could not be checked",
  lockedNudge: "Unlock the full report to read what we found here",
  stickyLine: "Your full report is ready.",
  stickyButton: "Unlock full report",
} as const;

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
