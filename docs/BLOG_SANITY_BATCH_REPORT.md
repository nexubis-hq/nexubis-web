# Blog Sanity Batch Report

Last updated: 2026-07-29T17:01:45.591Z
Batch ID: batch-2026-07-29-archive-02

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

- 14. The Power of LinkedIn | the-power-of-linkedin | https://www.nexubis.io/post/the-power-of-linkedin
- 15. How to not suck at job applications | how-to-not-suck-at-job-applications | https://www.nexubis.io/post/how-to-not-suck-at-job-applications
- 16. Momentum Fever | momentum-fever | https://www.nexubis.io/post/momentum-fever
- 17. Keep positioning yourself | keep-positioning-yourself | https://www.nexubis.io/post/keep-positioning-yourself
- 18. New Year’s Resolutions | new-years-resolutions | https://www.nexubis.io/post/new-years-resolutions
- 19. Goals vs. Movement | goals-vs-movement | https://www.nexubis.io/post/goals-vs-movement
- 20. 2025 In Retrospect | 2025-in-retrospect | https://www.nexubis.io/post/2025-in-retrospect
- 21. Long-Term Greed | long-term-greed | https://www.nexubis.io/post/long-term-greed
- 22. Dick Proves the Agency Stereotype | dick-proves-the-agency-stereotype | https://www.nexubis.io/post/dick-proves-the-agency-stereotype
- 23. Striving for “Culinary” Perfection | striving-for-culinary-perfection | https://www.nexubis.io/post/striving-for-culinary-perfection

## Results

### The Power of LinkedIn

- Slug: `the-power-of-linkedin`
- Draft: `drafts.post-the-power-of-linkedin`
- Published: `post-the-power-of-linkedin`
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

### How to not suck at job applications

- Slug: `how-to-not-suck-at-job-applications`
- Draft: `drafts.post-how-to-not-suck-at-job-applications`
- Published: `post-how-to-not-suck-at-job-applications`
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

### Momentum Fever

- Slug: `momentum-fever`
- Draft: `drafts.post-momentum-fever`
- Published: `post-momentum-fever`
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

### Keep positioning yourself

- Slug: `keep-positioning-yourself`
- Draft: `drafts.post-keep-positioning-yourself`
- Published: `post-keep-positioning-yourself`
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

### New Year’s Resolutions

- Slug: `new-years-resolutions`
- Draft: `drafts.post-new-years-resolutions`
- Published: `post-new-years-resolutions`
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

### Goals vs. Movement

- Slug: `goals-vs-movement`
- Draft: `drafts.post-goals-vs-movement`
- Published: `post-goals-vs-movement`
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

### 2025 In Retrospect

- Slug: `2025-in-retrospect`
- Draft: `drafts.post-2025-in-retrospect`
- Published: `post-2025-in-retrospect`
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

### Long-Term Greed

- Slug: `long-term-greed`
- Draft: `drafts.post-long-term-greed`
- Published: `post-long-term-greed`
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

### Dick Proves the Agency Stereotype

- Slug: `dick-proves-the-agency-stereotype`
- Draft: `drafts.post-dick-proves-the-agency-stereotype`
- Published: `post-dick-proves-the-agency-stereotype`
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

### Striving for “Culinary” Perfection

- Slug: `striving-for-culinary-perfection`
- Draft: `drafts.post-striving-for-culinary-perfection`
- Published: `post-striving-for-culinary-perfection`
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

