import { test, afterEach, vi } from "vitest";
import assert from "node:assert/strict";
import { load } from "cheerio";
import { fetchSite, pickSplashEntry, pickInnerPages, validateUrl, normaliseUrl, extractLanguages, extractCopyrightYear, extractLargestForm } from "./fetch-site";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

const picker = `<h1>Choose your country and language</h1>
  <a href="https://other.example/en/">English</a><a href="/nl/">Nederlands</a>
  <fieldset><input type="radio" id="english" value="/nl-en/"><label for="english">EN</label></fieldset>`;
const content = `<title>Example machinery</title><h1>Precision machinery</h1>
  <p>${"We manufacture drilling machines for industrial buyers. ".repeat(15)}</p>`;

function mockPages(pages: Record<string, string>) {
  vi.stubEnv("SCORECARD_MOCK", "0");
  vi.stubEnv("RENDER_API_KEY", "");
  const fetch = vi.fn(async (input: string) => new Response(pages[input] || "Missing", {
    status: pages[input] ? 200 : 404, headers: { "content-type": "text/html" },
  }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

test("country picker follows English once, then walks the content page's nav", async () => {
  const fetch = mockPages({
    "https://example.com/": picker,
    "https://example.com/nl-en/": `${content}<nav><a href="products/">Products</a></nav>`,
    "https://example.com/nl-en/products/": "<p>Annular cutters and magnetic drills</p>",
  });
  const result = await fetchSite("https://example.com");
  assert.ok(result.ok);
  assert.equal(result.finalUrl, "https://example.com/nl-en/");
  assert.match(result.text, /Annular cutters/);
  assert.equal(fetch.mock.calls.length, 3);
});

test("normal landing page with language links does not trigger the extra hop", async () => {
  const fetch = mockPages({ "https://example.com/": `${content}<a href="/en/">English</a>` });
  const result = await fetchSite("https://example.com");
  assert.ok(result.ok);
  assert.equal(result.finalUrl, "https://example.com/");
  assert.equal(fetch.mock.calls.length, 1);
});

test("picker prefers Dutch next, then first same-host content link; ordinary short page stays put", () => {
  const base = new URL("https://example.com/");
  assert.equal(pickSplashEntry('<a href="/de/">Deutsch</a><a href="/nl/">Nederlands</a>', base), "https://example.com/nl/");
  assert.equal(pickSplashEntry('<h1>Select your country</h1><a href="/privacy">Privacy</a><a href="/global/">Global site</a>', base), "https://example.com/global/");
  assert.equal(pickSplashEntry('<h1>Small company</h1><a href="/about">About us</a>', base), null);
});

test("picker navigation is capped at one hop even if the chosen page is another picker", async () => {
  const fetch = mockPages({ "https://example.com/": picker, "https://example.com/nl-en/": picker });
  await fetchSite("https://example.com");
  assert.equal(fetch.mock.calls.length, 2);
});

test.each([403, 503, 200])("failed landing response %s gets just one browser retry", async (status) => {
  vi.stubEnv("SCORECARD_MOCK", "0");
  const fetch = vi.fn().mockResolvedValueOnce(new Response("Blocked", { status, headers: { "content-type": "text/plain" } }))
    .mockResolvedValueOnce(new Response(content, { headers: { "content-type": "text/html" } }));
  vi.stubGlobal("fetch", fetch);
  assert.equal((await fetchSite("https://example.com")).ok, true);
  assert.equal(fetch.mock.calls.length, 2);
  assert.match(fetch.mock.calls[1][1].headers["User-Agent"], /Chrome\//);
});

test("persistent block returns the failure reason after two attempts", async () => {
  vi.stubEnv("SCORECARD_MOCK", "0");
  const fetch = vi.fn(async () => new Response("Blocked", { status: 403 }));
  vi.stubGlobal("fetch", fetch);
  const result = await fetchSite("https://example.com");
  assert.ok(!result.ok);
  assert.match(result.reason, /403.*Browser retry also failed/);
  assert.equal(fetch.mock.calls.length, 2);
});

test("a successful browser retry keeps that identity when walking inner pages", async () => {
  vi.stubEnv("SCORECARD_MOCK", "0");
  const fetch = vi.fn()
    .mockResolvedValueOnce(new Response("Blocked", { status: 403 }))
    .mockResolvedValueOnce(new Response(`${content}<nav><a href="/products/">Products</a></nav>`, { headers: { "content-type": "text/html" } }))
    .mockResolvedValueOnce(new Response("<p>Our machines</p>", { headers: { "content-type": "text/html" } }));
  vi.stubGlobal("fetch", fetch);
  const result = await fetchSite("https://example.com");
  assert.ok(result.ok);
  assert.match(result.text, /Our machines/);
  assert.equal(fetch.mock.calls.length, 3);
  assert.equal(fetch.mock.calls[2][1].headers["User-Agent"], fetch.mock.calls[1][1].headers["User-Agent"]);
});

test("redirect cookies are retained for that origin, replaced by name, and never leaked to another host", async () => {
  vi.stubEnv("SCORECARD_MOCK", "0");
  const fetch = vi.fn()
    .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/check", "set-cookie": "check=pending; Path=/; Secure" } }))
    .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "/ready", "set-cookie": "check=ok; Path=/; Secure" } }))
    .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "https://www.example.com/" } }))
    .mockResolvedValueOnce(new Response(content, { headers: { "content-type": "text/html" } }));
  vi.stubGlobal("fetch", fetch);
  assert.equal((await fetchSite("https://example.com")).ok, true);
  assert.equal(fetch.mock.calls[1][1].headers.Cookie, "check=pending");
  assert.equal(fetch.mock.calls[2][1].headers.Cookie, "check=ok");
  assert.equal(fetch.mock.calls[3][1].headers.Cookie, undefined);
});

test("redirect destinations are validated before fetching", async () => {
  vi.stubEnv("SCORECARD_MOCK", "0");
  const fetch = vi.fn(async (_url: string) => new Response(null, { status: 302, headers: { location: "http://127.0.0.1/" } }));
  vi.stubGlobal("fetch", fetch);
  const result = await fetchSite("https://example.com");
  assert.ok(!result.ok);
  assert.match(result.reason, /redirect refused/);
  assert.ok(fetch.mock.calls.every(([url]) => url === "https://example.com/"));
});

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
