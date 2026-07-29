# Blog Documentation Cleanup Manifest

Generated: 2026-07-29

Scope: focused post-migration cleanup for Blog/Sanity documentation, reports, manifests, and launch QA evidence. Application runtime code, Sanity content, public media, Webflow export material, DNS, deployment, staging, and commits were not changed.

## Inventory Summary

- Blog/Sanity documentation files reviewed: 32.
- Root-level repository Blog/Sanity report candidates: 0.
- `docs/` Blog/Sanity/pre-cutover candidates reviewed: 29.
- Existing archived generated Webflow JSON references reviewed: 3.
- Exact duplicate hashes among reviewed report files: 0.
- Canonical final records retained: 7.
- Files moved to `docs/migration/blog/`: 7.
- Files archived under `docs/archive/blog-migration/`: 16.
- Current launch QA files moved to `docs/qa/`: 4.
- Files deleted: 0.
- Manual-review items: 0 for this focused Blog documentation pass.

## Canonical Files Retained

| Old path | New path | Purpose | Evidence | Risk |
|---|---|---|---|---|
| `docs/BLOG_SANITY_BATCH_MANIFEST.json` | `docs/migration/blog/BLOG_SANITY_BATCH_MANIFEST.json` | Complete published-post, slug, source URL, batch, and Sanity document manifest. | Contains 88 posts, 88 unique slugs, complete statuses; used by migration recovery script and final cutover invariant test. | Low after script/test path updates. |
| `docs/BLOG_SANITY_BATCH_MEDIA_MAPPING.json` | `docs/migration/blog/BLOG_SANITY_BATCH_MEDIA_MAPPING.json` | Complete Webflow media to Sanity asset mapping. | Contains source URLs, hashes, Sanity asset IDs, dimensions, and upload/reuse status. | Low after script path update. |
| `docs/BLOG_FINAL_ROUTE_AUDIT.json` | `docs/migration/blog/BLOG_FINAL_ROUTE_AUDIT.json` | Final route, canonical, sitemap, and rendered media evidence. | Scanned 88 routes with no missing, broken, or changed original routes. | Low. |
| `docs/BLOG_WEBFLOW_DEPENDENCY_AUDIT.json` | `docs/migration/blog/BLOG_WEBFLOW_DEPENDENCY_AUDIT.json` | Final stored-data Webflow dependency evidence. | Scanned 88 published posts; reports zero runtime Webflow media dependencies and zero Webflow hits. | Low after script path update. |
| `docs/BLOG_FINAL_SANITY_CUTOVER_REPORT.md` | `docs/migration/blog/BLOG_FINAL_SANITY_CUTOVER_REPORT.md` | Final human-readable cutover report and recovery summary. | Documents 88 published posts, zero pending/failed manifest entries, and Webflow runtime removal. | Low; internal links updated. |
| `docs/BLOG_FINAL_WEBFLOW_REMOVAL_REPORT.md` | `docs/migration/blog/BLOG_FINAL_WEBFLOW_REMOVAL_REPORT.md` | Final Webflow-independence report. | Summarises zero runtime fallback imports and zero browser Webflow requests across `/blog` and 88 post routes. | Low. |
| `docs/BLOG_SANITY_BATCH_REPORT.md` | `docs/migration/blog/BLOG_SANITY_BATCH_REPORT.md` | Latest batch recovery report retained with final migration records. | Written by the batch migration script and contains final batch details plus the Oxipack title decision. | Low after script path update. |

## Files Archived

