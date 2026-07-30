# Blog Link Restoration Rollback

Backup JSON: `.tmp-sanity-import/blog-link-restoration/sanity-blog-before-link-restoration.json`

To restore one post:

```powershell
npx sanity exec scripts/maintenance/restore-blog-article-links.ts --with-user-token -- --rollback=[slug]
```

The rollback command reads the backed-up document by exact slug and restores only the `body` field for that published post. It does not change title, slug, metadata, media, author, category, dates, or SEO fields.
