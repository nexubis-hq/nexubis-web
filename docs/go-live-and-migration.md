# Go-Live & nexubis.io Migration Checklist

> **Living document — keep it current.** Every setup/config item for the Scorecard
> funnel (booking, tracking, lead capture, CRM, email, DNS) lives here, plus exactly
> what has to change when we migrate hosting to the **nexubis.io** domain. The goal is a
> foolproof cutover: nothing in the code hard-codes a domain, so migration is a
> checklist of **config + DNS**, not a code change.
>
> Deep "why" detail for the funnel lives in [`funnel-audit-checklist.md`](./funnel-audit-checklist.md).
> Scorecard-tool launch items live in [`../LAUNCH_CHECKLIST.md`](../LAUNCH_CHECKLIST.md).
>
> Last updated: 2026-07-23. Legend: ✅ done · ⏳ waiting on someone · ⬜ to do · ⚠️ must-not-forget.

---

## 1. Environment variables (master list)

Set locally in `.env.local` (gitignored). **Everything marked "Vercel ⬜" must also be added to Vercel** before/at deploy. `NEXT_PUBLIC_*` values **bake in at build** — changing them requires a redeploy.

| Var | Type | Local | Vercel | Notes |
|---|---|---|---|---|
| `NEXT_PUBLIC_META_PIXEL_ID` | public (baked) | ✅ `885652097948360` | ⬜ | Pixel id. Public, but must be set in Vercel so the prod build bakes the right one |
| `META_CAPI_TOKEN` | **secret** | ✅ set + verified | ⬜ | Server-side events. Runtime secret (not baked). Verified: `events_received:1` |
| `META_TEST_EVENT_CODE` | temp | ✅ `TEST87920` | ⚠️ **never in prod** | Routes events into Test Events. **Remove before production** or real events divert into the test panel |
| `META_LEAD_VALUE` / `META_CURRENCY` | config | optional | optional | Value-based optimization. Omitted entirely if unset. `META_CURRENCY` defaults `EUR` |
| `CAL_WEBHOOK_SECRET` | **secret** | ✅ set | ⬜ | HMAC for `/api/cal-booking`. Must byte-match the secret Laine sets on the cal.com webhook |
| `FUNNELR_API_KEY` | **secret** | ⏳ pending | ⬜ | REST bridge auth (X-ApiKey header). Present = live; absent = dry-run |
| `FUNNELR_API_BASE_URL` | config | optional | optional | Defaults `https://ab513.gappstack.com/api` |
| `FUNNELR_NURTURE_ENABLED` | flag | ✅ `false` | ⬜ | Sales→nurture cron. `false` = dry-run (writes nothing). Flip to `true` ONLY after sequences are un-paused |
| `FUNNELR_NURTURE_AFTER_DAYS` | config | ✅ `14` | ⬜ | Eligibility age (final sales email is Day 13) |
| `FUNNELR_NURTURE_FROM` | config | ⬜ set at go-live | ⬜ | ISO cutover floor — set to go-live time so pre-launch/test leads are never back-tagged |
| `CRON_SECRET` | **secret** | ✅ set | ⬜ | Auth for `/api/cron/*`. Vercel Cron sends it as `Authorization: Bearer` |
| `REPLY_WEBHOOK_SECRET` | **secret** | ✅ set | ⬜ | Auth for `/api/inbound/reply`. The inbox monitor POSTs the reply sender with this |
| `REPLY_TAGGING_ENABLED` | flag | ✅ `false` | ⬜ | `false` = dry-run (reports, tags nothing). Flip to `true` once an inbox monitor is wired |
| `FUNNELR_WEBHOOK_URL` / `FUNNELR_WEBHOOK_SECRET` | dead | ⚠️ remove | — | The no-op webhook pattern. Not used by the real integration; delete once the live path is rewired |
| `RESEND_API_KEY` | **secret** | ✅ set + verified | ⬜ | Sending-only scope. Test send returned a message id |
| `SCORECARD_EMAIL_FROM` | config | ✅ `Nexubis <alerts@nexubis.io>` | ⬜ | Any `@nexubis.io` works (domain Verified, DKIM-signed) |
| `SCORECARD_LEAD_EMAILS` | config | ✅ `laine@nexubis.io` | ⬜ | Who gets the "new lead" alert (comma list). Empty-safe parsing |
| `NEXUBIS_TEAM_EMAIL` | config | ✅ `hello@nexubis.io` | ⬜ | Fallback recipient + used by suppression builtins |
| `AUDIT_INTERNAL_EMAILS` | config | ✅ | ⬜ | Test-traffic suppression (comma list). Built-ins always suppressed |
| `NEXT_PUBLIC_SITE_URL` | public (baked) | ⬜ | ⬜ **set at migration** | `https://www.nexubis.io` — validates report URLs + makes email/report links canonical |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | secret/public | ⏳ pending | ⬜ | Domain-scoped — see migration §2 |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | **secret** | ⏳ pending | ⬜ | NEW Upstash DB for Nexubis (never the LekkeWeb instance). Prod refuses to run without it |
| `RESEND_API_KEY` sender name | config | `SCORECARD_SENDER_FIRST_NAME` optional | — | Defaults `Hannes` |
| `SCORECARD_MOCK` | flag | `0` locally | ⚠️ **never in prod** | `1` = free mock runs. Must be unset in production |
| `NEXT_PUBLIC_SHOW_SCORECARD` | public (baked) | ✅ `true` | ⬜ | The launch flip. Off = homepage has zero Scorecard references |

