import { test } from "vitest";
import assert from "node:assert/strict";
import { pickInnerPages, validateUrl, normaliseUrl } from "./fetch-site";

const link = (text: string, href: string) => ({ text, href });

test("page picker honours the rubric's category priority", () => {
  const picked = pickInnerPages([
    link("Contact", "https://x.de/contact"),
    link("Products", "https://x.de/products"),
    link("About us", "https://x.de/about"),
    link("Downloads", "https://x.de/downloads"),
  ]);
  assert.deepEqual(
    picked.map((p) => p.category),
    ["products", "about", "downloads", "contact"],
  );
});

test("page picker caps at 5 pages and never reuses an href", () => {
  const picked = pickInnerPages([
    link("Products", "https://x.de/all"),
    link("About", "https://x.de/all"), // same href as products: must not double-pick
    link("Machines", "https://x.de/machines"),
    link("Company", "https://x.de/company"),
    link("Brochures", "https://x.de/brochures"),
    link("Kontakt", "https://x.de/kontakt"),
    link("Request a quote", "https://x.de/quote"),
    link("Get started", "https://x.de/start"),
  ]);
  assert.ok(picked.length <= 5);
  const hrefs = picked.map((p) => p.href);
  assert.equal(new Set(hrefs).size, hrefs.length);
});

test("page picker matches German and Dutch labels", () => {
  const picked = pickInnerPages([
    link("Unternehmen", "https://x.de/unternehmen"),
    link("Kontakt", "https://x.de/kontakt"),
  ]);
  assert.deepEqual(picked.map((p) => p.category).sort(), ["about", "contact"]);
});

test("validateUrl blocks private hosts and non-http protocols", () => {
  assert.equal(validateUrl("https://example.de").ok, true);
  assert.equal(validateUrl("example.de").ok, true);
  assert.equal(validateUrl("http://localhost:3000").ok, false);
  assert.equal(validateUrl("http://192.168.1.1").ok, false);
  assert.equal(validateUrl("ftp://example.de").ok, false);
  assert.equal(validateUrl("not a url").ok, false);
});

test("normaliseUrl adds https to bare domains only", () => {
  assert.equal(normaliseUrl("example.de"), "https://example.de");
  assert.equal(normaliseUrl("http://example.de"), "http://example.de");
});
