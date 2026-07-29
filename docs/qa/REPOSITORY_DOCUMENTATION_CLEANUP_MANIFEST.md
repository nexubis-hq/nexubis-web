# Repository Documentation Cleanup Manifest

Generated: 2026-07-29
Branch: `shannah`

## Summary

- Reviewed files and directories: 62
- Kept in root: 18
- Moved to docs: 9
- Archived: 6
- Deleted: 2
- Left as active work: 18
- Manual review required: 2
- Application code changed by this cleanup: no

## Files Kept In Root

| Path | Reason |
| --- | --- |
| `README.md` | Repository entry document. |
| `CLAUDE.md` | Agent tooling expects this in the root and it references root `SITE.md`. |
| `SITE.md` | Current site source of truth used by agent workflow; links updated for moved docs. |
| `package.json` | npm project manifest and scripts. |
| `package-lock.json` | npm lockfile. |
| `tsconfig.json` | TypeScript configuration. |
| `next.config.ts` | Next.js configuration. |
| `next-env.d.ts` | Next.js-managed type shim expected in the root. |
| `sanity.config.ts` | Sanity Studio configuration. |
| `sanity.cli.ts` | Sanity CLI configuration. |
| `vitest.config.ts` | Test configuration. |
| `eslint.config.mjs` | ESLint configuration. |
| `postcss.config.mjs` | PostCSS/Tailwind configuration. |
| `.gitignore` | Repository ignore rules. |
| `.env.example` | Safe environment template. |
| `.mcp.json` | Local MCP/project configuration. |
| `.prettierrc` | Prettier configuration. |
| `.prettierignore` | Prettier ignore configuration. |

## Files Moved To Docs

| From | To | Classification | Evidence | Risk |
| --- | --- | --- | --- | --- |
| `ASSET_BRIEF.md` | `docs/architecture/ASSET_BRIEF.md` | `MOVE_DOCS_ARCHITECTURE` | Design asset brief linked by design docs; no script references. | Low |
| `DESIGN_DIRECTIONS.md` | `docs/architecture/DESIGN_DIRECTIONS.md` | `MOVE_DOCS_ARCHITECTURE` | Homepage section direction; no script references. | Low |
| `DESIGN_ELEVATION.md` | `docs/architecture/DESIGN_ELEVATION.md` | `MOVE_DOCS_ARCHITECTURE` | Homepage design language; no script references. | Low |
| `HOMEPAGE_MAP.md` | `docs/architecture/HOMEPAGE_MAP.md` | `MOVE_DOCS_ARCHITECTURE` | Homepage implementation map; no script references. | Low |
| `PACKAGES_MAP.md` | `docs/architecture/PACKAGES_MAP.md` | `MOVE_DOCS_ARCHITECTURE` | Packages implementation map; no script references. | Low |
| `PACKAGES_V2.md` | `docs/architecture/PACKAGES_V2.md` | `MOVE_DOCS_ARCHITECTURE` | Current packages source-of-truth; `SITE.md` links updated. | Medium |
| `PORT_PLAN.md` | `docs/architecture/PORT_PLAN.md` | `MOVE_DOCS_ARCHITECTURE` | Scorecard architecture/build plan; no script references. | Low |
| `SCORECARD_HANDOFF.md` | `docs/architecture/SCORECARD_HANDOFF.md` | `MOVE_DOCS_ARCHITECTURE` | Scorecard system handoff; no script references. | Low |
| `LAUNCH_CHECKLIST.md` | `docs/qa/LAUNCH_CHECKLIST.md` | `MOVE_DOCS_QA` | Launch handoff; `SITE.md` and `docs/go-live-and-migration.md` links updated. | Medium |

## Files Left Untouched Because They Are Active Work

| Path | Classification | Evidence |
| --- | --- | --- |
| `docs/BLOG_SANITY_BATCH_MANIFEST.json` | `LEAVE_ACTIVE_WORK` | Modified today; read/written by `scripts/migrate-blog-sanity-batch.ts`. |
| `docs/BLOG_SANITY_BATCH_MEDIA_MAPPING.json` | `LEAVE_ACTIVE_WORK` | Modified today; read/written by `scripts/migrate-blog-sanity-batch.ts`. |
| `docs/BLOG_SANITY_BATCH_REPORT.md` | `LEAVE_ACTIVE_WORK` | Modified today; written by `scripts/migrate-blog-sanity-batch.ts`. |
| `docs/BLOG_WEBFLOW_DEPENDENCY_AUDIT.json` | `LEAVE_ACTIVE_WORK` | Modified today; written by `scripts/migrate-blog-sanity-batch.ts`. |
| `docs/BLOG_SANITY_BATCH_04_FINAL_REPORT.txt` | `LEAVE_ACTIVE_WORK` | Blog migration batch history; current batch reports cite it. |
| `docs/BLOG_SANITY_BATCH_05_FINAL_REPORT.txt` | `LEAVE_ACTIVE_WORK` | Blog migration batch history; current batch reports cite it. |
| `docs/BLOG_SANITY_BATCH_REPORT_OUTPUT.txt` | `LEAVE_ACTIVE_WORK` | Latest final batch output; active migration not final-QA complete. |
| `docs/BLOG_PRIORITY_MEDIA_MAPPING.json` | `LEAVE_ACTIVE_WORK` | Read/written by `scripts/import-priority-blog-posts.ts`. |
| `docs/BLOG_PRIORITY_SANITY_IMPORT_REPORT.md` | `LEAVE_ACTIVE_WORK` | Written by `scripts/import-priority-blog-posts.ts`. |
| `docs/BLOG_CIRCUIT_MEDIA_MAPPING.json` | `LEAVE_ACTIVE_WORK` | Read/written by `scripts/import-circuit-blog-post.ts`. |
| `docs/BLOG_CIRCUIT_SANITY_IMPORT_REPORT.md` | `LEAVE_ACTIVE_WORK` | Written by `scripts/import-circuit-blog-post.ts`. |
| `docs/BLOG_INDEX_MEDIA_PENDING.md` | `LEAVE_ACTIVE_WORK` | Active media migration pending list. |
| `docs/BLOG_POST_TEMPLATE_MEDIA_PENDING.md` | `LEAVE_ACTIVE_WORK` | Active post-template media pending list. |
| `docs/BLOG_INDEX_GENERATED_DATA.md` | `LEAVE_ACTIVE_WORK` | Documents active blog generated-data workflow. |
| `docs/PRE_BLOG_LINK_AUDIT.csv` | `LEAVE_ACTIVE_WORK` | Current pre-blog QA artifact. |
| `docs/PRE_BLOG_ROUTE_AUDIT.csv` | `LEAVE_ACTIVE_WORK` | Current pre-blog QA artifact. |
| `docs/PRE_BLOG_QA_HANDOFF.md` | `LEAVE_ACTIVE_WORK` | Current pre-blog QA handoff. |
| `docs/PRE_BLOG_PRODUCTION_ENV_READINESS.md` | `LEAVE_ACTIVE_WORK` | Current production readiness audit. |

