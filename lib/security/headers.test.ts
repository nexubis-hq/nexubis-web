import { test } from "vitest";
import assert from "node:assert/strict";
import { securityHeaderRules, sitePolicy, studioPolicy } from "./headers";

test("every route gets the security headers", () => {
  const [all] = securityHeaderRules();
  assert.equal(all.source, "/:path*");
  const keys = Object.fromEntries(all.headers.map((h) => [h.key, h.value]));
  assert.equal(keys["X-Frame-Options"], "DENY");
  assert.equal(keys["X-Content-Type-Options"], "nosniff");
  assert.equal(keys["Strict-Transport-Security"], "max-age=63072000");
  assert.equal(keys["Access-Control-Allow-Origin"], "https://www.nexubis.io");
  assert.ok(keys["Content-Security-Policy-Report-Only"]);
});

test("the site policy blocks framing, plugins and eval in production", () => {
  const policy = sitePolicy(false);
  assert.match(policy, /frame-ancestors 'none'/);
  assert.match(policy, /object-src 'none'/);
  assert.match(policy, /report-uri \/api\/csp-report/);
  assert.doesNotMatch(policy, /unsafe-eval/);
  assert.match(sitePolicy(true), /unsafe-eval/);
});

test("the studio keeps its own policy but still cannot be framed", () => {
  const rules = securityHeaderRules();
  assert.equal(rules[rules.length - 1].source, "/studio/:path*");
  assert.match(studioPolicy(), /frame-ancestors 'none'/);
});
