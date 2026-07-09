import { test, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";
import { expectedSessionToken, isValidSession, passwordMatches, adminConfigured } from "./auth";

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

test("the session token validates only when derived from the same password and secret", () => {
  const token = expectedSessionToken();
  assert.equal(isValidSession(token), true);
  assert.equal(isValidSession(token.slice(0, -1) + "0"), false);
  assert.equal(isValidSession(""), false);
  assert.equal(isValidSession(null), false);
  assert.equal(isValidSession(undefined), false);

  // A token minted under a different secret never validates.
  process.env.SCORECARD_SESSION_SECRET = "other-secret";
  assert.equal(isValidSession(token), false);
});

test("passwordMatches compares in constant time and rejects empties", () => {
  assert.equal(passwordMatches("test-password-123"), true);
  assert.equal(passwordMatches("test-password-124"), false);
  assert.equal(passwordMatches(""), false);
  process.env.SCORECARD_ADMIN_PASSWORD = "";
  assert.equal(passwordMatches(""), false);
});

test("adminConfigured requires both values", () => {
  assert.equal(adminConfigured(), true);
  delete process.env.SCORECARD_SESSION_SECRET;
  assert.equal(adminConfigured(), false);
});
