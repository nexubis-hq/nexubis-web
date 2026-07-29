# Blog Sanity Batch Report

Last updated: 2026-07-29T19:05:00.000Z
Batch ID: batch-2026-07-29-archive-07

## Batch 06 Deployment Gate

- Batch 06 commit: `260db6f9e82172329a35fbcb5d1bdd215393ffbf`.
- Branch: `shannah`.
- Push status: committed and pushed to `origin/shannah`.
- Production deployment: `dpl_13ebu2sGdpSCQk28Brr5Fo4wL4sZ`, Ready, target `production`, aliased to `https://nexubis.vercel.app`.
- Vercel inspect and response headers did not expose Git commit SHA for the production deployment. Production state was verified behaviorally before Batch 07: `/blog` returned 88 unique cards with 64 Sanity cards and 24 generated fallback cards.

## Sanity Document Counts

- Published post documents: 64 before Batch 07.
- Draft post documents: 0.
- Author documents: 1.
- Category documents: 6.
- Version/release documents: 0.
- Other schema documents: 70 `sanity.imageAsset` documents before Batch 07.
- Published post query used the public website conditions: `_type == "post"`, `defined(slug.current)`, `defined(publishedAt)`, not drafts, not versions.
- Published post slugs were unique: 64 unique slugs, 0 duplicate published slugs.
- The earlier `48 valid documents` Sanity validation output was not a post count. It meant 48 validated schema documents had no warnings; 23 additional validated documents had warnings, for 71 validated documents total and 0 errors.

## Position 57 Investigation

- Position 57 title: `Rethinking the Nexubis Trial`.
- Exact slug: `rethinking-the-nexubis-trial`.
- Manifest status: `complete`.
- Batch: `priority-3c2`.
- Published Sanity ID: `post-rethinking-the-nexubis-trial`.
- Webflow draft/archive: false / false.
- Body: non-empty.
- Source conflict: none found.
- Staging route: `https://nexubis.vercel.app/post/rethinking-the-nexubis-trial` returned HTTP 200.
- Conclusion: position 57 was legitimately skipped by Batch 06 because it was already completed in the priority set; it remains included in the 88-post manifest and final inventory.

## Manifest Reconciliation

- Inventory records: 88.
- Manifest records: 88.
- Complete records before Batch 07: 64.
- Pending records before Batch 07: 24.
- Validation-failed records: 0.
- Duplicate manifest slugs: 0.
- Missing inventory slugs: 0.
- Extra manifest slugs: 0.
- Published Sanity slugs missing from manifest: 0.
- Completed manifest slugs missing from Sanity: 0.

## Preflight

- `/blog` before Batch 07: 88 unique cards, 64 Sanity cards, 24 generated fallback cards.
- All 64 pre-batch Sanity cards used `cdn.sanity.io` thumbnails.
- All six filter/category icons used Sanity assets; shared Blog interface graphics contained no Webflow dependency.
- All 64 completed `/post/[slug]` routes returned HTTP 200.
- Published Sanity summaries override generated records by exact slug; drafts, versions and release documents remain excluded.
- Authenticated command path confirmed: `npm run blog:migrate-batch` -> `sanity exec scripts/migrate-blog-sanity-batch.ts --with-user-token --`.
- No public/client-side Sanity write token was found; only public project/dataset IDs are exposed.

## Selected Posts

- 65. Manifestation: From Impossible to Probable | `manifestation-from-impossible-to-probable` | https://www.nexubis.io/post/manifestation-from-impossible-to-probable | Hannes Oosthuizen | Founders Diary | Wed Jun 11 2025 11:27:07 GMT+0000
- 66. Stop Selling Time. Start Delivering Value. | `stop-selling-time-start-delivering-value` | https://www.nexubis.io/post/stop-selling-time-start-delivering-value | Hannes Oosthuizen | Company | Thu Jun 12 2025 13:55:37 GMT+0000
- 67. The Nexubis Referral Program | `the-nexubis-referral-program` | https://www.nexubis.io/post/the-nexubis-referral-program | Hannes Oosthuizen | Company | Thu Jun 12 2025 13:55:37 GMT+0000
- 68. Overcoming Imposter Syndrome | `overcoming-imposter-syndrome` | https://www.nexubis.io/post/overcoming-imposter-syndrome | Hannes Oosthuizen | Founders Diary | Wed Jun 11 2025 11:27:07 GMT+0000
- 69. Dragonborn | `dragonborn` | https://www.nexubis.io/post/dragonborn | Hannes Oosthuizen | Founders Diary | Wed Jun 11 2025 11:27:07 GMT+0000
- 70. Building a Leadership Team | `building-a-leadership-team` | https://www.nexubis.io/post/building-a-leadership-team | Hannes Oosthuizen | Founders Diary | Wed Jun 11 2025 11:27:07 GMT+0000
- 71. Not Everyone Wants the Gold Bar | `not-everyone-wants-the-gold-bar` | https://www.nexubis.io/post/not-everyone-wants-the-gold-bar | Hannes Oosthuizen | Founders Diary | Wed Jun 11 2025 11:27:07 GMT+0000
- 72. The Process or People Problem | `the-process-or-people-problem` | https://www.nexubis.io/post/the-process-or-people-problem | Hannes Oosthuizen | Founders Diary | Wed Jun 11 2025 11:27:07 GMT+0000
- 73. Most of My Job Sucks | `most-of-my-job-sucks` | https://www.nexubis.io/post/most-of-my-job-sucks | Hannes Oosthuizen | Founders Diary | Wed Jun 11 2025 11:27:07 GMT+0000
- 74. Empowering Clients | `empowering-clients` | https://www.nexubis.io/post/empowering-clients | Hannes Oosthuizen | Empowering Dreams | Wed Jun 11 2025 11:27:07 GMT+0000