---

## 2. Migration to nexubis.io — the domain-bound list

**The code is domain-agnostic** (origins come from request headers, config from env). These are the only things that change, each is config or DNS:

| Item | Action at cutover | Owner | Why |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Set to `https://www.nexubis.io`, then **redeploy** | env | Validates Scorecard report URLs in `/api/leads/scorecard`; makes email/report links canonical. Baked at build |
| Report-link stability | Do real lead capture only on the final domain, OR set `NEXT_PUBLIC_SITE_URL` now | — | Report links are built from the origin the visitor unlocked on; links made on a preview URL die if that preview goes away |
| cal.com webhook URL | Point `BOOKING_CREATED` → `https://www.nexubis.io/api/cal-booking` (secret unchanged) | Laine | Otherwise confirmed bookings never reach the site |
| Turnstile | Add `nexubis.io` (+ `www`) as allowed hostnames on the widget | Cloudflare | Keys are domain-scoped; wrong host = every unlock fails the challenge |
| Meta pixel | Add `nexubis.io` to the pixel's allowed domains (optional but tidy) | Meta UI | CAPI `event_source_url` auto-follows the real domain; no code change |
| Resend | **Already Verified on nexubis.io** — no action | ✅ | SPF/bounce sit on `send.nexubis.io`, DKIM on `resend._domainkey`, so no clash with the CRM root SPF |
| Funnelr / email DNS | Audit + fix on nexubis.io (funnel doc §6): exactly ONE root SPF merging all senders, exactly ONE `_dmarc`, DKIM, and the tracked-link CNAME | DNS | The CNAME is the exact thing that stalled LekkeWeb for a day; 3 duplicate `_dmarc` records currently flagged on nexubis.io |
| Vercel domain | Attach `nexubis.io` to the project; **redeploy** (bakes all `NEXT_PUBLIC_*`) | Vercel | — |
| Mirror all secrets | Add every "Vercel ⬜" env from §1 to the production project | env | Runtime secrets are not baked; they must exist in Vercel |

**Recommendation:** set `NEXT_PUBLIC_SITE_URL`, the cal.com webhook, and the Meta allowed-domain to the **final nexubis.io values from the start** (even while testing on the vercel.app preview) — then migration is effectively a no-op.

---

## 3. Per-service status & owner