## Files Archived

| From | To | Evidence |
| --- | --- | --- |
| `QA_REPORT.md` | `docs/archive/QA_REPORT.md` | Historical homepage QA report; useful context but no longer root source-of-truth. |
| `CRITIQUE_LOG.md` | `docs/archive/CRITIQUE_LOG.md` | Historical critique log; useful context but no longer root source-of-truth. |
| `package-copy-corrections-report.txt` | `docs/archive/package-copy-corrections-report.txt` | Final one-off package copy correction summary retained for audit history. |
| `docs/scorecard-glass-restyle.md` | `docs/archive/scorecard-glass-restyle.md` | File states the restyle is parked and not incorporated. |
| `docs/MAIN_SHOWREEL_REPLACEMENT_REPORT.txt` | `docs/archive/MAIN_SHOWREEL_REPLACEMENT_REPORT.txt` | Historical one-off media replacement report; no script references. |
| `docs/PACKAGES_DESKTOP_LOTTIE_REPLACEMENT_REPORT.txt` | `docs/archive/PACKAGES_DESKTOP_LOTTIE_REPLACEMENT_REPORT.txt` | Historical one-off Lottie replacement report; no script references. |

## Files Deleted

| Path | Classification | Evidence |
| --- | --- | --- |
| `package-copy-consistency-report.txt` | `DELETE_GENERATED_TEMP` | Interim package-copy report superseded by retained `docs/archive/package-copy-corrections-report.txt`; no script references. |
| `tsconfig.tsbuildinfo` | `DELETE_GENERATED_TEMP` | TypeScript build cache, ignored by `*.tsbuildinfo`, untracked/ignored local artifact. |

## Files Requiring Manual Review

| Path | Reason |
| --- | --- |
| `.qa/` | Tracked screenshot/measurement evidence. It appears historical and bulky, but tracked evidence should be reviewed before archive/deletion. |
| `qa/` | Ignored local QA screenshots/logs. It is probably disposable, but broad directory deletion was intentionally avoided. |

## Duplicate And Superseded Files Found

- `package-copy-consistency-report.txt` was superseded by `package-copy-corrections-report.txt` and source/test changes; the former was deleted, the latter archived.
- No exact duplicate documentation files were intentionally removed.
- Historical Blog batch reports mention moved/deleted report paths. Those historical documents were not rewritten because they record past working-tree state.

## Gitignore Changes

No `.gitignore` changes were required. Existing narrow rules already cover:

- `.env.local` through `.env*` with `!.env.example`
- `.env.*.local` through `.env*`
- `.vercel`
- `.vercel-old-link`
- `*.tsbuildinfo`
- `/qa/`
- `/webflow-export/`
- `/docs/funnelr-snapshots/`

## Broken References Corrected

- `SITE.md` now points to `docs/architecture/PACKAGES_V2.md`.
- `SITE.md` now points to `docs/qa/LAUNCH_CHECKLIST.md`.
- `docs/go-live-and-migration.md` now points to `qa/LAUNCH_CHECKLIST.md`.

## Sensitive Local Files

- `.env.local` remains ignored and was not displayed or modified.
- `docs/funnelr-snapshots/` remains ignored because it can contain live contact data.
- `.vercel/` and `.vercel-old-link/` remain ignored local deployment state.

## Validation Results

- `git status --short`: cleanup changes are present as unstaged deletes/untracked moved destinations because no staging was performed. Additional active Blog/Sanity/package changes from other work are also present.
- `git diff --cached --name-only`: empty; nothing was staged.
- `.env.local`: remains ignored by `.gitignore:34`.
- `tsconfig.tsbuildinfo`: remains ignored by `.gitignore:42`; exact local cache file was deleted.
- `next-env.d.ts`: still exists in the repository root.
- Root configuration files checked: `package.json`, `next.config.ts`, `sanity.config.ts`, and `vercel.json` still exist in the repository root.
- Active Blog/Sanity paths are still referenced by `scripts/migrate-blog-sanity-batch.ts`, `scripts/import-priority-blog-posts.ts`, and `scripts/import-circuit-blog-post.ts`; those files were not moved.
- `npm run typecheck`: failed in active `lib/blog/blog-batch-selection.test.ts` work because fixture `status` values are inferred as `string` instead of the `BatchStatus` union.
- `npm run test`: passed, 38 files and 281 tests.
- `npm run build`: did not compile because Next reported another build process already running. Multiple live `node` processes were present, so no process or `.next` cleanup was performed.
