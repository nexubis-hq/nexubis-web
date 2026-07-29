# Creative Director Critique Log

Demanding review of the elevated homepage against eight bars. Reviewed at 1280px desktop and 375px mobile via clean element-scoped captures (the dev-only Agentation overlay is excluded; it does not ship). Screenshots in `qa/cd/`. The standard was not "acceptable" but "would ship it under the Nexubis name to a design-literate client."

**Verdict up front: ships.** Two sections were sent back and reworked (Success, Value); everything else cleared on the first pass. The locked copy is untouched and the H3 QA gate still passes.

---

## Global bars

**1. Would it survive on a Mobbin board next to the references?** Yes. The Solutions showcase, the Proof video-tile + chat bubble, the Stakes product line-up, and the footer wordmark collage each carry a distinct, hand-made idea that would not read as the template in the row. The weakest-for-template-risk section was Success (a dark band with centred type is common); the booth media now differentiates it (see fix).

**2. One visual idea per section, executed well.** Held. Each section resolves to a single idea: Hero = showreel; Value = outcomes as mini-UIs; Stakes = the wrongly-picked cheap product; Guide = pull-quote + proof; Solutions = one themed vignette per service; Plan = three process vignettes; Proof = one quote + one case; Success = the booth; Proof bar = the ticker; FAQ = the accordion. No section tries to do three things.

**3. Layout diversity (no two adjacent skeletons).** Held. Down the page: asymmetric hero → 3 outcome tiles → dark editorial band + line-up → pull-quote + card stack → full-width accordion → 3 numbered cards → 2-up proof → dark centred media → marquee → accordion → footer collage. No two neighbours share a skeleton. Noted tension: the page leans on rounded cards (Value, Guide, Plan, Proof, Scorecard); it is broken up enough by the two dark bands, the accordion, the marquee and the footer that it does not read as card-fatigue, but it is the first thing I would watch if more card sections were ever added.

**4. Vignette believability + service tie.** Held. At a glance the fake UIs read as real product surfaces (browser chrome + traffic-light dots, Slack channel list with an unread badge, a scorecard with a filling ring, a video scrubber with a play-head). The five Solutions visuals each tie unmistakably to their service: logo-lockup-on-grid = Brand, wireframe→page = Website, wireframe→shaded machine = 3D/CGI, scrubber + filmstrip = Video, booth + unfolding brochure = Trade show & print.

**5. Colour rhythm.** Held. Neutrals carry every section; red does accent work only (one meaningful red element per vignette, plus the CTA). The two dark bands land at Section 3 (Stakes) and Section 9 (Success) — early and late — which bookends the page and gives it tempo. After the Success rework the two dark bands now rhyme (both use red light), which strengthened the cadence rather than fighting it.

**6. Typography hierarchy at arm's length, squinting.** Held. Every section has one unmistakable dominant: the split hero H1, the Stakes lead, the Solutions row titles, the Guide pull-quote, the Success statement. Supporting copy and vignettes sit clearly below the dominant. You can tell what matters in each section without reading it.

**7. Motion settles; reduced-motion complete.** Held. Entrances are one-shot on scroll-in; idle loops are slow and few (a drifting cursor, a filling ring, a scrubbing play-head, breathing spotlights) — nothing bounces for attention. Reduced-motion was **audited, not assumed**: every "start-hidden" `opacity:0`/`scale(0)`/dash-offset state lives inside `@media (prefers-reduced-motion: no-preference)`, so reduced-motion users get the complete, static final composition with nothing stuck hidden. The only ungated `opacity:0` rules in the stylesheet are a pre-existing Packages placeholder and the hamburger-icon open state — neither is a reveal.

**8. Locked copy + H3 QA (re-run).**
- **Copy byte-identical:** header, main, and footer all match the locked fingerprint exactly (main = 4692 chars). Vignette labels are all `aria-hidden` decorative and never enter the copy layer; the Proof stat chips wrap the existing "35%"/"33%" substrings without adding text.
- **Proof rule:** in the launch (flag-off) DOM, Oxipack = 1, 35% = 1, 33% = 1, none in a heading or link. DMN = the attribution plus the dev-only "[DMN quote to collect…]" placeholder marker (guarded by the production build-warning); in production with the real quote it is 1 — same documented state as the H3 QA.
- **Em dashes:** 0 across homepage source. (Normalised the em dashes I had left in code comments; the out-of-scope Packages FAQ page still has them in its copy, flagged for a separate pass.)
- **Build/console:** production build green, zero console errors in launch state, zero horizontal overflow at 375/768/1280.

---

## Per-section

