import { test, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";
import { expectedSessionToken } from "@/lib/scorecard/auth";
import { guardAdminRequest, type GuardInput } from "./request-guard";

const PREV = { pw: process.env.SCORECARD_ADMIN_PASSWORD, secret: process.env.SCORECARD_SESSION_SECRET };

beforeEach(() => {
  process.env.SCORECARD_ADMIN_PASSWORD = "test-password-123";
  process.env.SCORECARD_SESSION_SECRET = "test-secret-456";
});
afterEach(() => {
  if (PREV.pw === undefined) delete process.env.SCORECARD_ADMIN_PASSWORD;
  else process.env.SCORECARD_ADMIN_PASSWORD = PREV.pw;
  if (PREV.secret === undefined) delete process.env.SCORECARD_SESSION_SECRET;
  else process.env.SCORECARD_SESSION_SECRET = PREV.secret;
});

function req(overrides: Partial<GuardInput>): GuardInput {
  return {
    method: "GET",
    pathname: "/audit/admin/leads",
    host: "nexubis.io",
    origin: null,
    referer: null,
    sessionCookie: undefined,
    ...overrides,
  };
}

test("signed-out visits to admin pages get a bare redirect to the login screen", () => {
  for (const pathname of ["/audit/admin/leads", "/audit/admin/scans", "/audit/admin/manual", "/audit/admin/some-slug"]) {
    assert.deepEqual(guardAdminRequest(req({ pathname })), { action: "redirect", location: "/audit/admin" });
  }
});

test("the login screen itself stays reachable when signed out", () => {
  assert.deepEqual(guardAdminRequest(req({ pathname: "/audit/admin" })), { action: "allow" });
  assert.deepEqual(guardAdminRequest(req({ pathname: "/audit/admin/" })), { action: "allow" });
});

test("signed-in visits are allowed", () => {
  const sessionCookie = expectedSessionToken();
  assert.deepEqual(guardAdminRequest(req({ sessionCookie })), { action: "allow" });
  assert.deepEqual(
    guardAdminRequest(req({ sessionCookie: sessionCookie.slice(0, -1) + "0" })),
    { action: "redirect", location: "/audit/admin" }
  );
});

test("form posts from our own site are allowed (login, sign-out, admin actions)", () => {
  assert.deepEqual(
    guardAdminRequest(req({ method: "POST", pathname: "/audit/admin", origin: "https://nexubis.io" })),
    { action: "allow" }
  );
  assert.deepEqual(
    guardAdminRequest(req({ method: "POST", origin: null, referer: "https://nexubis.io/audit/admin/leads" })),
    { action: "allow" }
  );
});

test("cross-site or origin-less form posts are refused", () => {
  const cases: Partial<GuardInput>[] = [
    { origin: "https://evil.example" },
    { origin: "null" },
    { origin: null, referer: null },
    { origin: null, referer: "https://evil.example/page" },
    { origin: "https://nexubis.io.evil.example" },
    { origin: "https://nexubis.io", host: null },
  ];
  for (const c of cases) {
    assert.deepEqual(guardAdminRequest(req({ method: "POST", pathname: "/audit/admin", ...c })), { action: "forbid" });
  }
});
