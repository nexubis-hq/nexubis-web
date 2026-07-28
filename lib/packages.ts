// Single source of truth for the /packages page. Nothing about pricing or
// features may live in JSX: cards, the Partner cycle block and the FAQ all read
// from here, so one edit here changes every figure on the page and the two can
// never drift.
//
// EUR is the base currency; USD is the higher converted figure (~EUR x 1.10, set to
// clean round numbers). Partner's base is divisible by 12 so every prepayment figure
// lands on a round number: yearly is 5,000 a month, a 12,000 saving, 60,000 up front.
//
// Rounding rule: per-month prices round for display, but period totals (up front,
// saving) are computed from the EXACT per-month value and rounded once at the end.

export type BillingCycle = "monthly" | "quarterly" | "yearly";
export type Currency = "EUR" | "USD";
export type Feature = { label: string; tip: string };

export type Tier = {
  id: "momentum" | "scale" | "partner";
  name: string;
  descriptor: string; // the quoted pain line
  unlockLine: string; // bold accent line above the features
  highlighted: boolean; // Scale only
  highlightLabel?: string; // "Most chosen"
  discountsAvailable: boolean; // Partner only
  monthly: Record<Currency, number>;
  features: Feature[]; // exactly 6
};

// Discount factors, applied only where discountsAvailable is true.
const QUARTERLY_FACTOR = 0.9; // 10% off
const YEARLY_FACTOR = 10 / 12; // two months free

export const TIERS: Tier[] = [
  {
    id: "momentum",
    name: "Momentum",
    descriptor: "Our website is outdated and it's nobody's job to fix it.",
    unlockLine: "Your website, fully handled:",
    highlighted: false,
    discountsAvailable: false,
    monthly: { EUR: 3500, USD: 3900 },
    features: [
      {
        label: "Dedicated 2-person team",
        tip: "Your own developer and designer, the same two people every month. You learn their names, they learn your product, and nothing goes into an anonymous ticket queue.",
      },
      {
        label: "Website build & maintenance",
        tip: "Full Webflow development, plus every update, new page and bug fix after launch. Your site never goes stale in the gap between projects.",
      },
      {
        label: "SEO built in & monitored",
        tip: "On-page SEO handled as we build rather than bolted on afterwards, then tracked every month so you can see what is moving. No separate SEO retainer to buy.",
      },
      {
        label: "30 design requests a month",
        tip: "Any website or brand design task counts as one request, with two rounds of feedback on every deliverable. Most partners never come close to using all thirty.",
      },
      {
        label: "Social, email & document design",
        tip: "Social templates, email headers, letterheads, proposals and internal documents. The everyday assets that usually end up being made badly in PowerPoint.",
      },
      {
        label: "72-hour turnaround, 3 meetings/mo",
        tip: "Most requests come back inside three working days. You get your own Slack channel, daily Loom updates, weekly progress notes and a monthly report.",
      },
    ],
  },
  {
    id: "scale",
    name: "Scale",
    descriptor: "Everything we put out needs to look like one company.",
    unlockLine: "Everything in Momentum, plus:",
    highlighted: false,
    discountsAvailable: false,
    monthly: { EUR: 4200, USD: 4600 },
    features: [
      {
        label: "Dedicated 3-person team",
        tip: "A third specialist joins your team, usually design or motion, so more work can run in parallel instead of queueing. Four meetings a month instead of three.",
      },
      {
        label: "Unlimited design requests",
        tip: "No monthly cap and nobody counting. Submit as much as your team can review.",
      },
      {
        label: "48-hour turnaround, queue priority",
        tip: "Most requests come back inside two working days, and your tasks are picked up ahead of Momentum work. Three feedback rounds per deliverable instead of two.",
      },
      {
        label: "The full design suite",
        tip: "Print, presentations, pitch decks, brochures, spec sheets and sales collateral. Everything that lives beyond the screen.",
      },
      {
        label: "3D & video, up to 5 a month",
        tip: "Product renders and short-form video for social and sales, up to five pieces a month. Custom website animations and motion graphics are included on top of that.",
      },
      {
        label: "Monthly strategy call with our CEO",
        tip: "A standing call about where the brand goes next, not a status update on this month's queue.",
      },
    ],
  },
  {
    id: "partner",
    name: "Partner",
    descriptor: "We need to look completely different, and be actively marketing.",
    unlockLine: "Everything in Scale, plus:",
    highlighted: true,
    highlightLabel: "Most chosen",
    discountsAvailable: true,
    monthly: { EUR: 6000, USD: 6600 },
    features: [
      {
        label: "All hands on deck",
        tip: "The whole team is available to you rather than a fixed headcount, and meetings happen as often as the work needs them. This is the level where we operate as your creative department.",
      },
      {
        label: "Dedicated creative director",
        tip: "One named senior person owns your brand end to end and is your single point of contact. They hold the standard across everything that goes out.",
      },
      {
        label: "Brand refresh or full CI, yearly",
        tip: "A complete identity rebuild or corporate identity guide, included every twelve months. On its own this is a project most agencies quote separately.",
      },
      {
        label: "Campaign design & execution",
        tip: "Social, email and digital campaigns designed, built and shipped. This is the difference between looking ready to go to market and actually being in it.",
      },
      {
        label: "Unlimited 3D & scripted video",
        tip: "No cap on product renders or video work. Includes a fully scripted product or brand film produced for you.",
      },
      {
        label: "Trade-show and print collateral",
        tip: "Stand graphics, banners, brochures and everything the show floor needs. We also review the whole brand every quarter to catch drift before your buyers notice it.",
      },
    ],
  },
];

