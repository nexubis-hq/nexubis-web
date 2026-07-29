# Blog Index Generated Data

The production `/blog` page reads committed generated data from:

- `lib/blog/generated/posts.json`
- `lib/blog/generated/categories.json`

The raw Webflow CSV files under `webflow-export/cms/` are migration inputs only and are ignored by Git.

When the Webflow Blog CSV export changes, run:

```bash
npm run blog:generate-index
```

Then commit the generated JSON output. Vercel does not run this generator and does not need the raw Webflow export files.
