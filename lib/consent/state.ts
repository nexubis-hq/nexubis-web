export const CONSENT_COOKIE = "nx_consent";
export const CONSENT_MAX_AGE = 365 * 24 * 60 * 60;

export type Consent = { analytics: boolean; marketing: boolean; decided: boolean; ts: number };
export const DEFAULT_CONSENT: Consent = { analytics: false, marketing: false, decided: false, ts: 0 };

export function parseConsent(value?: string | null): Consent {
  try {
    const parsed = JSON.parse(decodeURIComponent(value ?? ""));
    if (
      typeof parsed?.analytics !== "boolean" || typeof parsed?.marketing !== "boolean" ||
      typeof parsed?.decided !== "boolean" || typeof parsed?.ts !== "number" ||
      !Number.isFinite(parsed.ts) || parsed.ts <= 0 || parsed.ts > Date.now() ||
      Date.now() - parsed.ts >= CONSENT_MAX_AGE * 1000
    ) return DEFAULT_CONSENT;
    return { analytics: parsed.analytics, marketing: parsed.marketing, decided: parsed.decided, ts: parsed.ts };
  } catch {
    return DEFAULT_CONSENT;
  }
}

export function readConsentCookie(): string {
  if (typeof document === "undefined") return "";
  return document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${CONSENT_COOKIE}=`))?.slice(CONSENT_COOKIE.length + 1) ?? "";
}

export function hasMarketingConsent(): boolean {
  const consent = parseConsent(readConsentCookie());
  return consent.decided && consent.marketing;
}

export function serializeConsent(consent: Consent): string {
  return `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(consent))}; Path=/; SameSite=Lax; Max-Age=${CONSENT_MAX_AGE}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}
