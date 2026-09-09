import { afterEach, describe, expect, it, vi } from "vitest";
import { CONSENT_MAX_AGE, DEFAULT_CONSENT, parseConsent, serializeConsent } from "./state";

afterEach(() => vi.unstubAllEnvs());
describe("consent cookie", () => {
  it.each([undefined, "", "broken", "%invalid", "null", "{}", '{"marketing":"true"}'])("fails closed for %s", (raw) => {
    expect(parseConsent(raw)).toEqual(DEFAULT_CONSENT);
  });
  it("round trips both choices and expires old decisions", () => {
    const consent = { analytics: true, marketing: false, decided: true, ts: Date.now() };
    expect(parseConsent(encodeURIComponent(JSON.stringify(consent)))).toEqual(consent);
    expect(parseConsent(JSON.stringify({ ...consent, ts: Date.now() - CONSENT_MAX_AGE * 1000 }))).toEqual(DEFAULT_CONSENT);
  });
  it("uses one-year first-party cookie attributes and Secure in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const value = serializeConsent({ ...DEFAULT_CONSENT, decided: true, ts: Date.now() });
    expect(value).toContain("Path=/; SameSite=Lax; Max-Age=31536000; Secure");
    expect(value).not.toContain("Domain=");
  });
});
