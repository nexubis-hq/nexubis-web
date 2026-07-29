# Pre-Blog Production QA Handoff

Audit date: 2026-07-29  
Production URL: `https://nexubis.vercel.app`  
Canonical Vercel project: `hello-91244177s-projects/nexubis`

## Ready Now

- Completed non-Blog production routes return expected statuses: `/`, `/about`, `/work`, `/work/altify`, `/work/circuit`, `/work/oxipack`, `/packages`, `/contact`, `/scorecard`, `/scorecard/admin`.
- Unknown `/work/[slug]` returns `404`.
- Header, footer, Work cards, Case Study related links, Homepage CTAs, Package CTAs, Contact tabs and Scorecard entry controls were audited on production.
- Link audit total: 252 interactive elements.
- Link classification: 117 `INTERNAL_VALID`, 73 `EXTERNAL_VALID`, 49 `FUNCTIONAL_ACTION`, 13 `PENDING_BLOG_MIGRATION`.
- No incorrect absolute same-site UI links were found on completed non-Blog pages.
- No Webflow runtime requests were found on completed non-Blog routes.
- Privacy & terms is absent from shared footers on completed routes.
- Homepage Oxipack proof media is visible; play button and pulse are centered at 1440, 1280, 1024, 991, 767, 390 and 375px.
- Contact page loads Cal.com inline embed at `app.cal.com/nexubis/30min`.
- `/api/contact` exists; GET returns `405`, which is expected.
- Browser smoke at 1440, 1280, 1024, 991, 767, 390 and 375px found no horizontal overflow and no broken images on completed routes.
- Local validation commands passed.

## Fixed

No code fixes were applied in this audit pass. Remaining issues require Blog/Sanity migration, SEO route implementation, legal/copy decisions, or manual production tests.

## Pending Blog Migration

- `/blog`
- `/post/[slug]`
- Blog media
- Blog metadata
- Blog sitemap completeness
- Blog Webflow-source removal
- Package Learn More destination `/post/rethinking-the-nexubis-trial`
- Case Study story-card destinations:
  - `/post/altify-empowering-nexubis`
  - `/post/circuit-securing-nexubis`
  - `/post/oxipack-empowering-nexubis`
- Blog/Sanity generated data and schema files were not edited.

## Blocked Outside Blog

- `/robots.txt` returns `404`.
- `/sitemap.xml` returns `404`.
- Scorecard unlock copy still references `https://www.nexubis.io/privacy` in `lib/scorecard/copy.ts`, but no legal route/content exists for launch. Do not create legal text without approval.
- Production deployment is fresh to merged commit `ce6a16b`, but local uncommitted Homepage/CSS/Sanity work is not deployed and should not be assumed live.
- The production build for `ce6a16b` emitted the DMN placeholder warning. Local dirty changes appear to replace that quote, but they are not part of the production deployment tested here.
- Scorecard Turnstile environment names are absent, so bot-check enforcement is disabled by current code behavior.
- `RENDER_API_KEY` is absent, so the Scorecard JS-render fallback is unavailable for JS-heavy prospect sites.

## Manual Tests Required

### Contact/Funnelr/Resend

- New Contact: one Funnelr contact created.
- First Name saved.
- Last Name empty.
- Brand: Nexubis applied.
- Source: Nexubis | Contact Form applied.
- Added to Nexubis | All Contacts.
- No nurture or sales sequence starts.
- No booking/pipeline tag.
- Resend reaches `hello@nexubis.io`.
- Resend reaches `laine@nexubis.io`.
- Reply-To uses visitor email.

### Existing Scorecard Contact

- Existing contact reused.
- No duplicate.
- Last Name unchanged.
- Scorecard URL unchanged.
- Existing tags/lists/sequences unchanged.
- Contact Form source tag added.
- No new sequence begins.

### Scorecard

- Run one approved live Scorecard with supplied test details.
- Confirm KV run persistence.
- Confirm AI/search/screenshot/PageSpeed calls complete.
- Confirm unlock creates the permanent report URL.
- Confirm report email and internal notification behavior.
- Confirm admin route displays the lead/report.

### Cal.com

- Select a real date/time far enough to reach attendee details.
- Complete one approved test booking.
- Confirm Cal webhook route receives the booking and records the Schedule event.

### Device / DNS

- Physical mobile-device test was not performed by the agent.
- Final DNS/canonical test remains pending until domain cutover.

## Production Media Health

- Homepage main showreel request: R2 `reel.mp4`, `206 video/mp4`, byte ranges supported.
- Homepage Oxipack proof showreel: R2 `Oxipack Specific Showreel.mp4`, `206 video/mp4`, starts muted after click.
- Homepage Oxipack poster: `/assets/work/oxipack/hero-poster.webp`, `200 image/webp`.
- `booth-loop-poster.jpg`: `200 image/jpeg`.
- Case Study hero videos: R2 `206 video/mp4`, muted, looped/autoplaying where designed.
- Case Study gallery videos:
  - Altify `TEMPLATE LONG.mp4`: duration `3.53s`, observed `5` loop resets in `19s`.
  - Altify `BTC MOON 2.mp4`: duration `2.33s`, observed `7` loop resets in `19s`.
  - Circuit `01.mp4`: duration `5.10s`, observed `3` loop resets in `19s`.
  - Circuit `02.mp4`: duration `8.33s`, observed `2` loop resets in `19s`.
  - Oxipack `TEMPLATE LONG.mp4`: duration `6.33s`, observed `2` loop resets in `19s`.
  - Oxipack `TEMPLATE SQUARE.mp4`: duration `3.83s`, observed `4` loop resets in `19s`.

## Automated Command Results

- `npm run lint`: passed with 28 warnings, no errors. Warnings are existing `no-img-element`, one unused eslint-disable, one unused import, and Blog migration image warnings.
- `npm run typecheck`: passed.
- `npm run test`: passed, 31 files and 241 tests.
- `npm run build`: passed locally using `.env.local`.

## Final Readiness Call

The completed non-Blog portion is ready for final QA, subject to the non-Blog blockers and manual tests listed above.

The whole site is not ready for final cutover until Blog/Sanity migration, missing SEO routes, legal/privacy direction, DMN production-copy deployment status, and manual Contact/Scorecard/Cal tests are resolved.
