# Scorecard v1 — File Manifest (pre-audit-rework backup)

**Snapshot date:** 2026-09-01
**Backup branch:** `backup/scorecard-pre-audit-rework`
**Backup tag:** `scorecard-v1-2026-09-01` (commit `0d99b7b`)

This is the complete footprint of the scorecard feature as it exists before the audit rework. Every path below was verified to exist at the snapshot commit. Files marked **(shared)** are used by the rest of the site too — changing them affects more than the scorecard.

---

## Routes & Pages

| File | Role |
| --- | --- |
| `app/scorecard/page.tsx` | Public landing page + form shell; renders the ScorecardFlow |
| `app/scorecard/r/[slug]/page.tsx` | Shared report viewer (dynamic, live KV reads) |
| `app/scorecard/r/[slug]/opengraph-image.tsx` | Dynamic OG image for shared reports |
| `app/scorecard/r/[slug]/loading.tsx` | Loading skeleton for the report page |
| `app/scorecard/r/[slug]/not-found.tsx` | 404 for expired/invalid report slugs |
| `app/scorecard/admin/page.tsx` | Admin login gate |
| `app/scorecard/admin/layout.tsx` | Admin section layout |
| `app/scorecard/admin/leads/page.tsx` | Leads table (score, verdict, routing, webhook status) |
| `app/scorecard/admin/scans/page.tsx` | Historical scans list with diagnostics |
| `app/scorecard/admin/[slug]/page.tsx` | Individual scorecard admin detail view |
| `app/scorecard/admin/actions.ts` | Admin server actions (login/logout etc.) |

## API Routes

| File | Role |
| --- | --- |
| `app/api/scorecard/run/route.ts` | Public run endpoint; streams stage events, applies abuse rails, generates scorecard, returns teaser |
| `app/api/scorecard/unlock/route.ts` | Email-gate unlock; promotes run to permanent slug, runs lead plumbing, sends notifications |
| `app/api/leads/scorecard/route.ts` | Fire-and-forget lead bridge to Funnelr |
| `app/api/cron/dependency-health/route.ts` | Daily health check for external dependencies; emails alerts |
| `app/api/cron/nurture-handoff/route.ts` | Daily sales→nurture handoff (gated by `FUNNELR_NURTURE_ENABLED`) |

## Components

| File | Role |
| --- | --- |
| `components/scorecard/flow/ScorecardFlow.tsx` | Main client flow: form → scan → teaser → unlock |
| `components/scorecard/flow/ScanAnimation.tsx` | Animated scan progress tied to real pipeline stages |
| `components/scorecard/flow/ScorecardPreviewRadar.tsx` | Radar preview in teaser (also used on homepage) **(shared)** |
| `components/scorecard/report/ReportView.tsx` | Full report renderer (cover, scores, radar, categories, first fix, next steps) |
| `components/scorecard/report/ReportNav.tsx` | Sticky report header with book-a-call CTA |
| `components/scorecard/report/ReportSidebar.tsx` | Report section navigation |
| `components/scorecard/report/BenchmarkRadar.tsx` | Prospect-vs-rivals radar chart |
| `components/scorecard/report/ScoreRing.tsx` | Circular 0–100 score with verdict-band coloring |
| `components/scorecard/report/UnlockBar.tsx` | Teaser-state "unlock to see full report" bar |
| `components/scorecard/report/UnlockPanel.tsx` | Email gate form: Turnstile check, Meta lead event, Funnelr bridge |
| `components/scorecard/report/BookCallButton.tsx` | Book-application-call CTA **(shared)** |
| `components/scorecard/admin/CopyLinkButton.tsx` | Copy report link in admin UI |
| `components/SiteHeader.tsx` | Site header used by scorecard landing **(shared)** |
| `components/RevealOnScroll.tsx` | Scroll animations used on landing **(shared)** |
| `components/MetaPixel.tsx` | Meta Pixel script tag **(shared)** |

## AI Generation — Prompts, Schemas, Pipeline

