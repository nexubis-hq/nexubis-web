# Blog Sanity Batch Report

Last updated: 2026-07-29T19:32:00+02:00
Batch ID: batch-2026-07-29-archive-08

## Batch 07 Deployment Verification

- Batch 07 commit: `7630ef9e5f97762aac54943bffec1dc2c128cb7e`.
- Branch: `shannah`.
- Push result: branch was aligned with `origin/shannah` before Batch 08 work.
- Vercel deployment: `dpl_13ebu2sGdpSCQk28Brr5Fo4wL4sZ`, Ready, aliased to `https://nexubis.vercel.app`.
- Deployed Blog state before Batch 08: 88 unique cards, 74 Sanity cards, 14 generated fallback cards.

## Preflight And Reconciliation

- Published Blog posts before Batch 08: 74; unique published slugs: 74; duplicate slugs: 0.
- Unexpected draft Blog posts: 0.
- Public version/release Blog documents: 0.
- Manifest records: 88 total, 74 complete, 14 pending, 0 validation-failed.
- Missing manifest slugs: 0; extra manifest slugs: 0.
- Completed manifest slugs missing from Sanity: 0.
- Published Sanity slugs missing from manifest: 0.
- Authenticated command path confirmed: `sanity exec scripts/migrate-blog-sanity-batch.ts --with-user-token --`.
- No public/client-side Sanity write token was found.

## Selected Posts

1. 75. Building Fast vs. Building Right | `building-fast-vs-building-right` | https://www.nexubis.io/post/building-fast-vs-building-right
2. 76. Empowering Communities | `empowering-communities` | https://www.nexubis.io/post/empowering-communities
3. 77. The Work-Life Balance Lie | `the-work-life-balance-lie` | https://www.nexubis.io/post/the-work-life-balance-lie
4. 78. When Branding Does (and Doesn’t) Matter | `when-branding-does-and-doesnt-matter` | https://www.nexubis.io/post/when-branding-does-and-doesnt-matter
5. 79. Empowering Founders | `empowering-founders` | https://www.nexubis.io/post/empowering-founders
6. 80. Keep Firing Yourself | `keep-firing-yourself` | https://www.nexubis.io/post/keep-firing-yourself
7. 81. How We Work | `how-we-work` | https://www.nexubis.io/post/how-we-work
8. 82. The Tech Stack We Actually Recommend | `the-tech-stack-we-actually-recommend` | https://www.nexubis.io/post/the-tech-stack-we-actually-recommend
9. 83. Empowering Teams | `empowering-teams` | https://www.nexubis.io/post/empowering-teams
10. 84. AI Isn’t Coming — It’s Already Here | `ai-isnt-coming-its-already-here` | https://www.nexubis.io/post/ai-isnt-coming-its-already-here

All ten were authored by Hannes Oosthuizen. Categories reused: Startup Stack, Empowering Dreams, Founders Diary, and Artificial Intelligence. Published source date for all ten selected records: Wed Jun 11 2025 11:27:07 GMT+0000.

## Final Four Readiness

These records were checked but restored to pending and were not left published:

1. 85. Startup Time Traps | `what-early-stage-founders-spend-way-too-much-time-on` | https://www.nexubis.io/post/what-early-stage-founders-spend-way-too-much-time-on
2. 86. How It All Started (and Almost Didn’t) | `how-it-all-started-and-almost-didnt` | https://www.nexubis.io/post/how-it-all-started-and-almost-didnt
3. 87. How We Landed on Empowering Dreams | `how-we-landed-on-empowering-dreams` | https://www.nexubis.io/post/how-we-landed-on-empowering-dreams
4. 88. Welcome to Dreamlab | `welcome-to-dreamlab` | https://www.nexubis.io/post/welcome-to-dreamlab

Each has a source row and required media reference. A retry after an execute timeout briefly published these four; the four published Sanity post documents were deleted, their manifest rows were restored to pending, and their media mapping rows were removed. Batch 08 final state remains 84 complete and 4 pending.

## Publication Results

- Drafts created/replaced: `drafts.post-[exact-slug]` for all ten selected posts.
- Published IDs: `post-[exact-slug]` for all ten selected posts.
- Posts published: 10.
- Posts left as drafts: 0.
- Posts requiring repair: 0.
- Final four pending: 4.

## Structured Fields

- Existing narrow trimming was reused for title, author name, category title, excerpt, SEO title, and SEO description.
- Source field needing outer-whitespace cleanup: `how-we-work` excerpt.
- Slugs, article bodies, headings, punctuation, capitalization, captions and URLs were not altered.

## Portable Text

