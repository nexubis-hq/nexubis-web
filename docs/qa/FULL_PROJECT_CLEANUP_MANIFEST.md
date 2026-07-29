# Full Project Cleanup Manifest

Generated: 2026-07-29
Branch: `shannah`
Starting commit: `c7f338254b8155846a20fc5fde12d1e71fe9a7c3`
Repository root: `C:/Users/shann/ShipStudio/nexubis-site`

## 1. Inventory Summary

- Tracked files inventoried: 612.
- Untracked non-ignored files at start: 1.
- Tracked `.qa/` and `qa/` files: 110.
- Tracked public assets reviewed by reference/hash scan: public asset tree.
- Root config files checked: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`, `sanity.config.ts`, `sanity.cli.ts`, `vitest.config.ts`, `vercel.json`, `.gitignore`, `.env.example`, `CLAUDE.md`.
- Ignored local files confirmed: `.env.local`, `.next/`, `.vercel`, `.vercel-old-link`, `tsconfig.tsbuildinfo`, `.shipstudio/`, `docs/funnelr-snapshots/`, `webflow-export/`, `node_modules/`.
- Active processes: multiple `next dev` / `next start` Node processes are running, with `.next/dev/lock` present. `.next/` and `tsconfig.tsbuildinfo` were not deleted.

## 2. Proposed Action Table

| Current path | Classification | Proposed action | Destination | References | Evidence | Risk | Launch-critical | Approved by rules | Action taken |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `PACKAGES_MOBILE_EURO_LOTTIE_ADAPTATION_REPORT.txt` | `ARCHIVE_HISTORICAL` | Move | `docs/archive/PACKAGES_MOBILE_EURO_LOTTIE_ADAPTATION_REPORT.txt` | self only | one-off Lottie adaptation report; no source references | Low | No | Yes | Moved |
| `.gitignore` | `KEEP_ROOT_REQUIRED` | Add narrow generated-folder ignores | root | repository tooling | `test-results/` and `.tmp-sanity-import/` are local generated folders | Low | No | Yes | Updated |
| `docs/README.md` | `KEEP_DOCS_CANONICAL` | Update index | same | docs index | prior wording still treated Blog migration as active | Low | Yes | Yes | Updated |
| `tsconfig.tsbuildinfo` | `DELETE_BUILD_CACHE` | Delete after processes stop | n/a | ignored cache | ignored by `*.tsbuildinfo`; active processes recreated it | Low | No | No while active | Deferred |
| `.next/` | `DELETE_BUILD_CACHE` | Delete after processes stop | n/a | Next cache | `.next/dev/lock` and active Next processes present | Medium | No | No while active | Deferred |
| `.qa/` | `MANUAL_REVIEW_REQUIRED` | Human decision | n/a | tracked evidence | 110 tracked QA files across `.qa/` and `qa/` | Medium | Possibly | No | Left |
| `qa/` | `MANUAL_REVIEW_REQUIRED` | Human decision | n/a | ignored local evidence | ignored local screenshots/logs, useful names | Medium | Possibly | No | Left |
| `components/PackagesPricing.tsx` | `MANUAL_REVIEW_REQUIRED` | Split/remove unused export later | n/a | `PackagesServices` imported by `/packages` | `PackagesPricing` unused, `PackagesServices` active | Medium | Yes | No source edit in cleanup | Left |
| duplicate public asset groups | `MANUAL_REVIEW_REQUIRED` | Human visual review | n/a | possible dynamic/media usage | exact hash duplicates found | Medium | Yes | No | Left |
| `docs/BLOG_PRIORITY_*` and `docs/BLOG_CIRCUIT_*` | `MANUAL_REVIEW_REQUIRED` | Archive after launch if desired | n/a | scripts write exact paths | pilot import history, final records supersede them | Low/Medium | No | No until post-cutover | Left |

## 3. Files Kept In Root

- `README.md`: repository overview.
- `CLAUDE.md`: root agent instructions.
- `SITE.md`: current site source of truth expected by agent workflow.
- `package.json`, `package-lock.json`: npm project files.
- `tsconfig.json`, `next.config.ts`, `next-env.d.ts`: TypeScript/Next config.
- `sanity.config.ts`, `sanity.cli.ts`: Sanity config.
- `vitest.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`: test/lint/build config.
- `.gitignore`, `.env.example`, `.mcp.json`, `.prettierrc`, `.prettierignore`: root tooling/config.
- `.env.local`: ignored sensitive local file; not displayed or changed.

## 4. Files Moved

- `PACKAGES_MOBILE_EURO_LOTTIE_ADAPTATION_REPORT.txt` -> `docs/archive/PACKAGES_MOBILE_EURO_LOTTIE_ADAPTATION_REPORT.txt`.

## 5. Files Archived

- One new archive move in this pass: `docs/archive/PACKAGES_MOBILE_EURO_LOTTIE_ADAPTATION_REPORT.txt`.
- Existing archive from prior cleanup retained: homepage QA/design reports, showreel/Lottie reports, package-copy correction report, parked Scorecard restyle, and archived generated Blog Webflow JSON.

## 6. Files Deleted

No files were deleted in this pass.

Deletion of empty `.tmp-sanity-import/` and `test-results/` was attempted as exact paths but blocked by local safety policy, so they remain manual/local cleanup items.

## 7. Dead Source Removed

None.

`components/PackagesPricing.tsx` contains an unused `PackagesPricing` export with retired Flex/pricing code, but the same file still exports active `PackagesServices`. It was left untouched for a dedicated source cleanup.

## 8. Assets Removed

None.

Exact duplicate asset hash groups found but not removed:

- `public/assets/images/about-reel-poster.jpg` and `public/assets/images/reel_draft.jpg`
- `public/assets/images/trial-background-poster.jpg` and `public/assets/videos/3D-Abstract-Waves-Black-Background-2023-11-27-04-58-03-Utc-poster-00001.jpg`
- `public/assets/images/Website-Packages-video-poster-00001.jpg` and `public/assets/videos/Website-Packages-video-poster-00001.jpg`
- `public/assets/work/circuit/hero-poster.webp` and `public/assets/work/oxipack/hero-poster.webp`

## 9. QA Files Classified

- `.qa/`: tracked historical visual QA evidence; `MANUAL_REVIEW_REQUIRED`.
- `qa/`: ignored local QA evidence; `MANUAL_REVIEW_REQUIRED`.
- `.shipstudio/`: ignored local Ship Studio metadata; `SENSITIVE_LOCAL` / local tooling.
- `test-results/`: local generated test output; now ignored by exact rule.

## 10. Blog Migration Files Retained

Retained as canonical or recovery-useful migration records:

- `docs/BLOG_FINAL_SANITY_CUTOVER_REPORT.md`
- `docs/BLOG_FINAL_SANITY_CUTOVER_OUTPUT.txt`
- `docs/BLOG_FINAL_ROUTE_AUDIT.json`
- `docs/BLOG_FINAL_WEBFLOW_REMOVAL_REPORT.md`
- `docs/BLOG_SANITY_BATCH_MANIFEST.json`
- `docs/BLOG_SANITY_BATCH_MEDIA_MAPPING.json`
- `docs/BLOG_SANITY_BATCH_REPORT.md`
- `docs/BLOG_SANITY_BATCH_REPORT_OUTPUT.txt`
- `docs/BLOG_WEBFLOW_DEPENDENCY_AUDIT.json`
- `docs/archive/blog-webflow-generated/`
- `webflow-export/` as ignored reference material.

Pilot/intermediate records retained for manual post-cutover decision:

- `docs/BLOG_PRIORITY_*`
- `docs/BLOG_CIRCUIT_*`
- `docs/BLOG_SANITY_BATCH_04_FINAL_REPORT.txt`
- `docs/BLOG_SANITY_BATCH_05_FINAL_REPORT.txt`
- `docs/BLOG_INDEX_MEDIA_PENDING.md`
- `docs/BLOG_POST_TEMPLATE_MEDIA_PENDING.md`

## 11. Webflow References Classified

- `PRODUCTION_DEPENDENCY`: none found in app runtime source for Webflow JS/CSS/forms.
- `MIGRATION_SOURCE`: `scripts/generate-blog-index-data.ts`, `scripts/generate-blog-post-fixtures.ts`, `scripts/import-circuit-blog-post.ts`, `scripts/import-priority-blog-posts.ts`, `scripts/migrate-blog-sanity-batch.ts`.
- `REFERENCE_ONLY`: `README.md`, `docs/CASE_STUDY_MEDIA_MAPPING.md`, `docs/BLOG_INDEX_GENERATED_DATA.md`.
- `HISTORICAL_DOCUMENTATION`: pre-blog and final migration docs/audits.
- `SANITY_CONTENT_PENDING_MEDIA` / historical mapping: Webflow CDN URLs in Blog media mapping JSON and pending-media docs.

## 12. Environment Documentation Findings

`.env.example` is incomplete relative to current `process.env` references.

Missing from `.env.example` but referenced by code:

- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL_HAIKU`
- `ANTHROPIC_MODEL_SONNET`
- `AUDIT_INTERNAL_EMAILS`
- `CRON_SECRET`
- `FUNNELR_ALLOW_WRITE_TEST`
- `FUNNELR_NURTURE_AFTER_DAYS`
- `FUNNELR_NURTURE_ENABLED`
- `FUNNELR_NURTURE_FROM`
- `FUNNELR_WEBHOOK_SECRET`
- `FUNNELR_WEBHOOK_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_URL`
- `META_CAPI_TOKEN`
- `META_CURRENCY`
- `META_LEAD_VALUE`
- `META_TEST_EVENT_CODE`
- `NEXT_PUBLIC_META_PIXEL_ID`
- `NEXT_PUBLIC_SHOW_SCORECARD`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `NEXUBIS_TEAM_EMAIL`
- `PAGESPEED_API_KEY`
- `RENDER_API_KEY`
- `REPLY_TAGGING_ENABLED`
- `REPLY_WEBHOOK_SECRET`
- `SCORECARD_ADMIN_PASSWORD`
- `SCORECARD_EMAIL_FROM`
- `SCORECARD_GLOBAL_HOURLY_CAP`
- `SCORECARD_IP_WINDOW_DAYS`
- `SCORECARD_LEAD_EMAILS`
- `SCORECARD_MOCK`
- `SCORECARD_SEND_EMAIL1`
- `SCORECARD_SENDER_FIRST_NAME`
- `SCORECARD_SESSION_SECRET`
- `SCORECARD_TARGET_DAILY_CAP`
- `SCORECARD_UNLIMITED_IPS`
- `SCREENSHOTONE_ACCESS_KEY`
- `SERPER_API_KEY`
- `TURNSTILE_SECRET_KEY`

