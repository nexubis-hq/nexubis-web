# Blog Sanity Batch Report

Last updated: 2026-07-29T17:33:26.739Z
Batch ID: batch-2026-07-29-archive-03

## Task 3C2 Preflight

- /blog production state before this batch: 88 unique cards, 4 Sanity cards, 84 generated fallback cards.
- Sanity exact-slug precedence remains implemented in `lib/blog/get-blog-index-posts.ts`.
- Drafts, versions and release documents remain excluded by the published summary query.
- `/post/[slug]` still uses published Sanity first via `getPostBySlug`.
- No Sanity write token is exposed in client-side code; batch writes use the locally authenticated Sanity CLI user.
- Production application code does not read `webflow-export`; only migration scripts read offline CSV files.
- `lib/blog/related-posts.ts` keeps generated-only related summaries because the helper is synchronous and unrelated to `/blog` Sanity precedence.
- `scripts/generate-blog-index-data.ts` writes `source: "generated"` so generated fallback records satisfy the shared summary type.

## Oxipack Title Check

Authoritative body/source comparison supports `Oxipack: Funding Nexubis`: Webflow Blog CSV, generated Blog record, published Sanity document, current `/blog` card, and live Webflow article H1 all use that title. The live Webflow page HTML title says `Oxipack: Empowering Nexubis`, but the article content and CMS sources do not. No Sanity title change was made.

```json
{
  "liveWebflowArticleH1": "Oxipack: Funding Nexubis",
  "liveWebflowHtmlTitle": "Oxipack: Empowering Nexubis",
  "webflowCsv": "Oxipack: Funding Nexubis",
  "generated": "Oxipack: Funding Nexubis",
  "sanity": [
    {
      "_id": "post-oxipack-empowering-nexubis",
      "slug": "oxipack-empowering-nexubis",
      "title": "Oxipack: Funding Nexubis"
    }
  ],
  "productionBlogCardContainsFunding": true,
  "productionPostContainsFunding": true,
  "conclusion": "Keep Oxipack: Funding Nexubis"
}
```

## Selected Posts

- 24. The Walter Mitty Effect | the-walter-mitty-effect | https://www.nexubis.io/post/the-walter-mitty-effect
- 25. The Discipline of Quitting | the-discipline-of-quitting | https://www.nexubis.io/post/the-discipline-of-quitting
- 26. Empowering Women with Project Flamingo | empowering-women-with-project-flamingo | https://www.nexubis.io/post/empowering-women-with-project-flamingo
- 27. The Legendary Play  | the-legendary-play | https://www.nexubis.io/post/the-legendary-play
- 28. Keep Firing Yourself (Part 2) | keep-firing-yourself-part-2 | https://www.nexubis.io/post/keep-firing-yourself-part-2
- 29. Skip the Ladder. Join a Startup. | skip-the-ladder-join-a-startup | https://www.nexubis.io/post/skip-the-ladder-join-a-startup
- 30. Fresh Out of College… Now What? | fresh-out-of-college-now-what | https://www.nexubis.io/post/fresh-out-of-college-now-what
- 31. For Professionals, By Professionals | for-professionals-by-professionals | https://www.nexubis.io/post/for-professionals-by-professionals
- 32. Pick Your Battles | pick-your-battles | https://www.nexubis.io/post/pick-your-battles
- 33. Make It Memorable | make-it-memorable | https://www.nexubis.io/post/make-it-memorable

## Results

### The Walter Mitty Effect

- Slug: `the-walter-mitty-effect`
- Draft: `drafts.post-the-walter-mitty-effect`
- Published: `post-the-walter-mitty-effect`
- Author/category: `author-hannes-oosthuizen` / `category-founders-diary`
- Portable Text: 0 blocks, 0 headings, 0 paragraphs, 0 bullet items, 0 ordered items, 0 blockquotes, 0 links, 0 inline images
- Excerpt: 0 -> 0
- SEO description: 0 -> 0
- Media records: 0
- Lottie: not present; Webflow URLs: 0
- Validation errors: none
- Route verified: true
- Blog card verified: true
- Stored zero-Webflow check: passed
- Rendered zero-Webflow verified: true

### The Discipline of Quitting

- Slug: `the-discipline-of-quitting`
- Draft: `drafts.post-the-discipline-of-quitting`
- Published: `post-the-discipline-of-quitting`
- Author/category: `author-hannes-oosthuizen` / `category-founders-diary`
- Portable Text: 0 blocks, 0 headings, 0 paragraphs, 0 bullet items, 0 ordered items, 0 blockquotes, 0 links, 0 inline images
- Excerpt: 0 -> 0
- SEO description: 0 -> 0
- Media records: 0
- Lottie: not present; Webflow URLs: 0
- Validation errors: none
- Route verified: true
- Blog card verified: true
- Stored zero-Webflow check: passed
- Rendered zero-Webflow verified: true

### Empowering Women with Project Flamingo

- Slug: `empowering-women-with-project-flamingo`
- Draft: `drafts.post-empowering-women-with-project-flamingo`
- Published: `post-empowering-women-with-project-flamingo`
- Author/category: `author-hannes-oosthuizen` / `category-empowering-dreams`
- Portable Text: 0 blocks, 0 headings, 0 paragraphs, 0 bullet items, 0 ordered items, 0 blockquotes, 0 links, 0 inline images
- Excerpt: 0 -> 0
- SEO description: 0 -> 0
- Media records: 0
- Lottie: not present; Webflow URLs: 0
- Validation errors: none
- Route verified: true
- Blog card verified: true
- Stored zero-Webflow check: passed
- Rendered zero-Webflow verified: true

