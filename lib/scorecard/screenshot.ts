import { createHmac } from "node:crypto";
import { isMockMode } from "./env";
import { MOCK_PNG_BASE64 } from "./mock";

export type ScreenshotResult = { ok: true; url: string } | { ok: false; reason: string };

// First-impression exhibits: the above-the-fold homepage exactly as a buyer
// first sees it. Captured on first load, no scroll, ads and cookie banners
// blocked. Desktop is 1440x900; mobile is 390x844 (a current iPhone viewport).
const DESKTOP_VIEWPORT = { width: "1440", height: "900" };
const MOBILE_VIEWPORT = { width: "390", height: "844" };

// Build a ScreenshotOne /take URL that renders above the fold. cache=true keeps
// us inside the free tier on repeat loads (30-day CDN cache per URL+params).
// `extra` overrides or adds params; URLSearchParams encodes values for us.
//
// When a secret key is supplied the URL is SIGNED (HMAC-SHA256 of the query
// string). This is what lets the access_key sit safely in the public report's
// <img src>: with "Require signed requests" enabled on the ScreenshotOne
// account, a lifted access_key is useless without the secret, which never
// leaves the server.
export function buildScreenshotUrl(
  targetUrl: string,
  accessKey: string,
  extra?: Record<string, string>,
  secretKey?: string,
): string {
  const params = new URLSearchParams({
    access_key: accessKey,
    url: targetUrl,
    viewport_width: DESKTOP_VIEWPORT.width,
    viewport_height: DESKTOP_VIEWPORT.height,
    format: "png",
    full_page: "false",
    block_ads: "true",
    block_cookie_banners: "true",
    delay: "2",
    cache: "true",
    cache_ttl: "2592000",
  });
  if (extra) {
    for (const [k, v] of Object.entries(extra)) params.set(k, v);
  }
  const query = params.toString();
  if (secretKey) {
    const signature = createHmac("sha256", secretKey).update(query).digest("hex");
    return `https://api.screenshotone.com/take?${query}&signature=${signature}`;
  }
  return `https://api.screenshotone.com/take?${query}`;
}

export function buildMobileScreenshotUrl(targetUrl: string, accessKey: string, secretKey?: string): string {
  return buildScreenshotUrl(
    targetUrl,
    accessKey,
    {
      viewport_width: MOBILE_VIEWPORT.width,
      viewport_height: MOBILE_VIEWPORT.height,
      device_scale_factor: "2",
    },
    secretKey,
  );
}

// Screenshot bytes for the vision read. Same params as the report's <img>, so
// ScreenshotOne serves it from cache, no extra credit.
const SHOT_FETCH_TIMEOUT_MS = 40_000;
async function fetchShotBase64(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SHOT_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") || "").startsWith("image/")) return null;
    return Buffer.from(await res.arrayBuffer()).toString("base64");
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface FirstImpressionShots {
  /** Above-the-fold desktop render, base64 PNG for the vision read. */
  desktop: string | null;
  /** Above-the-fold mobile render, base64 PNG. */
  mobile: string | null;
  /** Stable ScreenshotOne URLs for the report <img> exhibits. */
  desktopUrl: string | null;
  mobileUrl: string | null;
}

// Capture the first-five-seconds exhibits for one company. Best-effort: a null
// field is "could not be captured" and must be surfaced as such, never guessed.
export async function captureFirstImpression(targetUrl: string): Promise<FirstImpressionShots> {
  if (isMockMode()) {
    return {
      desktop: MOCK_PNG_BASE64,
      mobile: MOCK_PNG_BASE64,
      desktopUrl: `https://mock-shots.test/desktop?url=${encodeURIComponent(targetUrl)}`,
      mobileUrl: `https://mock-shots.test/mobile?url=${encodeURIComponent(targetUrl)}`,
    };
  }
  const accessKey = process.env.SCREENSHOTONE_ACCESS_KEY;
  if (!accessKey) return { desktop: null, mobile: null, desktopUrl: null, mobileUrl: null };
  // Sign the URLs so the access_key in the public <img> cannot be abused.
  const secretKey = process.env.SCREENSHOTONE_SECRET_KEY;
  const desktopUrl = buildScreenshotUrl(targetUrl, accessKey, undefined, secretKey);
  const mobileUrl = buildMobileScreenshotUrl(targetUrl, accessKey, secretKey);
  const [desktop, mobile] = await Promise.all([fetchShotBase64(desktopUrl), fetchShotBase64(mobileUrl)]);
  return { desktop, mobile, desktopUrl, mobileUrl };
}

// The report needs a plain URL for its <img>; no key means an honest failure.
export function getHeroScreenshot(targetUrl: string): ScreenshotResult {
  if (isMockMode()) return { ok: true, url: `https://mock-shots.test/desktop?url=${encodeURIComponent(targetUrl)}` };
  const accessKey = process.env.SCREENSHOTONE_ACCESS_KEY;
  if (!accessKey) return { ok: false, reason: "Screenshot service not configured." };
  return { ok: true, url: buildScreenshotUrl(targetUrl, accessKey, undefined, process.env.SCREENSHOTONE_SECRET_KEY) };
}
