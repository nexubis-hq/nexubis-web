# Pre-Blog Production Environment Readiness

Audit date: 2026-07-29  
Canonical project: `hello-91244177s-projects/nexubis`  
Canonical production URL: `https://nexubis.vercel.app`  
GitHub repository: `nexubis-hq/nexubis-web`

## Production Deployment

- Status: `Ready`
- Deployment ID: `dpl_FeynWQNoTLBTNRd7XA7xzHY6Z6y6`
- Production alias tested: `https://nexubis.vercel.app`
- Deployment URL: `https://nexubis-bdci0ud8f-hello-91244177s-projects.vercel.app`
- Created: `2026-07-29 15:37:35 +0200`
- Branch: `main`
- Commit: `ce6a16b`
- Commit message: `Add Sanity studio setup and clean reports`
- Freshness: production is fresh to the latest merged `main`/`shannah` commit. Local uncommitted changes exist and are not part of this production deployment.

## Production Environment Names

Values were not printed or pulled. Names were read with `npx vercel env ls production --scope hello-91244177s-projects`.

| Variable | Files using it | Integration | Purpose | Required/optional | Server/public | Present in Production | Build-time | Runtime | Redeploy needed after change | Recommended action |
|---|---|---|---|---|---|---|---|---|---|---|
| `FUNNELR_API_KEY` | `app/api/contact/route.ts`, `lib/funnelr/client.ts`, scorecard inbound/cron scripts | Contact/Funnelr | Contact create/update and reply tagging | Required for contact and reply flows | Server | Yes | No | Yes | No for runtime APIs | Ready for manual Contact test |
| `FUNNELR_API_BASE_URL` | `lib/funnelr/client.ts`, scripts | Contact/Funnelr | Override Funnelr API base URL | Optional, defaults to `https://ab513.gappstack.com` | Server | No | No | Yes | No | Add only if default base changes |
| `RESEND_API_KEY` | `lib/resend.ts`, `lib/contact/notify.ts`, scorecard notify | Resend | Send Contact and Scorecard emails | Required for live email | Server | Yes | No | Yes | No | Ready for manual email test |
| `CONTACT_EMAIL_FROM` | `lib/contact/notify.ts` | Contact/Resend | Contact sender override | Optional, falls back to `SCORECARD_EMAIL_FROM` | Server | No | No | Yes | No | Add if Contact needs a sender distinct from Scorecard |
| `SCORECARD_EMAIL_FROM` | `lib/resend.ts`, `lib/contact/notify.ts`, scorecard notify | Resend | Default verified sender | Required fallback | Server | Yes | No | Yes | No | Ready |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | `sanity/env.ts`, `sanity.config.ts` | Sanity | Studio project ID | Required for Studio/build | Public | Yes | Yes | Yes | Yes | Present; Blog/Sanity content audit deferred |
| `NEXT_PUBLIC_SANITY_DATASET` | `sanity/env.ts`, `sanity.config.ts` | Sanity | Studio dataset | Required for Studio/build | Public | Yes | Yes | Yes | Yes | Present; Blog/Sanity content audit deferred |
| `NEXT_PUBLIC_SANITY_API_VERSION` | Not referenced | Sanity | Not used | Optional/not used | Public | No | No | No | N/A | No action |
| `SANITY_API_READ_TOKEN` | Not referenced | Sanity | Not used | Optional/not used | Server | No | No | No | N/A | No action |
| `ANTHROPIC_API_KEY` | `lib/scorecard/anthropic.ts`, `lib/scorecard/env.ts` | Scorecard AI | Claude calls | Required for real Scorecard | Server | Yes | No | Yes | No | Ready for manual Scorecard test |
| `ANTHROPIC_MODEL_SONNET` | `lib/scorecard/env.ts` | Scorecard AI | Sonnet model override | Optional fallback exists | Server | Yes | No | Yes | No | Ready |
| `ANTHROPIC_MODEL_HAIKU` | `lib/scorecard/env.ts` | Scorecard AI | Haiku model override | Optional fallback exists | Server | Yes | No | Yes | No | Ready |
| `SERPER_API_KEY` | `lib/scorecard/web-search.ts` | Scorecard search | Web search enrichment | Required for real non-mock search | Server | Yes | No | Yes | No | Ready |
| `SCREENSHOTONE_ACCESS_KEY` | `lib/scorecard/screenshot.ts`, `lib/scorecard/env.ts` | Scorecard screenshots | Screenshot capture | Required for real screenshots | Server | Yes | No | Yes | No | Ready |
| `SCREENSHOTONE_SECRET_KEY` | `lib/scorecard/env.ts` | Scorecard screenshots | Declared credential surface | Referenced in env surface only | Server | Yes | No | Possible future | No | Present but not actively used outside env report |
| `PAGESPEED_API_KEY` | `lib/scorecard/pagespeed.ts` | Scorecard PageSpeed | PSI API | Optional but expected for production quality | Server | Yes | No | Yes | No | Ready |
| `KV_REST_API_URL` | `lib/scorecard/kv.ts`, `lib/scorecard/env.ts` | Upstash KV | Scorecard runs/leads/rate limits | Required for Scorecard persistence | Server | Yes | No | Yes | No | Ready |
| `KV_REST_API_TOKEN` | `lib/scorecard/kv.ts`, `lib/scorecard/env.ts` | Upstash KV | Scorecard persistence token | Required | Server | Yes | No | Yes | No | Ready |
| `KV_REST_API_READ_ONLY_TOKEN` | Not referenced directly | Upstash KV | Integration-provided read-only token | Unused by code | Server | Yes | No | No | N/A | No action |
| `KV_REDIS_URL` | Not referenced directly | Upstash KV | Integration-provided Redis URL | Unused by code | Server | Yes | No | No | N/A | No action |
| `KV_URL` | Not referenced directly | Upstash KV | Integration-provided URL | Unused by code | Server | Yes | No | No | N/A | No action |
| `SCORECARD_ADMIN_PASSWORD` | `lib/scorecard/auth.ts` | Scorecard admin | Admin login password | Required for admin | Server | Yes | No | Yes | No | Ready |
| `SCORECARD_SESSION_SECRET` | `lib/scorecard/auth.ts` | Scorecard admin | Signed admin cookie secret | Required for admin | Server | Yes | No | Yes | No | Ready |
| `SCORECARD_UNLIMITED_IPS` | `lib/scorecard/limits.ts` | Scorecard rate limits | IP allowlist | Optional | Server | Yes | No | Yes | No | Ready |
| `SCORECARD_IP_WINDOW_DAYS` | `lib/scorecard/limits.ts` | Scorecard rate limits | Rate-limit window | Optional, defaults to `7` | Server | No | No | Yes | No | Add only if default is wrong |
| `SCORECARD_TARGET_DAILY_CAP` | `lib/scorecard/limits.ts` | Scorecard rate limits | Per-target cap | Optional, defaults to `2` | Server | No | No | Yes | No | Add only if default is wrong |
| `SCORECARD_GLOBAL_HOURLY_CAP` | `lib/scorecard/limits.ts` | Scorecard rate limits | Global hourly cap | Optional, defaults to `200` | Server | No | No | Yes | No | Add only if default is wrong |
| `SCORECARD_LEAD_EMAILS` | `lib/scorecard/notify.ts` | Scorecard email | Internal lead recipients | Required for intended notifications | Server | Yes | No | Yes | No | Ready |
| `SCORECARD_SEND_EMAIL1` | `lib/scorecard/env.ts`, `lib/scorecard/notify.ts` | Scorecard email | Fallback Email 1 flag | Optional flag | Server | Yes | No | Yes | No | Ready |
| `SCORECARD_SENDER_FIRST_NAME` | `lib/scorecard/notify.ts` | Scorecard email | Email signature first name | Optional, defaults to `Hannes` | Server | No | No | Yes | No | Add only if default is wrong |
| `SCORECARD_MOCK` | scorecard tests/scripts/runtime helpers | Scorecard | Local/mock mode | Test/dev only | Server | No | No | No for production | N/A | No production action |
| `NEXT_PUBLIC_SITE_URL` | `app/api/leads/scorecard/route.ts`, `app/api/scorecard/unlock/route.ts` | Scorecard links | Absolute report URL fallback | Optional, request origin fallback exists | Public | No | No | Yes | No | Consider adding final `https://www.nexubis.io` after DNS cutover |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `components/scorecard/report/UnlockPanel.tsx` | Scorecard bot check | Optional Turnstile widget | Optional; no widget if absent | Public | No | Yes | Yes | Yes | Add with `TURNSTILE_SECRET_KEY` if bot check required at launch |
| `TURNSTILE_SECRET_KEY` | `lib/scorecard/unlock.ts` | Scorecard bot check | Server verification | Optional; verification skipped if absent | Server | No | No | Yes | No | Add with public site key if bot check required |
| `RENDER_API_KEY` | `lib/scorecard/fetch-site.ts` | Scorecard JS render | ScrapingBee rendered HTML fallback | Optional; plain fetch fallback remains | Server | No | No | Yes | No | Add if JS-heavy prospect sites need better crawling |
| `FUNNELR_WEBHOOK_URL` | `lib/scorecard/funnelr.ts` | Scorecard/Funnelr | Legacy/signed webhook bridge | Referenced but not called by current unlock path | Server | No | No | No current runtime | No | Confirm whether dead code or future bridge |
| `FUNNELR_WEBHOOK_SECRET` | `lib/scorecard/funnelr.ts` | Scorecard/Funnelr | Legacy/signed webhook HMAC | Referenced but not called by current unlock path | Server | No | No | No current runtime | No | Confirm whether dead code or future bridge |
| `FUNNELR_NURTURE_ENABLED` | `app/api/cron/nurture-handoff/route.ts` | Funnelr cron | Enable nurture handoff | Required flag for cron behavior | Server | Yes | No | Yes | No | Ready |
| `FUNNELR_NURTURE_AFTER_DAYS` | `app/api/cron/nurture-handoff/route.ts` | Funnelr cron | Delay before nurture | Optional fallback exists | Server | Yes | No | Yes | No | Ready |
| `FUNNELR_NURTURE_FROM` | `app/api/cron/nurture-handoff/route.ts` | Funnelr cron | Nurture date override | Optional | Server | No | No | Yes | No | No action |
| `CRON_SECRET` | `app/api/cron/nurture-handoff/route.ts` | Cron | Protect cron endpoint | Required if cron used | Server | Yes | No | Yes | No | Ready |
| `REPLY_TAGGING_ENABLED` | `app/api/inbound/reply/route.ts` | Reply webhook | Enable real reply tagging | Required flag | Server | Yes | No | Yes | No | Ready |
| `REPLY_WEBHOOK_SECRET` | `app/api/inbound/reply/route.ts` | Reply webhook | Protect inbound reply route | Required | Server | Yes | No | Yes | No | Ready |
| `CAL_APPLICATION_EVENT_SLUG` | Not referenced directly | Cal.com | Expected event slug config | Configured but unused by code | Server | Yes | No | No | N/A | Confirm if Cal webhook handler should consume it |
| `CAL_WEBHOOK_SECRET` | Not referenced directly in scanned files | Cal.com | Expected webhook secret | Configured but unused by code surface scanned | Server | Yes | No | Possible through handler if dynamic | No | Verify `lib/cal-webhook/handler` consumption in final Cal webhook test |
| `NEXT_PUBLIC_META_PIXEL_ID` | `lib/meta/events.ts` | Meta pixel | Browser pixel ID | Optional fallback exists | Public | Yes | Yes | Yes | Yes | Ready |
| `META_CAPI_TOKEN` | `lib/meta/capi.ts` | Meta CAPI | Server-side conversion events | Optional but expected for CAPI | Server | Yes | No | Yes | No | Ready |
| `META_LEAD_VALUE` | `lib/meta/events.ts` | Meta CAPI | Optional lead value | Optional | Server | No | No | Yes | No | Add if Meta value reporting is required |
| `META_CURRENCY` | `lib/meta/events.ts` | Meta CAPI | Optional value currency | Optional, defaults to `EUR` when value set | Server | No | No | Yes | No | Add with `META_LEAD_VALUE` if needed |
| `META_TEST_EVENT_CODE` | `lib/meta/capi.ts` | Meta CAPI | Test Events routing | Optional/testing only | Server | No | No | Yes | No | Keep absent in production unless testing |