Present in `.env.example` but not found by direct `process.env.X` scan:

- `CAL_APPLICATION_EVENT_SLUG`
- `CAL_WEBHOOK_SECRET`
- `FUNNELR_TEST_CONTACT_EMAIL`
- `FUNNELR_TEST_LIST_ID`
- `FUNNELR_TEST_TAG_ID`

Note: `CAL_*` variables are consumed through `lib/cal-webhook/handler.ts` via an injected env type rather than direct `process.env.X` in the route, so they should remain documented.

## 13. Gitignore Changes

Added narrow generated-local rules:

- `/test-results/`
- `/.tmp-sanity-import/`

No broad Markdown/TXT/JSON/CSV/report/docs ignore rules were added.

## 14. Broken References Corrected

No broken source imports or package script paths were changed in this pass.

`docs/README.md` was updated to reflect the current canonical docs and post-cutover retention rules.

## 15. Package Script Audit

Package scripts resolve to existing command targets:

- `blog:migrate-batch` -> `scripts/migrate-blog-sanity-batch.ts`
- `funnelr:inspect` -> `scripts/funnelr-inspect.ts`
- `funnelr:verify:nexubis` -> `scripts/funnelr-verify-nexubis-readonly.ts`
- `funnelr:verify:lekkeweb` -> `scripts/funnelr-verify-lekkeweb-readonly.ts`
- `test:funnelr:write` -> `scripts/test-funnelr-write.ts`