| File | Role |
| --- | --- |
| `lib/scorecard/anthropic.ts` | Single home for Claude calls: structured outputs, cost accounting, schema validation, retries |
| `lib/scorecard/output-schemas.ts` | Zod + JSON schemas: FirstImpression, RubricScores, DeckCopy, DetectContext, CompetitorRescue |
| `lib/scorecard/generate.ts` | Full generation orchestration: evidence → scoring → verdict/first fix → copy pass → fallbacks |
| `lib/scorecard/orchestrator.ts` | Evidence gathering: screenshots, site facts, first-impression vision reads, competitor edges |
| `lib/scorecard/detect.ts` | Auto-detect product one-liner and competitors; Serper rescue when <2 found |
| `lib/scorecard/evidence.ts` | Evidence bundle assembly |
| `lib/scorecard/copy.ts` | All client-facing copy/strings (landing, form, unlock, report labels, scan stages) |
| `lib/scorecard/rubric.ts` | The 5 categories × 5 checks rubric, weights, check keys |
| `lib/scorecard/scoring.ts` | Assembles company scores, benchmark, verdict band, first-fix category |
| `lib/scorecard/result.ts` | ScorecardResult/DeckCopy/VerdictBand types; teaser redaction |
| `lib/scorecard/types.ts` | Shared types safe for client import |
| `lib/scorecard/templates.ts` | Fallback copy when generation fails or content-safety blocks |
| `lib/scorecard/content-safety.ts` | Scans generated copy for banned phrases, em-dashes, placeholders |
| `lib/scorecard/mock.ts` | Zero-API-spend mock pipeline |

## Data Fetching & External APIs

| File | Role |
| --- | --- |
| `lib/scorecard/fetch-site.ts` | Crawls prospect + rival sites (JS rendering); extracts site facts |
| `lib/scorecard/screenshot.ts` | ScreenshotOne homepage screenshots (desktop + mobile) |
| `lib/scorecard/web-search.ts` | Serper search client for competitors and offsite evidence |
| `lib/scorecard/competitors.ts` | Competitor URL resolution and validation |
| `lib/scorecard/offsite.ts` | Offsite evidence gathering (third-party mentions etc.) |
| `lib/scorecard/pagespeed.ts` | Google PageSpeed Insights client |

## Run Pipeline, Validation & Abuse Prevention

| File | Role |
| --- | --- |
| `lib/scorecard/run.ts` | Validates/normalizes run input (URL, one-liner, competitors) |
| `lib/scorecard/unlock.ts` | Validates unlock input; Turnstile verification |
| `lib/scorecard/limits.ts` | Rate limiting, IP throttling, cost thresholds |
| `lib/scorecard/disposable-domains.ts` | Blocks disposable/test email domains |
| `lib/scorecard/auth.ts` | Admin session auth (signed cookie, `SCORECARD_SESSION_SECRET`) |

## Persistence, Caching & Determinism

| File | Role |
| --- | --- |
| `lib/scorecard/kv.ts` | Upstash KV client; run records, lead records, shared slugs |
| `lib/scorecard/determinism.ts` | Deterministic envelope: hashing, cache keys, replay, record TTL |
| `lib/scorecard/call-cache.ts` | Per-envelope cost tracking / cumulative API spend |
| `lib/scorecard/share.ts` | Unguessable share slugs, SharedScorecard persistence, view counters |
| `lib/scorecard/diagnostics.ts` | Per-host scan telemetry |

## Leads, Email & Funnelr

| File | Role |
| --- | --- |
| `lib/scorecard/leads.ts` | LeadRecord structure and KV-backed queries |
| `lib/scorecard/lead-funnelr.ts` | Funnelr bridge: normalize, validate, signed webhook submit, tags + custom fields |
| `lib/scorecard/funnelr.ts` | Funnelr client used by the scorecard |
| `lib/scorecard/routing.ts` | Lead routing: seniority, vertical, geo, follow-up timing, loom flag |
| `lib/scorecard/notify.ts` | Internal team alerts + fallback Email 1 (behind `SCORECARD_SEND_EMAIL1`) |
| `lib/funnelr/nurture-scheduler.ts` | Sales→nurture transition logic (driven by cron) |
| `lib/funnelr/nexubis-tags.ts` | Funnelr tag definitions (Brand, Source, Start-Sales, Nurture) |
| `lib/resend.ts` | Resend email client wrapper **(shared)** |