## Missing Production Names

Missing but optional/defaulted/test-only: `CONTACT_EMAIL_FROM`, `FUNNELR_API_BASE_URL`, `FUNNELR_NURTURE_FROM`, `META_CURRENCY`, `META_LEAD_VALUE`, `META_TEST_EVENT_CODE`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `RENDER_API_KEY`, `SCORECARD_GLOBAL_HOURLY_CAP`, `SCORECARD_IP_WINDOW_DAYS`, `SCORECARD_MOCK`, `SCORECARD_SENDER_FIRST_NAME`, `SCORECARD_TARGET_DAILY_CAP`, `TURNSTILE_SECRET_KEY`, `FUNNELR_ALLOW_WRITE_TEST`.

Needs product decision: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` are absent, so the Scorecard unlock bot check is currently disabled by design. `RENDER_API_KEY` is absent, so JS-heavy prospect sites do not get the rendered-HTML fallback.

Needs code ownership decision: `FUNNELR_WEBHOOK_URL` and `FUNNELR_WEBHOOK_SECRET` are referenced by `lib/scorecard/funnelr.ts` but the current unlock path does not call that module.

## Configured But Not Directly Referenced

Production contains these names that are not directly referenced by `process.env.*` scans: `CAL_APPLICATION_EVENT_SLUG`, `CAL_WEBHOOK_SECRET`, `KV_REDIS_URL`, `KV_REST_API_READ_ONLY_TOKEN`, `KV_URL`, `SCREENSHOTONE_SECRET_KEY`.

`KV_*` extras are normal Vercel/Upstash integration surface. `SCREENSHOTONE_SECRET_KEY` is declared in the Scorecard env surface. `CAL_*` variables should be verified during the real Cal webhook test because the visible route delegates to `lib/cal-webhook/handler`.
