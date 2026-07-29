# Design Elevation

> The rebuilt homepage is structurally correct but visually flat. This document names the design language that made the **old** Nexubis site feel senior, then gives a per-section direction to bring that language into the new 12-section page. No code this session. Companion asset list: [`ASSET_BRIEF.md`](./ASSET_BRIEF.md).
>
> Reference: `reference/original-site/` is empty; the source of truth is the seven screenshots supplied with this brief (old testimonials, old "4 step plan", old solutions cards, the Sean Sanders portrait spotlight, and the three flat new sections). Existing tokens and primitives are in `app/globals.css` and `app/page.tsx`; retired-but-kept old components are in `components/` (`TestimonialsCarousel`, `WorkSection`, and the old `step-card`/`solution-card` CSS still lives in `globals.css`).

---

## Part 1 — The Nexubis design language (name it, reuse it)

Five motifs carried the old site. They are the vocabulary; every section below is built by combining them. Nothing here needs a new dependency: it is DOM, SVG, CSS, and the GSAP already in the project.

### L1 — Conversational UI (chat-bubble language)
Testimonials rendered as a chat thread: **grey incoming bubbles** (`.review-message`, `var(--light)` fill, left-aligned), **soft-red reply bubbles** (`.review-message.reply`, `#fff0f0`, right-aligned, `align-self:flex-end`), and **one card inverted to solid red** for rhythm (the hover state `.review-card:hover .review-message { background: var(--primary); color:#fff }` promoted to a permanent "featured" card). The conceit says "these are real conversations," which reads as trust.
- **Reuse from:** `components/TestimonialsCarousel.tsx` + `.review-message` / `.review-card` CSS.
- **Rule:** bubbles have asymmetric radius (tighten the corner nearest the speaker), never a full pill. Incoming left, reply right, one red beat per group.

### L2 — Embedded product vignettes (tiny fake interfaces)
Every abstract idea was made tangible with a **miniature working-looking UI** inside the card: an avatar cluster wired to a "Contact team" button; a project-plan document with floating red stage-tags; a Slack channel list with the client channel highlighted red; three Lighthouse "100" rings feeding a "Published" pill. These are the single biggest reason the old site felt senior. They are **hand-built DOM/SVG**, not icons.
- **Reuse from:** the old `.step-card-body` slot (it held these). Rebuild the raster versions as live DOM/SVG.
- **Rule:** a vignette is a *specific* fake interface, never a generic glyph. It uses real UI parts (rows, pills, rings, cursors, tags) at small scale, monochrome neutrals with exactly one red accent element that carries the meaning.

### L3 — Card rhythm (numbered, barred, ghost-numeral, tag pills)
The scannable card system: **thin red accent bar** on the title (`border-left: 4px solid var(--primary)`), an **oversized ghost numeral** bleeding off the corner (`::before` CSS counter at `calc(var(--h1)*0.7)`, faded-red fill), and **tag pills** for capability lists (`.solution-card-body li` — rounded, hairline border, hover to red border).
- **Reuse from:** `.solution-card-header`, `.step-card-header::before`, `.solution-card-body li` in `globals.css`.
- **Rule:** numerals are decoration (ghosted, oversized, clipped), not labels. Pills return wherever a capability list appears.

### L4 — Portrait / subject spotlight over the brand-mark shape
The Sean Sanders testimonial: a **cutout subject** (person, or by extension a product/booth) floated over the **Nexubis mark used as a giant background shape** in red, one corner of the mark peeking past the photo. It turns the logo into set dressing and gives depth.
- **Reuse from:** `NexubisLogo` / the footer wordmark SVG as an oversized positioned background element; the `review-media` frame.
- **Rule:** the mark is huge, cropped, low-saturation-or-solid red, and always *behind* a foreground subject with a small overlap. Never floating decoratively on its own.

### L5 — One accent, calm neutrals
A single red (`--primary #ff4141`) does all the work against `--surface #f2f2f2`, `--black #1d1c1a`, `--work-black #0f0f0f`, `--white`. Red is rationed: it marks the one thing that matters per view (the chosen item, the reply, the CTA, the highlighted channel). Depth comes from **layering neutrals and shadow**, not from more colour.
- **Rule (60-30-10):** ~60% neutral surface, ~30% ink, ~10% red. If two reds compete in one viewport, one of them is wrong.

**Motion vocabulary already in the repo (reuse, do not reinvent):** `RevealOnScroll` (`data-reveal`, y:40 + opacity, `power4.out`); `HeroAnimations` (scroll-scrubbed reel scale, infinite marquee `x` loop, word-stagger, bg-mark rotate/scale-in); `FooterAnimations` (wordmark rise on view, pointer-parallax on layered photos). Section loops should be **CSS keyframes or a single GSAP `repeat:-1` tween**, paused under `prefers-reduced-motion`.

