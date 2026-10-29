import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { searchWeb, type WebResult } from "../web-search";
import { gatherOffsiteEvidence, newQueryBudget } from "../offsite";
import {
  boundedLookup,
  lookupCompanyLinkedin,
  lookupPersonLinkedin,
} from "./linkedin-lookup";
import { hostFromUrl, formatSearchBlock } from "../web-search";
import {
  leadBrand,
  linkedinCompanySearch,
  linkedinPeopleSearch,
  linkedinUrl,
} from "./linkedin";
import { firstSeenLine, nextStep } from "./follow-up";
import type { SharedScorecard } from "../share";
import fixture from "../fixtures/scorecard-result.json";
vi.mock("../web-search", async (original) => ({
  ...(await original<typeof import("../web-search")>()),
  searchWeb: vi.fn(),
}));
const lead = {
  firstName: "Alex",
  company: "Example",
  url: "https://example.com",
  email: "alex@example.com",
};
const result = (
  url: string,
  title = "Example | LinkedIn",
  snippet = "Example manufacturer"
): WebResult => ({ url, title, snippet });
beforeEach(() => vi.mocked(searchWeb).mockReset());
afterEach(() => vi.useRealTimers());
it.each([
  [
    "country company hit",
    [
      result("https://nl.linkedin.com/company/example-nl"),
      result("https://www.linkedin.com/company/second/"),
    ],
  ],
  [
    "raw fallback preserves audit hit",
    [result("https://linkedin.com.evil.com/company/audit-selected/")],
  ],
  ["clear match", [result("https://www.linkedin.com/company/example/")]],
  [
    "several results",
    [
      result("https://example.com"),
      result("https://www.linkedin.com/in/alex/"),
      result("https://www.linkedin.com/company/example-1/"),
      result("https://www.linkedin.com/company/example-2/"),
    ],
  ],
  [
    "no company result",
    [
      result("https://example.com/company/example"),
      result("https://linkedin.com/in/alex"),
    ],
  ],
  [
    "similar but wrong company",
    [
      result(
        "https://www.linkedin.com/company/example-other/",
        "Example Other"
      ),
    ],
  ],
] as const)(
  "LK2 matches the existing offsite selection: %s",
  async (_name, organic) => {
    vi.mocked(searchWeb).mockImplementation(async (query) => ({
      query,
      organic: [...organic],
      knowledgeGraph: null,
    }));
    const audit = await gatherOffsiteEvidence(
      lead.company,
      lead.url,
      newQueryBudget(10)
    );
    const fact = audit.facts.find((f) => f.key === "linkedin-page")!;
    const admin = await lookupCompanyLinkedin(lead);
    const picked =
      fact.evidence.match(
        /LinkedIn company page found: (.*?)\.(?: Snippet:|$)/
      )?.[1] || null;
    expect(admin?.url || null).toBe(
      picked ? linkedinUrl(picked, "company") || picked : null
    );
    expect(searchWeb).toHaveBeenLastCalledWith(
      '"Example" site:linkedin.com/company'
    );
    // These remain the real production helpers, only the network search is mocked.
    expect(hostFromUrl(lead.url)).toBe("example.com");
    expect(formatSearchBlock([])).toBe("");
  }
);
it("uses existing report evidence with audit source and zero company searches", async () => {
  const report = {
    result: structuredClone(fixture),
  } as unknown as SharedScorecard;
  report.result.scores[0].isProspect = true;
  report.result.scores[0].categories[0].checks[0].evidence =
    "LinkedIn company page found: https://www.linkedin.com/company/example/. Snippet: company";
  const before = JSON.stringify(report);
  expect(await lookupCompanyLinkedin({ ...lead, report })).toMatchObject({
    url: "https://www.linkedin.com/company/example/",
    source: "audit",
  });
  expect(searchWeb).not.toHaveBeenCalled();
  expect(JSON.stringify(report)).toBe(before);
});
it("normalizes the selected nl company hit without changing selection", async () => {
  vi.mocked(searchWeb).mockResolvedValue({
    query: "",
    organic: [
      result("https://nl.linkedin.com/company/example-nl"),
      result("https://www.linkedin.com/company/second/"),
    ],
    knowledgeGraph: null,
  });
  expect(await lookupCompanyLinkedin(lead)).toMatchObject({
    url: "https://www.linkedin.com/company/example-nl/",
    source: "lookup",
  });
});
it("saves a matching top nl person result in normalized form", async () => {
  vi.mocked(searchWeb).mockResolvedValue({
    query: "",
    organic: [
      result("https://nl.linkedin.com/in/jan-jansen", "Jan Jansen at Example"),
    ],
    knowledgeGraph: null,
  });
  expect(
    await lookupPersonLinkedin({ ...lead, firstName: "Jan" })
  ).toMatchObject({
    url: "https://www.linkedin.com/in/jan-jansen/",
    label: "Jan Jansen at Example",
    source: "lookup",
    status: "likely",
  });
});
it.each([
  "https://nl.linkedin.com/in/jan-jansen",
  "nl.linkedin.com/in/jan-jansen",
  "http://nl.linkedin.com/in/jan-jansen",
])("normalizes a pasted country profile: %s", (input) => {
  expect(linkedinUrl(input, "in")).toBe(
    "https://www.linkedin.com/in/jan-jansen/"
  );
});
it.each([
  [
    "name and company in title",
    result("https://linkedin.com/in/alex", "Alex at Example"),
    true,
  ],
  [
    "company in snippet",
    result("https://linkedin.com/in/alex", "Alex Smith", "Works at Example"),
    true,
  ],
  [
    "wrong name",
    result("https://linkedin.com/in/sam", "Sam at Example"),
    false,
  ],
  [
    "wrong company",
    result("https://linkedin.com/in/alex", "Alex Smith", "Other employer"),
    false,
  ],
  [
    "company URL",
    result("https://linkedin.com/company/example", "Alex Example"),
    false,
  ],
  [
    "spoofed host",
    result("https://linkedin.com.evil.test/in/alex", "Alex Example"),
    false,
  ],
] as const)("person rule: %s", async (_name, top, matches) => {
  vi.mocked(searchWeb).mockResolvedValue({
    query: "",
    organic: [top],
    knowledgeGraph: null,
  });
  const found = await lookupPersonLinkedin(lead);
  expect(Boolean(found)).toBe(matches);
  if (matches)
    expect(found).toMatchObject({
      status: "likely",
      source: "lookup",
      label: top.title,
    });
  expect(searchWeb).toHaveBeenCalledExactlyOnceWith(
    "Alex Example site:linkedin.com/in"
  );
});
it("does not scan lower results, or search for missing names and test leads", async () => {
  vi.mocked(searchWeb).mockResolvedValue({
    query: "",
    organic: [
      result("https://linkedin.com/in/sam", "Sam Example"),
      result("https://linkedin.com/in/alex", "Alex Example"),
    ],
    knowledgeGraph: null,
  });
  expect(await lookupPersonLinkedin(lead)).toBeNull();
  vi.mocked(searchWeb).mockClear();
  for (const patch of [
    { firstName: "" },
    { email: "alex@nexubis.io" },
    { email: "shannahdt9+qa@gmail.com" },
  ])
    expect(await lookupPersonLinkedin({ ...lead, ...patch })).toBeNull();
  expect(searchWeb).not.toHaveBeenCalled();
});
it("L3 cleans identical/empty company names and strips www in queries and labels", async () => {
  expect(leadBrand("Jeka", "jeka", "https://www.jekashop.com")).toBe(
    "Jekashop"
  );
  expect(leadBrand("", "Jeka", "www.jekashop.com")).toBe("Jekashop");
  expect(leadBrand("Acme & Co", "Alex", lead.url)).toBe("Acme & Co");
  vi.mocked(searchWeb).mockResolvedValue(null);
  const jeka = {
    ...lead,
    firstName: "Jeka",
    company: "Jeka",
    url: "www.jekashop.com",
  };
  await lookupCompanyLinkedin(jeka);
  await lookupPersonLinkedin(jeka);
  expect(searchWeb).toHaveBeenNthCalledWith(
    1,
    '"Jekashop" site:linkedin.com/company'
  );
  expect(searchWeb).toHaveBeenNthCalledWith(
    2,
    "Jeka Jekashop site:linkedin.com/in"
  );
});
it("L6 encodes fallback URLs and deduplicates words case insensitively", () => {
  expect(linkedinCompanySearch("A/B & Co")).toBe(
    "https://www.linkedin.com/search/results/companies/?keywords=A%2FB%20%26%20Co"
  );
  expect(linkedinPeopleSearch("Jeka", "jeka")).toBe(
    "https://www.linkedin.com/search/results/people/?keywords=jeka"
  );
  expect(linkedinPeopleSearch("Alex & Sam", "A/B + Co")).toContain(
    "Alex%20%26%20Sam%20A%2FB%20%2B%20Co"
  );
});
it.each(["in", "company"] as const)(
  "L8 normalizes permitted LinkedIn %s hosts and schemes while rejecting spoofing",
  (kind) => {
    expect(linkedinUrl(`https://linkedin.com/${kind}/name/`, kind)).toBe(
      `https://www.linkedin.com/${kind}/name/`
    );
    expect(
      linkedinUrl(`https://www.linkedin.com/${kind}/name`, kind)
    ).not.toBeNull();
    for (const value of [
      `http://linkedin.com/${kind}/name`,
      `linkedin.com/${kind}/name`,
      `https://nl.linkedin.com/${kind}/name`,
      `nl.linkedin.com/${kind}/name`,
      `http://za.linkedin.com/${kind}/name`,
      `https://be.linkedin.com/${kind}/name`,
    ])
      expect(linkedinUrl(value, kind)).toBe(
        `https://www.linkedin.com/${kind}/name/`
      );
    for (const value of [
      `https://linkedin.com.evil.com/${kind}/name`,
      `https://evil.com/linkedin.com/${kind}/name`,
      `https://other.linkedin.com/${kind}/name`,
      `https://linkedin.com:443/${kind}/name`,
      `http://linkedin.com:80/${kind}/name`,
      `https://linkedin.com:8443/${kind}/name`,
      `https://evil.test/${kind}/name`,
      `https://linkedin.com.evil.test/${kind}/name`,
      `https://user@linkedin.com/${kind}/name`,
      `https://linkedin.com/${kind === "in" ? "company" : "in"}/name`,
      `https://linkedin.com/${kind}/`,
      "javascript:alert(1)",
    ])
      expect(linkedinUrl(value, kind)).toBeNull();
  }
);
it("bounds each lookup to eight seconds and catches independent failures", async () => {
  vi.useFakeTimers();
  const hanging = boundedLookup(() => new Promise(() => {}));
  expect(
    await boundedLookup(async () => {
      throw new Error("failed");
    })
  ).toBeNull();
  await vi.advanceTimersByTimeAsync(8000);
  expect(await hanging).toBeNull();
});
it("F2 gives the four next steps, with SAST meeting times", () => {
  const now = Date.parse("2026-10-29T10:00:00Z");
  const meeting = {
    event: "created" as const,
    startTime: "2026-10-30T08:15:00Z",
    bookedAt: "",
    uid: "1",
    attendeeName: "Alex",
  };
  expect(nextStep("Alex", false, undefined, now)).toBe(
    "Send Alex to Funnelr (Email 1 re-sends the report link)."
  );
  expect(nextStep("Alex", true, undefined, now)).toBe(
    "Funnelr sequence running. Waiting for a reply or a booking."
  );
  expect(nextStep("Alex", false, meeting, now)).toBe(
    "Meeting on 30 Oct 10:15. Look at LinkedIn and the report before the call."
  );
  expect(
    nextStep(
      "Alex",
      true,
      { ...meeting, startTime: "2026-10-28T08:00:00Z" },
      now
    )
  ).toBe("Meeting was on 28 Oct. Add a note on how it went.");
  expect(
    nextStep("Alex", false, { ...meeting, event: "cancelled" }, now)
  ).toContain("Send Alex");
});
it("H1 counts calendar days in SAST: today, one day, several days", () => {
  const now = Date.parse("2026-10-29T22:05:00Z"); // 30 Oct in SAST
  expect(firstSeenLine("Example", "2026-10-29T22:01:00Z", now)).toBe(
    "Example \u00B7 first seen 30 Oct (today)"
  );
  expect(firstSeenLine("Example", "2026-10-29T21:59:00Z", now)).toBe(
    "Example \u00B7 first seen 29 Oct (1 day ago)"
  );
  expect(firstSeenLine("Example", "2026-10-26T23:00:00Z", now)).toBe(
    "Example \u00B7 first seen 27 Oct (3 days ago)"
  );
});
