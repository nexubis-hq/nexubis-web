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

test("verifiedFactsBlock renders present and not-found lines for the scorer", () => {
  const block = verifiedFactsBlock([
    { key: "linkedin-page", present: true, evidence: "LinkedIn company page found: x." },
    { key: "brochures", present: false, evidence: "No downloadable brochure shows up." },
  ]);
  assert.ok(block.startsWith("## VERIFIED BY WEB SEARCH"));
  assert.ok(block.includes("linkedin-page: PRESENT"));
  assert.ok(block.includes("brochures: not found"));
});
