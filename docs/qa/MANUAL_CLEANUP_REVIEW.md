# Manual Cleanup Review

Generated: 2026-07-29

## `.qa/`

- Why uncertain: tracked screenshot and measurement evidence, 110 files, about 73.7 MB. It is not runtime code, but tracked visual QA evidence can be useful during launch review.
- Risk: medium.
- Recommended human decision: after final launch QA, decide whether to keep selected evidence, archive it outside the repo, or remove it from Git history in a separate storage-focused cleanup.
- Consequence of keeping it: larger repository, but preserved visual audit trail.
- Consequence of removing it: smaller repository, but loss of historical screenshot evidence.

## `qa/`

- Why uncertain: ignored local QA screenshots/logs, including many route and media checks. It appears generated and disposable, but it contains useful launch evidence names.
- Risk: medium.
- Recommended human decision: review after launch; keep only evidence needed for final QA handoff, then delete exact selected local files.
- Consequence of keeping it: local disk clutter only, because `/qa/` is ignored.
- Consequence of removing it: loss of local visual evidence, but no repository impact.

## `components/PackagesPricing.tsx`

- Why uncertain: `PackagesPricing` export appears unused, but `PackagesServices` from the same file is actively imported by `app/packages/page.tsx`.
- Risk: medium.
- Recommended human decision: split `PackagesServices` into its own component and remove the unused old pricing export in a dedicated source cleanup with tests.
- Consequence of keeping it: stale Flex/pricing code remains in source but does not render.
- Consequence of removing it incorrectly: `/packages` can break if `PackagesServices`, its Lottie helpers, or service styles are removed with it.

## Public Asset Duplicate Groups

- Why uncertain: exact duplicate hashes exist, but image paths can be referenced dynamically, by documentation, or by future/manual QA.
- Risk: medium.
- Recommended human decision: review each pair visually and with route screenshots before deleting.
- Consequence of keeping it: small avoidable asset duplication.
- Consequence of removing it incorrectly: broken poster, case-study, or visual fallback.

Potential duplicate groups:

- `public/assets/images/about-reel-poster.jpg` and `public/assets/images/reel_draft.jpg`
- `public/assets/images/trial-background-poster.jpg` and `public/assets/videos/3D-Abstract-Waves-Black-Background-2023-11-27-04-58-03-Utc-poster-00001.jpg`
- `public/assets/images/Website-Packages-video-poster-00001.jpg` and `public/assets/videos/Website-Packages-video-poster-00001.jpg`
- `public/assets/work/circuit/hero-poster.webp` and `public/assets/work/oxipack/hero-poster.webp`

## `.env.example`

- Why uncertain: it is incomplete relative to current `process.env` usage, but the production environment may intentionally contain Vercel/Upstash integration variables not suitable for the minimal local template.
- Risk: medium.
- Recommended human decision: update `.env.example` or create a dedicated `docs/operations/ENVIRONMENT_VARIABLES.md` once final launch env ownership is confirmed.
- Consequence of keeping it: new developers may miss required Scorecard/Funnelr/Meta/Sanity variables.
- Consequence of changing it incorrectly: confusion between required secrets, optional flags, public build-time variables, and test-only variables.

## `docs/BLOG_PRIORITY_*` and `docs/BLOG_CIRCUIT_*`

- Why uncertain: these are superseded by final Blog/Sanity cutover records, but import scripts still write the exact paths and the files provide pilot import history.
- Risk: low to medium.
- Recommended human decision: after DNS cutover and post-cutover QA, archive these pilot records or keep them beside final records as migration history.
- Consequence of keeping it: extra migration clutter.
- Consequence of removing it: loss of pilot import context.

## `scripts/import-priority-blog-posts.ts` and `scripts/import-circuit-blog-post.ts`

- Why uncertain: likely superseded by the final batch migration, but useful for recovery or comparison while launch is still in progress.
- Risk: medium.
- Recommended human decision: keep until post-cutover QA and then archive/remove in a dedicated migration-script cleanup.
- Consequence of keeping it: source tree retains obsolete migration scripts.
- Consequence of removing it: less recovery ability if a pilot post needs reinspection.

## `scripts/generate-blog-index-data.ts` and `scripts/generate-blog-post-fixtures.ts`

- Why uncertain: production no longer depends on generated Webflow JSON, but these scripts may remain useful to rebuild archived reference data.
- Risk: medium.
- Recommended human decision: keep until Webflow export recovery is no longer needed, then remove with the archived generated JSON decision.
- Consequence of keeping it: old Webflow generation path remains visible.
- Consequence of removing it: harder to reproduce archived generated Blog fixtures.

## `tsconfig.tsbuildinfo`

- Why uncertain: disposable ignored build cache, but active Next dev/build processes are running and recently recreated it.
- Risk: low.
- Recommended human decision: delete only after dev/build processes are stopped.
- Consequence of keeping it: harmless local cache file, ignored by Git.
- Consequence of removing it: TypeScript will recreate it.

## `.next/`

- Why uncertain: ignored build/dev cache with active Next processes and `.next/dev/lock`.
- Risk: medium while dev server is running.
- Recommended human decision: delete only after all Next dev/start/build processes stop.
- Consequence of keeping it: local disk usage.
- Consequence of removing it while active: could disrupt the running preview.

## `.tmp-sanity-import/` and `test-results/`

- Why uncertain: empty local generated directories. Exact deletion was attempted but blocked by local safety policy.
- Risk: low.
- Recommended human decision: remove manually after confirming no active process needs them.
- Consequence of keeping it: harmless empty local directories.
- Consequence of removing it: no repository impact.
