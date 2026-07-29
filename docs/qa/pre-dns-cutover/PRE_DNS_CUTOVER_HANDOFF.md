# Pre-DNS Cutover Handoff

Generated: 2026-07-29T20:51:21.023Z

## Ready
- Webflow URL baseline captured: 99 URLs.
- Sanity migration count parity: passed.
- Sitemap generated and audited: passed.
- robots.txt on current Vercel returns 200, is `text/plain`, allows public crawling, disallows private/API routes, and references `https://www.nexubis.io/sitemap.xml`.
- Public noindex audit found 0 public noindex errors.
- Internal link crawl found 0 broken internal links and 0 orphaned Blog posts.
- Runtime HTML scan found 0 required Webflow hosts and 0 old duplicate Vercel hosts.
- Required Production environment variable name audit found 0 missing required variables. Optional/defaulted/test-only names are separated in `AUDIT_SUMMARY.json`.
- Runtime Webflow dependency check: passed.
- Local build/test validation: passed.

## Fixed
- Added reusable pre-DNS URL parity/audit script.
- Updated docs index with one concise pre-DNS handoff link.
- Added missing canonical metadata for `/`, `/packages`, and `/scorecard`.
- Updated migration/recovery script paths to the organised Blog migration docs created by the prior cleanup.
- No Sanity content, public media, DNS, deployment, Funnelr, Resend, Scorecard, or Cal.com behaviour was changed.

## Blocked
- Vercel custom domains: verify/add nexubis.io and www.nexubis.io in the canonical Vercel project before DNS change.
- Current deployed Vercel canonical audit still reports 3 canonical errors because the local canonical fix has not been deployed yet: `/`, `/packages`, `/scorecard`.
- Vercel read-only domain inspection reports `nexubis.io` and `www.nexubis.io` are not found under `hello-91244177s-projects`.
- Current `https://www.nexubis.io/` still serves Webflow HTML.
- Current Vercel Production deployment inspected: `dpl_BffeN8erVAXCTWWSqpLKs5NjDhc6`, Ready, created 2026-07-29 22:21:54 +0200, aliases include `https://nexubis.vercel.app`.
- Local HEAD is `c7f338254b8155846a20fc5fde12d1e71fe9a7c3`; `main` is `ce6a16b4abf57536d437b65f017789cff10d3ade`. Current Vercel Production SHA was not exposed by the read-only CLI output, so deployed SHA must be confirmed after commit/merge/deploy.
- Count mismatch: 0
- Unexpected 404 count: 0
- Soft/wrong-content count: 0
- Sitemap non-200 count: 0
- Public noindex errors: 0
- Canonical errors: 3
- Runtime Webflow requests: 0
- Old Vercel runtime requests: 0
- Missing Production env variables from Vercel env-name audit: 0

## Local Corrected State

- `npm run lint`: passed with 29 existing warnings and 0 errors.
- `npm run typecheck`: passed.
- `npm run test`: passed, 38 test files and 281 tests.
- `npm run build`: passed, 104 static pages generated.
- Temporary local production server verification:
  - `/`: 200 with canonical `https://www.nexubis.io/`.
  - `/packages`: 200 with canonical `https://www.nexubis.io/packages`.
  - `/scorecard`: 200 with canonical `https://www.nexubis.io/scorecard`.
  - `/robots.txt`: 200.
  - `/sitemap.xml`: 200.
  - `/blog`: 200.
  - `/post/10-better-or-dont-bother`: 200.
  - `/post/not-a-real-post`: 404.
  - `/work/sataya`: 404.

## Manual Pre-DNS Actions
- Review the exact code and report changes.
- Commit the changes.
- Push or merge to main.
- Wait for the canonical Vercel Production deployment.
- Confirm the deployed SHA.
- Rerun parity and sitemap checks against the deployed commit.
- Confirm both intended domains are attached to the canonical project.
- Export or screenshot the current DNS zone.
- Change DNS manually only after final approval.

## Post-Cutover Tests
- Rerun URL parity against https://www.nexubis.io.
- Confirm apex-to-www redirect.
- Confirm HTTPS.
- Repeat one controlled Contact test.
- Repeat one controlled Cal.com booking/webhook test.
- Run one full Production Scorecard test.
- Verify robots.txt on the real domain.
- Verify sitemap.xml on the real domain.
- Submit sitemap in Google Search Console.
- Monitor 404s, indexing and canonical issues.
