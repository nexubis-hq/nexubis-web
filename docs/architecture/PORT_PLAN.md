# PORT_PLAN.md — Industrial Brand Credibility Scorecard

Port of the LekkeWeb audit tool (snapshot at `reference/lekkeweb-audit-tool/`, gitignored)
into this repo as the Nexubis Scorecard, rebuilt to the Part 2B Build Doc v3
(`reference/Nexubis_Part2B_Scorecard_BuildDoc_v3.md`). Prompt pack:
`reference/Nexubis_Scorecard_ClaudeCode_BuildPrompts_v1.md`.

House rules (enforced as tests, not conventions): no em dashes anywhere; the word
"audit" never appears client-facing (it is the Scorecard / Credibility Check);
the AI scores only what it can see; Oxipack named exactly once per report; no hard
selling outside the fixed closing pages.

---

## 1. This repo

- **Framework:** Next.js 16.2.9 (App Router, Turbopack), React 19.2.7, TS 5. Path alias `@/*` → `./*`. `next.config.ts` is empty; no middleware; no route segment configs yet.
- **Styling:** Tailwind v4 via PostCSS, but components consume **CSS custom properties** from `app/globals.css :root` with semantic classes, not utility soup. Tokens to consume (never hardcode):
  - Colours: `--primary` #ff4141, `--black` #1d1c1a, `--body` #5a5a5a, `--mid` #888680, `--light` #eeeeec, `--white`, `--surface` #f2f2f2, `--work-black` #0f0f0f
  - Type: `--h1..--h4` (clamp), `--p-lg`, `--p-xl`; headings Helvetica Now Display 500, body Inter 400 (local `@font-face`, files at `public/assets/fonts/*.woff2` — these replace the snapshot's DM fonts in OG images)
  - Layout: `--container` 87.5rem, `--grid-gap`, spacing `--s-2..--s-8`; buttons `--button-y/x/radius`; classes `.site-container`, `.section`, `.btn`, `.btn-primary`, `.btn-secondary`
- **Shared components:** `SiteHeader`, `SiteFooter`, `RevealOnScroll` (`data-reveal` → GSAP y:40/opacity reveal, adds `.is-inview`, reduced-motion safe). Design language motifs in `DESIGN_ELEVATION.md` (L1 chat bubbles, L2 product vignettes, L3 card rhythm with ghost numerals, L5 one-red-accent 60-30-10).
- **Animation/markup coupling (from HOMEPAGE_MAP.md):** the `*Animations.tsx` drivers are markup-coupled (class names/counts); `RevealOnScroll` is the decoupled primitive — the report UI should lean on `data-reveal`/`.is-inview` only, never the homepage drivers.
- **Placeholder discipline:** the DMN pattern in `app/page.tsx` (~135–148): dev-only visible label + build-time `console.warn` in production when placeholder content survives. Reuse for the Loom slot and any pending copy.
- **Config:** `lib/site-config.ts` is the single URL module: `BOOKING_URL` (currently `/contact` interim), `SCORECARD_URL = "/scorecard"`, `OXIPACK_CASE_URL = "/work/oxipack"`, `SHOW_SCORECARD = process.env.NEXT_PUBLIC_SHOW_SCORECARD === "true"`.
- **Flag-gated surfaces (already built, do not rebuild):** hero transitional CTA "Check your brand's credibility" + support line "Not ready to book? Run the instant check and see where you're being undersold, on the spot."; Section 7 `ScorecardBlock` (headline "How credible is your brand, really?", locked sub/bullets/CTA/expectation/micro-proof per Part 2B §13); footer link "Brand Credibility Scorecard". **The header deliberately has no Scorecard link** (nav must not compete with the Book CTA) — Prompt 8's "four surfaces" resolve to: hero CTA, hero support line, Section 7 block, footer link.
- **Env handling today:** direct `process.env`, no validation layer, no tests, no test runner. `.env.local` is already populated (keys from the export; KV/Resend/Turnstile/Funnelr marked PENDING; fresh admin secrets generated).
- **Missing deps to add:** `vitest`, `zod`, `@upstash/redis`, `@anthropic-ai/sdk`, `cheerio`, `resend`. All conflict-free. (Do NOT port: `docx`, `@calcom/embed-react`, Meta pixel deps.)

## 2. The snapshot (what it is)

Working two-mode audit tool: landing → qualifier → scan (SSE stage stream) → instant teaser → Turnstile/email unlock → permanent shared report `audit/r/[slug]` (180-day TTL) → admin (leads, Loom attach). Engine: crawl (cheerio, ScrapingBee JS-render fallback) → ScreenshotOne + PageSpeed + Serper in parallel → Claude calls (Haiku default, Sonnet for vision/synthesis, temperature 0, structured outputs + zod, 2-attempt repair loop, 50s per-call timeout) → 7-pillar weighted scoring → package recommendation. KV-backed determinism envelope (`withCallEnvelope` + `searchCacheKey`, SHA-256 identity, 180-day TTL). Vitest suite over every pure module. Model IDs from `lib/stoep-plan/env.ts` (`ANTHROPIC_MODEL_HAIKU` default `claude-haiku-4-5-20251001`, `ANTHROPIC_MODEL_SONNET` default `claude-sonnet-4-6`), with a call-time mock-mode lever (`STOEP_MOCK=1`) to port as `SCORECARD_MOCK=1`.

## 3. Module-by-module port map

Target: `lib/scorecard/` (engine), `components/scorecard/` (UI), `app/scorecard/` + `app/api/scorecard/` (routes).

### lib/audit-tool → lib/scorecard

| Module | Decision | Notes |
|---|---|---|
| `fetch-site.ts` | **PORT AS-IS** | Crawl + page picker + `looksClientRendered` ScrapingBee fallback + `normaliseUrl`/`validateUrl`. Widen page picking to about/products/downloads/brochures/contact, up to 5 inner pages (Prompt 2). |
| `screenshot.ts` | **PORT AS-IS** | ScreenshotOne hero capture (block ads/cookie banners, delay 2s, 30-day cache). Add mobile viewport capture alongside 1440x900. Drop FB login-dismiss CSS (presence). |
| `pagespeed.ts` | **PORT AS-IS** | Mobile+desktop+LCP, 7-day cache, null-tolerant. |
| `web-search.ts` | **PORT AS-IS** | Serper + Anthropic web-search fallback + `searchCacheKey`. Change `gl=za` → EU-appropriate (`gl=nl`/none). New query set: LinkedIn presence, brochures/spec sheets (`filetype:pdf`), trade shows, competitor name→site resolution. |
| `kv.ts` | **PORT AS-IS** | Upstash client. Points at the NEW Nexubis database. |
| `limits.ts` + test | **PORT AS-IS** | Rename env vars (`AUDIT_*` → `SCORECARD_*`), keep IP window / per-target daily / global hourly caps + `SCORECARD_UNLIMITED_IPS`. |
| `disposable-domains.ts` | **PORT AS-IS** | |
| `content-safety.ts` + test | **PORT AS-IS** | `stripEmDashes(Deep)` + `sanitizeCopy`. Add "audit" to the client-facing banned-word scan. |
| `call-cache.ts` | **PORT AS-IS** | AsyncLocalStorage envelope. |
| `clamp.ts` | **PORT WITH CHANGES** | Keep `clampWords`; new clamp table for the new copy blocks (verdict paragraph, findings, first-fix copy). |
| `determinism.ts` + test | **PORT WITH CHANGES** | Identity becomes `prospect URL + sorted competitor URLs + productOneLiner` (no mode/town/industry). Keep SHA-256 key + 180-day TTL + `searchCacheKey`. |
| `cost-cache.ts` + test | **PORT AS-IS** | Complements call-cache. |
| `types.ts` | **PORT WITH CHANGES** | `ProspectData` → `{ name, company, url, role, productOneLiner, competitors: Array<{raw; name?; url?; resolved?: boolean}> }`. Strip mode/town/isOnline/industry/goal/handles. |
| `run.ts` + test | **PORT WITH CHANGES** | Keep `normaliseToHttps`, `deriveCompanyFromUrl`, run-record KV pattern. Single mode. |
| `orchestrator.ts` | **PORT WITH CHANGES** | Biggest rework: one pipeline × N companies (prospect + up to 3 resolved competitors) in parallel. Keep `withCallEnvelope`, rate-limit wiring, cost logging, `isSelfMatch` (reused for competitor self-match rejection). Drop presence pipeline, findCompetitors (prospect names them), AI-search visibility, package synthesis. Output: one `EvidenceBundle` per company. |
| `anthropic.ts` | **PORT WITH CHANGES** | Keep `runJson` (timeout, repair loop, structured outputs, zod fallback, usage/cost accounting), `readSiteVisuals`, COPY_DIET + NO_FALSE_NEGATIVE preambles. Replace all assess/synthesis calls with: (a) 25-check rubric scorer per company, (b) report-copy pass. Drop classifyIndustry, findCompetitors, checkAISearchVisibility, assessFindability, GBP/Facebook readers, PACKAGES dict. |
| `scoring.ts` + test | **REWRITE (port shape only)** | New model: 5 categories × 5 checks × 0–4 → /20 per category, /100 overall; null checks excluded from denominator, category scaled to 20; deterministic PageSpeed→points table in code; verdict bands in code (80–100 narrow / 60–79 visible / <60 wide, benchmark adjusts wording only); first-fix = lowest category, tie-break website → message clarity → product visuals → brand identity → trade show and print. |
| `output-schemas.ts` + `schema.ts` + test | **PORT WITH CHANGES** | Same JSON-Schema + zod pattern; new shapes per Part 2B §15 (meta, scores, totals, verdict, first_fix, exhibits, deck_copy, routing). |
| `unlock.ts` + test | **PORT WITH CHANGES** | Keep Turnstile, MX check, disposable filter, dedupe/idempotency, elapsed-time check. Add role field. Replace Meta CAPI with Funnelr HMAC webhook (3× retry, `webhook:failed` flag). Resend team notification. Flag-gated fallback Email 1 (`SCORECARD_SEND_EMAIL1`). Lead record keeps raw-email-free hashing pattern where possible, but the Part 2B lead record needs queryable email for admin — store it (this differs from LekkeWeb; leads live in OUR new KV). |
| `leads.ts` | **PORT WITH CHANGES** | New `LeadRecord`: name, email, role, company, url, productOneLiner, competitors, credibilityScore, verdict, firstFixCategory, reportSlug, timestamps, routing flags, note, loomStatus, webhook status. |
| `share.ts` | **PORT AS-IS** | Unguessable 8-char slugs, 180-day TTL, `patchShared`, view counter. Keys `scorecard:{slug}`. |
| `lead-quality.ts` + test | **REWRITE (as routing)** | Tier logic replaced by Part 2B routing flags: role seniority, vertical guess from productOneLiner, geo guess from TLD/content, suggested follow-up timing, Loom-candidate fit. |
| `auth.ts` | **PORT AS-IS** | Session-cookie admin auth on `SCORECARD_ADMIN_PASSWORD`/`SCORECARD_SESSION_SECRET`. |
| `loom.ts` | **PORT AS-IS** | Loom attach + loomStatus (none/selected/recorded/sent). |
| `recent.ts` | **PORT AS-IS** | Admin recents list. |
| `flags.ts` | **DROP** | `AUDIT_V3_ENABLED` obsolete; our flag is `NEXT_PUBLIC_SHOW_SCORECARD` (already in site-config). |
| `inspect.ts` | **PORT WITH CHANGES** | Internal debug helpers, useful for admin raw-scores view. |
| `presence.ts` + presence fixtures | **DROP** | Whole presence mode. Tendrils to cut while porting: mode branches in orchestrator, anthropic prompts, types, determinism, limits `targetHash`, run, unlock, scoring `SKIP_BY_MODE`, readiness, report-model, run/unlock routes, `detect-socials` route, AuditFlow qualifier, Slides 2–6 presence branches, OG images. |
| `industry-checklists.ts` | **DROP** | SA industry tokens. |
| `score-templates.ts` | **PORT WITH CHANGES** | Fallback templated copy when AI copy fails safety checks — useful; rewrite strings for the new categories. |
| `package-standards.ts` | **DROP** | LekkeWeb packages (Firestarter/Lekker Leads/Bakgat). Report ends on Book an application call. |
| `readiness.ts` (if present) | **DROP** | Replaced by verdict bands. |
| `report-model.ts` + test | **PORT WITH CHANGES** | Derive render model from the new structured output. |
| `no-em-dashes.test.ts` | **PORT AS-IS + EXTEND** | Scan all of `lib/scorecard/` + `components/scorecard/` string literals; add the audit-word scan. |
| `acceptance.test.ts` | **PORT WITH CHANGES** | Rebuild scenarios on the new rubric/verdict/first-fix + Oxipack-once + idempotency. |
| `unlock.test.ts`, `web-search.test.ts`, `run.test.ts`, `determinism.test.ts`, `limits.test.ts`, `cost-cache.test.ts`, `content-safety.test.ts`, `lead-quality.test.ts` | **PORT WITH CHANGES** | Follow their modules. |
| `og-fonts/` (DM Sans/Serif) | **DROP** | OG images use Helvetica Now Display + Inter from `public/assets/fonts/`. |
| `fixtures/website-audit.json` | **REPLACE** | New fixtures: recorded `EvidenceBundle` + scored report for a public industrial manufacturer (not a client), per Prompt 2/9. |
| `lib/stoep-plan/env.ts` | **PORT WITH CHANGES** | Becomes `lib/scorecard/env.ts`: full env surface with clear missing-key errors, model IDs (`ANTHROPIC_MODEL_HAIKU`/`SONNET` with current defaults), `SCORECARD_MOCK` call-time mock lever, credential-policy docs (new KV db, nexubis.io Resend sender, Turnstile hostname). |
| `lib/stoep-plan/tokens.ts`, `lib/seo.ts`, `lib/aeo-pages.ts`, `lib/homepage-faqs.ts`, `lib/redirects.ts`, `lib/schema.ts` (root) | **DROP** | LekkeWeb site concerns, not the tool. |

### app/ routes

| Snapshot | Decision | Target |
|---|---|---|
| `app/audit/page.tsx` (+ v2 fallback) | PORT WITH CHANGES | `app/scorecard/page.tsx` — landing + flow, single mode, locked Part 2B copy. |
| `app/api/audit/run` (SSE, maxDuration 120, force-dynamic) | PORT WITH CHANGES | `app/api/scorecard/run` — same SSE stage-stream pattern, new stages (Reading your site / Capturing first impressions / Checking your competitors / Scoring 25 checks). |
| `app/api/audit/unlock` | PORT WITH CHANGES | `app/api/scorecard/unlock` — Funnelr webhook replaces Meta CAPI. |
| `app/api/audit/detect-socials` | **DROP** | Presence-mode only. |
| `app/audit/r/[slug]` + OG image | PORT WITH CHANGES | `app/scorecard/r/[slug]` — new report pages (Part 2B §7), OG image on repo tokens/fonts, noindex. |
| `app/audit/admin{,/leads,/[slug]/edit}` | PORT WITH CHANGES | `app/scorecard/admin{,/leads,/[slug]}` — leads table + Loom candidate view + notes/loomStatus; internal report view with routing block + raw scores + Loom attach + regenerate. Noindex, out of sitemap. |

### components/

| Snapshot | Decision | Notes |
|---|---|---|
| `audit-flow/AuditFlow.tsx` | PORT WITH CHANGES | Steps become: landing → step-1 form (url + one-liner + 2–3 competitors) → scan → teaser → unlock → report. No mode choice, no qualifier. Reskin on repo tokens. |
| `audit-flow/ScanAnimation.tsx` | PORT WITH CHANGES | New stage labels; must tolerate real duration (~≤90s target). |
| `audit-flow/LandingRadar.tsx` | PORT WITH CHANGES | Rebuild as a Scorecard-shaped illustration (5 categories), or reuse the homepage ScorecardBlock vignette language (L2). |
| `audit-tool/slides/*`, `ScoreRing`, `ReportRadar`, report shell, `AuditProgress`, `PublicDeckNav`, `MobileDeckGate`, `StatusIcon` | PORT WITH CHANGES | Layout mechanics only; full reskin via `var(--x)` tokens (snapshot hardcodes emerald/amber/red hexes — all replaced). Report becomes mobile-first single-scroll (not a gated desktop deck): drop `MobileDeckGate`. 9 pages per Part 2B §7 incl. conditional Loom slot (DMN placeholder pattern) and teaser variant with blur + unlock panel. |
| `Nav.tsx`, `WhatsAppFAB`, `MetaPixel`, `LogoCarousel`, `JsonLd`, `ScrollProgress` | **DROP** | This repo has `SiteHeader`/`SiteFooter`; no Meta pixel, no WhatsApp FAB in the Nexubis design. |

## 4. Rename map

- Folders/files: `lib/audit-tool` → `lib/scorecard`; `components/audit-flow` + `components/audit-tool` → `components/scorecard/{flow,report}`; `app/audit` → `app/scorecard`; `app/api/audit/*` → `app/api/scorecard/*`.
- KV keys: `audit-gen:` → `scorecard-gen:`; `audit:{slug}` → `scorecard:{slug}`; `audit-leads` → `scorecard-leads`; `audit-lead:` dedupe → `scorecard-lead:`.
- Env vars: `AUDIT_TOOL_PASSWORD` → `SCORECARD_ADMIN_PASSWORD`; `AUDIT_TOOL_SESSION_SECRET` → `SCORECARD_SESSION_SECRET`; `AUDIT_UNLIMITED_IPS` → `SCORECARD_UNLIMITED_IPS`; `AUDIT_IP_WINDOW_DAYS`/`AUDIT_TARGET_DAILY_CAP`/`AUDIT_GLOBAL_HOURLY_CAP` → `SCORECARD_*`; `LEKKEWEB_TEAM_EMAIL` → `NEXUBIS_TEAM_EMAIL`; `AUDIT_V3_ENABLED`/`AUDIT_DEMO`/`STOEP_MOCK` → dropped/`SCORECARD_MOCK`; `TURNSTILE_SECRET` → `TURNSTILE_SECRET_KEY` (+ `NEXT_PUBLIC_TURNSTILE_SITE_KEY`).
- Client-facing strings: "audit" never appears; internal identifiers may keep `scorecard-tool` naming. Types: `AuditResult`→`ScorecardResult`, `SharedAudit`→`SharedScorecard`, etc.

## 5. Risks & mitigations

1. **Version skew is minimal** (snapshot: Next 16.2.4/React 19.2.4; repo: 16.2.9/19.2.7) — same major, low risk. Snapshot deps to add here: `@anthropic-ai/sdk@^0.99`, `@upstash/redis`, `zod@^4`, `cheerio`, `resend`, `vitest` (devDep). **No `docx`, no `@calcom/embed-react`, no `sharp`, no Meta.**
2. **No test runner in this repo yet** — add vitest + a `test` script; keep tests colocated as in the snapshot.
3. **Runtimes:** snapshot run route is Node (`force-dynamic`, `maxDuration: 120`) and OG images are edge. Vercel default maxDuration is now 300s, fine. Keep OG images on the default runtime unless the port shows otherwise.
4. **KV is PENDING** (new Upstash db not yet created) — everything must run in `SCORECARD_MOCK=1` locally; limits fall back to in-memory like the snapshot. Launch checklist gates on real KV.
5. **Turnstile/Resend/Funnelr keys PENDING** — unlock flow needs graceful dev behaviour (skip Turnstile verify when key unset, like the snapshot's fail-open patterns) but the launch checklist must hard-require them.
6. **Cost:** 4 companies × (crawl + 2 screenshots + PageSpeed + Serper trio + vision + scoring) ≈ 3–4× LekkeWeb per-run cost. Budget guard: hard caps per run, target < USD 0.40 fresh; envelope cache makes re-runs ~free.
7. **SSE + Turbopack dev:** the run route streams; verify streaming works under the always-on Ship Studio dev server (it did for LekkeWeb under the same stack).
8. **Report UI coupling:** do not touch homepage animation drivers; use `RevealOnScroll`/`data-reveal` only. Turbopack CSS HMR gotcha: edit near the top of `globals.css` to force recompile; browser is source of truth.
9. **`SCORECARD_URL` must stay the route** — tool lands at `/scorecard` exactly (site-config already points there); `BOOKING_URL` consumed from site-config in the report's next-step page (URL still interim `/contact`, pending from Leon).

## 6. Build phases (per the prompt pack)

1. **Foundation** (Prompt 1): `lib/scorecard/` engine modules + env + mock mode + house-rule tests, no UI.
2. **Evidence pipeline** (Prompt 2): multi-company orchestrator → `EvidenceBundle` per company + fixture.
3. **Scoring** (Prompt 3): 25-check rubric, verdict/first-fix in code, copy pass, §15 structured output.
4. **Report UI** (Prompt 4): `/scorecard/r/[slug]` + teaser variant + OG, Nexubis skin.
5. **Landing + flow** (Prompt 5): `/scorecard`, two-step form, scan, preview, unlock gate.
6. **Lead plumbing** (Prompt 6): Funnelr webhook + Resend + share hardening.
7. **Admin** (Prompt 7): leads, Loom, report ops.
8. **Wiring** (Prompt 8): flag on, verify 4 surfaces + rollback state.
9. **Acceptance** (Prompt 9): real-site runs, cost audit, failure drills, LAUNCH_CHECKLIST.md.