### 1. Hero — SHIP
- **Failed:** nothing blocking. The added brand-mark backdrop and warm glow are very restrained — arguably too subtle to notice.
- **Changed:** left as-is. On reflection a loud glow would cheapen a confident hero; the subtle depth is the right call, and it seeds the warmth that pays off in the dark bands.
- **Verdict:** Ships. Confident split headline, clear dual message, showreel, logo strip. Reads premium next to the references.

### 2. Value stack — SHIP (reworked)
- **Failed:** the "More output" vignette read sparse at rest — the fly-off animation left one lonely card + timer, so the "queue of deliverables" idea did not land.
- **Changed:** widened and rotated the deliverable fan (d2/d3 offset 7cqw/13cqw with a slight rotate) so a clear stack of three cards is always visible behind the one flying off.
- **Verdict:** Ships. Three tiles now each carry a legible mini-UI (picked product + ring + cursor; fanned deliverable queue + countdown; checklist → Published pill) under a strong numbered title.

### 3. Stakes — SHIP
- **Failed:** nothing.
- **Changed:** none.
- **Verdict:** Ships, one of the strongest. The dark band + the line-up of identical greyed products with the cheap one wrongly wearing the red "Picked on price" flag is a single sharp idea, executed with restraint.

### 4. The Guide — SHIP (fixed during build)
- **Failed:** the industrial sector glyphs overflowed their tile earlier in the build.
- **Changed:** flex-sized the glyphs to sit inside the box; scoped SVG overflow to the one vignette that needs it.
- **Verdict:** Ships. Large pull-quote carries the empathy; three proof cards (five-into-one team diagram, growing scope bars, industrial glyphs) each tie to their bullet.

### 5. Solutions — SHIP
- **Failed:** nothing.
- **Changed:** none.
- **Verdict:** Ships, the showcase. Five distinct themed vignettes, each animating on its accordion row open. This is the section that would headline the Mobbin board.

### 6. How it works — SHIP
- **Failed:** nothing (ghost numeral was lightened during build so it stopped competing with the body copy).
- **Changed:** none this pass.
- **Verdict:** Ships. Direct descendant of the old process cards — avatar cluster + booking button, live artboard, Slack channel list — the fake UIs are the believable kind.

### 7. Scorecard (flag-on) — SHIP
- **Failed:** nothing.
- **Changed:** none.
- **Verdict:** Ships. The fake report (filling score ring → 62, "Undersold in 3 of 5 places", You-vs-Competitor thumbnails) sells the tool before it exists. Correctly absent in the launch state.

### 8. Proof — SHIP
- **Failed:** nothing.
- **Changed:** none.
- **Verdict:** Ships. DMN as a single elegant chat bubble (dashed = to-collect), Oxipack as a video tile with a designed poster and the stats as chips inside the case line. Names appear once, never in a heading or link.

### 9. Success statement — SHIP (reworked)
- **Failed:** the booth silhouette was too faint — it read as "a few vague lines on black," so the section did not earn its dark band; template-risk was highest here.
- **Changed:** raised the booth stroke to 15%, added a subtle panel fill, and brought the two red spotlight cones up to 13%. The band now unmistakably reads as a lit trade-show booth behind the copy, tying to "Picture the next trade show," while the text stays fully legible. (Real `booth-loop.mp4` will replace the poster later; the poster now holds on its own.)
- **Verdict:** Ships. The strongest single improvement of this pass.

### 10. Proof bar — SHIP
- **Failed:** nothing.
- **Changed:** none.
- **Verdict:** Ships. A slim marquee of the three claims with red diamond marks, borrowing the hero logo-strip motion. Quiet, on-brand, does not compete with the sections around it.

### 11. FAQ — SHIP
- **Failed:** borderline — it is the most understated section (a plain accordion, no heading because the copy locks none).
- **Changed:** none needed; the ghosted brand mark behind gives it enough weight, and understatement is correct for an FAQ this late in the page.
- **Verdict:** Ships. Clean, legible, on-brand.

### 12. Footer — SHIP
- **Failed:** nothing.
- **Changed:** none.
- **Verdict:** Ships. The layered duotone photo collage over the oversized red wordmark, with the "Built brilliantly. Branded to match." sign-off, is a confident close.

---

## Open items for final ship (not blockers, but must land before go-live)
- **`oxipack-testimonial.mp4`** (+ poster) — the Proof video tile runs on a designed poster + play button until the real testimonial is shot.
- **`booth-loop.mp4`** (+ `booth-loop-poster.jpg`) — the Success band runs on the booth poster until the loop is produced.
- Both are flagged in `ASSET_BRIEF.md`; both placeholders are designed to look intentional in the meantime, and the production build already warns if the DMN quote placeholder is still present.

**Final call: would ship it under the Nexubis name to a design-literate client.**
