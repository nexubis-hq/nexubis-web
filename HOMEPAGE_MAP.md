# Homepage Restructure Map

> Inventory of the current Nexubis homepage and its mapping onto the locked 12-section StoryBrand wireframe. No code changed — this is the planning artifact for the rebuild.

The homepage is a single file, `app/page.tsx` (742 lines). Every section is a local function component inside that file, with data arrays declared at the top and a handful of shared imported components (header, footer, work, testimonials, and per-section animation drivers). There is **no `SITE.md`** and **no constants module** — see Constraints.

---

## 1. Current homepage inventory

Render order (from `Home()` in `app/page.tsx:203`):
`SiteHeader → Hero → Solutions → Work → Reviews → Comparison → Steps → Faq → CloudCta → SiteFooter`

| # | Section | Where it lives | What it renders | Reusable primitives |
|---|---------|----------------|-----------------|---------------------|
| — | **SiteHeader** | `components/SiteHeader.tsx` | Sticky nav: logo, "Case Studies" dropdown (Circuit/Oxipack/Altify), Packages + Dreamlab links, rocket "Get Started" CTA, mobile panel | Nav link + icon set, dropdown, rocket CTA button (`RocketIcon`, exported) |
| — | **Hero** | `app/page.tsx:222` | Word-split H1, sub-paragraph, two CTAs (Get Started + Our Packages), autoplay showreel video with mute toggle, client logo marquee, bg image | Rocket CTA, `btn-group`, `hero-reel-video`, `hero-logos-track` marquee (10 logos) |
| — | **Solutions** | `app/page.tsx:466` | Eyebrow + H2, 3-up card grid; each card = title, paragraph, bulleted service list | `solution-card`, `solutions-grid`, `Eyebrow`/`SectionIcon` |
| — | **Work** | `app/page.tsx:506` + `components/WorkSection.tsx` | Eyebrow + H2, tabbed featured-work switcher (Circuit/Oxipack/Altify/Sataya) with preview media + tags + "See More" | `work-tabs` (client tab/preview pattern), media frame, tag pills |
| — | **Reviews** | `app/page.tsx:523` + `components/TestimonialsCarousel.tsx` | Large featured quote (Sean Sanders / Altify) with quote-mark SVG + media, then eyebrow + H2, then draggable testimonial carousel (4 reviews) with pagination bullets | `featured-review` block, `review-card`, `TestimonialsCarousel` (pointer-drag carousel), quote-mark SVG |
| — | **Comparison** | `app/page.tsx:572` | Avatar stack + H2, single card comparing **Nexubis vs Other agencies** as two check-lists | `comparison-card`, `CheckList` (red/plain variant), `avatar-stack`, `NexubisLogo` |
| — | **Steps** | `app/page.tsx:642` | Eyebrow + H2, 4-up numbered process cards (01–04), each with title + image | `step-card`, `steps-grid`, numbered header |
| — | **Faq** | `app/page.tsx:684` | Intro (H2 + paragraph) + accordion of **10** questions using native `<details name="homepage-faq">` | native `<details>` accordion + chevron SVG |
| — | **CloudCta** | `app/page.tsx:728` | Full-bleed "Empowering / Dreams." headline over animated clouds. No actual link. | `cloud-cta` block, cloud layer |
| — | **SiteFooter** | `components/SiteFooter.tsx` | Big wordmark, logo, link menu (Work / Contact / Packages), social (Instagram / LinkedIn / Threads), © 2025 line, footer media strip | `footer-menus`, wordmark SVG, `NexubisLogo` |

### Shared primitives worth reusing
- **`Eyebrow` + `SectionIcon`** (`app/page.tsx:340`) — pill label with icon variants (`solutions | work | testimonials | process`), light/dark. Reuse for every new section header.
- **`CheckList`** (`app/page.tsx:632`) — bulleted check list, red or plain. Reuse for authority bullets and proof lines.
- **Rocket CTA button** — `RocketIcon` exported from `SiteHeader.tsx`; the `btn btn-primary … rocket-button` pattern is the site's primary CTA. Reuse everywhere a primary CTA is needed.
- **Data-array pattern** — `solutions`, `steps`, `reviews`, `faqs`, `logos` are plain arrays at the top of `page.tsx`. Expanding/reordering content = edit the array.

### Animation drivers (fragile — see Constraints)
Each visual section is paired with a client component that reads the DOM and animates it:
`HeroAnimations`, `SolutionsAnimations`, `WorkAnimations`, `SectionScrollAnimations` (used by Reviews), `FooterAnimations`, plus `CompetitorComparisonLottie` (used on the Packages page, **not** the homepage). These target the existing class names/markup — structural changes to a section can silently break its animation.

