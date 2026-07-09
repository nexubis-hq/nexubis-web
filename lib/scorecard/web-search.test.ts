import { test } from "vitest";
import assert from "node:assert/strict";
import { formatSearchBlock, searchConfigured, hostFromUrl, type WebSearchResponse } from "./web-search";

const r = (query: string, over: Partial<WebSearchResponse> = {}): WebSearchResponse => ({
  query,
  organic: [],
  knowledgeGraph: null,
  ...over,
});

test("searchConfigured reflects the env key", () => {
  const prevKey = process.env.SERPER_API_KEY;
  const prevMock = process.env.SCORECARD_MOCK;
  delete process.env.SERPER_API_KEY;
  delete process.env.SCORECARD_MOCK;
  assert.equal(searchConfigured(), false);
  process.env.SERPER_API_KEY = "test-key";
  assert.equal(searchConfigured(), true);
  delete process.env.SERPER_API_KEY;
  process.env.SCORECARD_MOCK = "1";
  assert.equal(searchConfigured(), true);
  if (prevKey === undefined) delete process.env.SERPER_API_KEY;
  else process.env.SERPER_API_KEY = prevKey;
  if (prevMock === undefined) delete process.env.SCORECARD_MOCK;
  else process.env.SCORECARD_MOCK = prevMock;
});

test("formatSearchBlock renders organic results and knowledge panel per query", () => {
  const block = formatSearchBlock([
    r("dosatech linkedin", {
      organic: [{ title: "DosaTech GmbH | LinkedIn", url: "https://linkedin.com/company/dosatech", snippet: "Dosing systems manufacturer, 120 followers" }],
      knowledgeGraph: "DosaTech GmbH, Manufacturer, https://dosatech.de",
    }),
  ]);
  assert.ok(block.includes('### Search: "dosatech linkedin"'));
  assert.ok(block.includes("Knowledge panel: DosaTech GmbH"));
  assert.ok(block.includes("- DosaTech GmbH | LinkedIn: Dosing systems manufacturer, 120 followers (https://linkedin.com/company/dosatech)"));
});

test("formatSearchBlock dedupes organic URLs across queries and skips failed queries", () => {
  const dup = { title: "Same Page", url: "https://same.de", snippet: "hello" };
  const block = formatSearchBlock([
    r("query one", { organic: [dup] }),
    null,
    r("query two", { organic: [dup, { title: "Other", url: "https://other.de", snippet: "" }] }),
  ]);
  assert.equal(block.match(/https:\/\/same\.de/g)?.length, 1);
  assert.ok(block.includes("- Other (https://other.de)"));
  assert.ok(!block.includes("null"));
});

test("formatSearchBlock marks empty result sets", () => {
  const block = formatSearchBlock([r("obscure query")]);
  assert.ok(block.includes("(no results)"));
});

test("hostFromUrl normalises to a bare lowercase host", () => {
  assert.equal(hostFromUrl("https://www.DosaTech.de/products"), "dosatech.de");
  assert.equal(hostFromUrl("dosatech.de"), "dosatech.de");
  assert.equal(hostFromUrl(""), null);
  assert.equal(hostFromUrl(undefined), null);
});