---

## Part 2 — Per-section elevation directions

Each section names: **Layout change · Vignette/visual · Motion (entry / hover / loop) · Derives from · Asset**. Default build path is hand-built SVG/DOM (see [`ASSET_BRIEF.md`](./ASSET_BRIEF.md)).

### 1 — Hero (keep the showreel, add depth)
- **Layout change:** keep the current headline / sub / CTA / reel / logo strip. Introduce a **z-layered background**: the Nexubis mark (L4) oversized, low-opacity, bleeding off the top-right behind the headline, plus a soft radial glow anchored bottom-left that matches the Success section's dark-red radial, so the page opens and closes on the same light.
- **Vignette/visual:** brand-mark backdrop + gradient glow. The reel keeps its scroll-scrub scale.
- **Motion:** *entry* — existing word-stagger + reel rise; add the mark scaling/rotating in from 0 (reuse the `HeroAnimations` bg-mark treatment already written for `.hero-bg`). *hover* — CTA rocket (existing). *loop* — very slow (60s) drift or breathing scale on the glow only; marquee already loops.
- **Derives from:** `HeroAnimations` bg-mark logic, `NexubisLogo`, the Success `::before` radial.
- **Asset:** none new (mark is SVG in repo; glow is CSS). Showreel `reel.mp4` already lazy.

### 2 — Value stack (three tiles get real vignettes)
- **Layout change:** keep the three-tile grid, but grow each tile to hold a **vignette panel above the numeral + title** (old process-card proportions: media block over label block). Retain L3 ghost numeral and add the thin red bar to the title.
- **Vignette/visual (L2):**
  - **01 Buyers see your worth** — two side-by-side product cards; the **branded one wears a higher price tag** and gets "picked" (a cursor/hand selects it, a red ring snaps around it) while the cheaper one dims.
  - **02 More output, faster turnaround** — a **queue of deliverable cards** (brochure, webpage, 3D frame) flying off a stack, with a small **timer** ticking down beside it.
  - **03 Brand ready for every launch** — a **checklist flipping to done**, ending in the **rocket "Published" pill** motif lifted straight from old step 4.
- **Motion:** *entry* — `data-reveal` lift; vignette elements assemble (cards deal in, checklist writes on). *hover* — the vignette advances one beat (price tag pops, next card flies off, one more check ticks). *loop* — subtle, 1 cycle every ~6s, paused off-screen and under reduced-motion.
- **Derives from:** old `.step-card-body` vignette slot; the Lighthouse/Published pill from old step 4; `value-tile` current markup; `RevealOnScroll`.
- **Asset:** BUILD IN CODE (3 SVG/DOM vignettes).

### 3 — Stakes (editorial, one strong visual, break the rhythm)
- **Layout change:** keep the dark/typographic two-column band. Add, under or beside the copy, **one hero visual**: a **lineup of near-identical greyed product silhouettes** where the **cheaper one wears the "chosen" highlight** (red outline + a "picked on price" tag) — the inverse of tile 01, deliberately uncomfortable.
- **Vignette/visual (L2 + L5):** monochrome product row on the dark band; a single red highlight on the *wrong* winner. Restraint is the point.
- **Motion:** *entry* — products fade up in sequence; the red highlight snaps to the cheap one last, a beat late, so it lands. *hover* — none (this is a narrative, not a toy). *loop* — none, or a single slow pulse on the highlight.
- **Derives from:** `stakes-section` band; L2 product-card unit shared with tile 01 (build once, restyle).
- **Asset:** BUILD IN CODE (1 SVG/DOM lineup).

### 4 — The Guide (empathy pull-quote + proof-card vignettes)
- **Layout change:** promote the empathy line to a **large display pull-quote** (hero-scale type, generous measure). Turn the three authority bullets into **three compact proof cards** (L3 rhythm), each with a small vignette instead of a check bullet.
- **Vignette/visual (L2):**
  - **One team, not five suppliers** — a **five-nodes-collapsing-into-one** diagram (five scattered supplier chips animate into a single Nexubis node).
  - **Scope expands over time** — a **widening timeline/bar** where the engagement bar grows across months.
  - **We speak industrial** — a **row of hand-drawn industrial glyphs** (packaging machine, valve, bulk-solids hopper) — custom line-SVG, not an icon set.
- **Motion:** *entry* — pull-quote fades in word-group by group; cards `data-reveal` stagger. *hover* — the diagram plays its collapse / the timeline extends / glyphs cycle a subtle line-draw. *loop* — none by default (play once on reveal, replay on hover).
- **Derives from:** `guide-empathy` / `guide-bullets` (`CheckList` red) → replace checklist with proof cards; L3 card system; `avatar-stack` for optional faces.
- **Asset:** BUILD IN CODE (3 vignettes). Industrial glyphs: BUILD IN CODE custom SVG; optional upgrade to a designed glyph set (see brief).