---

## 2. Mapping to the new 12-section wireframe

Legend: **REUSE AS-IS** (copy swap only) · **ADAPT** (structural change) · **NEW**

| New § | Section | Verdict | Source & what changes |
|-------|---------|---------|-----------------------|
| **1** | Hero — headline, sub, two CTAs, showreel + logo strip | **REUSE AS-IS** | Current `Hero` already has all of this (word-split H1, sub, 2 CTAs, `hero-reel-video`, 10-logo marquee). Copy/headline swap only. Keep `HeroAnimations`. |
| **2** | Value stack — three outcome tiles | **ADAPT** | Adapt the `Solutions` 3-card grid (`solutions-grid`) into 3 outcome tiles (outcome-framed copy, not service lists). Structural reuse of the card layout; content reframed. |
| **3** | Stakes — short narrative | **NEW** | No equivalent exists. Build a new lightweight narrative section (Eyebrow + H2 + paragraph). Reuse `Eyebrow`. |
| **4** | The Guide — empathy line + three authority bullets | **ADAPT** | Adapt the `Comparison` section. Keep `avatar-stack` + `NexubisLogo` + `CheckList` for the three authority bullets; drop the "vs Other agencies" two-column framing in favor of empathy line + authority. |
| **5** | Solutions — five services + micro-CTAs | **ADAPT** | Expand the `Solutions` array from **3 → 5** entries and add a micro-CTA per card. Source content for the 5 from the existing 3 plus the `services` list in `PackagesPricing.tsx:89` (`PackagesServices`). Reuse `solution-card` + `SolutionsAnimations`. |
| **6** | The Plan — three numbered steps + one-liner + CTA | **ADAPT** | Adapt `Steps` from **4 → 3** cards (`step-card` numbered pattern), add a one-liner paragraph + a primary CTA. Drop one of the four current steps. |
| **7** | Lead generator (Scorecard) | **NEW (reserve slot)** | Placeholder section only; content/embed wired separately. Reserve a `/scorecard` CTA slot (see Constraints). |
| **8** | Proof — one DMN quote + one Oxipack case tile | **ADAPT** | Adapt from `Reviews` + `WorkSection`. Use the `featured-review` block for the single DMN quote (**new copy** — no DMN quote exists today; current featured quote is Sean/Altify) and one `work` tile for the Oxipack case (Oxipack already exists in `WorkSection` and logos). |
| **9** | Success statement — vivid paragraph + CTA | **NEW** | No equivalent. New single-paragraph section + primary CTA. (The `CloudCta` "Empowering / Dreams." block is the closest vibe and could be repurposed, but it is not a success/CTA statement — recommend NEW and keep `CloudCta` as the closer if desired, or retire it.) |
| **10** | Proof bar — three slim proof lines | **NEW (or adapt)** | Recommend NEW: a slim 3-item row built from `CheckList` or the `hero-logos`/avatar primitives. Could also distill from testimonial data. |
| **11** | FAQ — seven questions | **REUSE AS-IS** | Reuse the `Faq` native `<details>` accordion. Current array has **10** questions — trim to 7 (copy edit only, no structural change). |
| **12** | Footer — link + sign-off changes | **REUSE AS-IS** | Reuse `SiteFooter`. Update link list and © sign-off (see Retire/Constraints). |

---

## 3. Retired / relocated sections

| Current section | Fate | Notes |
|-----------------|------|-------|
| **Reviews — draggable testimonial carousel** (`TestimonialsCarousel`, 4 reviews) | **RETIRE from homepage** | Section 8 replaces the testimonial wall with a single DMN quote + one case tile. **Relocate, don't delete:** the carousel + `reviews` data is a good fit for a future `/about` or a dedicated testimonials page. Keep the component. |
| **Reviews — featured quote (Sean/Altify)** | **PARTIAL RETIRE** | The `featured-review` *shell* is reused for Section 8, but the Sean/Altify content is replaced by the DMN quote. Keep the Sean quote content elsewhere (testimonials page). |
| **Comparison "vs Other agencies" copy** | **RETIRE the two-column framing** | The Nexubis-vs-others list copy is dropped; the layout primitives (`CheckList`, `avatar-stack`) survive into Section 4. The "Other agencies" negative column is not used in the StoryBrand Guide framing. |
| **Steps — 4th process card** | **RETIRE one card** | Section 6 is 3 steps. One of the four current steps (`book-cal`, plan, partnership, launch) is dropped/merged. |
| **Faq — 3 surplus questions** | **RETIRE 3 of 10** | Trim the 10-question array to the 7 highest-value questions. Pure copy decision. |
| **CloudCta ("Empowering / Dreams.")** | **DECISION NEEDED** | Not in the 12-section spec. Either retire, or keep as a decorative closer between §11 and §12. Recommend retire unless the visual is wanted — it carries no CTA. |
| **Work — tabbed switcher (Circuit/Sataya/Altify)** | **MOSTLY RETIRE** | Section 8 uses only the Oxipack tile. The full 4-tab `WorkSection` should **relocate** to a `/work` page rather than be deleted (it references live case-study URLs). |

