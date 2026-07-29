# Nexubis Documentation Index

This folder holds project documentation that should be committed. Secret values must never be placed in documentation; keep local credentials in ignored environment files such as `.env.local`.

## Architecture Sources Of Truth

- Root `SITE.md`: current brand, route, and implementation source of truth for agent workflows. It intentionally remains in the repository root.
- Root `CLAUDE.md`: current agent instructions. It intentionally remains in the repository root.
- `docs/architecture/PACKAGES_V2.md`: current packages page implementation notes.
- `docs/architecture/PACKAGES_MAP.md`: packages page rebuild map.
- `docs/architecture/HOMEPAGE_MAP.md`: homepage route and section map.
- `docs/architecture/DESIGN_ELEVATION.md`, `docs/architecture/DESIGN_DIRECTIONS.md`, and `docs/architecture/ASSET_BRIEF.md`: homepage design language and asset context.
- `docs/architecture/PORT_PLAN.md` and `docs/architecture/SCORECARD_HANDOFF.md`: Scorecard architecture and handoff context.

## Operations Sources Of Truth

- `docs/AI_READ_FIRST_FUNNELR_AUTOMATION_MASTER_CONTRACT.md`: permanent Funnelr automation contract.
- `docs/FUNNELR_API.md`
- `docs/funnel-audit-checklist.md`
- `docs/go-live-and-migration.md`: living go-live, DNS, booking, tracking, CRM, and environment checklist.
- `docs/qa/LAUNCH_CHECKLIST.md`: Scorecard launch checklist.

## Current Blog Migration Sources Of Truth

The Blog/Sanity migration is complete. These records must remain until final Blog URL parity, sitemap verification, DNS cutover, and post-cutover QA are complete:

- `docs/migration/blog/BLOG_FINAL_SANITY_CUTOVER_REPORT.md`: final Sanity cutover report.
- `docs/migration/blog/BLOG_SANITY_BATCH_MANIFEST.json`: complete published-post, slug, source, and Sanity document manifest.
- `docs/migration/blog/BLOG_SANITY_BATCH_MEDIA_MAPPING.json`: complete Webflow media to Sanity asset mapping.
- `docs/migration/blog/BLOG_FINAL_ROUTE_AUDIT.json`: final migrated route evidence.
- `docs/migration/blog/BLOG_WEBFLOW_DEPENDENCY_AUDIT.json`: final stored-data Webflow dependency audit.
- `docs/migration/blog/BLOG_FINAL_WEBFLOW_REMOVAL_REPORT.md`: final runtime Webflow-independence report.
- `docs/migration/blog/BLOG_SANITY_BATCH_REPORT.md`: latest batch recovery report retained with the final records.
- `docs/CASE_STUDY_MEDIA_MAPPING.md`
- `docs/archive/blog-webflow-generated/`

## Current Launch QA

Retain these until final URL parity, sitemap verification, DNS cutover, and post-cutover QA are complete:

- `docs/qa/LAUNCH_CHECKLIST.md`
- `docs/qa/PRE_CUTOVER_CTA_HANDOFF.md`
- `docs/qa/PRE_CUTOVER_LINK_FIXES.md`
- `docs/qa/PRE_CUTOVER_LINK_PARITY_AUDIT.csv`
- `docs/qa/PRE_CUTOVER_LINK_PARITY_AUDIT_SUMMARY.txt`
- `docs/qa/REPOSITORY_DOCUMENTATION_CLEANUP_MANIFEST.md`
- `docs/qa/FULL_PROJECT_CLEANUP_MANIFEST.md`
- `docs/qa/FULL_PROJECT_CLEANUP_SUMMARY.md`
- `docs/qa/MANUAL_CLEANUP_REVIEW.md`
- `docs/qa/BLOG_DOCUMENTATION_CLEANUP_MANIFEST.md`
- `docs/qa/pre-dns-cutover/PRE_DNS_CUTOVER_HANDOFF.md`: final pre-DNS cutover audit handoff.

## Historical Blog Migration Records

Archived batch, pilot import, resolved pending-media, generated-data, and pre-Blog QA reports live in `docs/archive/blog-migration/`. Treat them as historical recovery context, not current source of truth.

## Files Retained Until After DNS Cutover

- Raw Webflow exports under `webflow-export/`
- Complete final migration manifest and complete media mapping under `docs/migration/blog/`
- Archived generated Webflow JSON under `docs/archive/blog-webflow-generated/`
- Current pre-cutover launch QA evidence under `docs/qa/`

## Archive

`docs/archive/` contains historical or superseded reports retained for audit context. Treat them as reference, not current source of truth. Do not delete archived migration or QA evidence before DNS cutover and post-cutover QA are complete.
