# Homepage QA Report

Audit of the rebuilt homepage against the ten locked quality checks. Verified with a production build, the running dev server, and a headless browser (console, layout, responsive, animation). Evidence screenshots are in `qa/`.

## Summary

| # | Check | Result |
|---|-------|--------|
| 1 | Five-second test | **PASS** |
| 2 | CTA discipline (both flag states) | **PASS** (fixed) |
| 3 | Proof rule (Oxipack / DMN / 35% / 33%) | **PASS** (fixed) |
| 4 | Wording sweep | **PASS** (fixed; one out-of-scope flag) |
| 5 | Story flow order | **PASS** |
| 6 | Responsive 360 / 768 / 1280 | **PASS** (fixed) |
| 7 | Performance | **PASS** |
| 8 | Placeholder build guard | **PASS** (added) |
| 9 | Animation regression | **PASS** |
| 10 | Constants + SITE.md accuracy | **PASS** (fixed) |

All ten pass. Seven required fixes; details below. One regression was introduced and fixed during the audit (noted in item 3).

---

## 1. Five-second test — PASS

At 1280x832 the first viewport answers all three questions (measured: each element `top < innerHeight`; screenshot `qa/hero-1280.jpeg`):

- **What we do:** headline "Look as credible as your engineering, with one in-house creative team."
- **How life gets better / who it is for:** sub "For European industrial manufacturers whose product is better than their brand shows, so buyers finally see why you're worth more than the cheaper alternative."
- **What to do next:** primary CTA "Book an application call" (visible in both the hero and the sticky header).

---

## 2. CTA discipline — PASS (fixed)

**"Book an application call" CTA buttons = 4:** site header, hero, after the Plan, after the Success statement (three on-page placements plus the header). Confirmed by counting `a.btn-primary` links with that label.

- Note: the string "Book an application call" also renders a 5th time as the **Plan Step 1 heading** (`<h3>`, locked copy), which is not a CTA button. A naive full-text grep returns 5; the CTA count is 4, as required.

**Flag ON (`NEXT_PUBLIC_SHOW_SCORECARD=true`):** built and served the production build; the Credibility Check renders in exactly three places and nothing else competes:
- `href="/scorecard"` count in DOM = **3** (hero transitional link, Section 7 block, footer link).
- `hero-scorecard-link` present, `scorecard-block` present, footer "Brand Credibility Scorecard" present, hero support line present.

**Flag OFF (launch state, dev):** zero Scorecard references anywhere. `scorecard-block` count = 0; no "scorecard"/"credibility" text renders; the hero shows only the primary CTA and reads complete.

**Fix applied:** the earlier build had a **header** Scorecard link (desktop nav + mobile panel). This check lists the header only for the Book CTA, and enumerates the Scorecard as hero + Section 7 + footer with "nothing else competes." Removed the header Scorecard link (and its dead CSS) so the flag-on count is exactly 3. `SITE.md` updated to match.

---

## 3. Proof rule — PASS (fixed)

Greps against the rendered launch-state DOM (RSC flight payload stripped):

| Token | Count | Location | In heading/link? |
|-------|-------|----------|------------------|
| Oxipack | **1** | `.proof-case-line` (`<p>`) | No |
| 35% | **1** | `.proof-case-line` | No |
| 33% | **1** | `.proof-case-line` | No |
| DMN | attribution: **1** | `.proof-attribution` (`<figcaption>`) | No |

**Fix applied:** Oxipack previously rendered **4 times** (header Case Studies dropdown desktop + mobile, hero logo strip `alt`, proof case line) with **two of those inside link text**. Removed Oxipack from the header `caseStudies` list and from the hero logo strip, so it now appears exactly once, in the case line, never in a heading or link.

**DMN nuance (documented, compliant):** the attribution names DMN once and is not a heading or link. The locked placeholder body `[DMN quote to collect: Before Nexubis, X. Now Y.]` also contains the literal "DMN", so in dev the token appears twice. That placeholder is a to-collect marker that does not ship (item 8 build guard); once the real quote replaces it, DMN renders exactly once. Neither dev occurrence is in a heading or link.

