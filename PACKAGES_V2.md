# Packages page rebuild (feat/packages-v2)

The `/packages` page, rebuilt on the existing Webflow-parity look. All pricing,
features and FAQ copy now come from two data files; nothing about money lives in
JSX. The visual language (cards, fonts, colours, controls, FAQ) reuses the existing
`.package-*` / `.billing-selector` / `.packages-faq-*` styles, so it matches the
live site; only genuinely new pieces got new CSS.

## What changed

- **Three tiers: Momentum, Scale, Partner.** The Flex "Custom" card and the old
  global-discount logic are gone. Partner is the highlighted "Most chosen" card
  (red border, primary CTA, animated Lottie flame).
- **Two controls.** Currency (EUR/USD) on the left; billing cycle
  (Monthly/Quarterly/Annually, the original segmented control with its "10% Off" /
  "2 Months Free" badges) on the right. **Annually is pre-selected.**
- **Only Partner discounts.** Choosing Quarterly/Annually drops Partner's per-month
  price and shows the saving in the green pill the site has always used. Momentum
  and Scale are flat rates and show the grey "No Discount Applied" pill.
- **Per-feature InfoTips**, a per-card "Book an application call" CTA, and a fully
  rewritten 13-question FAQ with `FAQPage` JSON-LD. (An earlier reassurance band was
  removed as redundant: "one invoice, one team" is already in the header subtitle,
  "two months' notice" is FAQ Q7, and "not sure which fits?" is now the closing FAQ.)

## Pricing model — how to change a price

Everything is in **`lib/packages.ts`** (`TIERS`). EUR is the base; USD is the higher
converted figure (~EUR x 1.10, set to clean round numbers). To change a price, edit
the one `monthly: { EUR, USD }` line for that tier. Discounts are derived:

- `QUARTERLY_FACTOR = 0.9` (10% off), `YEARLY_FACTOR = 10/12` (two months free).
- Partner's base is **divisible by 12** so every prepayment figure is round: yearly
  €5,000/mo, save €12,000/yr, €60,000 up front (USD: $5,500 / $13,200 / $66,000).
- Helpers: `priceFor`, `savingFor`, `upfrontFor`, `gapToScale`, plus `formatMoney`
  (groups thousands with a space: "€6 000", never "€6,000").
- A module-load assertion throws if any tier does not have exactly 6 features each
  with a non-empty tip, so a future edit can't ship a bare row.

## Features — how to change one

Edit the tier's `features[]` in `lib/packages.ts`. Each is `{ label, tip }`: the
label is the short one-line row, the tip is the hover/focus detail. Both the check
row and its InfoTip come from the same entry.

## FAQ — how to change an answer

Edit **`lib/packages-faq.ts`** (`getPackagesFaq(currency)` → `{ q, a }[]`). The same
array feeds both the visible accordion and the `FAQPage` JSON-LD, so they can never
drift, and A1's prices are computed from `lib/packages.ts`. All answers are in the
server-rendered HTML (native `<details>`), so crawlers see them without a click.

## InfoTip API — `components/ui/InfoTip.tsx`

`<InfoTip label={string} tip={string} />`. Built on **Radix Tooltip**: opens on
hover (120ms) and on keyboard focus, portalled and collision-aware so it never
clips or runs off a 375px viewport, and Radix wires the trigger's accessible
description to the panel. The glyph is a muted-steel circled "i" (token `--steel`),
not accent red, so eighteen of them read as quiet marks.

## Cycle behaviour and why only Partner discounts

Momentum and Scale are priced at what a dedicated 2- and 3-person team costs to run,
so they have no prepayment option. Partner is the level where prepaying makes sense,
so it is the only tier whose price reacts to the cycle. The billing toggle badges
advertise the available rates; the "No Discount Applied" pill on the other two cards
makes clear who they apply to.

## Commercial terms on the page

Only these appear, and no others may be added without sign-off: the **two months'
notice** line (FAQ Q7) and the **paid-up-front** line (Partner
card). No refund policy, minimum initial period, cancellation fee or auto-renewal.

## Dependency added

**`@radix-ui/react-tooltip`** — the reliable, accessible hover+focus tooltip with
portal and collision handling; hand-rolling the positioning was explicitly out of
scope. (An earlier `@radix-ui/react-popover` attempt was removed: Popover is a click
pattern and would not open reliably from hover.)

## Token added

`--steel: #5a6672` in `app/globals.css :root` — the muted blue-grey for the InfoTip
glyph. Clears WCAG AA (5.8:1 on white) at the glyph's size.

## AWAITING CLIENT CONFIRMATION

Two FAQ answers assert claims a human should sign off:

- **Q11** asserts Webflow only (the old FAQ also offered Framer, Headless Shopify
  and Figma Sites).
- **Q12** asserts Nexubis retains case-study rights.

(The earlier "unused requests roll over" claim was removed: the monthly request
count is gone entirely, replaced by the work-streams model, so there is no cap and
nothing to roll over.)

## Deviations from the original brief (all per live client direction)

- The brief specified **no global billing toggle** (Partner-only, in-card). The
  client asked to bring back the global Monthly/Quarterly/Annually toggle (OG style)
  with the green / "No Discount Applied" pills, so that was built instead.
- The brief's "01 / PACKAGES" eyebrow was dropped and the Google-rating badge kept,
  per the client, to match the live header.
- Feature labels were shortened for scannability (detail moved into the tooltips).
- The Partner "Scale comparison" sentence was trimmed out of the card as too long;
  the up-front total remains. It can be reinstated if wanted.
- Prices use a space thousands-separator and Partner moved €5,900 → €6,000 so all
  discount figures are round.

## Follow-up (not done here)

- The homepage FAQ contains a "How does pricing work?" question that overlaps this
  page. Two URLs carrying pricing `FAQPage` schema splits relevance; the homepage
  pricing question should be dropped or reworded to link here. **Not edited.**
</content>