## Tracking & Analytics

| File | Role |
| --- | --- |
| `lib/meta/events.ts` | Meta event definitions incl. scorecard lead event + leadValue() **(shared)** |
| `lib/meta/track.ts` | Pixel tracking wrapper **(shared)** |
| `components/MetaPixel.tsx` | Pixel script tag (listed above) **(shared)** |
| `components/scorecard/report/UnlockPanel.tsx` | Fires Meta lead event on unlock (listed above) |

## Config, Env & Monitoring

| File | Role |
| --- | --- |
| `lib/scorecard/env.ts` | Central env config per subsystem (ai, retrieval, screenshots, pagespeed, jsRender, kv, email, botCheck, funnelr, admin) |
| `lib/site-config.ts` | Shared site config incl. scorecard feature flag **(shared)** |
| `lib/monitoring/dependency-health.ts` | Balance/health checks: Serper, ScreenshotOne, Anthropic spend, PageSpeed, Resend, Upstash |

## Assets & Fixtures

| File | Role |
| --- | --- |
| `lib/scorecard/og-fonts/` | Fonts bundled for the OG image renderer |
| `lib/scorecard/fixtures/scorecard-result.json` | Demo scorecard result (used on `/scorecard/r/demo`) |
| `lib/scorecard/fixtures/evidence-bundle.json` | Sample evidence payload |
| `lib/scorecard/fixtures/real-runs/jasa.json` | Recorded real run |
| `lib/scorecard/fixtures/real-runs/unifortes.json` | Recorded real run |
| `lib/scorecard/fixtures/real-runs/bakon.json` | Recorded real run |

## Utilities

| File | Role |
| --- | --- |
| `lib/scorecard/clamp.ts` | Text truncation/clamping helpers |

## Tests

All in `lib/scorecard/` unless noted:

- `acceptance.test.ts` — end-to-end acceptance / deterministic replay
- `anthropic` behavior covered via `generate.test.ts`, `cost-cache.test.ts`
- `auth.test.ts`, `limits.test.ts`, `unlock.test.ts`, `run.test.ts` — auth, rate limits, input validation
- `competitors.test.ts`, `detect.test.ts`, `offsite.test.ts`, `web-search.test.ts`, `fetch-site.test.ts` — data gathering
- `content-safety.test.ts`, `house-rules.test.ts` — copy policy (banned phrases, em-dashes)
- `determinism.test.ts`, `fixtures.test.ts` — caching and fixtures
- `generate.test.ts`, `orchestrator.test.ts`, `scoring.test.ts` — pipeline and scoring
- `lead-funnelr.test.ts`, `plumbing.test.ts`, `scorecard-lead-route.test.ts` — lead plumbing
- `lib/monitoring/dependency-health.test.ts` — dependency monitor

## Dev Scripts

| File | Role |
| --- | --- |
| `scripts/scorecard-mock-run.ts` | Run full pipeline in mock mode |
| `scripts/scorecard-real-run.ts` | Run against real APIs with logging |
| `scripts/scorecard-record-fixture.ts` | Record a real run as a fixture |
| `scripts/scorecard-score-fixture.ts` | Re-score an existing fixture (replay) |

## Reference & Docs

| File | Role |
| --- | --- |
| `reference/Nexubis_Part2B_Scorecard_BuildDoc_v3.md` | Full product specification (locked) |
| `reference/Nexubis_Scorecard_ClaudeCode_BuildPrompts_v1.md` | AI prompt reference |
| `docs/architecture/SCORECARD_HANDOFF.md` | Design/architecture handoff |
| `docs/qa/LAUNCH_CHECKLIST.md` | Pre-launch QA checklist |
| `docs/funnel-audit-checklist.md` | Launch readiness (env config, flags, monitoring) |
| `docs/go-live-and-migration.md` | Go-live procedures |
| `docs/FUNNELR_API.md` | Funnelr integration docs |