### 5 — Solutions (THE showcase — each service gets a themed micro-animation)
- **Layout change:** keep the full-width numbered accordion (L3), but every open panel now reveals a **themed vignette on one side** (panel becomes a two-column: description + tag pills left, animated visual right). Tag pills (L3) return under each description.
- **Vignette/visual (L2), one per service:**
  - **Brand identity** — a **logo lockup snapping onto a grid** with colour swatches sliding in.
  - **Website** — a **wireframe assembling into a polished industrial product page** (boxes → shaded UI).
  - **3D & CGI** — a **machine silhouette rotating from wireframe to shaded cutaway** (stylised SVG line-to-fill; a real 3D loop is the upgrade path).
  - **Video & motion** — a **filmstrip / scrubber** with a play head moving across a product shot (UI in code; footage optional).
  - **Trade show & print** — a **booth front elevation with a brochure unfolding** in front of it.
- **Motion:** *entry* — when a row opens, its vignette plays its build once. *hover* — hovering the row title scrubs/teases the first frames. *loop* — the open row's vignette loops gently (rotate, scrub, unfold) until closed; only one row open at a time (native `<details name>` already enforces this).
- **Derives from:** `solution-row` accordion + `solution-row-body` + `text-cta` ("Learn more"); L3 tag pills from old `.solution-card-body li`.
- **Asset:** BUILD IN CODE (5 vignettes). 3D machine and the product shot have optional NEEDS-PRODUCTION upgrades.

### 6 — How it works (direct descendant of the old "4 step plan")
- **Layout change:** rebuild on the **old process-card pattern exactly** — label block (title + L3 ghost numeral) over a media block that holds the vignette. Three cards now.
- **Vignette/visual (L2), rebuilt as live DOM/SVG (the old ones were raster):**
  - **01 Book an application call** — the **avatar cluster wired to a calendar / "Contact team" button** (rebuild old step 1).
  - **02 See it before you commit** — a **live artboard/preview** where a piece of real-looking brand work materialises on a canvas.
  - **03 Our team becomes your team** — the **Slack channel list with the client channel highlighted red** (rebuild old step 3).
- **Motion:** *entry* — cards `data-reveal` stagger; each vignette assembles (avatars pop in, artboard paints, channel list expands and the client row highlights). *hover* — advance one beat (button press ripple / next brush stroke / channel switch). *loop* — off by default; play on reveal, replay on hover.
- **Derives from:** old `.step-card` + `.step-card-header::before` + `.step-card-body`; existing `plan-card` markup; reuse repo `avatar-*.png` for the cluster.
- **Asset:** BUILD IN CODE (3 vignettes). Avatar photos already in repo.

### 7 — Scorecard block (sell the tool before it exists; still behind the flag)
- **Layout change:** keep the dark gradient `scorecard-panel`, but give it a **fake product visual on one side**: a miniature **Scorecard report**.
- **Vignette/visual (L2):** a **score ring** (e.g. a red arc filling to a number), a **verdict line** ("Undersold in 3 of 5 places"), and **two screenshot thumbnails** (your site vs a competitor) as small framed UI. It should read like a real report card.
- **Motion:** *entry* — the ring animates from 0 to its value; verdict types in; thumbnails slide up. *hover* — ring nudges / thumbnail lifts. *loop* — ring re-fills every ~8s, subtle.
- **Derives from:** `scorecard-panel` + `scorecard-bullets`; the Lighthouse-ring motif from old step 4 (same ring primitive as value tile 03).
- **Asset:** BUILD IN CODE (fake report). Thumbnails are fake UI in code (or tiny placeholder frames), not stock screenshots.

### 8 — Proof (Oxipack video tile + DMN chat bubble)
- **Layout change:** two-up. Left: **Oxipack video testimonial tile** — a real player with a poster frame and **stat chips overlaid (35% / 33%)** as UI chips (L2), name appearing exactly once, never in a heading or link (preserves the QA proof rule). Right: the **DMN quote as a single elegant chat bubble** (L1) with its attribution.
- **Vignette/visual:** player + chip overlay; one incoming grey bubble (or one promoted red bubble for rhythm) for DMN.
- **Motion:** *entry* — tile `data-reveal`; chips count up (35, 33). *hover* — play-button grows, poster subtly zooms. *loop* — none (video is the motion once played).
- **Derives from:** L1 `.review-message` bubble; `proof-quote` / `proof-case` current markup; the QA proof-rule discipline stays intact (Oxipack once, in the case/stat line; DMN once, in the bubble attribution).
- **Asset:** NEEDS PRODUCTION — `oxipack-testimonial.mp4` + poster (placeholder slot until shot). Chips + bubble BUILD IN CODE. DMN body stays the flagged placeholder with its build-time warning until the real quote lands.