| Service | Status | Owner | Remaining |
|---|---|---|---|
| Meta pixel (browser) | ✅ live + verified (id `885652097948360`) | — | Mirror pixel id to Vercel |
| Meta CAPI (server) | ✅ live + verified (`events_received:1`) | — | Mirror token to Vercel; remove test code before prod |
| Meta custom conversions | ⬜ | Hannes (Meta UI) | Create 4 conversions — see §4 |
| Resend (email send) | ✅ live + verified (test send ok) | — | Mirror key to Vercel |
| Lead alerts → laine@ | ✅ wired | — | Delivers now that Resend is live |
| cal.com booking links | ✅ all CTAs route to `cal.com/nexubis/30min` | — | — |
| cal.com webhook/event config | ✅ done (live test pending post-migration) | Laine | Fields aligned in code (`title`, `Report-Link`) |
| Funnelr REST bridge | ⏸️ held — Shannah's Codex is doing the tag-only rewrite + pushing to main | Shannah | On her push: pull + verify against her handover doc; then rewire live path off the dead webhook |
| Sales→nurture scheduler | ✅ built + tested (12/12), live but dormant | Hannes | `/api/cron/nurture-handoff` daily; applies only `Trigger: Nexubis \| Start Credibility Brief Nurture`. Dormant until `FUNNELR_API_KEY` + `FUNNELR_NURTURE_ENABLED=true`. Tag names in `lib/funnelr/nexubis-tags.ts` — reconcile with Shannah's mapping module when it lands |
| Reply detection | ✅ endpoint + tag-only action built (6 tests); **inbox monitor still to wire** | Hannes | `/api/inbound/reply` applies `Pipeline: Nexubis \| Replied`. Dormant until a monitor POSTs to it + `REPLY_TAGGING_ENABLED=true`. Until then, apply the Replied tag manually in Funnelr. See §4 for the recommended wiring |
| Turnstile (bot gate) | ⏳ | Hannes | Keys + nexubis.io hostname |
| Upstash KV | ⏳ | Hannes | New DB (never LekkeWeb's) |

---

## 4. Human / config tasks (not code)

- **Laine — cal.com event (`nexubis/30min`):** ✅ **DONE (2026-07-23)** — webhook enabled (`Booking created` only, secret set, URL `https://nexubis.io/api/cal-booking`), and two questions added. Confirmed via the public API; the code was aligned to the **real** field identifiers:
  - Business Name → `title` (Laine mapped it onto cal.com's built-in meeting-title field, so the company name becomes the meeting title — fine).
  - Report Link → `Report-Link`.
  - ⚠️ **Migration gotcha:** the webhook targets the **apex** `nexubis.io` (not `www`). At cutover, apex `nexubis.io` must serve `/api/cal-booking` **directly** — a 301/302 apex→www redirect can drop the POST body/signature and cal.com may not follow it. Either serve apex directly, or change the webhook URL to the canonical host. Keep `NEXT_PUBLIC_SITE_URL` on the same host to avoid report-URL origin mismatches.
  - Still to verify (post-migration): one real test booking → webhook fires → `Schedule` + Call-Booked tag. Today the webhook shows "No data yet" (can't reach localhost).
- **Meta custom conversions** (Events Manager → Custom Conversions):
  - `Scorecard — Started` = event `AuditStart`.
  - `Scorecard — Lead (email unlock)` = event `Lead`, `content_name` = `Nexubis Scorecard`.
  - `Scorecard — Booking Click` = event `AuditBookClick`.
  - `Scorecard — Booking Confirmed` = event `Schedule`, `content_name` = `Nexubis Scorecard`.
- **DNS on nexubis.io** (funnel doc §6): remove the 3 duplicate `_dmarc` TXT records (keep one), ensure ONE root SPF that includes every sender, confirm the Funnelr tracked-link CNAME.
- **Reply-detection wiring** (to auto-apply `Pipeline: Nexubis | Replied`): the endpoint `/api/inbound/reply` is built; it just needs something watching the reply inbox to POST the sender. Since `nexubis.io` mail is Google Workspace (Google owns the MX, so Cloudflare Email Routing can't intercept), the simplest path is a **Gmail Apps Script** on the sales inbox: a time-based trigger that finds new replies and does `UrlFetchApp.fetch("https://<site>/api/inbound/reply", { headers: { "x-reply-secret": <REPLY_WEBHOOK_SECRET> }, payload: {from: <sender>} })`. Alternatively an inbound-parse service (Mailgun/SendGrid). Then set `REPLY_TAGGING_ENABLED=true`. Until wired, apply the Replied tag manually.
- **Privacy wording** on the unlock gate (`UNLOCK.privacyNotice` in `lib/scorecard/copy.ts`) — confirm EU/POPIA wording + policy URL (Leon).

---

## 5. Pre-launch smoke tests (in order)

1. cal relay: unsigned → 401, valid `BOOKING_CREATED` → 200 (already verified locally).
2. meta relay: returns `{"ok":true}`; with token, `skipped:false` (verified).
3. Internal test with a suppressed email: full run, report loads, book + cancel a test call, logs show the internal skip on every leg.
4. Full E2E with a NON-internal Gmail: run → unlock → lead alert reaches laine@ → book via the email's link → `Schedule` lands in Meta exactly once.
5. Day-one skim: `AuditStart → Lead → BookClick → Schedule` for anomalies.

---

## 6. ⚠️ Must remove / flip before production

- [ ] `META_TEST_EVENT_CODE` — **unset** (else live events divert into Test Events).
- [ ] `SCORECARD_MOCK` — **unset** (else the tool serves canned data).
- [ ] `FUNNELR_WEBHOOK_URL` / `FUNNELR_WEBHOOK_SECRET` — remove (dead no-op pattern).
- [ ] `NEXT_PUBLIC_SHOW_SCORECARD=true` in production, then redeploy.
- [ ] Every secret from §1 mirrored into Vercel.
