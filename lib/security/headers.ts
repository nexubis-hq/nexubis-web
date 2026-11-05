// Security response headers for every route, applied from next.config.ts.
//
// The Content Security Policy only allows the outside services the site
// really uses. It ships in report-only mode first: browsers report what the
// policy WOULD block (to /api/csp-report, visible in the Vercel logs) but block
// nothing. Once the reports are clean, flip CSP_ENFORCE to true.
//
// Note: frame-ancestors is ignored in report-only mode, so X-Frame-Options:
// DENY is what stops other sites framing ours (clickjacking) until then.

export const CSP_ENFORCE = false;

export const SITE_ORIGIN = "https://www.nexubis.io";
export const CSP_REPORT_PATH = "/api/csp-report";

const R2_MEDIA = "https://pub-d0adc0fc26c84d8e8c8db97d1ab2d30f.r2.dev";

// Where each outside service is used:
//   Meta Pixel (components/MetaPixel.tsx): connect.facebook.net, www.facebook.com
//   Microsoft Clarity (components/consent/ConsentTracking.tsx): *.clarity.ms, c.bing.com
//   Cal.com booking embed (components/ContactTabs.tsx): app.cal.com, cal.com
//   Cloudflare Turnstile bot check (audit form): challenges.cloudflare.com
//   Blog images (Sanity): cdn.sanity.io
//   Showreels and work videos: Cloudflare R2 public bucket
//   Blog YouTube embeds, report Loom walkthroughs: youtube.com, loom.com
const SITE_DIRECTIVES: Record<string, string[]> = {
  "default-src": ["'self'"],
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    "https://connect.facebook.net",
    "https://www.clarity.ms",
    "https://*.clarity.ms",
    "https://app.cal.com",
    "https://challenges.cloudflare.com",
  ],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": [
    "'self'",
    "data:",
    "blob:",
    "https://cdn.sanity.io",
    "https://www.facebook.com",
    "https://*.clarity.ms",
    "https://c.bing.com",
  ],
  "font-src": ["'self'", "data:"],
  "media-src": ["'self'", R2_MEDIA],
  "connect-src": [
    "'self'",
    "https://www.facebook.com",
    "https://connect.facebook.net",
    "https://*.clarity.ms",
    "https://app.cal.com",
    "https://cal.com",
  ],
  "frame-src": [
    "https://app.cal.com",
    "https://cal.com",
    "https://challenges.cloudflare.com",
    "https://www.youtube.com",
    "https://www.youtube-nocookie.com",
    "https://www.loom.com",
  ],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"],
};

// The Sanity Studio editor (/studio) talks to Sanity's own APIs and needs a
// looser script policy. Still no framing by other sites.
const STUDIO_DIRECTIVES: Record<string, string[]> = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://*.sanity.io", "https://sanity-cdn.com", "https://*.sanity-cdn.com"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "blob:", "https://*.sanity.io", "https://lh3.googleusercontent.com", "https://avatars.githubusercontent.com"],
  "font-src": ["'self'", "data:"],
  "connect-src": ["'self'", "https://*.sanity.io", "wss://*.sanity.io", "https://sanity-cdn.com", "https://*.sanity-cdn.com"],
  "frame-src": ["'self'", "https://*.sanity.io"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'", "https://*.sanity.io"],
  "frame-ancestors": ["'none'"],
};

// Vercel's comment/feedback toolbar, injected on preview deployments only.
const VERCEL_TOOLBAR: Record<string, string[]> = {
  "script-src": ["https://vercel.live"],
  "frame-src": ["https://vercel.live"],
};

function isPreviewDeployment(): boolean {
  return process.env.VERCEL_ENV === "preview";
}

function serialize(directives: Record<string, string[]>, dev: boolean): string {
  const preview = isPreviewDeployment();
  const parts = Object.entries(directives).map(([name, values]) => {
    let list = values;
    // Next.js dev mode (hot reload) needs eval; production never gets it.
    if (dev && name === "script-src" && !list.includes("'unsafe-eval'")) list = [...list, "'unsafe-eval'"];
    if (preview && VERCEL_TOOLBAR[name]) list = [...list, ...VERCEL_TOOLBAR[name]];
    return `${name} ${list.join(" ")}`;
  });
  parts.push(`report-uri ${CSP_REPORT_PATH}`);
  return parts.join("; ");
}

export function sitePolicy(dev = false): string {
  return serialize(SITE_DIRECTIVES, dev);
}

export function studioPolicy(dev = false): string {
  return serialize(STUDIO_DIRECTIVES, dev);
}

export const CSP_HEADER = CSP_ENFORCE
  ? "Content-Security-Policy"
  : "Content-Security-Policy-Report-Only";

type HeaderRule = { source: string; headers: { key: string; value: string }[] };

export function securityHeaderRules(dev = false): HeaderRule[] {
  return [
    {
      source: "/:path*",
      headers: [
        { key: CSP_HEADER, value: sitePolicy(dev) },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Strict-Transport-Security", value: "max-age=63072000" },
        // Replaces the CDN's default "*": only our own site may read responses
        // cross-origin.
        { key: "Access-Control-Allow-Origin", value: SITE_ORIGIN },
      ],
    },
    // Later rules override earlier ones for the same header.
    {
      source: "/studio/:path*",
      headers: [{ key: CSP_HEADER, value: studioPolicy(dev) }],
    },
  ];
}
