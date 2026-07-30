// Host gate + cookie-domain helpers for Meta tracking. Import-safe on both client
// and server (only NEXT_PUBLIC_* env, inlined at build).
//
// Why gate on HOST, not NODE_ENV: Vercel preview deploys run with
// NODE_ENV=production, so a NODE_ENV check would leak preview/test traffic into
// the live dataset and wreck match quality. Both tracking legs stay inert unless
// the runtime host is the real production site. NEXT_PUBLIC_META_TRACKING_FORCE=1
// is a deliberate override for verifying a preview against Test Events.

const ALLOWED_HOSTS = new Set(["nexubis.io", "www.nexubis.io"]);

function forced(): boolean {
  return process.env.NEXT_PUBLIC_META_TRACKING_FORCE === "1";
}

// Lowercase and drop any :port so "nexubis.io:443" still matches.
export function normaliseHost(host: string | null | undefined): string {
  if (!host) return "";
  return host.split(":")[0].trim().toLowerCase();
}

// True when this host is allowed to send Meta events (or the force flag is set).
export function isTrackingHost(host: string | null | undefined): boolean {
  if (forced()) return true;
  return ALLOWED_HOSTS.has(normaliseHost(host));
}

// The current host on the client, or null on the server.
export function clientTrackingHost(): string | null {
  if (typeof window === "undefined") return null;
  return window.location.host;
}

// The registrable cookie Domain for the current host, derived at runtime and
// never hardcoded. For nexubis.io / www.nexubis.io this returns ".nexubis.io" so
// the identity cookies are shared across the apex and www. For localhost, an IP,
// or a *.vercel.app preview it returns null (a host-only cookie), which is fine
// because tracking is inert there anyway.
export function cookieDomain(host: string | null | undefined): string | null {
  const h = normaliseHost(host);
  if (!h || h === "localhost" || h.endsWith(".localhost") || h === "127.0.0.1") return null;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) return null;
  const parts = h.split(".");
  if (parts.length < 2) return null;
  // Preview hosts like nexubis-web-git-x.vercel.app must not set a shared domain.
  if (h.endsWith(".vercel.app")) return null;
  return "." + parts.slice(-2).join(".");
}
