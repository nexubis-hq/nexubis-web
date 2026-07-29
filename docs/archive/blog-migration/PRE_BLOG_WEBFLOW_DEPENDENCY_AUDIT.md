# Pre-Blog Webflow Dependency Audit

## Runtime Result

Production browser checks were run against `https://nexubis.vercel.app` on:

- `/`
- `/about`
- `/work`
- `/work/altify`
- `/work/circuit`
- `/work/oxipack`
- `/packages`
- `/contact`
- `/scorecard`

No required runtime request to these Webflow hosts was observed on completed non-Blog routes:

- `webflow.com`
- `webflow.io`
- `cdn.prod.website-files.com`
- `website-files.com`
- `uploads-ssl.webflow.com`
- `assets.website-files.com`

Production pages did not import or serve Webflow export HTML, Webflow export CSS, or Webflow JavaScript.

## Production Code Matches Outside Blog/Sanity

| Match | Location | Classification | Action |
|---|---|---|---|
| `https://www.nexubis.io/contact` | `app/contact/page.tsx` metadata/canonical | REFERENCE_ONLY | Allowed system/SEO URL |
| `https://www.nexubis.io` | `app/about/page.tsx`, `app/work/page.tsx`, `app/work/[slug]/page.tsx` metadata helpers | REFERENCE_ONLY | Allowed canonical/OG URL base |
| `https://www.nexubis.io` | `app/api/leads/scorecard/route.ts`, `app/api/scorecard/unlock/route.ts` fallback origin | REFERENCE_ONLY | Allowed server-side absolute fallback |
| `https://www.nexubis.io/privacy` | `lib/scorecard/copy.ts` Scorecard unlock privacy URL | BLOCKED_OUTSIDE_BLOG | Missing legal route/content; needs launch decision |
| `w-form`, `w-input`, `w-select`, `w-button` search terms | No non-Blog production dependency found | CLEAR | No action |
| `window.Webflow`, `Webflow.push`, `webflow.js`, `data-wf-*` | No non-Blog production dependency found | CLEAR | No action |

## Blog/Sanity Boundary

Webflow CDN references remain inside active Blog migration data/source files and are classified as `PENDING_BLOG_MIGRATION`. They were not edited in this pass.

## Runtime External Hostnames

| Hostname | Purpose | Status |
|---|---|---|
| `pub-d0adc0fc26c84d8e8c8db97d1ab2d30f.r2.dev` | Approved Cloudflare R2 video delivery | `206 video/mp4`, byte ranges supported |
| `app.cal.com` | Contact page inline Cal embed and schedule API | `200` responses observed |
| `cal.com` | Public booking URL/avatar assets | `200` responses observed |
| `connect.facebook.net` | Approved Meta pixel script | Loaded on pages with analytics |
| `graph.facebook.com` | Server-side Meta CAPI route target | Server-side only; not browser-loaded in safe checks |

## Media Checks

- Homepage Oxipack proof video uses `https://pub-d0adc0fc26c84d8e8c8db97d1ab2d30f.r2.dev/nexubis/oxipack/Oxipack%20Specific%20Showreel.mp4`.
- Homepage Oxipack poster uses `/assets/work/oxipack/hero-poster.webp`, status `200`.
- `booth-loop-poster.jpg` returned `200`.
- Case Study hero and gallery video requests returned `206 video/mp4` with byte ranges.
- Six non-hero gallery videos looped for at least two cycles each in browser observation.
