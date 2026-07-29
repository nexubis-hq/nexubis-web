# Blog Sanity Batch Report

Last updated: 2026-07-29T16:36:27.984Z
Batch ID: batch-2026-07-29-archive-01

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

- 1. The Nexubis Effect | the-nexubis-effect | https://www.nexubis.io/post/the-nexubis-effect
- 5. AI Is Not a Phase. It's an Era. | ai-is-not-a-phase-its-an-era | https://www.nexubis.io/post/ai-is-not-a-phase-its-an-era
- 6. Metamorphosis | metamorphosis | https://www.nexubis.io/post/metamorphosis
- 7. Beyond the €30 000  | beyond-the-eu30-000 | https://www.nexubis.io/post/beyond-the-eu30-000
- 8. The Cost of Refusing to Adapt | the-cost-of-refusing-to-adapt | https://www.nexubis.io/post/the-cost-of-refusing-to-adapt
- 9. The Gold Bar Theory | the-gold-bar-theory | https://www.nexubis.io/post/the-gold-bar-theory
- 10. Partnership Over Transaction | partnership-over-transaction | https://www.nexubis.io/post/partnership-over-transaction
- 11. Impact Builds Network | impact-builds-network | https://www.nexubis.io/post/impact-builds-network
- 12. Just Do It | just-do-it | https://www.nexubis.io/post/just-do-it
- 13. My 1st Biggest Mistake | my-1st-biggest-mistake | https://www.nexubis.io/post/my-1st-biggest-mistake

## Results

### The Nexubis Effect

- Slug: `the-nexubis-effect`
- Draft: `drafts.post-the-nexubis-effect`
- Published: `post-the-nexubis-effect`
- Author/category: `author-hannes-oosthuizen` / `category-company`
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

### AI Is Not a Phase. It's an Era.

- Slug: `ai-is-not-a-phase-its-an-era`
- Draft: `drafts.post-ai-is-not-a-phase-its-an-era`
- Published: `post-ai-is-not-a-phase-its-an-era`
- Author/category: `author-hannes-oosthuizen` / `category-ai-x-nexubis`
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

### Metamorphosis

- Slug: `metamorphosis`
- Draft: `drafts.post-metamorphosis`
- Published: `post-metamorphosis`
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

### Beyond the €30 000 

- Slug: `beyond-the-eu30-000`
- Draft: `drafts.post-beyond-the-eu30-000`
- Published: `post-beyond-the-eu30-000`
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

### The Cost of Refusing to Adapt

- Slug: `the-cost-of-refusing-to-adapt`
- Draft: `drafts.post-the-cost-of-refusing-to-adapt`
- Published: `post-the-cost-of-refusing-to-adapt`
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

### The Gold Bar Theory

- Slug: `the-gold-bar-theory`
- Draft: `drafts.post-the-gold-bar-theory`
- Published: `post-the-gold-bar-theory`
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

### Partnership Over Transaction

- Slug: `partnership-over-transaction`
- Draft: `drafts.post-partnership-over-transaction`
- Published: `post-partnership-over-transaction`
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

### Impact Builds Network

- Slug: `impact-builds-network`
- Draft: `drafts.post-impact-builds-network`
- Published: `post-impact-builds-network`
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

### Just Do It

- Slug: `just-do-it`
- Draft: `drafts.post-just-do-it`
- Published: `post-just-do-it`
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

### My 1st Biggest Mistake

- Slug: `my-1st-biggest-mistake`
- Draft: `drafts.post-my-1st-biggest-mistake`
- Published: `post-my-1st-biggest-mistake`
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

