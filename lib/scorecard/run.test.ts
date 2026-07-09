import { test } from "vitest";
import assert from "node:assert/strict";
import { deriveCompanyFromUrl, normaliseToHttps, prospectFromRunInput, runInputIsValid } from "./run";

test("normaliseToHttps prepends https only when missing", () => {
  assert.equal(normaliseToHttps("example.de"), "https://example.de");
  assert.equal(normaliseToHttps("http://example.de"), "http://example.de");
  assert.equal(normaliseToHttps("HTTPS://example.de"), "HTTPS://example.de");
  assert.equal(normaliseToHttps(""), "");
});

test("normaliseToHttps drops a trailing dot or slash (FQDN / pasted input)", () => {
  assert.equal(normaliseToHttps("dmnwestinghouse.com."), "https://dmnwestinghouse.com");
  assert.equal(normaliseToHttps("example.de/"), "https://example.de");
  assert.equal(normaliseToHttps("  example.de.  "), "https://example.de");
  // A trailing-dot FQDN yields the same provisional company as the clean form.
  assert.equal(deriveCompanyFromUrl("dmn-westinghouse.com."), "Dmn Westinghouse");
});

test("deriveCompanyFromUrl makes a readable provisional name from the domain", () => {
  assert.equal(deriveCompanyFromUrl("https://www.example-machinery.de/"), "Example Machinery");
  assert.equal(deriveCompanyFromUrl("veltkamp-dosing.com"), "Veltkamp Dosing");
  assert.equal(deriveCompanyFromUrl("mybiz.nl"), "Mybiz");
});

test("run input maps to a prospect with derived company, contact fields empty", () => {
  const p = prospectFromRunInput({
    url: "example-machinery.de",
    productOneLiner: "Leak detection systems for packaging lines",
    competitors: ["DosaTech GmbH", "flowserve-dosing.com"],
  });
  assert.equal(p.company, "Example Machinery");
  assert.equal(p.url, "https://example-machinery.de");
  assert.equal(p.name, ""); // collected at the unlock gate
  assert.equal(p.role, ""); // collected at the unlock gate
  assert.equal(p.productOneLiner, "Leak detection systems for packaging lines");
  assert.deepEqual(p.competitors.map((c) => c.raw), ["DosaTech GmbH", "flowserve-dosing.com"]);
});

test("runInputIsValid needs only a url (one-liner and competitors are detected)", () => {
  assert.equal(runInputIsValid({ url: "x.de" }), true);
  assert.equal(runInputIsValid({ url: "x.de", productOneLiner: "", competitors: [] }), true);
  assert.equal(runInputIsValid({ url: "" }), false);
  assert.equal(runInputIsValid({ url: "   " }), false);
  assert.equal(runInputIsValid({}), false);
});

test("blank competitor entries are dropped and the list caps at 3", () => {
  const p = prospectFromRunInput({
    url: "x.de",
    productOneLiner: "Pumps",
    competitors: [" a.de ", "", "b.de", "c.de", "d.de"],
  });
  assert.deepEqual(p.competitors.map((c) => c.raw), ["a.de", "b.de", "c.de"]);
});
