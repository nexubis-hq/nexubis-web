import { test, vi, beforeEach } from "vitest";
import assert from "node:assert/strict";

const { searchWebMock } = vi.hoisted(() => ({ searchWebMock: vi.fn() }));
vi.mock("./web-search", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./web-search")>();
  return { ...actual, searchWeb: searchWebMock };
});

import { gatherOffsiteEvidence, newQueryBudget, verifiedFactsBlock } from "./offsite";

const empty = { query: "q", organic: [], knowledgeGraph: null };

beforeEach(() => {
  searchWebMock.mockReset();
  searchWebMock.mockResolvedValue(empty);
});

test("linkedin company page is extracted as a present fact with evidence", async () => {
  searchWebMock.mockImplementation(async (q: string) => {
    if (q.includes("linkedin")) {
      return {
        query: q,
        organic: [{ title: "DosaTech GmbH | LinkedIn", url: "https://www.linkedin.com/company/dosatech", snippet: "1,204 followers. Dosing systems." }],
        knowledgeGraph: null,
      };
    }
    return empty;
  });
  const ev = await gatherOffsiteEvidence("DosaTech", "https://dosatech.de", newQueryBudget(24));
  const li = ev.facts.find((f) => f.key === "linkedin-page");
  assert.ok(li);
  assert.equal(li.present, true);
  assert.ok(li.evidence.includes("linkedin.com/company/dosatech"));
});

test("PDF results become a present brochures fact; none found is an honest negative", async () => {
  searchWebMock.mockImplementation(async (q: string) => {
    if (q.includes("filetype:pdf") && !q.startsWith("site:")) {
      return {
        query: q,
        organic: [{ title: "DosaTech D-500 datasheet", url: "https://dosatech.de/downloads/d500.pdf", snippet: "" }],
        knowledgeGraph: null,
      };
    }
    return empty;
  });
  const ev = await gatherOffsiteEvidence("DosaTech", "https://dosatech.de", newQueryBudget(24));
  const br = ev.facts.find((f) => f.key === "brochures");
  assert.ok(br);
  assert.equal(br.present, true);
  assert.ok(br.evidence.includes("d500.pdf"));

  searchWebMock.mockResolvedValue(empty);
  const ev2 = await gatherOffsiteEvidence("DosaTech", "https://dosatech.de", newQueryBudget(24));
  const br2 = ev2.facts.find((f) => f.key === "brochures");
  assert.equal(br2?.present, false);
  assert.ok(br2?.evidence.includes("No downloadable brochure"));
});

test("trade show mentions are detected across fair vocabulary", async () => {
  searchWebMock.mockImplementation(async (q: string) => {
    if (q.includes("exhibition")) {
      return {
        query: q,
        organic: [{ title: "DosaTech at interpack 2026", url: "https://interpack.com/exhibitors/dosatech", snippet: "Visit our stand in hall 5" }],
        knowledgeGraph: null,
      };
    }
    return empty;
  });
  const ev = await gatherOffsiteEvidence("DosaTech", "https://dosatech.de", newQueryBudget(24));
  const ts = ev.facts.find((f) => f.key === "trade-shows");
  assert.equal(ts?.present, true);
  assert.ok(ts?.evidence.includes("interpack"));
});

test("an exhausted budget skips queries and surfaces could-not-check evidence", async () => {
  const budget = newQueryBudget(2);
  const ev = await gatherOffsiteEvidence("DosaTech", "https://dosatech.de", budget);
  assert.equal(searchWebMock.mock.calls.length, 2);
  assert.equal(budget.used, 2);
  assert.equal(ev.queriesUsed, 2);
  const ts = ev.facts.find((f) => f.key === "trade-shows");
  assert.equal(ts?.present, false);
  assert.ok(ts?.evidence.includes("could not be checked"));
});

test("category findability runs only when a term is given, and matches the company's own host", async () => {
  // No term (competitor path): no findability fact, 3 or 4 queries as before.
  const evNone = await gatherOffsiteEvidence("DosaTech", "https://dosatech.de", newQueryBudget(24));
  assert.equal(evNone.facts.find((f) => f.key === "category-findability"), undefined);

  // Term given and the prospect's own site shows up: a present fact.
  searchWebMock.mockImplementation(async (q: string) => {
    if (q === "dosing pumps for chemical lines") {
      return {
        query: q,
        organic: [
          { title: "Dosing pumps overview", url: "https://some-directory.com/pumps", snippet: "" },
          { title: "DosaTech D-500", url: "https://www.dosatech.de/products/d500", snippet: "" },
        ],
        knowledgeGraph: null,
      };
    }
    return empty;
  });
  const ev = await gatherOffsiteEvidence("DosaTech", "https://dosatech.de", newQueryBudget(24), {
    categoryTerm: "dosing pumps for chemical lines",
  });
  const fa = ev.facts.find((f) => f.key === "category-findability");
  assert.equal(fa?.present, true);
  assert.ok(fa?.evidence.includes("dosatech.de"));
});

test("category findability phrases absence as a first-page sample, never a verdict", async () => {
  searchWebMock.mockImplementation(async (q: string) =>
    q === "dosing pumps"
      ? {
          query: q,
          organic: [{ title: "Rival pumps", url: "https://rival.com/pumps", snippet: "" }],
          knowledgeGraph: null,
        }
      : empty,
  );
  const ev = await gatherOffsiteEvidence("DosaTech", "https://dosatech.de", newQueryBudget(24), { categoryTerm: "dosing pumps" });
  const fa = ev.facts.find((f) => f.key === "category-findability");
  assert.equal(fa?.present, false);
  assert.ok(fa?.evidence.includes("does not appear on the first page"));
  assert.ok(fa?.evidence.includes("sample"), "the evidence declares itself a sample");
});

test("verifiedFactsBlock renders present and not-found lines for the scorer", () => {
  const block = verifiedFactsBlock([
    { key: "linkedin-page", present: true, evidence: "LinkedIn company page found: x." },
    { key: "brochures", present: false, evidence: "No downloadable brochure shows up." },
  ]);
  assert.ok(block.startsWith("## VERIFIED BY WEB SEARCH"));
  assert.ok(block.includes("linkedin-page: PRESENT"));
  assert.ok(block.includes("brochures: not found"));
});
