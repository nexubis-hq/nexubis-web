import { test, vi, beforeEach } from "vitest";
import assert from "node:assert/strict";

// searchWeb is mocked so name resolution is tested without network or mock-mode
// plumbing; the rest of web-search (hostFromUrl etc.) stays real.
const { searchWebMock } = vi.hoisted(() => ({ searchWebMock: vi.fn() }));
vi.mock("./web-search", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./web-search")>();
  return { ...actual, searchWeb: searchWebMock };
});

import { isSelfMatch, looksLikeUrl, resolveCompetitor, resolveCompetitors } from "./competitors";
import type { ProspectData } from "./types";

const prospect: ProspectData = {
  name: "",
  role: "",
  company: "Veltkamp Dosing",
  url: "https://veltkamp-dosing.nl",
  productOneLiner: "Precision dosing equipment for food production lines",
  competitors: [{ raw: "DosaTech GmbH" }, { raw: "flowserve-dosing.com" }],
};

beforeEach(() => {
  searchWebMock.mockReset();
  searchWebMock.mockResolvedValue(null);
});

test("looksLikeUrl separates domains from names", () => {
  assert.equal(looksLikeUrl("dosatech.de"), true);
  assert.equal(looksLikeUrl("https://dosatech.de/products"), true);
  assert.equal(looksLikeUrl("DosaTech GmbH"), false);
  assert.equal(looksLikeUrl("someone@dosatech.de"), false);
  assert.equal(looksLikeUrl(""), false);
});

test("isSelfMatch catches host, subdomain, squashed-name and token overlap", () => {
  assert.equal(isSelfMatch({ name: "Whatever", url: "https://www.veltkamp-dosing.nl/x" }, prospect), true);
  assert.equal(isSelfMatch({ name: "Shop", url: "https://shop.veltkamp-dosing.nl" }, prospect), true);
  assert.equal(isSelfMatch({ name: "Veltkampdosing", url: null }, prospect), true);
  assert.equal(isSelfMatch({ name: "Veltkamp Dosing Systems", url: "https://elsewhere.com" }, prospect), true);
  assert.equal(isSelfMatch({ name: "DosaTech", url: "https://dosatech.de" }, prospect), false);
});

test("a URL entry resolves locally with a derived display name", async () => {
  const c = await resolveCompetitor("flowserve-dosing.com", prospect);
  assert.equal(c.resolved, true);
  assert.equal(c.url, "https://flowserve-dosing.com");
  assert.equal(c.name, "Flowserve Dosing");
  assert.equal(searchWebMock.mock.calls.length, 0); // no search spent on URLs
});

test("a URL entry that is the prospect itself is rejected but kept", async () => {
  const c = await resolveCompetitor("www.veltkamp-dosing.nl", prospect);
  assert.equal(c.resolved, false);
  assert.equal(c.raw, "www.veltkamp-dosing.nl");
});

test("a name entry resolves via search using the one-liner as context", async () => {
  searchWebMock.mockResolvedValue({
    query: "q",
    organic: [{ title: "DosaTech GmbH, dosing systems", url: "https://www.dosatech.de/en", snippet: "" }],
    knowledgeGraph: null,
  });
  const c = await resolveCompetitor("DosaTech GmbH", prospect);
  assert.equal(c.resolved, true);
  assert.equal(c.url, "https://dosatech.de");
  assert.equal(c.name, "DosaTech GmbH");
  const query = String(searchWebMock.mock.calls[0][0]);
  assert.ok(query.includes("DosaTech GmbH"));
  assert.ok(query.includes(prospect.productOneLiner));
});

test("name resolution skips directories and marketplaces", async () => {
  searchWebMock.mockResolvedValue({
    query: "q",
    organic: [
      { title: "DosaTech GmbH | LinkedIn", url: "https://linkedin.com/company/dosatech", snippet: "" },
      { title: "DosaTech on DirectIndustry", url: "https://www.directindustry.com/dosatech", snippet: "" },
      { title: "DosaTech GmbH", url: "https://dosatech.de", snippet: "" },
    ],
    knowledgeGraph: null,
  });
  const c = await resolveCompetitor("DosaTech", prospect);
  assert.equal(c.resolved, true);
  assert.equal(c.url, "https://dosatech.de");
});

test("an unresolvable name stays in the run with resolved:false", async () => {
  searchWebMock.mockResolvedValue({ query: "q", organic: [], knowledgeGraph: null });
  const c = await resolveCompetitor("Completely Unknown Rival", prospect);
  assert.equal(c.resolved, false);
  assert.equal(c.name, "Completely Unknown Rival");
  assert.equal(c.url, undefined);
});

test("a result whose host and title share no token with the entry is not claimed", async () => {
  searchWebMock.mockResolvedValue({
    query: "q",
    organic: [{ title: "Unrelated Blog Post", url: "https://random-site.com", snippet: "" }],
    knowledgeGraph: null,
  });
  const c = await resolveCompetitor("DosaTech", prospect);
  assert.equal(c.resolved, false);
});

test("resolveCompetitors preserves form order", async () => {
  const list = await resolveCompetitors({
    ...prospect,
    competitors: [{ raw: "flowserve-dosing.com" }, { raw: "dosatech.de" }],
  });
  assert.deepEqual(list.map((c) => c.raw), ["flowserve-dosing.com", "dosatech.de"]);
  assert.deepEqual(list.map((c) => c.resolved), [true, true]);
});