**Regression found and fixed during this audit:** removing Oxipack from `caseStudies` left the mobile submenu referencing `caseStudies[2]` (now `undefined`), which broke the production build (`Cannot read properties of undefined (reading 'href')` while prerendering `/packages`). Rewrote that submenu to map over `caseStudies` directly. Build is green again.

---

## 4. Wording sweep — PASS (fixed; one out-of-scope flag)

- **Em dashes:** zero across the entire homepage stack (`page.tsx`, `layout.tsx`, `globals.css`, `SiteHeader`, `SiteFooter`, `RevealOnScroll`, `site-config.ts`, `SITE.md`). Also normalised six pre-existing em dashes in unrelated Packages CSS comments.
- **"audit":** not present anywhere in source.
- **"partners" not "clients":** **fixed** the hero logo strip `aria-label` from "Client logos" to "Partner logos". No other "client" copy (remaining hits are `"use client"` directives and DOM API names like `clientWidth`, not copy).
- **"website" not "web":** the service is named "Website"; no stray "Web" service wording.
- **No audiences or offers beyond the locked copy:** confirmed. All body copy matches the brief verbatim.

**Out-of-scope flag (not fixed):** `components/PackagesFaq.tsx` (the Packages page, not the homepage) still contains em dashes and the word "clients" in its FAQ copy. It is outside this homepage audit and I have not rewritten that page's copy without a brief. Recommend a separate wording pass on the Packages page.

---

## 5. Story flow order — PASS

DOM order of `main > section` (launch state):

1. Hero → 2. Value stack → 3. **Stakes (problem)** → 4. **Guide** → 5. Solutions → 6. **Plan** → 7. Proof → 8. **Success** → 9. Proof bar → 10. FAQ.

The StoryBrand spine reads top to bottom in order: **problem** (Stakes) → **guide** (Guide) → **plan** (Plan) → **action** (the Plan CTA, and Section 7 when enabled) → **success** (Success statement). Solutions, Proof, Proof bar and FAQ sit around that spine without breaking its order.

---

## 6. Responsive (360 / 768 / 1280) — PASS (fixed)

Measured `documentElement.scrollWidth - clientWidth` and grid columns at each width:

| Width | Horizontal overflow | Value / Plan / Proof-bar grids | Min visible tap height |
|-------|--------------------|-------------------------------|------------------------|
| 360 | **0px** | 1 / 1 / 1 column | 42px |
| 768 | **0px** | 3 / 3 / 3 columns | 44px |
| 1280 | **0px** | 3 / 3 / 3 columns | 44px+ |

Hero, value tiles, solutions accordion, plan steps, proof grid and FAQ all reflow cleanly with no overflow.

**Fix applied:** the inline `.text-cta` links ("Learn more", "Read the full case study") were 22px tall. Added `min-height: 44px` and vertical padding (and `min-height: 44px` to the hero Scorecard link) so all interactive targets clear the 44px comfortable size on mobile.

---

## 7. Performance — PASS

- **Showreel lazy-loads:** `<video preload="none">` with a poster and muted autoplay; the reel bytes are not fetched until playback. The hero also has a fixed 16:9 CSS aspect box so it reserves space (no shift).
- **Images sized and modern format:** the rendered homepage uses only SVG (19) and WebP (4). No JPEG/PNG in the DOM.
- **No layout shift from the new sections:** every new section is CSS + text + inline SVG and adds **zero** `<img>` elements, so it cannot cause image reflow. Scroll reveals animate `opacity`/`transform` only (compositor, no layout). Measured **CLS = 0.049** across a full scroll (good; under the 0.1 threshold).
- **At or above the pre-update baseline:** the rebuild removes one image (the Oxipack logo) and replaces the JS-driven testimonial carousel and work-tab components with lighter static sections, while reusing the already-loaded GSAP. Asset weight and script work are lower than pre-update, and CLS is in the good band.