## Structured-Field Whitespace

- `Manifestation: From Impossible to Probable ` had trailing whitespace in the source title. The approved structured-field trimming removed only that outer title whitespace before writing to Sanity.
- No selected author name, category title, excerpt, SEO title or SEO description required trimming.
- Slugs, article body, headings, punctuation, capitalisation, URLs and captions were not altered.

## Publication Results

Manifestation: From Impossible to Probable

- Draft: `drafts.post-manifestation-from-impossible-to-probable`
- Published: `post-manifestation-from-impossible-to-probable`
- Author/category: `author-hannes-oosthuizen` / `category-founders-diary`
- Portable Text: 40 blocks, 8 headings, 31 paragraphs, 1 blockquote
- Excerpt: 155 -> 155
- SEO description: 132 -> 132
- Validation errors: none

Stop Selling Time. Start Delivering Value.

- Draft: `drafts.post-stop-selling-time-start-delivering-value`
- Published: `post-stop-selling-time-start-delivering-value`
- Author/category: `author-hannes-oosthuizen` / `category-company`
- Portable Text: 38 blocks, 6 headings, 15 paragraphs, 17 unordered list items, 1 link
- Excerpt: 162 -> 162
- SEO description: 154 -> 154
- Validation errors: none

The Nexubis Referral Program

- Draft: `drafts.post-the-nexubis-referral-program`
- Published: `post-the-nexubis-referral-program`
- Author/category: `author-hannes-oosthuizen` / `category-company`
- Portable Text: 33 blocks, 5 headings, 18 paragraphs, 10 unordered list items
- Excerpt: 367 -> 296
- SEO description: 93 -> 93
- Validation errors: none

Overcoming Imposter Syndrome

- Draft: `drafts.post-overcoming-imposter-syndrome`
- Published: `post-overcoming-imposter-syndrome`
- Author/category: `author-hannes-oosthuizen` / `category-founders-diary`
- Portable Text: 23 blocks, 4 headings, 17 paragraphs, 2 blockquotes
- Excerpt: 247 -> 247
- SEO description: 202 -> 169
- Validation errors: none

Dragonborn

- Draft: `drafts.post-dragonborn`
- Published: `post-dragonborn`
- Author/category: `author-hannes-oosthuizen` / `category-founders-diary`
- Portable Text: 14 blocks, 12 paragraphs, 2 blockquotes
- Excerpt: 303 -> 294
- SEO description: 198 -> 169
- Validation errors: none

Building a Leadership Team

- Draft: `drafts.post-building-a-leadership-team`
- Published: `post-building-a-leadership-team`
- Author/category: `author-hannes-oosthuizen` / `category-founders-diary`
- Portable Text: 30 blocks, 4 headings, 23 paragraphs, 3 unordered list items
- Excerpt: 176 -> 176
- SEO description: 136 -> 136
- Validation errors: none

Not Everyone Wants the Gold Bar

- Draft: `drafts.post-not-everyone-wants-the-gold-bar`
- Published: `post-not-everyone-wants-the-gold-bar`
- Author/category: `author-hannes-oosthuizen` / `category-founders-diary`
- Portable Text: 23 blocks, 4 headings, 19 paragraphs
- Excerpt: 319 -> 294
- SEO description: 335 -> 169
- Validation errors: none

The Process or People Problem