### 9 — Success statement (dark band earns its keep with media)
- **Layout change:** keep the dark band and centred type, but back it with **looping muted media**: a **trade-show booth loop** (client booth footage or a stylised 3D booth render), text overlaid, the existing red radial kept as a tint over the video for legibility.
- **Vignette/visual:** full-bleed muted video behind a dark scrim; the copy and single CTA sit on top.
- **Motion:** *entry* — copy fades up (existing); video crossfades in from its poster. *hover* — CTA rocket. *loop* — the booth video loops silently; **reduced-motion / no-video fallback** shows a **static poster** (a graded still of the booth) under the same scrim, so the section never looks broken without the file.
- **Derives from:** `success-section` band + `::before` radial; hero reel `<video>` handling (muted, playsInline, lazy) for the background loop.
- **Asset:** NEEDS PRODUCTION — `booth-loop.mp4` (or a 3D render sequence) **plus** `booth-loop-poster.jpg` as the mandatory fallback. Scrim + overlay BUILD IN CODE.

### 10 — Proof bar (ticker/marquee, old logo-strip motion)
- **Layout change:** convert the static three-line band into a **slow horizontal marquee** reusing the hero logo-strip motion language; the three claims scroll as a continuous track with **small inline marks** (a tiny red tick or the Nexubis mark) separating them.
- **Vignette/visual:** three claims + inline SVG marks on a slim band; duplicate the track for seamless loop (as `HeroAnimations` does for logos).
- **Motion:** *entry* — fade in. *hover* — pause the marquee (respect reduced-motion by not animating at all, showing the three claims statically). *loop* — continuous `x` translate, ~40–60s, `repeat:-1`.
- **Derives from:** `hero-logos` marquee + its clone-and-loop logic in `HeroAnimations`; current `proof-bar-item`.
- **Asset:** BUILD IN CODE (marquee + inline marks).

### 11 — FAQ (accordion + ghosted brand mark)
- **Layout change:** keep the accordion; add the **Nexubis mark ghosted large behind** the list (matching the old FAQ section's weight, which used `bg-mark.svg`), so the section has presence without new content.
- **Vignette/visual:** oversized low-opacity mark (L4, non-overlapping variant) bottom-corner behind the `faq-list`.
- **Motion:** *entry* — list `data-reveal`; chevrons already rotate on open. *hover* — row hairline warms slightly. *loop* — none.
- **Derives from:** `faq-solo` / `faq-list` + existing `.faq-bg` (`bg-mark.svg`); `NexubisLogo`.
- **Asset:** BUILD IN CODE (already have `bg-mark.svg`).

### 12 — Footer (resurrect the layered imagery + new sign-off)
- **Layout change:** keep the big wordmark and the new sign-off "Built brilliantly. Branded to match."; **resurrect the old footer's layered imagery** — the three overlapping photos with pointer-parallax that already exist (`footer-img-1/2/3.webp`, `FooterAnimations` parallax) but read faintly. Bring them forward as an intentional collage under the wordmark.
- **Vignette/visual:** layered photo collage + rising wordmark; red kept only in the wordmark.
- **Motion:** *entry* — wordmark rises on view (existing). *hover* — pointer-parallax on the photos (existing). *loop* — none.
- **Derives from:** `SiteFooter` + `FooterAnimations` (both already built); existing footer images.
- **Asset:** reuse existing footer images; **optional** NEEDS PRODUCTION swap to real client-work photography for a stronger collage.

---

## Global guardrails
- **One red per viewport** (L5). If a vignette and a CTA both want red, the CTA wins; the vignette uses red only on its single meaningful element.
- **Every vignette is a specific fake interface (L2), hand-built in SVG/DOM.** If a proposed visual could sit on any SaaS template, it is wrong — redraw it as *this* business's artifact (a brochure, a booth, a machine cutaway, a Slack channel named for the client).
- **Motion is subtle and consistent:** reuse `RevealOnScroll` for entries; loops are one slow cycle, pause off-screen and under `prefers-reduced-motion`; no new animation library (GSAP + CSS only; `lottie-web` exists if a vector loop is unavoidable, but hand-built is the default).
- **Banned, no exceptions:** generic icon libraries, stock photography, decorative blob/wave/mesh backgrounds, and any vignette that reads as a template. See [`ASSET_BRIEF.md`](./ASSET_BRIEF.md).
