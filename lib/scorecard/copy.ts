// Client-facing Scorecard copy, locked from Part 2B (Sections 4, 7, 10, 13).
// English only at launch; keeping every string here is what lets Dutch and
// German arrive later without touching components. House rules apply to every
// string in this file: no em dashes, never the banned word, no hype.

export const SCORECARD_NAME = "The Industrial Brand Credibility Scorecard";
export const POWERED_BY = "Powered by Nexubis AI";

// ── Landing (hero rewrite, Copy Brief v1 §3) ─────────────────────────────────
// The hero leads with the promise the ad made (a score out of 100), names the
// audience in the kicker, and shows the client roster as proof. The website
// field is the only thing the visitor fills in; everything else is detected
// server-side.
export const LANDING = {
  kicker: "For European industrial manufacturers",
  headline: "Your Brand, Scored out of 100.",
  subheadline:
    "Enter your website. In under 2 minutes you get your score on the five things buyers judge you on, how you sit against your closest competitors, and the first thing to fix.",
  bullets: [
    "Scored on five fronts: website, visuals, message, printed material and brand as a whole",
    "Benchmarked side by side against the competitors you get cross-shopped with",
    "One clear first fix, explained plainly, not a list of forty problems",
  ],
  submitButton: "Scan my website",
  // Sits directly under the button. The highlight is red, the note stays grey.
  reassurance: {
    highlight: "Free brand scorecard",
    note: "Done in under 2 minutes",
  },
} as const;

export const FORM_FIELDS = {
  website: { label: "Enter your company website", helper: "That's all we need. We read your site and work out the rest." },
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
  privacyNotice: "We use these details to send your report link and follow up about your results.",
} as const;

// ── Report navigation + share ────────────────────────────────────────────────
// The full report carries a sticky nav with a single action: book a call.
// Never the banned word: this is the Scorecard, never an audit.
export const REPORT_NAV = {
  book: "Book an application call",
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

// The fine-grained work narrated beneath the scan checklist. Each line maps to
// something the pipeline genuinely does, grouped under the four real stages the
// backend reports, so a line is only ever shown once its stage has started. The
// Nexubis voice: present tense, no jokes, no exclamation marks, no emoji, no em
// dashes (house rule). Kept short (~40 chars) so nothing wraps on a phone. The
// wait is real work; saying what the work is earns the score the tool hands over.
export const SCAN_STEPS: { stage: keyof typeof SCAN_STAGES; label: string }[] = [
  { stage: "reading", label: "Fetching your website" },
  { stage: "reading", label: "Mapping your site structure" },
  { stage: "reading", label: "Reading your product story" },
  { stage: "impressions", label: "Checking your message clarity" },
  { stage: "impressions", label: "Reviewing your calls to action" },
  { stage: "impressions", label: "Assessing your brand identity" },
  { stage: "competitors", label: "Finding your closest competitors" },
  { stage: "competitors", label: "Running the same checks on each" },
  { stage: "scoring", label: "Scoring you side by side" },
  { stage: "scoring", label: "Compiling your Credibility Score" },
];

// The sub-line under the active step. The detected beat lands the moment the
// server has read the site (the first personal touch and it stays put after);
// before that, and if detection returns nothing, a calm holding line per stage
// keeps the screen moving. Same house rules: short, present tense, no em dashes.
export const SCAN_SUBLINE = {
  detected: (oneLiner: string) => `So you make ${oneLiner}. Now we know what to benchmark.`,
  holding: {
    reading: "Reading page titles and headings",
    impressions: "Looking for proof and credentials",
    competitors: "Comparing you against close rivals",
    scoring: "Weighing all 25 checks",
  } as Record<keyof typeof SCAN_STAGES, string>,
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