// Exact (unrounded) per-month figure for a tier at a given cycle. Non-discount
// tiers return their monthly rate for every cycle rather than throwing.
function exactPerMonth(tier: Tier, currency: Currency, cycle: BillingCycle): number {
  const base = tier.monthly[currency];
  if (!tier.discountsAvailable) return base;
  if (cycle === "quarterly") return base * QUARTERLY_FACTOR;
  if (cycle === "yearly") return base * YEARLY_FACTOR;
  return base;
}

// Number of months paid up front for a discounted cycle.
function monthsInPeriod(cycle: BillingCycle): number {
  if (cycle === "quarterly") return 3;
  if (cycle === "yearly") return 12;
  return 1;
}

// Per-month figure, rounded to the nearest whole currency unit for display.
export function priceFor(tier: Tier, currency: Currency, cycle: BillingCycle): number {
  return Math.round(exactPerMonth(tier, currency, cycle));
}

// Saving for the whole billing period (per quarter, per year) versus paying the
// monthly rate for the same span. Zero for tiers without prepayment. Computed
// from the exact per-month value, rounded once.
export function savingFor(tier: Tier, currency: Currency, cycle: BillingCycle): number {
  if (!tier.discountsAvailable || cycle === "monthly") return 0;
  const months = monthsInPeriod(cycle);
  const full = tier.monthly[currency] * months;
  const discounted = exactPerMonth(tier, currency, cycle) * months;
  return Math.round(full - discounted);
}

// Total charged up front for a discounted cycle. Null for monthly and for tiers
// without prepayment. Computed from the exact per-month value so yearly lands on
// a clean ten-months total.
export function upfrontFor(tier: Tier, currency: Currency, cycle: BillingCycle): number | null {
  if (!tier.discountsAvailable || cycle === "monthly") return null;
  return Math.round(exactPerMonth(tier, currency, cycle) * monthsInPeriod(cycle));
}

// Per-month difference between Partner at the given cycle and Scale's monthly
// rate. The page's strongest argument: what the top tier costs over the middle.
export function gapToScale(currency: Currency, cycle: BillingCycle): number {
  const partner = TIERS.find((t) => t.id === "partner")!;
  const scale = TIERS.find((t) => t.id === "scale")!;
  return priceFor(partner, currency, cycle) - scale.monthly[currency];
}

// Display helpers. The numeral is formatted with a thousands separator; the
// currency symbol is kept separate so the card can render it in the body face
// while the numeral uses tabular figures.
export function currencySymbol(currency: Currency): string {
  return currency === "USD" ? "$" : "€";
}

export function formatNumber(amount: number): string {
  // Thousands grouped with a space to match the site's house style ("5 900", never
  // "5,900"), and with a non-breaking space so a price never wraps mid-number.
  // Deterministic, no locale dependence (SSR-safe).
  return amount.toLocaleString("en-US").replace(/,/g, " ");
}

export function formatMoney(currency: Currency, amount: number): string {
  return `${currencySymbol(currency)}${formatNumber(amount)}`;
}

export function tierById(id: Tier["id"]): Tier {
  return TIERS.find((t) => t.id === id)!;
}

export function isCurrency(value: string | null | undefined): value is Currency {
  return value === "EUR" || value === "USD";
}

export function currencyFromParam(value: string | null | undefined): Currency {
  // An absent or invalid param falls back to EUR without throwing.
  if (!value) return "EUR";
  const upper = value.toUpperCase();
  return isCurrency(upper) ? upper : "EUR";
}

// Build-time guard: every tier must carry exactly six features and no feature may
// ship without a tip. Runs at module load so a future edit that drops a tip or a
// row fails the build instead of shipping a bare row (Step 10, gate 6).
for (const tier of TIERS) {
  if (tier.features.length !== 6) {
    throw new Error(`packages: tier "${tier.id}" has ${tier.features.length} features, expected exactly 6`);
  }
  for (const feature of tier.features) {
    if (!feature.label.trim() || !feature.tip.trim()) {
      throw new Error(`packages: tier "${tier.id}" has a feature with an empty label or tip`);
    }
  }
}