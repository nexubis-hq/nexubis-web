# Asset Brief

> Assets required to elevate the homepage per [`DESIGN_ELEVATION.md`](./DESIGN_ELEVATION.md). Three lists. **BUILD IN CODE is the default and should hold the overwhelming majority** — we want hand-built SVG/DOM vignettes and CSS/GSAP motion, not stock. `NEEDS DESIGN FILE` and `NEEDS PRODUCTION` are the short lists, reserved for things code genuinely cannot make.
>
> Tokens/motion to build against: `--primary #ff4141`, `--surface #f2f2f2`, `--black #1d1c1a`, `--work-black #0f0f0f`; GSAP + ScrollTrigger and `RevealOnScroll` are already in the project; `lottie-web` exists as a last resort for vector loops. No new dependencies.

---

## BANNED (applies to every list)
- ❌ Generic icon libraries (Lucide, Font Awesse, Heroicons, Material, etc.). Section vignettes are bespoke SVG.
- ❌ Stock photography of any kind.
- ❌ Decorative blobs, wave dividers, gradient-mesh backgrounds.
- ❌ Any vignette that could belong to a generic SaaS template. Every fake UI must be *this* company's artifact (a brochure, a booth, a machine cutaway, a Slack channel named for the client, a Scorecard report).
- ❌ New runtime dependencies.

---

## 1. BUILD IN CODE (default — hand-built SVG / DOM / CSS / GSAP)

These are the bulk of the work. All are vector vignettes, fake UI, or CSS/SVG animation. Build as self-contained components with `data-reveal` entries and reduced-motion fallbacks.

**Design-language primitives (build once, reuse everywhere)**
- `ChatBubble` (L1) — grey incoming / soft-red reply / solid-red featured variants. Derive from `.review-message`.
- `GhostNumeral` + `AccentBarTitle` + `TagPill` (L3) — extract from `.solution-card-header` / `.solution-card-body li`.
- `BrandMarkBackdrop` (L4) — oversized cropped Nexubis mark as a positioned background (overlap and ghosted variants).
- `ScoreRing` / `PublishedPill` — the Lighthouse-ring + rocket "Published" motif from old step 4; reused by value tile 03 and the Scorecard.
- `Marquee` — clone-and-loop track from `HeroAnimations`, reused by the proof bar.

**Section 1 — Hero:** brand-mark backdrop (SVG) + CSS radial glow; reuse existing bg-mark motion. (No file.)

**Section 2 — Value stack (3 vignettes):**
- `vignette-worth` — two product cards, higher price tag on the branded one, cursor picks it, red ring snaps.
- `vignette-output` — deliverable-card queue (brochure / webpage / 3D frame) flying off a stack + a ticking timer.
- `vignette-launch` — checklist flipping to done → `PublishedPill` with rocket.

**Section 3 — Stakes:** `vignette-lineup` — greyed identical product silhouettes, the cheap one wearing the red "chosen / picked on price" highlight (shares the product-card unit with tile 01).

**Section 4 — Guide (3 proof-card vignettes):**
- `vignette-one-team` — five supplier chips collapsing into one Nexubis node.
- `vignette-scope` — an engagement bar widening across a month timeline.
- `vignette-industrial` — custom line-SVG industrial glyphs (packaging machine, valve, bulk-solids hopper). Hand-drawn, not an icon set. (Optional upgrade in list 2.)

**Section 5 — Solutions (5 themed micro-animations):**
- `sol-brand` — logo lockup snapping onto a grid + colour swatches.
- `sol-website` — wireframe assembling into a polished industrial product page.
- `sol-3d` — machine silhouette, wireframe → shaded cutaway (stylised SVG line-to-fill). (Real 3D loop is the upgrade in list 3.)
- `sol-video` — filmstrip / scrubber UI with a moving play head. (Real footage is the upgrade in list 3; UI ships in code with a placeholder frame.)
- `sol-tradeshow` — booth front elevation with a brochure unfolding.

