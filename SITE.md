# Nexubis

> Look as credible as your engineering, with one in-house creative team.

Nexubis is the in-house creative team for European industrial manufacturers whose product is better than their brand shows. This site sells that positioning: brand, website, 3D, video, and print on one flat monthly retainer.

## Brand Identity

- Personality: confident, industrial, premium, plain-spoken. Sells on outcomes, not adjectives.
- Colours (existing tokens, unchanged): red accent `#FF4141`, near-black `#1d1c1a`, body grey `#5a5a5a`, off-white surfaces `#f2f2f2`, deep "work black" `#0f0f0f` for the dramatic dark sections.
- Fonts (existing, unchanged): Helvetica Now Display for headings and confident lines, Inter for body.
- Motion: subtle. A hero intro sequence plus a gentle "lift and fade" as each section scrolls in. Everything respects reduced-motion.

## Pages

- **Homepage** (`/`) - The locked 12-section story. See below.
- **Packages** (`/packages`) - Pricing and packages page (unchanged this round; it shares the header and footer).
- **Scorecard** (`/scorecard`) - The Industrial Brand Credibility Scorecard: the instant lead-generator tool. A visitor enters their website, what they make, and 2 or 3 competitors; the tool checks all of them (crawl, first-impression screenshots, loading speed, web presence), scores 25 checks with Nexubis AI, and shows a preview on the spot. Entering name, work email and role unlocks the full report.
- **Shared reports** (`/scorecard/r/...`) - Each unlocked report lives at its own private link for 180 days: score, competitor benchmark, five category pages, the first place to fix, the Oxipack proof, and the booking step. Not indexed by search engines. A personal video can be attached from the admin and appears at the top.
- **Scorecard admin** (`/scorecard/admin`) - Password-protected team area: the leads table (with a "Loom candidates" view for the weekly video selection), notes, and per-report tools (attach the video, regenerate, copy the link). Not indexed.

## Homepage sections (in order)

1. **Hero** - Headline, sub-headline, the "Book an application call" button, the showreel video, and the client logo strip.
2. **Value stack** - Three outcome tiles: Buyers see your worth / More output, faster turnaround / Brand ready for every launch.
3. **Stakes** - A short dark narrative about what a weak brand costs a great product.
4. **The Guide** - An empathy line, our authority line, and three proof bullets. No client names or stats here.
5. **Solutions** ("What we take off your plate") - Five services in an accordion, each with a "Learn more" link: Brand identity, Website, 3D & CGI, Video & motion, Trade show & print.
6. **The Plan** ("How it works") - Three numbered steps, a summary paragraph, and the booking button.
7. **Brand Credibility Scorecard** - The lead-generator block. Hidden by default; see "The Scorecard switch" below.
8. **Proof** - One customer quote (DMN, currently a clearly marked placeholder to collect) and one case tile (Oxipack) linking to the case study.
9. **Success statement** - A vivid "picture the next trade show" paragraph and the booking button.
10. **Proof bar** - A slim band with three short promises.
11. **FAQ** - Seven questions in an accordion.
12. **Footer** - Links, social, and the sign-off "Built brilliantly. Branded to match."

## Components

- **Header** (`components/SiteHeader.tsx`) - Logo, navigation, and the "Book an application call" button. The Scorecard is not linked from the header; when it is switched on, the Credibility Check appears in exactly three places: the hero transitional link, Section 7, and the footer.
- **Footer** (`components/SiteFooter.tsx`) - Wordmark, link menu (About, What we do, Work / Case studies, Scorecard when on, Contact, Privacy & terms), social (LinkedIn, Instagram), and the sign-off line.
- **RevealOnScroll** (`components/RevealOnScroll.tsx`) - Drives the gentle scroll-in motion for the new sections.
- **HeroAnimations / FooterAnimations** - Existing motion for the hero and footer, kept as-is.

## The one place to change links: `lib/site-config.ts`

Every button and important link on the homepage reads from this one file, so you never hunt through the code:

- `BOOKING_URL` - Where "Book an application call" goes. **Interim: it points at the contact page.** When the real booking link exists, change it here once and every button updates.
- `SCORECARD_URL` - The Scorecard tool (`/scorecard`). The tool ships later; the address is reserved now.
- `CONTACT_URL` - The contact page.
- `OXIPACK_CASE_URL` - The Oxipack case study link.
- `FOOTER_LINKS` / `SOCIAL_LINKS` - The footer menus.

## The Scorecard switch (a feature flag)

Everything about the Brand Credibility Scorecard is hidden until you turn it on. When on, it appears in exactly three places: Section 7, the hero's "Check your brand's credibility" link and support line, and the footer link. It is deliberately not in the header, so it never competes with the "Book an application call" button.

- **To turn it on:** set an environment variable `NEXT_PUBLIC_SHOW_SCORECARD` to `true`, then rebuild.
- **When off (the default):** the whole Section 7 block is completely absent (no empty gap), and the hero shows only the "Book an application call" button, laid out to look intentional that way.

## How to customise

- **Change any CTA destination:** edit `lib/site-config.ts`.
- **Change wording:** the homepage copy lives near the top of `app/page.tsx` as clearly named blocks (hero, value tiles, stakes, guide, solutions, plan, scorecard, proof, success, proof bar, FAQ).
- **Change colours or fonts:** edit the tokens at the top of `app/globals.css`. The whole site follows them.
- **Turn the Scorecard on or off:** the `NEXT_PUBLIC_SHOW_SCORECARD` switch above.