No package script was removed.

## 16. URL Audit

Remaining `https://www.nexubis.io` references in application source are canonical metadata, sitemap, scorecard/report URL generation, internal-origin sanitisation, tests, and user-agent context. These are valid before DNS cutover.

Remaining `https://nexubis.vercel.app` references are final route/migration audit evidence and migration script staging constants.

Remaining direct Cal.com references are approved contact embed/fallback text, central `lib/booking.ts`, Scorecard report booking prefill links, docs, and tests.

No `/privacy` or `/terms` route references were found in application source during the targeted audit; references in fixture text or external crawl evidence are not app routes.

## 17. Validation Results

Validation was run after the cleanup edits:

- `npm run lint`: passed with 29 warnings and 0 errors. Warnings were pre-existing source warnings for `<img>` usage, one unused eslint-disable directive, and one unused `SCORECARD_URL` import.
- `npm run typecheck`: passed.
- `npm run test`: passed, 38 test files and 281 tests.
- `npm run build`: passed. Next.js generated 104 static pages, including Blog posts, `robots.txt`, and `sitemap.xml`.
- `git diff --cached --name-status`: no staged files.
- `git check-ignore`: confirmed `.env.local`, `.next`, `.vercel`, `.vercel-old-link`, `tsconfig.tsbuildinfo`, `/test-results/`, and `/.tmp-sanity-import/` are ignored.

`qa/` is not broadly ignored because tracked reusable/evidence files already exist there and require manual review.

## 18. Manual Review Candidates

See `docs/qa/MANUAL_CLEANUP_REVIEW.md`.