- Draft: `drafts.post-the-process-or-people-problem`
- Published: `post-the-process-or-people-problem`
- Author/category: `author-hannes-oosthuizen` / `category-founders-diary`
- Portable Text: 51 blocks, 8 headings, 35 paragraphs, 8 unordered list items
- Excerpt: 180 -> 180
- SEO description: 165 -> 165
- Validation errors: none

Most of My Job Sucks

- Draft: `drafts.post-most-of-my-job-sucks`
- Published: `post-most-of-my-job-sucks`
- Author/category: `author-hannes-oosthuizen` / `category-founders-diary`
- Portable Text: 34 blocks, 5 headings, 28 paragraphs, 1 blockquote
- Excerpt: 159 -> 159
- SEO description: 210 -> 164
- Validation errors: none

Empowering Clients

- Draft: `drafts.post-empowering-clients`
- Published: `post-empowering-clients`
- Author/category: `author-hannes-oosthuizen` / `category-empowering-dreams`
- Portable Text: 24 blocks, 2 headings, 16 paragraphs, 6 unordered list items
- Excerpt: 348 -> 299
- SEO description: 191 -> 169
- Validation errors: none

## Media

- Batch 07 media mappings: 30.
- Uploaded assets: 12.
- Reused mappings/assets: 18.
- Each selected post migrated thumbnail and Open Graph image to Sanity; category icons reused existing Sanity assets.
- AVIF assets uploaded for `stop-selling-time-start-delivering-value` and `the-nexubis-referral-program`.
- No inline image, hero media, Lottie fallback, Lottie JSON image, poster image, CMS file or YouTube showreel migration was required for these ten standard posts.

## Lottie And Showreel

- Lottie: not present for all ten selected posts.
- Showreel/video: not enabled for all ten selected posts.
- No malformed Lottie JSON, external Lottie asset, poster image or unsupported embed was found.

## Audits

- Stored-data Webflow audit: zero Webflow media/runtime dependencies in selected post documents, Portable Text, markDefs, SEO fields, thumbnails, author/category refs and Lottie fields.
- Sanity duplicate audit: exactly one published document per selected slug; deterministic IDs were reused.
- Blog DOM/hydration audit: `/blog` returned 88 unique cards; 74 Sanity thumbnail cards and 14 generated fallback cards. All ten Batch 07 card DOM fragments contain Sanity thumbnail URLs and no Webflow URL in src, srcset, serialized HTML or hydration content.
- Browser network audit: each selected `/post/[slug]` route made zero Webflow requests, contained zero Webflow URLs in rendered DOM, and had no console/page errors after scrolling.
- `/blog` full-scroll browser audit loaded 14 Webflow thumbnail requests from remaining generated fallback cards only; these belong to pending slugs and are not marked complete.
- Related-post audit: selected Sanity article routes rendered no related-post Webflow thumbnails and no Webflow related resources.

## Route And Card Verification

- All 74 completed staging routes returned HTTP 200.
- Every selected staging route returned HTTP 200 at `https://nexubis.vercel.app/post/[exact-slug]`.
- Exact `/post/[slug]` paths and canonical `https://www.nexubis.io/post/[exact-slug]` values were preserved. No `/blog/[slug]` routes, Vercel canonicals or redirects were created.
- Blog-card verification passed: exactly one card per selected slug, Sanity-sourced title/excerpt/category/thumbnail, Sanity category icon, stable `/post/[slug]` href, and no duplicates.

## Counts And Idempotency

- Previous source split: 64 Sanity / 24 generated fallback.
- New source split: 74 Sanity / 14 generated fallback.
- Verify-only rerun completed and marked all ten complete without duplicate posts, cards, authors, categories, references, body blocks, unnecessary asset uploads, changed slugs or reverted category icon mappings.

## Validation Commands

- Batch 06 commit/deployment check: passed; production state reflected 64/24.
- Direct Sanity document-count query: passed; 64 published posts before Batch 07.
- Inventory-position-57 investigation: passed; already complete priority post.
- Full manifest reconciliation: passed.
- Batch 07 dry-run: passed.
- Batch execute/publish: passed.
- Sanity document validation: passed, 56 valid documents, 25 warning documents, 0 errors, 81 validated documents.
- Verify-only/idempotency: passed.
- Exact-slug, stored-data Webflow, Blog DOM/hydration, browser network, route, card and related-post audits: passed for Batch 07.
- `npm run lint`: passed with 29 existing warnings and 0 errors.
- `npm run typecheck`: passed.
- `npm run test`: passed, 35 files / 270 tests.
- `npm run build`: passed.

## Remaining Work

- 14 generated fallback posts remain pending for later batches.
- Failed posts: 0.
- Posts requiring repair: none for Batch 07.