### The Legendary Play

- Slug: `the-legendary-play`
- Draft: `drafts.post-the-legendary-play`
- Published: `post-the-legendary-play`
- Author/category: `author-hannes-oosthuizen` / `category-founders-diary`
- Portable Text: 0 blocks, 0 headings, 0 paragraphs, 0 bullet items, 0 ordered items, 0 blockquotes, 0 links, 0 inline images
- Excerpt: 0 -> 0
- SEO description: 0 -> 0
- Media records: 0
- Lottie: not present; Webflow URLs: 0
- Validation errors: none
- Route verified: true
- Blog card verified: true
- Stored zero-Webflow check: passed
- Rendered zero-Webflow verified: true

### Keep Firing Yourself (Part 2)

- Slug: `keep-firing-yourself-part-2`
- Draft: `drafts.post-keep-firing-yourself-part-2`
- Published: `post-keep-firing-yourself-part-2`
- Author/category: `author-hannes-oosthuizen` / `category-founders-diary`
- Portable Text: 0 blocks, 0 headings, 0 paragraphs, 0 bullet items, 0 ordered items, 0 blockquotes, 0 links, 0 inline images
- Excerpt: 0 -> 0
- SEO description: 0 -> 0
- Media records: 0
- Lottie: not present; Webflow URLs: 0
- Validation errors: none
- Route verified: true
- Blog card verified: true
- Stored zero-Webflow check: passed
- Rendered zero-Webflow verified: true

### Skip the Ladder. Join a Startup.

- Slug: `skip-the-ladder-join-a-startup`
- Draft: `drafts.post-skip-the-ladder-join-a-startup`
- Published: `post-skip-the-ladder-join-a-startup`
- Author/category: `author-hannes-oosthuizen` / `category-for-professionals`
- Portable Text: 0 blocks, 0 headings, 0 paragraphs, 0 bullet items, 0 ordered items, 0 blockquotes, 0 links, 0 inline images
- Excerpt: 0 -> 0
- SEO description: 0 -> 0
- Media records: 0
- Lottie: not present; Webflow URLs: 0
- Validation errors: none
- Route verified: true
- Blog card verified: true
- Stored zero-Webflow check: passed
- Rendered zero-Webflow verified: true

### Fresh Out of College… Now What?

- Slug: `fresh-out-of-college-now-what`
- Draft: `drafts.post-fresh-out-of-college-now-what`
- Published: `post-fresh-out-of-college-now-what`
- Author/category: `author-hannes-oosthuizen` / `category-for-professionals`
- Portable Text: 0 blocks, 0 headings, 0 paragraphs, 0 bullet items, 0 ordered items, 0 blockquotes, 0 links, 0 inline images
- Excerpt: 0 -> 0
- SEO description: 0 -> 0
- Media records: 0
- Lottie: not present; Webflow URLs: 0
- Validation errors: none
- Route verified: true
- Blog card verified: true
- Stored zero-Webflow check: passed
- Rendered zero-Webflow verified: true

### For Professionals, By Professionals

- Slug: `for-professionals-by-professionals`
- Draft: `drafts.post-for-professionals-by-professionals`
- Published: `post-for-professionals-by-professionals`
- Author/category: `author-hannes-oosthuizen` / `category-for-professionals`
- Portable Text: 0 blocks, 0 headings, 0 paragraphs, 0 bullet items, 0 ordered items, 0 blockquotes, 0 links, 0 inline images
- Excerpt: 0 -> 0
- SEO description: 0 -> 0
- Media records: 0
- Lottie: not present; Webflow URLs: 0
- Validation errors: none
- Route verified: true
- Blog card verified: true
- Stored zero-Webflow check: passed
- Rendered zero-Webflow verified: true

### Pick Your Battles

- Slug: `pick-your-battles`
- Draft: `drafts.post-pick-your-battles`
- Published: `post-pick-your-battles`
- Author/category: `author-hannes-oosthuizen` / `category-founders-diary`
- Portable Text: 0 blocks, 0 headings, 0 paragraphs, 0 bullet items, 0 ordered items, 0 blockquotes, 0 links, 0 inline images
- Excerpt: 0 -> 0
- SEO description: 0 -> 0
- Media records: 0
- Lottie: not present; Webflow URLs: 0
- Validation errors: none
- Route verified: true
- Blog card verified: true
- Stored zero-Webflow check: passed
- Rendered zero-Webflow verified: true

### Make It Memorable

- Slug: `make-it-memorable`
- Draft: `drafts.post-make-it-memorable`
- Published: `post-make-it-memorable`
- Author/category: `author-hannes-oosthuizen` / `category-founders-diary`
- Portable Text: 0 blocks, 0 headings, 0 paragraphs, 0 bullet items, 0 ordered items, 0 blockquotes, 0 links, 0 inline images
- Excerpt: 0 -> 0
- SEO description: 0 -> 0
- Media records: 0
- Lottie: not present; Webflow URLs: 0
- Validation errors: none
- Route verified: true
- Blog card verified: true
- Stored zero-Webflow check: passed
- Rendered zero-Webflow verified: true