- Building Fast vs. Building Right: 61 blocks, 6 headings, 31 paragraphs, 15 unordered items, 4 ordered items, 5 blockquotes, 0 links, 0 inline images.
- Empowering Communities: 25 blocks, 4 headings, 18 paragraphs, 3 unordered items.
- The Work-Life Balance Lie: 29 blocks, 4 headings, 22 paragraphs, 3 unordered items, 1 link.
- When Branding Does (and Doesn’t) Matter: 51 blocks, 6 headings, 26 paragraphs, 18 unordered items, 1 blockquote.
- Empowering Founders: 30 blocks, 4 headings, 22 paragraphs, 4 unordered items.
- Keep Firing Yourself: 42 blocks, 5 headings, 31 paragraphs, 6 unordered items.
- How We Work: 43 blocks, 9 headings, 31 paragraphs, 3 unordered items.
- The Tech Stack We Actually Recommend: 74 blocks, 8 headings, 42 paragraphs, 24 unordered items.
- Empowering Teams: 18 blocks, 5 headings, 9 paragraphs, 4 unordered items.
- AI Isn’t Coming — It’s Already Here: 48 blocks, 7 headings, 31 paragraphs, 10 unordered items.

## Excerpt And SEO

- All excerpts are 300 characters or fewer after normalization.
- All SEO descriptions are 170 characters or fewer after normalization.
- SEO title length warnings remain non-blocking; no SEO title truncation was applied.

## Media

- Batch 08 media mapping rows: 30.
- Uploaded: 11.
- Reused: 19.
- Migrated fields per selected post: `post.thumbnail`, `post.seo.openGraphImage`, and `category.icon`.
- Category icons reused existing Sanity assets.
- Lottie/showreel: none present in the selected ten; no Lottie or showreel fields were invented.

## Webflow Audits

- Stored-data Webflow audit: passed for all ten selected Sanity documents; zero Webflow media/runtime URLs stored.
- Blog card verification: importer verify-only marked all ten cards complete, Sanity-sourced, Sanity-thumbnail backed, and zero-Webflow verified.
- Blog DOM/hydration: `/blog` returns 88 unique cards. Selected Batch 08 cards are Sanity-backed; the only remaining Webflow DOM media belongs to the four pending fallback cards.
- Browser network audit: `/blog` made zero Webflow requests. Each selected article route made zero Webflow requests after scrolling.
- Rendered article audit: each selected route contained zero Webflow media/runtime URLs.
- Related-post audit: selected routes rendered zero Webflow URLs; no Sanity-backed related thumbnail fell back to Webflow.

## Route And Card Verification

- All ten selected routes returned HTTP 200 at `https://nexubis.vercel.app/post/[exact-slug]`.
- Canonical remains `https://www.nexubis.io/post/[exact-slug]`.
- Exact `/post/[slug]` route was preserved for every selected post.
- No `/blog/[slug]` route or redirect was created.
- `/blog` final source split: 84 Sanity cards and 4 generated fallback cards.

## Idempotency

- Verify-only against `batch-2026-07-29-archive-08` completed all ten records without duplicate posts, authors, categories, references, cards or slugs.
- Published Sanity posts after Batch 08: 84.
- Unique published slugs after Batch 08: 84.
- Duplicate published slugs: 0.
- Draft Blog posts: 0.

## Validation

- Batch dry-run: passed on positions 75-84.
- Batch execute/publish: completed after retry; final-four accidental retry state was repaired.
- Sanity document validation: 0 errors; 27 existing SEO-title warnings.
- Verify-only: passed; all ten Batch 08 entries complete.
- Stored-data audit: passed.
- Blog DOM/hydration audit: passed for selected cards; four fallback Webflow thumbnails remain pending.
- Browser network audit: passed for selected routes and `/blog`.
- Public-route verification: passed.
- Blog-card verification: passed.
- Related-post verification: passed.
- Lint: passed with 29 existing warnings.
- Typecheck: passed.
- Test: passed, 35 files and 270 tests.
- Build: passed.

## Files Changed

- `docs/BLOG_SANITY_BATCH_MANIFEST.json`
- `docs/BLOG_SANITY_BATCH_MEDIA_MAPPING.json`
- `docs/BLOG_SANITY_BATCH_REPORT.md`
- `docs/BLOG_SANITY_BATCH_REPORT_OUTPUT.txt`
- `docs/BLOG_WEBFLOW_DEPENDENCY_AUDIT.json`

## Excluded Dirty Files

- `app/api/contact/route.ts`
- `components/CompetitorComparisonLottie.tsx`
- `components/ContactTabs.tsx`
- `lib/contact/contact-route.test.ts`
- `lib/packages-faq.ts`
- `docs/BLOG_SANITY_BATCH_04_FINAL_REPORT.txt`
- `docs/BLOG_SANITY_BATCH_05_FINAL_REPORT.txt`
- `docs/MAIN_SHOWREEL_REPLACEMENT_REPORT.txt`
- `docs/PACKAGES_DESKTOP_LOTTIE_REPLACEMENT_REPORT.txt`
- `lib/packages-faq.test.ts`
- `package-copy-consistency-report.txt`
- `package-copy-corrections-report.txt`
- `public/assets/lotties/CompetitorComparison_Euro.json`

