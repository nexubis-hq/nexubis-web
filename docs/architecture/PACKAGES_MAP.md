# PACKAGES_MAP.md — recon for /packages rebuild (feat/packages-v2)

Findings from Step 1 recon, plus the plan for Steps 2–11.

## Current page wiring

`app/packages/page.tsx` renders, in order:
`SiteHeader` → `PackagesPricing` + `PackagesServices` → `PackagesComparison` → `PackagesTrial` → `PackagesFaq` → `PackagesCloudCta` → `SiteFooter`.

Components involved:

- **`components/PackagesPricing.tsx`** — client. Holds the billing cycle (`useState<Cycle>`, default `annually`) and renders: heading, the **global Monthly/Quarterly/Annually toggle** (`.billing-selector`), a 3-card grid (**Momentum, Scale, + a Flex "Custom" card**), and the trusted-logo strip. Also exports `PackagesServices` (the services tag cloud). Prices are **hardcoded strings in USD** (`"$2 600"` etc.) with hardcoded saving strings.
- **`components/PackagesComparison.tsx`** — the "All the Expert Skill, None of the Overhead" Lottie section. Untouched by this brief.
- **`components/PackagesTrial.tsx`** — "Still on the Fence?" trial band. Not in scope; the brief's reassurance band replaces the pricing-adjacent messaging but this trial section is separate and left as-is.
- **`components/PackagesFaq.tsx`** — 12-question `<details>/<summary>` accordion, hardcoded copy, **no JSON-LD**. Four answers now contradict the new page (Flex tier, cheaper custom plan, "1 business day", "early-stage startups"). Full replacement required.
- **`components/PackagesCloudCta.tsx`** — the "Empowering Dreams." cloud closer. Untouched.

## Pricing data source

None — prices live as **string literals in JSX** inside `PackagesPricing.tsx` and `PackagesFaq.tsx`. This is exactly what Step 2 forbids. New single source of truth: `lib/packages.ts`.

## Billing toggle state

Held in `PackagesPricing.tsx` via `useState<Cycle>("annually")`, driving `.billing-selector` (a `role="radiogroup"`). Per Step 3/Step 9 this **page-level toggle is removed entirely** from this page. The only cycle control that remains is the **Partner-card-level** selector (Step 4). The `.billing-selector` markup + CSS is dropped from the new page; no other page uses it, so the styles become dead (left in globals.css, harmless, or removed — see plan).

## Card grid + breakpoints

`.packages-cards` grid in `app/globals.css` (~line 250). Cards are `.package-card` with `.package-red` (Scale, highlighted) / `.package-grey` / `.package-flex` variants. The new grid reuses the same 3-column desktop / stacked-mobile behaviour and drops the 4th (Flex) card.

## Primitives inventory

- **Card** — `.package-card` (border, radius `.5rem`, padding). Reused.
- **Button** — `.btn` / `.btn-primary` / `.btn-secondary` (globals.css ~line 165). Reused for every CTA. Scale = `.btn-primary`, Momentum + Partner = `.btn-secondary`.
- **Pill/badge** — `.popular-pill` (Scale's "Popular"). Reused, relabelled **"Most chosen"**.
- **Segmented control** — **none exists**. The old `.billing-selector` is the nearest pattern; the new Partner selector is a small purpose-built segmented control styled to match.
- **Tooltip / popover** — **none exists anywhere in the repo.**
- **Animation coupling** — the only Lottie/animation on this page is `CompetitorComparisonLottie` inside `PackagesComparison`, which the rebuild does not touch. No animation targets the pricing-card markup, so restructuring the cards is safe.

## Tokens (from `app/globals.css :root`)

Available: `--primary #ff4141`, `--black #1d1c1a`, `--body #5a5a5a`, `--mid #888680`, `--light #eeeeec`, `--white`, `--surface #f2f2f2`, `--button-radius`, `--button-y/x`, spacing `--s-2..--s-8`, type `--h1..--h4`, `--p-lg`, `--p-xl`. Fonts: **Helvetica Now Display** (headings, hardcoded in the base `h1–h4` + `.btn` rules) and **Inter** (body).

**Two tokens the brief needs that do NOT exist:**

1. **"technical steel" muted blue-grey** (Step 6, the InfoTip glyph colour). Added as `--steel: #5a6672` (contrast 5.8:1 on white → WCAG AA pass for the small glyph). Documented in PACKAGES_V2.md.
2. **"mono token with tabular lining figures"** for the price numeral (Step 3). **The repo has no monospace font and no font token** — the "industrial token brief" it references is not present in this codebase. Rules 5 + 6 (use existing tokens, look native) govern: the price numeral reuses the existing display-face treatment (the `h2` element already inherits Helvetica Now Display) and adds `font-variant-numeric: tabular-nums` so digits keep a stable width when the Partner price animates. No new font stack is introduced. Documented as a deliberate deviation.

## Dependency added

`@radix-ui/react-popover` (Step 6 sanctions it; repo had zero radix). Used in **controlled** mode: I own the open state (hover-delay / focus / touch / one-at-a-time), Radix supplies only portal + collision-aware placement + dismissal, per "do not hand-roll positioning maths." Justified in PACKAGES_V2.md.

## Plan (Steps 2–11)

- `lib/packages.ts` — types, tier data, `priceFor` / `savingFor` / `upfrontFor` / `gapToScale`, plus a build-time assertion that every tier has exactly 6 features each with a non-empty tip.
- `lib/packages-faq.ts` — `{ q, a }[]` (12), prices interpolated from `lib/packages.ts`; consumed by both the accordion and the JSON-LD.
- `components/ui/InfoTip.tsx` — the single tooltip primitive (Radix Popover, controlled).
- `components/packages/` — `CurrencyControl`, `PricingCards`, `PartnerCycleBlock`, `ReassuranceBand`, `PackagesFaqV2` (accordion + JSON-LD).
- `app/packages/page.tsx` — rewired: header block + currency control + cards + reassurance band + closing CTA + new FAQ. Old `PackagesPricing` billing toggle and Flex card gone.
- CSS additions scoped under a `pkg-` prefix in globals.css; `--steel` token added to `:root`.
- Gates in Step 10 run before "done"; outputs in PACKAGES_V2.md + SITE.md.