**Section 6 — How it works (3 vignettes, rebuilt from old raster process cards):**
- `step-call` — avatar cluster (reuse repo `avatar-*.png`) wired to a calendar / "Contact team" button.
- `step-preview` — live artboard where a piece of real-looking brand work paints in.
- `step-slack` — Slack channel list with the client channel highlighted red.

**Section 7 — Scorecard:** `scorecard-report` — fake report: `ScoreRing` + verdict line + two framed thumbnail UIs (built in code, not screenshots).

**Section 8 — Proof:** stat chips `35%` / `33%` (count-up UI chips) + the DMN `ChatBubble`. (Video itself is in list 3.)

**Section 9 — Success:** dark scrim + red-radial overlay + text layer over the background video slot. (Video/poster in list 3.)

**Section 10 — Proof bar:** `Marquee` of the three claims + small inline red marks (SVG).

**Section 11 — FAQ:** ghosted `BrandMarkBackdrop` behind the accordion (reuse existing `bg-mark.svg`).

**Section 12 — Footer:** re-stage existing `footer-img-1/2/3.webp` as an intentional collage under the rising wordmark (reuse `FooterAnimations` parallax). No new file unless the photo swap in list 3 is taken.

---

## 2. NEEDS DESIGN FILE (illustration beyond what code should hand-draw)

Keep this list short — only take these if the in-code version underdelivers.

- **`sol-3d` machine artwork (optional upgrade):** if the SVG line-to-fill machine reads too abstract, a designer supplies a clean 2-tone **machine cutaway illustration** (wireframe + shaded states as layered SVG or a small sprite) matching the real product category (packaging machinery / bulk-solids). Deliver as optimised SVG, red-and-neutral only.
- **Industrial glyph set (optional upgrade to `vignette-industrial`):** a small **custom glyph family** (6–8 sector marks: packaging machine, valve, hopper, conveyor, leak-detector, process tank) drawn to one line-weight so they read as a set, not clip-art. SVG, single colour + red accent. Only if the hand-built glyphs lack polish.
- **"Real-looking brand work" mini-mockups for `step-preview` and `sol-website`:** if the code mock looks fake-in-a-bad-way, a designer supplies 2–3 **tiny brand-artboard mockups** (a logo, a product page, a brochure spread) as flat SVG/PNG to paint into the artboard vignette. Must depict plausible industrial-brand work, not generic dashboards.

*Everything here has a working BUILD-IN-CODE version first; design files are polish upgrades, not blockers.*

---

## 3. NEEDS PRODUCTION (video / photography that cannot be drawn)

- **`oxipack-testimonial.mp4` (+ `oxipack-testimonial-poster.jpg`)** — Section 8. Real Oxipack video testimonial. Ships as a **named placeholder slot** now (poster-only tile, play affordance disabled) until the footage exists. 16:9, muted-capable, H.264 + poster. Oxipack named once, in the case/stat line, never in a heading or link.
- **`booth-loop.mp4` (+ mandatory `booth-loop-poster.jpg`)** — Section 9. A **looping trade-show booth** background: either client booth footage **or** a stylised 3D booth render sequence exported to muted MP4 (short, seamless loop, no audio, dark-graded to sit under the scrim). The **poster is required**, not optional: it is the reduced-motion / no-file fallback and must look intentional on its own (graded booth still under the same dark-red scrim). Until delivered, Section 9 runs on the poster/gradient only.
- **`sol-video` product footage (optional upgrade)** — Section 5. A short **product shot loop** to play inside the filmstrip/scrubber UI. The UI ships in code with a placeholder frame; real footage is a later enhancement, not a blocker.
- **Client-work photography (optional)** — Section 12 footer collage, and optionally Section 4/8. Real photographs of shipped Nexubis work (brand, booth, print) to replace the existing faint footer images with a stronger, on-brand collage. Only if art direction wants photography over the current layered images.

---

## Sequencing note
Build order that unblocks the most value first: (1) the shared primitives, (2) Sections 5 and 6 vignettes (the showcase and the old-site descendant carry the "senior" feeling), (3) Sections 2/3/4/7/10, (4) drop in the production video slots (8, 9) as placeholders now and swap the real files when they land. No section is blocked on list 2 or 3: every one has a BUILD-IN-CODE default that ships first.
