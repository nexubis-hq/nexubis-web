import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ensureMetaIdentity, getMetaIdentity } from "./ids";

// Minimal cookie jar so document.cookie behaves like a browser's in the node env:
// assigning "name=value; attrs" upserts name=value; reading joins them back.
function installBrowser(search: string, seed: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(seed));
  const document = {
    get cookie() {
      return Array.from(store, ([k, v]) => `${k}=${v}`).join("; ");
    },
    set cookie(str: string) {
      const pair = str.split(";")[0];
      const eq = pair.indexOf("=");
      store.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    },
  };
  (globalThis as unknown as { document: unknown }).document = document;
  (globalThis as unknown as { window: unknown }).window = {
    location: { search, protocol: "https:", host: "nexubis.io" },
  };
  return store;
}

beforeEach(() => {
  installBrowser("");
});

afterEach(() => {
  delete (globalThis as unknown as { document?: unknown }).document;
  delete (globalThis as unknown as { window?: unknown }).window;
});

describe("ensureMetaIdentity", () => {
  it("derives _fbc from an fbclid in the URL, in Meta's format", () => {
    installBrowser("?fbclid=test123");
    const id = ensureMetaIdentity();
    expect(id.fbc).toMatch(/^fb\.1\.\d+\.test123$/);
  });

  it("mints _fbp as fb.1.<ms>.<10 digits>", () => {
    const id = ensureMetaIdentity();
    expect(id.fbp).toMatch(/^fb\.1\.\d+\.\d{10}$/);
  });

  it("mints a stable external_id", () => {
    const id = ensureMetaIdentity();
    expect(id.externalId).toBeTruthy();
    expect(id.externalId!.length).toBeGreaterThanOrEqual(16);
  });

  it("does not invent an _fbc when there is no fbclid", () => {
    const id = ensureMetaIdentity();
    expect(id.fbc).toBeNull();
    // but the other two are always present
    expect(id.fbp).toBeTruthy();
    expect(id.externalId).toBeTruthy();
  });

  it("preserves an existing _fbc rather than overwriting it from a new fbclid", () => {
    installBrowser("?fbclid=fresh", { _fbc: "fb.1.111.original" });
    const id = ensureMetaIdentity();
    expect(id.fbc).toBe("fb.1.111.original");
  });

  it("is idempotent: a second call returns the same identity", () => {
    installBrowser("?fbclid=test123");
    const first = ensureMetaIdentity();
    const second = ensureMetaIdentity();
    expect(second).toEqual(first);
    // and getMetaIdentity reads the same values straight from the cookies
    expect(getMetaIdentity()).toEqual(first);
  });
});
