import { test } from "vitest";
import assert from "node:assert/strict";
import { buildShareMailto } from "@/components/scorecard/report/ReportNav";
import { SHARE } from "./copy";

test("buildShareMailto produces a valid mailto with encoded subject, summary and link", () => {
  const url = "https://www.nexubis.io/scorecard/r/abc123";
  const mailto = buildShareMailto("DMN-Westinghouse", 79, url);

  assert.ok(mailto.startsWith("mailto:?"), "is a mailto with no preset recipient");
  const q = new URLSearchParams(mailto.slice("mailto:?".length));

  // Subject decodes to the share subject for the company.
  assert.equal(q.get("subject"), SHARE.subject("DMN-Westinghouse"));
  // Body decodes to the summary followed by the live report link.
  const body = q.get("body") ?? "";
  assert.ok(body.includes("DMN-Westinghouse"), "body names the company");
  assert.ok(body.includes("79 out of 100"), "body includes the score");
  assert.ok(body.endsWith(url), "body ends with the report link");
  // House rule: never the banned word in client-facing copy.
  assert.ok(!/\baudit/i.test(body), "no banned word"); // audit-ok
});

test("buildShareMailto omits the score line when the overall is null", () => {
  const mailto = buildShareMailto("Acme", null, "https://x.test/r/1");
  const body = new URLSearchParams(mailto.slice("mailto:?".length)).get("body") ?? "";
  assert.ok(!/out of 100/.test(body), "no score sentence when unscored");
  assert.ok(body.endsWith("https://x.test/r/1"));
});