Nothing needs deletion outright — every retired block has a natural home on `/work`, `/about`, or a testimonials page. Preserve components; change what the homepage *imports/renders*.

---

## 4. Constraints & fragile spots

### CTAs and nav links are hardcoded and scattered — **centralize before rebuild**
There is **no constants module today.** The same URLs are duplicated across files:

- **Primary "Get Started" CTA → `https://www.nexubis.io/contact`** appears in `SiteHeader.tsx:123`, `app/page.tsx:250` (Hero), and `SiteFooter.tsx:7`.
- **Secondary "Our Packages" → `/packages`** in Hero (`app/page.tsx:259`), header, and footer.
- **Case-study URLs** (`nexubis.io/work/*`) live in `SiteHeader.tsx:7` and `WorkSection.tsx`.
- **Client/logo URLs** inline in `app/page.tsx:12`.
- Footer links (`Work /#work`, `Contact`, social) in `SiteFooter.tsx:5`.

**Recommendation:** create one `lib/site-config.ts` (or `lib/constants.ts`) exporting:
```
BOOKING_URL      // NEW — a real booking link (see below)
CONTACT_URL      // = https://www.nexubis.io/contact (current primary CTA)
PACKAGES_URL     // = /packages
SCORECARD_URL    // NEW — = /scorecard (Section 7)
CASE_STUDIES     // Circuit / Oxipack / Altify / Sataya hrefs
SOCIAL_LINKS     // Instagram / LinkedIn / Threads
```
Then point Hero, header, footer, and the new §6/§7/§9 CTAs at these constants so the booking and scorecard URLs are set in exactly one place.

### Booking URL does not exist yet
There is **no calendar/booking link anywhere** in the code. The first process card image is named `book-cal.png` (`app/page.tsx:91`) but it is a static image with no href. Multiple sections in the new wireframe (§6 The Plan, §9 Success, potentially §1) call for a booking CTA. Decide the real booking destination (e.g. a Cal.com/Calendly URL, or reuse `CONTACT_URL`) and set it as `BOOKING_URL` in the constants module.

### /scorecard URL does not exist yet
No `/scorecard` route or link exists. Section 7 only reserves the slot; wire `SCORECARD_URL = "/scorecard"` in constants now so the CTA is ready, and build the route/embed separately.

### Animation drivers are markup-coupled (fragile)
`HeroAnimations`, `SolutionsAnimations`, `WorkAnimations`, `SectionScrollAnimations`, `FooterAnimations` animate by selecting existing class names in the DOM. Restructuring a section (§2 value stack, §4 guide, §5 five services, §6 three steps) can **silently break its animation** if class names/counts change. When adapting a section, check its paired animation component and update selectors/counts to match. The testimonial carousel and `CompetitorComparisonLottie` also do runtime measurement/`matchMedia` work that assumes specific class names.

### Content-count assumptions baked into components
- `TestimonialsCarousel` computes group counts from `reviews.length` and viewport — if reused with a different count it recalculates, but the homepage no longer needs it (moving to §8 single quote).
- Native FAQ `<details name="homepage-faq">` uses the shared `name` for single-open accordion behavior — keep the `name` attribute when trimming to 7.
- The `logos` marquee expects the 10 SVGs in `public/assets/images/`; a separate 14-logo set lives in `PackagesPricing.tsx`.

### Other notes
- Webflow-migration copy still says "Webflow development" in several places (`WorkSection`, FAQ, solutions) — expected for a Webflow-migrated site; revisit copy during the StoryBrand rewrite.
- Footer © line is hardcoded `© 2025` (`SiteFooter.tsx:96`) — update as part of the §12 sign-off change.
- No `SITE.md` exists — should be created as part of this restructure per project docs rules.
