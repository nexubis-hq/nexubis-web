import { test } from "vitest";
import assert from "node:assert/strict";
import { stripEmDashes, stripEmDashesDeep, sanitizeCopy } from "./content-safety";

// Inputs build the dashes from unicode escapes (not the literal characters) so
// this test source itself stays free of the banned em dash.
const EM = String.fromCharCode(0x2014); // em dash
const EN = String.fromCharCode(0x2013); // en dash

test("stripEmDashes replaces an em dash with a comma", () => {
  assert.equal(stripEmDashes(`Fast, clear ${EM} and credible.`), "Fast, clear, and credible.");
});

test("stripEmDashes leaves hyphens and number ranges intact", () => {
  assert.equal(stripEmDashes("fixed-price"), "fixed-price");
  assert.equal(stripEmDashes("Likely 20-40%"), "Likely 20-40%");
});

test("stripEmDashes converts a spaced en dash used as punctuation", () => {
  assert.equal(stripEmDashes(`Open today ${EN} come in`), "Open today, come in");
});

test("stripEmDashes converts a bare en dash range to a hyphen", () => {
  assert.equal(stripEmDashes(`20${EN}40%`), "20-40%");
});

test("output never contains the em dash character", () => {
  const out = stripEmDashes(`a ${EM} b ${EM} c`);
  assert.ok(!out.includes(EM));
});

test("stripEmDashesDeep walks nested objects and arrays, leaving non-strings alone", () => {
  const input = { a: `x ${EM} y`, b: [`p ${EM} q`, { c: `m ${EM} n` }], n: 5, ok: true };
  const out = stripEmDashesDeep(input);
  assert.deepEqual(out, { a: "x, y", b: ["p, q", { c: "m, n" }], n: 5, ok: true });
});

test("sanitizeCopy flags AI-tell phrases", () => {
  const r = sanitizeCopy("As an AI, I cannot help with that.");
  assert.equal(r.clean, false);
  assert.ok(r.hits.some((h) => h.category === "ai-tell"));
});

test("sanitizeCopy flags placeholder and provenance language", () => {
  assert.equal(sanitizeCopy("lorem ipsum dolor").clean, false);
  assert.equal(sanitizeCopy("This was confirmed by search.").clean, false);
  assert.equal(sanitizeCopy("The crawl saw nothing.").clean, false);
});

test("sanitizeCopy flags the banned client-facing word", () => {
  const r = sanitizeCopy("Your free website audit is ready."); // audit-ok
  assert.equal(r.clean, false);
  assert.ok(r.hits.some((h) => h.category === "banned-word"));
  assert.equal(sanitizeCopy("We audited your homepage.").clean, false); // audit-ok
});

test("sanitizeCopy passes clean Scorecard copy", () => {
  const r = sanitizeCopy("Your homepage buries the offer. Lead with what you make.");
  assert.equal(r.clean, true);
  assert.deepEqual(r.hits, []);
});

test("sanitizeCopy allowlist lets the real target domain through", () => {
  assert.equal(sanitizeCopy("Visit example.com today.").clean, false);
  assert.equal(sanitizeCopy("Visit example.com today.", { allow: ["example.com"] }).clean, true);
});
