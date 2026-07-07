import { test } from "vitest";
import assert from "node:assert/strict";
import { deriveCompanyFromUrl, normaliseToHttps, prospectFromRunInput, runInputIsValid } from "./run";

test("normaliseToHttps prepends https only when missing", () => {
  assert.equal(normaliseToHttps("example.de"), "https://example.de");
  assert.equal(normaliseToHttps("http://example.de"), "http://example.de");
  assert.equal(normaliseToHttps("HTTPS://example.de"), "HTTPS://example.de");
  assert.equal(normaliseToHttps(""), "");
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

test("runInputIsValid needs url, one-liner and 2 or 3 competitors", () => {
  const good = { url: "x.de", productOneLiner: "Dosing pumps", competitors: ["a.de", "b.de"] };
  assert.equal(runInputIsValid(good), true);
  assert.equal(runInputIsValid({ ...good, competitors: ["a.de", "b.de", "c.de"] }), true);
  assert.equal(runInputIsValid({ ...good, url: "" }), false);
  assert.equal(runInputIsValid({ ...good, productOneLiner: " " }), false);
  assert.equal(runInputIsValid({ ...good, competitors: ["a.de"] }), false);
  assert.equal(runInputIsValid({ ...good, competitors: ["a.de", "  "] }), false);
  assert.equal(runInputIsValid({ ...good, competitors: ["a.de", "b.de", "c.de", "d.de"] }), false);
});

test("blank competitor entries are dropped and the list caps at 3", () => {
  const p = prospectFromRunInput({
    url: "x.de",
    productOneLiner: "Pumps",
    competitors: [" a.de ", "", "b.de", "c.de", "d.de"],
  });
  assert.deepEqual(p.competitors.map((c) => c.raw), ["a.de", "b.de", "c.de"]);
});