| Old path | New path | Reason |
|---|---|---|
| `docs/BLOG_FINAL_SANITY_CUTOVER_OUTPUT.txt` | `docs/archive/blog-migration/BLOG_FINAL_SANITY_CUTOVER_OUTPUT.txt` | Terminal-style final output; useful launch evidence but superseded by the final MD and JSON records. |
| `docs/BLOG_SANITY_BATCH_REPORT_OUTPUT.txt` | `docs/archive/blog-migration/BLOG_SANITY_BATCH_REPORT_OUTPUT.txt` | Console-output summary superseded by final cutover report and route/dependency audits. |
| `docs/BLOG_SANITY_BATCH_04_FINAL_REPORT.txt` | `docs/archive/blog-migration/BLOG_SANITY_BATCH_04_FINAL_REPORT.txt` | Historical per-batch completion report. |
| `docs/BLOG_SANITY_BATCH_05_FINAL_REPORT.txt` | `docs/archive/blog-migration/BLOG_SANITY_BATCH_05_FINAL_REPORT.txt` | Historical per-batch completion report. |
| `docs/BLOG_PRIORITY_SANITY_IMPORT_REPORT.md` | `docs/archive/blog-migration/BLOG_PRIORITY_SANITY_IMPORT_REPORT.md` | Pilot priority-post import report superseded by complete manifest; retained for troubleshooting. |
| `docs/BLOG_PRIORITY_MEDIA_MAPPING.json` | `docs/archive/blog-migration/BLOG_PRIORITY_MEDIA_MAPPING.json` | Priority-only media mapping superseded by complete media mapping; retained for recovery context. |
| `docs/BLOG_CIRCUIT_SANITY_IMPORT_REPORT.md` | `docs/archive/blog-migration/BLOG_CIRCUIT_SANITY_IMPORT_REPORT.md` | Circuit-only pilot import report superseded by final records; retained for troubleshooting. |
| `docs/BLOG_CIRCUIT_MEDIA_MAPPING.json` | `docs/archive/blog-migration/BLOG_CIRCUIT_MEDIA_MAPPING.json` | Circuit-only media mapping superseded by complete media mapping; retained for recovery context. |
| `docs/BLOG_INDEX_GENERATED_DATA.md` | `docs/archive/blog-migration/BLOG_INDEX_GENERATED_DATA.md` | Documents the former generated Webflow-backed Blog data workflow, which final cutover removed from runtime. |
| `docs/BLOG_INDEX_MEDIA_PENDING.md` | `docs/archive/blog-migration/BLOG_INDEX_MEDIA_PENDING.md` | Pending-media list resolved by final Sanity media migration and Webflow dependency audit; retained as history. |
| `docs/BLOG_POST_TEMPLATE_MEDIA_PENDING.md` | `docs/archive/blog-migration/BLOG_POST_TEMPLATE_MEDIA_PENDING.md` | Early fixture pending-media list resolved by final migration; retained as history. |
| `docs/PRE_BLOG_LINK_AUDIT.csv` | `docs/archive/blog-migration/PRE_BLOG_LINK_AUDIT.csv` | Pre-Blog audit superseded by final Blog migration and pre-cutover parity evidence. |
| `docs/PRE_BLOG_PRODUCTION_ENV_READINESS.md` | `docs/archive/blog-migration/PRE_BLOG_PRODUCTION_ENV_READINESS.md` | Pre-Blog environment readiness evidence; retained historically because it contains verified Vercel/env-name context. |
| `docs/PRE_BLOG_QA_HANDOFF.md` | `docs/archive/blog-migration/PRE_BLOG_QA_HANDOFF.md` | Pre-Blog QA handoff superseded by final migration state; retained for audit trail. |
| `docs/PRE_BLOG_ROUTE_AUDIT.csv` | `docs/archive/blog-migration/PRE_BLOG_ROUTE_AUDIT.csv` | Pre-Blog route audit superseded by final route audit. |
| `docs/PRE_BLOG_WEBFLOW_DEPENDENCY_AUDIT.md` | `docs/archive/blog-migration/PRE_BLOG_WEBFLOW_DEPENDENCY_AUDIT.md` | Pre-Blog dependency audit superseded by final Webflow dependency/removal reports. |

## Files Kept For Final QA

| Old path | New path | Purpose | When it can be archived |
|---|---|---|---|
| `docs/PRE_CUTOVER_CTA_HANDOFF.md` | `docs/qa/PRE_CUTOVER_CTA_HANDOFF.md` | Current CTA and Contact routing handoff before DNS cutover. | After DNS cutover and post-cutover CTA QA pass. |
| `docs/PRE_CUTOVER_LINK_FIXES.md` | `docs/qa/PRE_CUTOVER_LINK_FIXES.md` | Current link-fix evidence and accepted Cal.com/contact routing decisions. | After final link parity and post-cutover QA pass. |
| `docs/PRE_CUTOVER_LINK_PARITY_AUDIT.csv` | `docs/qa/PRE_CUTOVER_LINK_PARITY_AUDIT.csv` | Current pre-cutover link parity evidence. | After final URL parity and post-cutover link QA pass. |
| `docs/PRE_CUTOVER_LINK_PARITY_AUDIT_SUMMARY.txt` | `docs/qa/PRE_CUTOVER_LINK_PARITY_AUDIT_SUMMARY.txt` | Concise current parity summary. | After final URL parity and post-cutover link QA pass. |

