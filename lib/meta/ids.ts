"use client";

// Self-minted Meta match identifiers. This is the single biggest lever on match
// quality: it makes fbc, fbp and external_id independent of fbevents.js loading,
// which is blocked for 20-40% of real users. We read the cookies if present and
// mint whatever is missing, persist them as first-party cookies on the
// registrable domain, and hand them to BOTH tracking legs (the server leg carries
// them in the POST body, which is the reliable half).
//
// Formats follow Meta's spec exactly:
//   _fbc = fb.1.<unix_ms>.<fbclid>
//   _fbp = fb.1.<unix_ms>.<10-digit random>
// external_id is our own stable pseudonymous UUID (raw, never hashed here; §7).

import { clientTrackingHost, cookieDomain } from "./config";

const FB_MAX_AGE = 90 * 24 * 60 * 60; // 90 days — Meta's attribution window for fbc/fbp.
const XID_MAX_AGE = 400 * 24 * 60 * 60; // external_id: keep as long as browsers allow.

const FBC_COOKIE = "_fbc";
const FBP_COOKIE = "_fbp";
const XID_COOKIE = "_nx_xid"; // first-party; underscored to sit beside _fbc/_fbp.

export interface MetaIdentity {
  fbc: string | null;
  fbp: string | null;
  externalId: string | null;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const escaped = name.replace(/[.$?*|{}()[\]\\/+^]/g, "\\$&");
  const match = document.cookie.match(new RegExp("(?:^|; )" + escaped + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAgeSec: number): void {
  if (typeof document === "undefined") return;
  const domain = cookieDomain(clientTrackingHost());
  const secure = typeof window !== "undefined" && window.location.protocol === "https:";
  let cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSec}; Path=/; SameSite=Lax`;
  if (domain) cookie += `; Domain=${domain}`;
  if (secure) cookie += "; Secure";
  document.cookie = cookie;
}

// A random run of decimal digits, crypto-backed where available, no leading zero
// so _fbp reads as a clean integer as Meta expects.
function randomDigits(len: number): string {
  const bytes = typeof crypto !== "undefined" && crypto.getRandomValues ? crypto.getRandomValues(new Uint8Array(len)) : null;
  let out = "";
  for (let i = 0; i < len; i++) {
    const digit = bytes ? bytes[i] % 10 : Math.floor(Math.random() * 10);
    out += String(digit);
  }
  return out[0] === "0" ? "1" + out.slice(1) : out;
}

function newUuid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `xid_${Date.now()}_${randomDigits(10)}`;
  }
}

function queryParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(name);
}

// Read existing identity and mint anything missing, persisting to cookies.
// Idempotent and cheap; safe to call on every load and every event.
export function ensureMetaIdentity(): MetaIdentity {
  if (typeof document === "undefined") return { fbc: null, fbp: null, externalId: null };

  // _fbc: keep an existing cookie; otherwise derive it from a fresh fbclid so an
  // ad click is captured even when fbevents.js is blocked.
  let fbc = readCookie(FBC_COOKIE);
  if (!fbc) {
    const fbclid = queryParam("fbclid");
    if (fbclid) {
      fbc = `fb.1.${Date.now()}.${fbclid}`;
      writeCookie(FBC_COOKIE, fbc, FB_MAX_AGE);
    }
  }

  // _fbp: mint if absent so every visitor has a browser id on both legs.
  let fbp = readCookie(FBP_COOKIE);
  if (!fbp) {
    fbp = `fb.1.${Date.now()}.${randomDigits(10)}`;
    writeCookie(FBP_COOKIE, fbp, FB_MAX_AGE);
  }

  // external_id: stable pseudonymous id, minted once on first visit.
  let externalId = readCookie(XID_COOKIE);
  if (!externalId) {
    externalId = newUuid();
    writeCookie(XID_COOKIE, externalId, XID_MAX_AGE);
  }

  return { fbc, fbp, externalId };
}

// Read-only snapshot of whatever is currently in the cookies.
export function getMetaIdentity(): MetaIdentity {
  return {
    fbc: readCookie(FBC_COOKIE),
    fbp: readCookie(FBP_COOKIE),
    externalId: readCookie(XID_COOKIE),
  };
}
