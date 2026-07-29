# Blog Sanity Batch Report

Last updated: 2026-07-29T19:47:49.190Z
Batch ID: batch-2026-07-29-archive-final

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

- 85. Startup Time Traps | what-early-stage-founders-spend-way-too-much-time-on | https://www.nexubis.io/post/what-early-stage-founders-spend-way-too-much-time-on
- 86. How It All Started (and Almost Didn’t) | how-it-all-started-and-almost-didnt | https://www.nexubis.io/post/how-it-all-started-and-almost-didnt
- 87. How We Landed on Empowering Dreams | how-we-landed-on-empowering-dreams | https://www.nexubis.io/post/how-we-landed-on-empowering-dreams
- 88. Welcome to Dreamlab | welcome-to-dreamlab | https://www.nexubis.io/post/welcome-to-dreamlab

## Results

### Startup Time Traps

- Slug: `what-early-stage-founders-spend-way-too-much-time-on`
- Draft: `drafts.post-what-early-stage-founders-spend-way-too-much-time-on`
- Published: `post-what-early-stage-founders-spend-way-too-much-time-on`
- Author/category: `author-hannes-oosthuizen` / `category-startup-stack`
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

### How It All Started (and Almost Didn’t)

- Slug: `how-it-all-started-and-almost-didnt`
- Draft: `drafts.post-how-it-all-started-and-almost-didnt`
- Published: `post-how-it-all-started-and-almost-didnt`
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

### How We Landed on Empowering Dreams

- Slug: `how-we-landed-on-empowering-dreams`
- Draft: `drafts.post-how-we-landed-on-empowering-dreams`
- Published: `post-how-we-landed-on-empowering-dreams`
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

### Welcome to Dreamlab

- Slug: `welcome-to-dreamlab`
- Draft: `drafts.post-welcome-to-dreamlab`
- Published: `post-welcome-to-dreamlab`
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

