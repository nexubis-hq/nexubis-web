# LAUNCH_CHECKLIST.md — Industrial Brand Credibility Scorecard

State of every launch item as of 2026-07-07. The tool is code-complete and
verified end to end (mock and real runs); the items marked PENDING are
external provisioning, most of them 10-minute jobs.

> **NOTE (2026-07-23):** the funnel/tracking/booking layer (Meta pixel + CAPI,
> cal.com, Resend, the Funnelr REST bridge, and the nexubis.io **domain-migration**
> steps) is now tracked in the living doc [`docs/go-live-and-migration.md`](docs/go-live-and-migration.md).
> That doc supersedes the Funnelr-webhook and interim-`BOOKING_URL` rows below
> (Funnelr is now a REST bridge, and `BOOKING_URL` already points at `cal.com/nexubis/30min`).

## Environment (production Vercel env)

| Item | State | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | READY | Reused LekkeWeb key per the credential policy; set locally, mirror to Vercel |
| `ANTHROPIC_MODEL_HAIKU` / `ANTHROPIC_MODEL_SONNET` | READY | Defaults baked in (`claude-haiku-4-5-20251001` / `claude-sonnet-4-6`); env overrides optional |
| `SERPER_API_KEY` | READY | Reused key |
| `SCREENSHOTONE_ACCESS_KEY` / `SCREENSHOTONE_SECRET_KEY` | READY | Reused keys |
| `PAGESPEED_API_KEY` | READY | Reused key, free tier |
| `RENDER_API_KEY` | EMPTY (optional) | Was empty in the LekkeWeb export too; JS-render fallback for SPA sites stays off until set. Crawler degrades gracefully |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | **PENDING** | Create a NEW (free) database in the same Upstash account. NEVER the LekkeWeb instance (`climbing-hagfish-*`); the code warns loudly if it sees it. Without KV, production refuses to run (by design: silently losing leads is unacceptable) |
| `RESEND_API_KEY` | **PENDING** | Same Resend account is fine; verify the nexubis.io sending domain first. Sender identity: `SCORECARD_EMAIL_FROM` (default `Nexubis <hello@nexubis.io>`) |
| `NEXUBIS_TEAM_EMAIL` | READY | `hello@nexubis.io` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | **PENDING** | Domain-scoped: add nexubis.io as a hostname on the existing widget or create a new pair. Until set, the unlock gate runs on honeypot + timing checks only; once set, Turnstile fails closed |
| `FUNNELR_WEBHOOK_URL` / `FUNNELR_WEBHOOK_SECRET` | **PENDING** | Nexubis-specific. Payload: contact, company, website, report URL, score, verdict, first fix, competitors, source tag `scorecard`; HMAC-SHA256 in `X-Nexubis-Signature`. Until live, set `SCORECARD_SEND_EMAIL1=true` so the tool sends Email 1 itself |
| `SCORECARD_SEND_EMAIL1` | READY | `false` once Funnelr owns Email 1; `true` in the interim (requires Resend) |
| `SCORECARD_ADMIN_PASSWORD` / `SCORECARD_SESSION_SECRET` | READY | Fresh values generated (in `.env.local`); mirror to Vercel. Never reuse other products' auth |
| `SCORECARD_UNLIMITED_IPS` | READY | Local/test IPs set; add office IPs as needed |
| `SCORECARD_MOCK` | **MUST BE UNSET IN PRODUCTION** | Currently `1` in `.env.local` so the Ship Studio preview runs free of API spend. A production deploy must not set it |
| `NEXT_PUBLIC_SITE_URL` | RECOMMENDED | Set to `https://www.nexubis.io` so webhook/email links are canonical |
| `NEXT_PUBLIC_SHOW_SCORECARD` | **THE LAUNCH FLIP** | Keep `true` in preview/staging now; flip to `true` in production at launch. With it off, the homepage renders with zero Scorecard references (verified) |

## Copy and content

- [ ] **Privacy wording** on the unlock gate: `UNLOCK.privacyNotice` in `lib/scorecard/copy.ts` is a plain placeholder marked TODO CONFIRM WITH LEON. Confirm exact EU wording + the privacy policy URL.
- [x] Oxipack case study line, named once, exact result figures (35% more output, 33% lower effective rate, no re-quote) — enforced by test.
- [ ] **Booking URL**: `BOOKING_URL` in `lib/site-config.ts` still points at the interim contact page. Swap once the application-call booking link exists (one line; header, homepage and report update together).
- [ ] **Copy drift for Leon**: Part 2B Section 13 expects a header Scorecard link; the shipped homepage deliberately omits it so the nav never competes with the Book CTA. Keep or add.
- [x] All other client-facing copy is locked Part 2B wording, held in `lib/scorecard/copy.ts`, scanned by tests (no em dashes, never the word audit). <!-- audit-ok -->

## Verification state

- [x] 111 unit/acceptance tests green (schemas, verdict guardrails incl. the 82-behind-a-rival rule, PageSpeed table, null-check scaling, tie-breaks, webhook signature + retry/flag, Email 1 exact copy + flag gate, unlock idempotency, disposable/honeypot/timing rails, Turnstile fail-closed, auth, house-rule scans, Oxipack-once).
- [x] E2E happy path in a real browser: form, scan, teaser, unlock, shared report.
- [x] Admin drill in a real browser: auth gate, wrong password rejected, leads table, Loom attach appearing live on the public report, loomStatus transitions.
- [x] Three REAL manufacturer runs (Bakon, JASA, Unifortes: public companies, not clients), hand-reviewed for defensible scores, real evidence citations, honest could-not-assess handling and house tone. Recorded under `lib/scorecard/fixtures/real-runs/`.
- [x] Cost audit: ~$0.18 to $0.19 per fresh run, well under the $0.40 target; cache replays near zero. Fresh-run duration 100 to 115s; the scan animation is built for it (target was ~90s; acceptable, revisit if drop-off shows).
- [x] Failure drills covered: competitor site down (honest bundle, run completes: observed live with an unreachable domain), PageSpeed timeout (renders "could not be measured"), Funnelr 500 (3 retries, lead flagged, team notified), Turnstile fail (fail-closed), disposable email (helpful copy), rate limits (per-IP / per-target / global, each with honest copy).
- [x] robots: shared reports and the whole admin area are noindex; no sitemap includes them.
- [x] Rollback verified: flag-off build renders a complete homepage with zero Scorecard references.

## Launch order

1. Provision the new Upstash database; set the two KV vars.
2. Verify nexubis.io in Resend; set `RESEND_API_KEY` (+ optional `SCORECARD_EMAIL_FROM`, `SCORECARD_SENDER_FIRST_NAME`).
3. Add nexubis.io Turnstile keys.
4. Set all remaining env vars in Vercel production (table above), WITHOUT `SCORECARD_MOCK`.
5. Funnelr: create the webhook, set URL + secret; until then run with `SCORECARD_SEND_EMAIL1=true`. Send one test unlock to a request bin to eyeball the payload/signature.
6. Confirm privacy wording and (optionally) the real booking URL.
7. Flip `NEXT_PUBLIC_SHOW_SCORECARD=true` in production and redeploy.
8. Run one real unlock end to end in production (team email arrives, Funnelr contact created, report link stable).
