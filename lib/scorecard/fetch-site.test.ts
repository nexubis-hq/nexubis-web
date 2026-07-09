import { test } from "vitest";
import assert from "node:assert/strict";
import { load } from "cheerio";
import { pickInnerPages, validateUrl, normaliseUrl, extractLanguages, extractCopyrightYear, extractLargestForm } from "./fetch-site";

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

// ── Deterministic page facts ─────────────────────────────────────────────────

test("extractLanguages prefers hreflang alternates and drops x-default", () => {
  const $ = load(`<html lang="en"><head>
    <link rel="alternate" hreflang="en" href="/en/">
    <link rel="alternate" hreflang="de-DE" href="/de/">
    <link rel="alternate" hreflang="x-default" href="/">
  </head><body></body></html>`);
  const r = extractLanguages($);
  assert.deepEqual(r.languages, ["de", "en"]);
  assert.equal(r.source, "hreflang");
});

test("extractLanguages falls back to a real language switcher, not html lang alone", () => {
  const switcher = load(`<html lang="en"><body><nav>
    <a href="/de/">Deutsch</a><a href="/fr/">FR</a><a href="/products">Products</a>
  </nav></body></html>`);
  const r = extractLanguages(switcher);
  assert.deepEqual(r.languages, ["de", "en", "fr"]);
  assert.equal(r.source, "switcher");

  // Only <html lang> and no switcher: single language, source none. This is
  // the Oxipack shape (English-only site) and must never invent languages.
  const single = load(`<html lang="en"><body><nav><a href="/products">Products</a></nav></body></html>`);
  const s = extractLanguages(single);
  assert.deepEqual(s.languages, ["en"]);
  assert.equal(s.source, "none");
});

test("extractCopyrightYear reads the latest footer year, ranges included, and null without a footer year", () => {
  const $ = load(`<html><body><footer>© 2010-2019 Example Machinery GmbH</footer></body></html>`);
  assert.equal(extractCopyrightYear($), 2019);
  const none = load(`<html><body><footer>Example Machinery GmbH</footer></body></html>`);
  assert.equal(extractCopyrightYear(none), null);
  const noFooter = load(`<html><body><p>Copyright 2015 elsewhere</p></body></html>`);
  assert.equal(extractCopyrightYear(noFooter), null);
});

test("extractLargestForm reports the biggest visible form and ignores single-field search forms", () => {
  const $ = load(`<html><body>
    <form><input type="search" name="q"></form>
    <form>
      <input type="hidden" name="csrf">
      <input type="text" name="first_name">
      <input type="email" name="email">
      <select name="country"></select>
      <textarea name="message"></textarea>
      <input type="submit" value="Send">
    </form>
  </body></html>`);
  const form = extractLargestForm($);
  assert.ok(form);
  assert.equal(form.fieldCount, 4); // hidden and submit excluded
  assert.deepEqual(form.fields, ["first name", "email", "country", "message"]);

  const searchOnly = load(`<html><body><form><input type="search" name="q"></form></body></html>`);
  assert.equal(extractLargestForm(searchOnly), null);
});