## The Scorecard tool (how it works, in plain words)

- **Where things live:** the engine is in `lib/scorecard/` (crawling, screenshots, scoring, emails, storage), the screens in `components/scorecard/`, and the pages under `app/scorecard/`. All the words a visitor sees are in one file, `lib/scorecard/copy.ts`.
- **What a run costs:** roughly 20 to 30 US cents in API fees per fresh check (measured, logged per run). Repeat checks of the same company are free thanks to caching.
- **Leads:** every unlock saves a lead (visible in the admin), pings the team by email, and sends the contact to Funnelr by webhook so the email sequence starts. If Funnelr is not connected yet, a built-in first email can be switched on with `SCORECARD_SEND_EMAIL1=true`.
- **House rules are enforced by tests:** no em dashes anywhere, the word "audit" never appears for visitors (it is always the Scorecard or the Credibility Check), Oxipack is named exactly once per report, and the AI only states what it actually saw.
- **Test drive without spending:** `SCORECARD_MOCK=1` makes the whole tool run on canned data (currently ON in local development). In production this must be OFF.
- **Before launch:** work through `LAUNCH_CHECKLIST.md` (new database, email domain, bot-check keys, Funnelr webhook, privacy wording).

## Recent Changes

- 2026-07-08: A round of homepage polish. The hero's "Check your brand's credibility" link is now a proper outline button sitting beside the red one, and the "Not ready to book?" line is smaller fine print. The big headline now flows as one sentence instead of breaking oddly, and every headline on the homepage uses Title Case ("How It Works", "Buyers See Your Worth", and so on). The three outcome tiles now sit on a bold Nexubis-red section background. The big "We know how it feels..." statement greys out and inks in word by word as you scroll, and the Nexubis logo above "We've become the in-house creative team..." was removed. The two busier guide icons (team hub, growth chart) were simplified and flattened to match the conveyor icon's clean style.
- 2026-07-07: Two more visual upgrades in the new soft "glass" style. (1) The three small icon tiles in the "one team / long-term partnerships / we speak industrial" cards are now little glass dioramas: a glowing red team hub with five channel bubbles gently bobbing around it, a rising bar chart whose red growth arrow redraws itself on a loop, and a hopper that pours a stream of red granules onto a conveyor. (2) The dark "A great product with a weak brand pays for it every day" section now has glassy product cards with a sweeping light reflection, a "Your product" glass pill on the first card, and a loop where a cursor glides in and picks the cheaper lookalike, making its red glow bloom. Also fixed a small bug where the "Picked on price" pill had stopped appearing. All motion pauses under reduced-motion settings.
- 2026-07-07: Redesigned the three "How it works" step illustrations (Book an application call / See it before you commit / Our team becomes your team) in the same soft, dimensional style as the outcome tiles. Step 1 now shows the team joined to a red calendar by a flowing dashed arrow, with a cursor that glides in and presses the Book a call button on a loop. Step 2 is a browser with a before/after slider that sweeps back and forth, revealing the branded design over the gray wireframe. Step 3 is a channel list (website, brand, 3D, video, print) where a red highlight walks down the rows one by one, pulsing each checkmark as it passes. All loops pause for visitors who prefer reduced motion. No wording changed.
- 2026-07-07: Redesigned the three outcome-tile illustrations near the top of the homepage (Buyers see your worth / More output, faster turnaround / Brand ready for every launch) to a softer, more dimensional style: floating white cards with deep soft shadows on a subtle blush-tinted panel, matching new reference art. Each one now plays a smooth repeating animation: a cursor glides over and picks the branded product card, a brief card flies across into a growing stack of deliverables while a gauge sweeps, and a checklist ticks itself off before a "Published" button pops in with a light shine. The animations pause automatically for visitors who prefer reduced motion. The words on the tiles did not change.
- 2026-07-07: Built the complete Brand Credibility Scorecard tool (the Section 7 lead generator). New: the `/scorecard` check flow, shareable reports, the team admin, lead capture with Funnelr webhook and team notifications, and the full AI scoring engine behind it. Three real manufacturer sites were scored end to end to tune the output. The homepage entry points now resolve to the working tool when the Scorecard switch is on.
- 2026-07-07: Elevated every homepage section with hand-built illustrations ("vignettes") in the old process-card style — small, realistic fake interfaces drawn in code (no stock images, no icon libraries). The words on the page did not change at all; only the visuals did. New vignettes live in `components/vignettes/`. Each one is decorative and animates gently as you scroll (and holds still if you prefer reduced motion). Two spots wait on real footage and show a tidy placeholder until it arrives: the Oxipack video testimonial (`oxipack-testimonial.mp4`) and the trade-show booth loop behind the closing statement (`booth-loop.mp4`).
- 2026-07-06: Rebuilt the homepage to the locked 12-section wireframe (new industrial-manufacturer positioning and copy). Added `lib/site-config.ts` so every CTA reads from one place, with `BOOKING_URL` pointing at contact for now. Added the Scorecard feature switch. Updated the header CTA and the footer links, social, and sign-off. Retired the old testimonial wall, the old process cards, the old solutions grid, and the "Empowering Dreams" closer from the homepage. The relocated components (`WorkSection`, `TestimonialsCarousel`) remain in the repo for reuse on other pages.