## Files Deleted

None. No reviewed file met the deletion standard because the TXT outputs and pending reports still provide historical launch or troubleshooting context. They were archived instead.

## Resolved Pending Reports

- `docs/archive/blog-migration/BLOG_INDEX_MEDIA_PENDING.md`
- `docs/archive/blog-migration/BLOG_POST_TEMPLATE_MEDIA_PENDING.md`

Both documents described earlier pending Webflow/Sanity media work. Final cutover evidence now shows 88 Sanity-backed Blog posts, 88 Blog sitemap routes, zero generated fallbacks, and zero Blog runtime Webflow dependencies.

## Unresolved Migration Issues

None identified in the reviewed final migration records. A final URL-parity, sitemap, and Webflow-independence audit should still run after this cleanup as planned.

## Scripts Retained

| Script | Classification | Purpose | Path updates |
|---|---|---|---|
| `scripts/migrate-blog-sanity-batch.ts` | `KEEP_RECOVERY` | Batch migration/recovery script for complete manifest, report, audit, and media mapping. | Updated to read/write `docs/migration/blog/` final records. |
| `scripts/import-priority-blog-posts.ts` | `ARCHIVE_AFTER_CUTOVER` | Historical priority-post import/recovery script. | Updated to read/write archived priority report/mapping paths. |
| `scripts/import-circuit-blog-post.ts` | `ARCHIVE_AFTER_CUTOVER` | Historical Circuit pilot import/recovery script. | Updated to read/write archived Circuit report/mapping paths. |
| `scripts/generate-blog-index-data.ts` | `ARCHIVE_AFTER_CUTOVER` | Historical generated-data recovery script; runtime no longer depends on generated Webflow JSON. | No path change in this pass. |
| `scripts/generate-blog-post-fixtures.ts` | `ARCHIVE_AFTER_CUTOVER` | Historical generated fixture recovery script. | No path change in this pass. |
| `scripts/verify-priority-blog-posts.ts` | `ARCHIVE_AFTER_CUTOVER` | Historical priority import verification helper. | No path change in this pass. |
| `scripts/verify-circuit-blog-post-import.ts` | `ARCHIVE_AFTER_CUTOVER` | Historical Circuit import verification helper. | No path change in this pass. |

## Broken References Corrected

- `scripts/migrate-blog-sanity-batch.ts`
- `scripts/import-priority-blog-posts.ts`
- `scripts/import-circuit-blog-post.ts`
- `lib/blog/blog-final-cutover.test.ts`
- `docs/README.md`
- `docs/migration/blog/BLOG_FINAL_SANITY_CUTOVER_REPORT.md`
- `docs/archive/blog-migration/BLOG_PRIORITY_SANITY_IMPORT_REPORT.md`
- `docs/archive/blog-migration/BLOG_CIRCUIT_SANITY_IMPORT_REPORT.md`
- `docs/qa/PRE_CUTOVER_LINK_PARITY_AUDIT_SUMMARY.txt`

Historical cleanup manifests may still mention the old paths as historical state snapshots.

## Manual Review Required

None for this focused Blog documentation cleanup. Historical migration scripts should be reviewed after DNS cutover and post-launch QA before removal.

## Validation Results

Validation was run after the cleanup:

- `npm run typecheck`: passed.
- `npm run test`: passed, 38 test files and 281 tests.
- `npm run build`: passed. Next.js generated 104 static pages, including `/blog`, 88 `/post/[slug]` pages, `robots.txt`, and `sitemap.xml`.
- `git diff --cached --name-status`: no staged files.
- Canonical final manifests still exist under `docs/migration/blog/`.
- `webflow-export/` remains intact.
- The `docs/` root now contains only `README.md` and shared Funnelr/go-live/case-study documents.