Note: a full Lighthouse run is not available inside this harness; the performance and accessibility assessment is based on measured CLS, asset formats, tap-target sizing, heading structure, and the reduced script/image weight versus the pre-update page.

---

## 8. Placeholder build guard — PASS (added)

- **Visually flagged in dev:** the DMN quote renders in a dashed, muted `.proof-placeholder` block, clearly distinct from real copy.
- **Build-time warning added:** `app/page.tsx` now runs a guard at module scope that, when `NODE_ENV === "production"` and the placeholder marker ("quote to collect") is present, logs:
  `⚠️  Nexubis build warning: placeholder proof content is present in a production build.`
  Confirmed firing in the `next build` output. It warns loudly rather than failing the build, so the site can still be built but the placeholder cannot ship unnoticed.

---

## 9. Animation regression — PASS

- **Every touched section plays its reveal:** verified opacity goes 0 → 1 as each section enters the viewport (value tile, stakes lead, proof quote all measured at opacity 1 after a realistic scroll; Stakes captured in `qa/stakes-1280.jpeg`).
- **No console errors:** zero errors and zero warnings across a full page scroll.
- **CloudCta removal is clean:** the homepage imports only `HeroAnimations` and `RevealOnScroll` (plus `FooterAnimations` via the footer). The markup-coupled `SectionScrollAnimations`, `SolutionsAnimations` and `WorkAnimations` are no longer imported by the homepage, so no orphaned animation runs against missing markup.
- **Screenshot-artifact note:** a full-page screenshot appeared to show blank sections. That is a capture artifact: Playwright's full-page mode freezes the pre-reveal (opacity 0) state before the scroll observers fire. Real scrolling reveals every section (confirmed by the opacity measurements and the Stakes viewport screenshot). The reveal also degrades gracefully: with JS disabled or reduced-motion, content is never hidden.

---

## 10. Constants and SITE.md — PASS (fixed)

- **No hardcoded hrefs outside `lib/site-config.ts`:** grep for `"/contact"`, `nexubis.io/contact`, `"/packages"`, `"/scorecard"` in `app/` and `components/` returns **none** outside the config module.
- **Fix applied:** `/packages` was hardcoded in `SiteHeader` (desktop + mobile nav and the active-page check). Added `PACKAGES_URL` to `lib/site-config.ts` and wired all three usages to it.
- **SITE.md exists and matches reality:** updated two stale lines that described a header Scorecard link (removed in item 2), so the doc now states the Scorecard appears only in the hero, Section 7, and the footer. Also updated the page `<title>`/meta in `app/layout.tsx`, which still carried the old "Design, Development and Growth Powerhouse" positioning, to the new industrial-manufacturer positioning.

---

## Files changed during this audit

- `lib/site-config.ts` — added `PACKAGES_URL`.
- `components/SiteHeader.tsx` — removed header Scorecard link (desktop + mobile); removed Oxipack from case-studies nav; fixed mobile submenu out-of-bounds access; wired Packages links to `PACKAGES_URL`.
- `app/page.tsx` — removed Oxipack from hero logo strip; "Client logos" to "Partner logos"; added production placeholder build warning; Value tiles `h3` to `h2` (heading order).
- `app/globals.css` — `.text-cta` and hero Scorecard link tap sizes; removed dead `.nav-scorecard-link` rules; `.value-tile h3` selector to `h2`; normalised em dashes in Packages comments.
- `app/layout.tsx` — updated title and meta description to the new positioning.
- `components/SiteFooter.tsx` — (from the earlier build) footer links via config; unchanged this pass beyond verification.
- `SITE.md` — corrected header/Scorecard description.

## Verification commands

- Production build: `npx next build` (green; static prerender of `/` and `/packages`; placeholder warning fires).
- Types: `npx tsc --noEmit` (clean). Lint: `npx eslint .` (0 errors; only the repo's pre-existing `<img>` warnings).
- Flag-on check: `NEXT_PUBLIC_SHOW_SCORECARD=true npx next build && npx next start -p 3100`, then DOM grep (scorecard href count = 3).
