# Design Directions — NEW / ADAPT Homepage Sections

> One chosen direction per section marked **NEW** or **ADAPT** in [`HOMEPAGE_MAP.md`](./HOMEPAGE_MAP.md), grounded in Mobbin references. Every direction is chosen to **reuse existing repo primitives** and add **zero new dependencies**. Reference screenshots live in `reference/mobbin/[section]/`; each is also linked to its canonical Mobbin page.
>
> Nexubis look we're steering toward: **sleek, dark-capable, generous whitespace, confident type, subtle motion.** Brand accent is red `#FF4141` (from the footer wordmark / comparison logo); primary CTA is the rocket button.

**Primitives available to bend** (from the inventory): `Eyebrow`/`SectionIcon`, `CheckList` (red/plain), rocket CTA button (`RocketIcon` + `btn btn-primary rocket-button`), `solution-card` + `solutions-grid`, `step-card` + `steps-grid` (numbered), `featured-review` block + quote-mark SVG, `work` tile/media frame, `hero-logos` marquee, `avatar-stack`, native `<details>` accordion, `cloud-cta` full-bleed block, and the per-section animation drivers (`*Animations`).

**Zero-new-dependency rule:** every direction below is buildable with the CSS/markup and primitives already in the repo. The one place a dependency *could* creep in (§7 Scorecard) is explicitly scoped to avoid it. `lottie-web` already exists in the project (used by `CompetitorComparisonLottie`) and is the only motion lib we'd reach for if a section ever needs frame animation.

---

## §2 — Value stack (ADAPT)

