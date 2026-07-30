import { afterEach, describe, expect, it } from "vitest";
import { cookieDomain, isTrackingHost, normaliseHost } from "./config";

const FORCE = "NEXT_PUBLIC_META_TRACKING_FORCE";

afterEach(() => {
  delete process.env[FORCE];
});

describe("normaliseHost", () => {
  it("lowercases and strips the port", () => {
    expect(normaliseHost("Nexubis.IO:443")).toBe("nexubis.io");
  });
  it("is empty for nullish input", () => {
    expect(normaliseHost(null)).toBe("");
    expect(normaliseHost(undefined)).toBe("");
  });
});

describe("isTrackingHost", () => {
  it("allows the apex and www production hosts", () => {
    expect(isTrackingHost("nexubis.io")).toBe(true);
    expect(isTrackingHost("www.nexubis.io")).toBe(true);
  });

  it("blocks localhost, previews and everything else", () => {
    expect(isTrackingHost("localhost:3000")).toBe(false);
    expect(isTrackingHost("nexubis-web-git-x-nexubis.vercel.app")).toBe(false);
    expect(isTrackingHost("nexubis.vercel.app")).toBe(false);
    expect(isTrackingHost(null)).toBe(false);
  });

  it("honours the force override on any host", () => {
    process.env[FORCE] = "1";
    expect(isTrackingHost("localhost:3000")).toBe(true);
    expect(isTrackingHost("nexubis.vercel.app")).toBe(true);
  });
});

describe("cookieDomain", () => {
  it("returns the shared registrable domain for production hosts", () => {
    expect(cookieDomain("nexubis.io")).toBe(".nexubis.io");
    expect(cookieDomain("www.nexubis.io")).toBe(".nexubis.io");
  });

  it("returns null (host-only) where a shared cookie makes no sense", () => {
    expect(cookieDomain("localhost")).toBeNull();
    expect(cookieDomain("127.0.0.1")).toBeNull();
    expect(cookieDomain("nexubis.vercel.app")).toBeNull();
    expect(cookieDomain(null)).toBeNull();
  });
});
