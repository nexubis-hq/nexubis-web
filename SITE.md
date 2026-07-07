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

## Recent Changes

- 2026-07-07: Elevated every homepage section with hand-built illustrations ("vignettes") in the old process-card style — small, realistic fake interfaces drawn in code (no stock images, no icon libraries). The words on the page did not change at all; only the visuals did. New vignettes live in `components/vignettes/`. Each one is decorative and animates gently as you scroll (and holds still if you prefer reduced motion). Two spots wait on real footage and show a tidy placeholder until it arrives: the Oxipack video testimonial (`oxipack-testimonial.mp4`) and the trade-show booth loop behind the closing statement (`booth-loop.mp4`).
- 2026-07-06: Rebuilt the homepage to the locked 12-section wireframe (new industrial-manufacturer positioning and copy). Added `lib/site-config.ts` so every CTA reads from one place, with `BOOKING_URL` pointing at contact for now. Added the Scorecard feature switch. Updated the header CTA and the footer links, social, and sign-off. Retired the old testimonial wall, the old process cards, the old solutions grid, and the "Empowering Dreams" closer from the homepage. The relocated components (`WorkSection`, `TestimonialsCarousel`) remain in the repo for reuse on other pages.