**Chosen reference:** [Titan Intake](https://mobbin.com/sites/sections/07b3d25c-0570-4302-8b43-5efadc2ca119) → `reference/mobbin/02-value-stack/titan-intake.webp`
**Alternates:** [Vizcom](https://mobbin.com/sites/sections/39a1103e-e38e-4ef6-b19d-172fc7440bb1) (`vizcom.webp`), [Maze](https://mobbin.com/sites/sections/dd7c3d7f-f977-4f20-97bd-4b2ca86725a9) (`maze.webp`)

**Why it fits:** Dark section, a `// VALUE` eyebrow, an oversized editorial headline on the left, a supporting line + a single pill CTA on the right, then three outlined tiles each with a small line-icon, a short outcome title, and one sentence. This is exactly the Nexubis register — confident type, generous space, restrained borders instead of colourful icon blobs (the opposite of the Sprig/Zendesk alternates, which we're avoiding). Vizcom shows the same idea with number-led tiles if we want metrics; Maze shows the glass-card-over-photo variant if we want more warmth.

**Primitives bent:** Reuse `solutions-grid` → relabel as a 3-tile outcome grid; reuse `solution-card` but strip the bulleted service `<ul>` and swap in one outcome sentence + a `SectionIcon`. Header uses `Eyebrow` (new `value` icon variant, or reuse `solutions`). Optional right-side CTA = existing rocket button. `SolutionsAnimations` stagger can be reused since the grid/card class names are preserved.

---

## §3 — Stakes (NEW)

**Chosen reference:** [Superpower](https://mobbin.com/sites/sections/9bb5f122-c825-461a-8a06-0c58fb481357) → `reference/mobbin/03-stakes/superpower-dark.webp`
**Alternates:** [SSENSE editorial band](https://mobbin.com/sites/sections/4de98a06-dbff-4e54-83c6-a301c519bba0) (`ssense-editorial.webp`), [Front "Does this sound familiar?"](https://mobbin.com/sites/sections/fdeb0c2b-6196-4d02-b036-9b4c03badce5) (`front-familiar.webp`)

**Why it fits:** *"Before Superpower, standard healthcare left our members in the dark."* — a full-bleed near-black band, one large multi-line statement naming the pain, a small avatar-stack trust cue, and a dual CTA. It agitates the problem through **typography and darkness**, not cartoon negativity — precisely the brief. It also happens to reuse two things we already own (avatar stack + two-button group), so the "NEW" section is cheap to build. SSENSE is the purely typographic fallback (headline + serif subhead + one outline button); Front is the 4-tile "does this sound familiar?" variant if we'd rather enumerate pains.

**Primitives bent:** New lightweight section, but assembled from existing parts: `Eyebrow` label, a large `h2` (hero-title treatment), the `avatar-stack` from the current Comparison section as the "you're not alone" cue, and the `btn-group` dual-CTA pattern from the Hero. Dark background reuses the site's dark section styling (as used by Work). No new primitive needed.

---

## §4 — The Guide (ADAPT)

**Chosen reference:** [KÖPPEN Founders' Note](https://mobbin.com/sites/sections/81d6349f-9811-4b17-9b2d-327dbabfa4fa) → `reference/mobbin/04-guide/koppen-founders-note.webp`
**Alternates:** [Ada "a letter from our CEO"](https://mobbin.com/sites/sections/3eb52aa7-420a-4211-ba9b-5793316410d6) (`ada-ceo-letter.webp`), [Podia trust bullets](https://mobbin.com/sites/sections/ce0a096d-40c3-4302-b580-c2cac12dbe08) (`podia-trust-bullets.webp`)

**Why it fits:** KÖPPEN pairs a short, warm **founders' note** (empathy line + signature) with a striking portrait — editorial, calm, generous margin. That's the StoryBrand "Guide": empathy first, authority second. We graft Podia's **authority-bullet row** ("More than a decade in business", "Loved by entrepreneurs", etc.) underneath the note to deliver the three proof bullets. This directly replaces the current "Nexubis vs Other agencies" framing while keeping its best pieces.

**Primitives bent:** Reuse the `Comparison` section shell but drop the negative "Other agencies" column. Empathy copy sits where the current `h2` is; keep `avatar-stack` + `NexubisLogo` as the authority signal; the three authority bullets reuse `CheckList` (red variant) — one column instead of two. If we want the portrait, it slots into a `review-media`-style frame borrowed from the Reviews section. No new dependency.

---

## §5 — Solutions, five services + micro-CTAs (ADAPT)

**Chosen reference:** [YLLW services accordion](https://mobbin.com/sites/sections/c838e6c7-2e50-40c5-8b29-f61445fd5bc0) → `reference/mobbin/05-solutions/yllw-accordion.webp`
**Alternates:** [OFF+BRAND numbered accordion](https://mobbin.com/sites/sections/dd3b3bfe-d63e-47e7-b692-64cde2a3f494) (`offbrand-accordion.webp`), [Trawelt expandable + CTA/blog tile](https://mobbin.com/sites/sections/4f9e148a-c050-401f-a9f4-0503c6627c79) (`trawelt-expandable.webp`)

**Why it fits:** YLLW is a full-width **list-accordion**: a small left descriptor, a large service title per row, a `+` affordance, an expanded row with body copy and **"Book a meeting" / "Get in touch" CTAs**. It scales gracefully from 3 → 5+ rows (the brief's requirement) far better than the current fixed 3-card grid, and its confident large-type, monochrome, dark-capable styling is the Nexubis look. OFF+BRAND shows the numbered `01–07` variant; Trawelt shows expandable rows that carry per-row bullets **and** a micro-CTA — the closest to "five services with micro-CTAs."

**Primitives bent:** Reuse the native `<details>`/`<summary>` accordion we already use for FAQ (single-open via shared `name`), restyled as full-width service rows. Each open panel carries the existing service `items` list and a micro-CTA (rocket button, small variant, or a plain text link like the Work "See More"). Expand the `solutions` data array from 3 → 5 entries (source the two extra from `PackagesServices`). Keep `SolutionsAnimations` but re-point selectors to the new row class names (flagged: markup-coupled).

---

## §6 — The Plan, three numbered steps (ADAPT)

**Chosen reference:** [FLORA (01 Ideate / 02 Iterate / 03 Scale)](https://mobbin.com/sites/sections/35657c50-f894-4f9e-9a02-7ec46c414587) → `reference/mobbin/06-plan/flora-numbered-dark.webp`
**Alternates:** [PayPal "How our process works" 01–03 + Learn more](https://mobbin.com/sites/sections/fc3046a5-a7dc-4377-87cc-d90bc9fd1848) (`paypal-process.webp`), [Wise "It's simple to start" numbered cards + CTA pill](https://mobbin.com/sites/sections/96d6e07b-b406-4314-b256-23ca5e0d76bc) (`wise-simple-start.webp`)

**Why it fits:** FLORA is a **dark three-card** row with big `01/02/03` numerals, a bold step title, a media preview, and a "Book a call" CTA above — an almost 1:1 match for our existing numbered `step-card` grid, just dark and trimmed to three. PayPal is the cleanest light version with a per-card "Learn more →" micro-CTA; Wise adds the one-liner + single pill CTA the brief asks for. Between them they cover "three numbered steps + one-liner paragraph + CTA" exactly.

**Primitives bent:** Reuse `steps-grid` + `step-card` (already renders zero-padded `01–04` numbers) — cut the array from 4 → 3 entries, add a one-liner paragraph under the heading and a single rocket CTA below the grid (Wise pattern). The `book-cal.png` card art already exists. Header keeps `Eyebrow icon="process"`. No new dependency.

---

## §7 — Lead generator / Scorecard (NEW — reserve slot)

**Chosen reference:** [Intercom "Demo Fin with your own content"](https://mobbin.com/sites/sections/e99e6ad5-cd3b-4bc3-8cda-aa49a7866813) → `reference/mobbin/07-scorecard/intercom-demo-fin.webp`
**Alternates:** [Grammarly free checker](https://mobbin.com/sites/sections/77c0c657-676e-461a-a54d-d1e69a0df29b) (`grammarly-checker.webp`), [HoneyBook checklist download](https://mobbin.com/sites/sections/4742d74f-46fc-48cf-bda1-e8268f2b1d5e) (`honeybook-checklist.webp`)

**Why it fits:** Intercom's block is the HubSpot-Website-Grader reference class done tastefully: a rounded panel, a bold two-line headline on the left, and a **single input (help-center URL) + one dark "Create demo" button** on the right, over a subtle gradient. For Nexubis this becomes "Get your free website scorecard → [your URL] → [Get my score]". It's a promo/entry point only — the graded experience lives at `/scorecard` (per the constants note in HOMEPAGE_MAP). Grammarly is the fuller inline-tool look; HoneyBook is the downloadable-asset variant if the lead magnet is a PDF rather than a tool.

**Primitives bent:** New section, but visually it's the `cloud-cta` full-bleed block restyled with a bordered panel + one text input + a rocket CTA pointing at `SCORECARD_URL`. **Zero-dep guardrail:** this session ships only the *promo slot* — a styled `<input>` + button that links/navigates to `/scorecard`. Do **not** pull in a form/validation library; if the input posts, use a native form or a small client handler. The actual grader logic is wired separately.

---

## §8 — Proof: one DMN quote + one Oxipack case tile (ADAPT)

**Chosen reference:** [Slash (gold-serif stat + quote, dark)](https://mobbin.com/sites/sections/3b81bd22-137b-44bc-bf24-10530c5337fb) → `reference/mobbin/08-proof/slash-stat-quote-dark.webp`
**Alternates:** [Giga customer spotlight (quote + case tile w/ 90% stat)](https://mobbin.com/sites/sections/3a49fbd6-7157-408d-a898-09f5d6b0b1e4) (`giga-customer-spotlight.webp`), [Apollo single quote + portrait](https://mobbin.com/sites/sections/2bed5aa3-c04b-4f2c-a61b-df0be81810d1) (`apollo-quote.webp`)

**Why it fits:** Slash pairs **one big metric** (`$50.3m`, gold serif) on the left with **one italic testimonial quote + attribution** on the right, on near-black — a single, high-conviction proof beat rather than a wall of reviews. That's the §8 brief: one DMN quote + one Oxipack stat tile, side by side. Giga is the layout to copy most literally — a case-study media tile with a `90%` stat baked onto the image, next to a quote with logo + attribution and a "Learn more" button — which maps cleanly to a DMN quote + an Oxipack tile linking to the case study.

**Primitives bent:** Reuse the `featured-review` block + quote-mark SVG for the DMN quote (swap Sean/Altify copy → DMN). For the case tile, reuse one `work` tile / `review-media` frame pointing at the Oxipack case-study URL (already in `WorkSection`), with a stat overlaid (Giga-style) using a simple absolutely-positioned label. The draggable `TestimonialsCarousel` is retired from the homepage here (relocate per HOMEPAGE_MAP). No new dependency.

---

## §9 — Success statement (NEW)

**Chosen reference:** [Superpower "Unlock your peak potential"](https://mobbin.com/sites/sections/3617832f-d369-4c64-9020-45c126b67e25) → `reference/mobbin/09-success/superpower-peak.webp`
**Alternates:** [Linear "Built for the future. Available today."](https://mobbin.com/sites/sections/3694f08d-fb8e-4a07-a140-2525716b8d42) (`linear-built-future.webp`), [Grok "Understand the Universe"](https://mobbin.com/sites/sections/6857a406-9c8b-4b57-8247-c96e015c140b) (`grok-universe.webp`)

**Why it fits:** A single vivid "imagine the after" line centered on a **dark radial-glow** field with one button — aspirational, cinematic, minimal. It's the emotional payoff before FAQ, and it rhymes with the existing `cloud-cta` "Empowering / Dreams." closer we already have (so we can retire/repurpose that block here rather than inventing a new one). Linear is the flat-dark, dual-CTA version; Grok is the moodier light-beam variant with a right-aligned supporting paragraph.

**Primitives bent:** Reuse the `cloud-cta` full-bleed block — swap the cloud image layer for a dark radial-gradient background (pure CSS), keep the oversized `h2`, and add one rocket CTA (the current block has no CTA — this fixes that). The `FooterAnimations`/scroll-reveal approach can drive a subtle fade-up. No new dependency; the gradient is CSS.

---

## §10 — Proof bar (NEW)

**Chosen reference:** [Duna (three metrics, divider rules)](https://mobbin.com/sites/sections/b4a2d7bc-628d-4514-b17f-100cca0942d5) → `reference/mobbin/10-proof-bar/duna-3metric.webp`
**Alternates:** [Ramp (slim metric row)](https://mobbin.com/sites/sections/d7b8268c-d948-4fd8-b80d-951b2e7c337e) (`ramp-metrics.webp`), [Mixpanel (big-number row)](https://mobbin.com/sites/sections/78a46ec2-49e2-45e9-a0bd-33d65bc69ff2) (`mixpanel-bignum.webp`)

**Why it fits:** Duna is a **slim, quiet band**: three claims (`10.6x` / `37%` / `4.8x`) with a small label under each, separated by thin vertical rules. It's understated proof that won't compete with §8 — exactly what a "three slim generalized proof lines" bar should be. Ramp shows the same idea edge-to-edge; Mixpanel shows the higher-contrast big-number treatment if we want the numbers louder.

**Primitives bent:** New but trivial — a flex row of three stat blocks with `1px` divider borders, reusing the site container and type scale. Could equally be built from three `CheckList`-style items if the "proof lines" are claims rather than numbers. This can double as a slim ticker later, but ships static (no marquee dependency). No new dependency.

---

## Cross-cutting notes

- **Zero new deps confirmed** for all nine directions. Everything maps to existing markup + CSS + the native `<details>` accordion + the rocket CTA. `lottie-web` is already in the tree if a future motion-heavy variant is wanted — but none of the chosen directions require it.
- **Animation coupling risk (from HOMEPAGE_MAP §4):** §2 and §5 reuse `SolutionsAnimations`, §6 sits near `WorkAnimations`/scroll reveals, §9 reuses footer/scroll reveals. Any class-name change must be mirrored in the paired `*Animations` component or the motion silently breaks.
- **CTA wiring:** §2, §3, §6, §7, §9 all introduce CTAs — point them at the proposed `lib/site-config.ts` constants (`BOOKING_URL`, `CONTACT_URL`, `SCORECARD_URL`) rather than hardcoding, so the still-undefined booking + scorecard URLs are set in one place.
- **Dark-capable palette:** chosen refs (Titan Intake, Superpower, YLLW, FLORA, Slash, Grok) lean near-black with a single warm/red accent — consistent with the Nexubis `#FF4141`. Keep accent usage to ~10% (60-30-10) per the project design principles.
