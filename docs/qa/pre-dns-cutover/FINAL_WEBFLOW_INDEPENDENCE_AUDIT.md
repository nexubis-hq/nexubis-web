# Final Webflow Independence Audit

Generated: 2026-07-29T20:51:21.023Z

- Source/data matches in active scanned areas: 29
- Runtime HTML external Webflow hosts observed: 0
- Runtime HTML old Vercel hosts observed: 0
- Stored-data final dependency audit Webflow runtime dependencies: 0

## Source Matches
- lib/blog/blog-final-cutover.test.ts: webflow-export -> REFERENCE_ONLY
- lib/blog/blog-index-precedence.test.ts: webflow.com -> REFERENCE_ONLY
- lib/blog/blog-index-precedence.test.ts: cdn.prod.website-files.com -> REFERENCE_ONLY
- lib/blog/blog-index-precedence.test.ts: website-files.com -> REFERENCE_ONLY
- lib/blog/blog-index-precedence.test.ts: uploads-ssl.webflow.com -> REFERENCE_ONLY
- lib/blog/post-fixtures.test.ts: webflow-export -> REFERENCE_ONLY
- scripts/generate-blog-index-data.ts: webflow-export -> MIGRATION_SOURCE
- scripts/generate-blog-post-fixtures.ts: webflow-export -> MIGRATION_SOURCE
- scripts/import-circuit-blog-post.ts: webflow-export -> MIGRATION_SOURCE
- scripts/import-priority-blog-posts.ts: webflow-export -> MIGRATION_SOURCE
- scripts/migrate-blog-sanity-batch.ts: webflow.com -> MIGRATION_SOURCE
- scripts/migrate-blog-sanity-batch.ts: webflow.io -> MIGRATION_SOURCE
- scripts/migrate-blog-sanity-batch.ts: cdn.prod.website-files.com -> MIGRATION_SOURCE
- scripts/migrate-blog-sanity-batch.ts: website-files.com -> MIGRATION_SOURCE
- scripts/migrate-blog-sanity-batch.ts: uploads-ssl.webflow.com -> MIGRATION_SOURCE
- scripts/migrate-blog-sanity-batch.ts: webflow-export -> MIGRATION_SOURCE
- scripts/qa/verify-public-url-parity.ts: webflow.com -> MIGRATION_SOURCE
- scripts/qa/verify-public-url-parity.ts: webflow.io -> MIGRATION_SOURCE
- scripts/qa/verify-public-url-parity.ts: cdn.prod.website-files.com -> MIGRATION_SOURCE
- scripts/qa/verify-public-url-parity.ts: website-files.com -> MIGRATION_SOURCE
- scripts/qa/verify-public-url-parity.ts: uploads-ssl.webflow.com -> MIGRATION_SOURCE
- scripts/qa/verify-public-url-parity.ts: assets.website-files.com -> MIGRATION_SOURCE
- scripts/qa/verify-public-url-parity.ts: webflow-export -> MIGRATION_SOURCE
- scripts/qa/verify-public-url-parity.ts: nexubis-web.vercel.app -> MIGRATION_SOURCE
- scripts/verify-circuit-blog-post-import.ts: cdn.prod.website-files.com -> MIGRATION_SOURCE
- scripts/verify-circuit-blog-post-import.ts: website-files.com -> MIGRATION_SOURCE
- scripts/verify-priority-blog-posts.ts: webflow.com -> MIGRATION_SOURCE
- scripts/verify-priority-blog-posts.ts: cdn.prod.website-files.com -> MIGRATION_SOURCE
- scripts/verify-priority-blog-posts.ts: website-files.com -> MIGRATION_SOURCE

## Runtime External Hostnames
- altify.app: 11
- calendly.com: 3
- cdn.sanity.io: 1593
- circuitprotect.com: 11
- claude.ai: 3
- cordialsystems.com: 8
- github.com: 3
- lekkeweb.co.za: 3
- pub-d0adc0fc26c84d8e8c8db97d1ab2d30f.r2.dev: 30
- sataya.io: 11
- schema.org: 1
- vercel.com: 3
- wisprflow.ai: 3
- www.altify.app: 4
- www.blueknight.io: 11
- www.circuitsecurity.com: 4
- www.designfocus.io: 11
- www.emprise.co.za: 11
- www.facebook.com: 106
- www.figma.com: 3
- www.flux-academy.com: 3
- www.google.com: 3
- www.instagram.com: 391
- www.lathyrus.io: 22
- www.linkedin.com: 400
- www.merklescience.com: 8
- www.nexubis.io: 392
- www.ox.security: 8
- www.oxipack.com: 12
- www.sanity.io: 3
- www.ship.studio: 3
- www.sofi.com: 8
- www.usably.studio: 11
- www.w3.org: 526
- www.youtube.com: 10
- x.com: 12
- youtu.be: 3
