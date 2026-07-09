# Nexubis — Handoff for the Credibility Scorecard / Audit build

> Context handoff from the homepage-redesign session. The next build is the **Credibility Scorecard** tool. Its entry points and route are already wired on the homepage, but the tool itself does not exist yet — that is this build.

## Where things stand
- Homepage redesign is **done, reviewed, pushed** on branch `homepage-redesign` → **PR #1** (https://github.com/nexubis-hq/nexubis-web/pull/1), preview at `https://nexubis-web-git-homepage-redesign-nexubis.vercel.app`. `main` is untouched (`de45b77`); not merged yet.

## Project / environment
- **Next.js 16 (App Router, Turbopack), React 19, TypeScript.** GSAP + lottie-web present. Deployed on **Vercel** (repo `nexubis-hq/nexubis-web`). **Vercel AI Gateway + AI SDK v6** are available — prefer `"provider/model"` strings through the gateway; do not hardcode provider packages.
- **Ship Studio environment:** dev server is always running on **:3000** — never run `npm run dev`. Verify with `npx tsc --noEmit` and `npx next build`.
- **Design tokens only** (in `app/globals.css :root`), no new colours/fonts. Primary red `#ff4141`; near-black `#1d1c1a`; surfaces `#f2f2f2`; dark `#0f0f0f`. Fonts: **Helvetica Now Display** (headings), **Inter** (body).
- **All URLs/CTAs live in `lib/site-config.ts`** — never hardcode.

## What's ALREADY wired for the Scorecard (do not rebuild)
- `lib/site-config.ts`: `SCORECARD_URL = "/scorecard"` (route reserved; page does not exist yet, so it currently 404s), and `SHOW_SCORECARD = process.env.NEXT_PUBLIC_SHOW_SCORECARD === "true"` (feature flag, **off by default**).
- **Homepage entry points, all flag-gated, all pointing at `SCORECARD_URL`:** hero transitional link ("Check your brand's credibility"), the **Section 7 promo block** (`ScorecardBlock` in `app/page.tsx` — headline + sub + 3 bullets + CTA + a fake "report" vignette: score ring → 62, "Undersold in 3 of 5 places", You/Competitor thumbnails), and a footer link.
- **When the tool is ready, set `NEXT_PUBLIC_SHOW_SCORECARD=true`** and all four entry points appear.

## The Scorecard product spec (from the locked homepage copy — treat as the brief)
Run the **Industrial Brand Credibility Scorecard, powered by Nexubis AI**. Enter your website and see, on the spot:
- Your **Credibility Score across the five places buyers look** *(the 5 dimensions still need defining in this build)*
- A **side-by-side benchmark against two or three competitors you choose**
- **The first place to fix, explained in a short personal video**
- "**You see your result on the spot. Unlock the full report by email, no waiting.**"
- Positioning: free, no obligations; lead-gen for a business that takes ~2 new partners/month.

So the build = an **AI-powered tool at `app/scorecard/page.tsx`**: input a website URL (+ 2–3 competitor URLs) → analyse → score across 5 credibility dimensions → benchmark → "first place to fix" → instant result, full report gated by email capture.

## Conventions & gotchas to carry forward
- **Turbopack CSS HMR is flaky** on `globals.css` edits — edit near the **top of the file** (e.g., a throwaway `:root` var) to force a recompile; the served static CSS chunk lags but the **browser (HMR) is the source of truth** — verify computed styles in the browser, not by curling the chunk.
- **Screenshots:** use **element-scoped** Playwright shots — a dev-only "Agentation" overlay pollutes full-viewport shots (it renders only when `NODE_ENV === "development"`; it does not ship).
- **Placeholder discipline:** pending assets render as designed placeholders with a **dev-only label** (`process.env.NODE_ENV !== "production"`), plus a **build-time `console.warn`** if placeholder content is present in a prod build (see the DMN pattern in `app/page.tsx`). Reuse this for anything unfinished (e.g. the "short personal video").
- **Motion:** every animation gated inside `@media (prefers-reduced-motion: no-preference)` with a static baseline = final state. Reveal system is `components/RevealOnScroll.tsx` (`data-reveal`, adds `.is-inview`).
- **Git:** branch `homepage-redesign` (PR #1); commit author configured as `Hannes Oosthuizen <hello@nexubis.io>`; `Nexubis-cmd` has push access. Keep Scorecard work on its own branch (off `main`, or off this one) and PR it separately.

## Suggested first moves
1. Define the **5 credibility dimensions** ("the five places buyers look") + the scoring rubric — this is the product's spine.
2. Decide the **AI architecture**: Vercel AI Gateway model, how you fetch/analyse a URL, competitor benchmarking, and the "personal video" (likely a placeholder/templated video first).
3. Decide **email capture / full-report delivery** (storage + email provider via Vercel Marketplace).
4. Build `app/scorecard/page.tsx`, then flip `NEXT_PUBLIC_SHOW_SCORECARD=true`.

## Key files
`lib/site-config.ts` · `app/page.tsx` (Section 7 `ScorecardBlock`) · `components/RevealOnScroll.tsx` · docs: `SITE.md`, `HOMEPAGE_MAP.md`, `DESIGN_ELEVATION.md`, `ASSET_BRIEF.md`, `QA_REPORT.md`, `CRITIQUE_LOG.md`.
