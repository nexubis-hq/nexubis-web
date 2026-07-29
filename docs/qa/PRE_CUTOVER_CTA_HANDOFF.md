# Pre-Cutover CTA Handoff

Generated: 2026-07-29T16:02:02.369Z

## Scope

Live Webflow routes inspected before DNS cutover: /, /about, /work, /work/altify, /work/circuit, /work/oxipack, /packages, /contact, /scorecard and /blog for nav/index only. Rebuild routes inspected locally after safe corrections for the same public routes. Deployed Vercel route status was checked for migrated non-blog post links. Blog/Sanity files were not edited.

## READY

- Correct internal navigation, valid external destinations, approved contact redirects, and functional controls: 431
- Booking CTAs correctly routed to /contact: 16
- Migrated Sanity post links returning 200:
- /work/altify: Altify: Empowering NexubisRead the full story here→ -> /post/altify-empowering-nexubis; Vercel status 200; correctly internal: yes
- /work/circuit: Circuit: Securing NexubisRead the full story here→ -> /post/circuit-securing-nexubis; Vercel status 200; correctly internal: yes
- /work/oxipack: Oxipack: Funding NexubisRead the full story here→ -> /post/oxipack-empowering-nexubis; Vercel status 200; correctly internal: yes
- /packages: Learn More -> /post/rethinking-the-nexubis-trial; Vercel status 200; correctly internal: yes

## FIXED

- lib/site-config.ts; Book an application callBook a Call; previous rebuild BOOKING_URL -> https://cal.com/nexubis/30min -> /contact; approved generic booking CTA rule.
- lib/site-config.ts; Book an application call; previous rebuild BOOKING_URL -> https://cal.com/nexubis/30min -> /contact; approved generic booking CTA rule.
- lib/site-config.ts; Book an application call; previous rebuild BOOKING_URL -> https://cal.com/nexubis/30min -> /contact; approved generic booking CTA rule.
- lib/site-config.ts; Book an application call; previous rebuild BOOKING_URL -> https://cal.com/nexubis/30min -> /contact; approved generic booking CTA rule.
- lib/site-config.ts; Book an application callBook a Call; previous rebuild BOOKING_URL -> https://cal.com/nexubis/30min -> /contact; approved generic booking CTA rule.
- lib/site-config.ts; Book an application callBook a Call; previous rebuild BOOKING_URL -> https://cal.com/nexubis/30min -> /contact; approved generic booking CTA rule.
- lib/site-config.ts; Book an application callBook a Call; previous rebuild BOOKING_URL -> https://cal.com/nexubis/30min -> /contact; approved generic booking CTA rule.
- lib/site-config.ts; Book an application callBook a Call; previous rebuild BOOKING_URL -> https://cal.com/nexubis/30min -> /contact; approved generic booking CTA rule.
- lib/site-config.ts; Book an application callBook a Call; previous rebuild BOOKING_URL -> https://cal.com/nexubis/30min -> /contact; approved generic booking CTA rule.
- lib/site-config.ts; Book an application callBook a Call; previous rebuild BOOKING_URL -> https://cal.com/nexubis/30min -> /contact; approved generic booking CTA rule.
- lib/site-config.ts; Book an application call; previous rebuild BOOKING_URL -> https://cal.com/nexubis/30min -> /contact; approved generic booking CTA rule.
- lib/site-config.ts; Book an application call; previous rebuild BOOKING_URL -> https://cal.com/nexubis/30min -> /contact; approved generic booking CTA rule.
- lib/site-config.ts; Book an application call; previous rebuild BOOKING_URL -> https://cal.com/nexubis/30min -> /contact; approved generic booking CTA rule.
- lib/site-config.ts; Book an application callBook a Call; previous rebuild BOOKING_URL -> https://cal.com/nexubis/30min -> /contact; approved generic booking CTA rule.
- lib/site-config.ts; Book an application callBook a Call; previous rebuild BOOKING_URL -> https://cal.com/nexubis/30min -> /contact; approved generic booking CTA rule.
- lib/site-config.ts; Book an application callBook a Call; previous rebuild BOOKING_URL -> https://cal.com/nexubis/30min -> /contact; approved generic booking CTA rule.

## PENDING_BLOG_MIGRATION

- None found in audited non-blog source links.

## PENDING_MANUAL_TEST

- Contact/Funnelr/Resend submission: not submitted in this task.
- Cal.com booking and webhook: embed/fallback present; booking not completed.
- Real Scorecard submission/unlock/report generation: not submitted in this task.
- Physical mobile-device navigation: not performed here.
- /packages: Visit sofi.com -> https://www.sofi.com/; 
- /packages: Visit sofi.com -> https://www.sofi.com/; 
- /contact: Visit sofi.com -> https://www.sofi.com/; 
- /contact: Visit sofi.com -> https://www.sofi.com/; 
- components/scorecard/report/BookCallButton.tsx: legacy-search:cal.com -> // The report's "book a call" CTA. A non-embed link that opens cal.com prefilled; components\scorecard\report\BookCallButton.tsx:3; Scorecard/report booking helper remains direct Cal.com; not changed because Scorecard logic was out of safe-fix scope

## BLOCKED

- None.

## Counts

- Total interactive/source rows audited: 436
- Internal navigation links: 194
- External links: 95
- Functional controls: 87
- Booking/appointment CTAs found: 17
- Booking CTAs changed to /contact: 16
- Same-site absolute UI links corrected: 0
- Direct Cal.com links remaining outside /contact: 0
- Webflow page links remaining: 0
- Old Vercel project links remaining: 0
- Pending Blog destinations: 0
- Broken internal links: 0
- Broken external links: 0

## Route Statuses

- live/: 200
- live/about: 200
- live/work: 200
- live/work/altify: 200
- live/work/circuit: 200
- live/work/oxipack: 200
- live/packages: 200
- live/contact: 200
- live/scorecard: 404
- live/blog: 200
- local/: 200
- local/about: 200
- local/work: 200
- local/work/altify: 200
- local/work/circuit: 200
- local/work/oxipack: 200
- local/packages: 200
- local/contact: 200
- local/scorecard: 200
- local/blog: 200
