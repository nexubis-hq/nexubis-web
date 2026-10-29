import { beforeEach, expect, it, vi } from "vitest";
import { lookupCompanyLinkedin, lookupPersonLinkedin } from "./linkedin-lookup";
import { emailName } from "./linkedin";
import { searchWeb } from "../web-search";
import type { SharedScorecard } from "../share";
import fixture from "../fixtures/scorecard-result.json";
vi.mock("../web-search", async (original) => ({
  ...(await original<typeof import("../web-search")>()),
  searchWeb: vi.fn(),
}));
const lead = {
  company: "Example",
  firstName: "Jan",
  email: "pp.blom@example.com",
  url: "https://example.com",
};
const website = (url: string, text = "", surrounding = "") => ({
  url,
  text,
  surrounding,
});
const result = (
  title: string,
  snippet = "Works at Example",
  url = "https://nl.linkedin.com/in/blom"
) => ({ query: "", knowledgeGraph: null, organic: [{ url, title, snippet }] });
beforeEach(() => vi.mocked(searchWeb).mockReset().mockResolvedValue(null));
it.each([
  ["pp.blom", "", { initials: "pp", lastName: "blom" }],
  ["jan.jansen", "", { lastName: "jansen" }],
  ["j_de_vries", "", { initials: "j", lastName: "vries" }],
  ["abc.blom", "", { initials: "abc", lastName: "blom" }],
  ["info", "", {}],
  ["sales", "", {}],
  ["jan", "Jan", {}],
  ["pp.jan", "Jan", { initials: "pp" }],
  ["no-reply", "", {}],
] as const)("W3 emailName %s", (local, first, expected) =>
  expect(emailName(`${local}@example.com`, first)).toEqual(expected)
);
it("W2 website wins over report/search and prefers the L3 brand by slug or text", async () => {
  const report = {
    result: structuredClone(fixture),
  } as unknown as SharedScorecard;
  report.result.scores[0].isProspect = true;
  report.result.scores[0].categories[0].checks[0].evidence =
    "https://linkedin.com/company/report/";
  const other = website("https://linkedin.com/company/other", "Other");
  for (const match of [
    website("https://nl.linkedin.com/company/example"),
    website("https://linkedin.com/company/right", "EXAMPLE LinkedIn"),
  ]) {
    expect(
      await lookupCompanyLinkedin({ ...lead, report }, [other, match])
    ).toMatchObject({
      source: "website",
      status: "likely",
      url: expect.stringContaining(
        match.url.includes("/right") ? "/right/" : "/example/"
      ),
    });
  }
  expect(await lookupCompanyLinkedin(lead, [other])).toMatchObject({
    url: "https://www.linkedin.com/company/other/",
  });
  expect(await lookupCompanyLinkedin({ ...lead, report }, [])).toMatchObject({
    source: "audit",
    url: "https://www.linkedin.com/company/report/",
  });
  expect(searchWeb).not.toHaveBeenCalled();
  vi.mocked(searchWeb).mockResolvedValue(
    result("Example", "", "https://linkedin.com/company/search")
  );
  expect(await lookupCompanyLinkedin(lead, [])).toMatchObject({
    source: "lookup",
    url: "https://www.linkedin.com/company/search/",
  });
  expect(searchWeb).toHaveBeenCalledExactlyOnceWith(
    '"Example" site:linkedin.com/company'
  );
});
it.each(["JAN, director", "P. Blom, owner"])(
  "W4 website person matches first or email last name: %s",
  async (nearby) => {
    expect(
      await lookupPersonLinkedin(lead, [
        website("https://linkedin.com/in/owner", "LinkedIn", nearby),
      ])
    ).toMatchObject({
      source: "website",
      status: "likely",
      url: "https://www.linkedin.com/in/owner/",
    });
    expect(searchWeb).not.toHaveBeenCalled();
  }
);
it("W4 email search accepts a surname in the title and brand in snippet", async () => {
  vi.mocked(searchWeb).mockResolvedValue(result("P. BLOM"));
  expect(await lookupPersonLinkedin(lead, [])).toMatchObject({
    source: "lookup",
    url: "https://www.linkedin.com/in/blom/",
  });
  expect(searchWeb).toHaveBeenCalledExactlyOnceWith(
    "blom Example site:linkedin.com/in"
  );
});
it.each([
  result("Jan Example", "Blom at Example"),
  result("Blom", "Other employer"),
  result("Blom Example", "", "https://linkedin.com/company/example"),
  result("Blom Example", "", "https://linkedin.com.evil.com/in/blom"),
  {
    ...result("Wrong"),
    organic: [...result("Wrong").organic, ...result("Blom Example").organic],
  },
])(
  "W4 rejects invalid email-name top hits then runs the unchanged old search",
  async (first) => {
    vi.mocked(searchWeb)
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(
        result("Jan Example", "", "https://linkedin.com/in/jan")
      );
    expect(await lookupPersonLinkedin(lead, [])).toMatchObject({
      url: "https://www.linkedin.com/in/jan/",
    });
    expect(searchWeb).toHaveBeenNthCalledWith(
      2,
      "Jan Example site:linkedin.com/in"
    );
    expect(searchWeb).toHaveBeenCalledTimes(2);
  }
);
it.each(["info", "sales", "jan"])(
  "W4 generic/first-name-only email %s skips the surname query",
  async (local) => {
    await lookupPersonLinkedin({ ...lead, email: `${local}@example.com` }, []);
    expect(searchWeb).toHaveBeenCalledExactlyOnceWith(
      "Jan Example site:linkedin.com/in"
    );
  }
);
it("W8 at most three searches across both lookups", async () => {
  await Promise.all([
    lookupCompanyLinkedin(lead, []),
    lookupPersonLinkedin(lead, []),
  ]);
  expect(searchWeb).toHaveBeenCalledTimes(3);
});

it("fix 2 ignores Jeka inside the Jekashop brand when an unrelated profile is nearby", async () => {
  expect(
    await lookupPersonLinkedin(
      {
        ...lead,
        company: "Jeka",
        firstName: "Jeka",
        url: "https://jekashop.com",
        email: "info@jekashop.com",
      },
      [
        website(
          "https://linkedin.com/in/unrelated",
          "LinkedIn",
          "Jekashop team: Sam Other"
        ),
      ]
    )
  ).toBeNull();
  expect(searchWeb).toHaveBeenCalledExactlyOnceWith(
    "Jeka Jekashop site:linkedin.com/in"
  );
});

it("fix 2 pp.blom finds the profile next to Peter-Paul Blom despite the excluded first name", async () => {
  expect(
    await lookupPersonLinkedin(
      { ...lead, firstName: "Jeka", company: "Jekashop" },
      [
        website(
          "https://linkedin.com/in/unrelated",
          "LinkedIn",
          "Jekashop team: Sam Other"
        ),
        website(
          "https://linkedin.com/in/peter-paul",
          "LinkedIn",
          "Peter-Paul Blom"
        ),
      ]
    )
  ).toMatchObject({
    source: "website",
    url: "https://www.linkedin.com/in/peter-paul/",
  });
  expect(searchWeb).not.toHaveBeenCalled();
});

it("fix 2 surname match wins over an earlier first-name match", async () => {
  expect(
    await lookupPersonLinkedin(lead, [
      website("https://linkedin.com/in/jan-other", "Jan Other"),
      website(
        "https://linkedin.com/in/peter-paul",
        "LinkedIn",
        "Peter-Paul Blom"
      ),
    ])
  ).toMatchObject({
    source: "website",
    url: "https://www.linkedin.com/in/peter-paul/",
  });
  expect(searchWeb).not.toHaveBeenCalled();
});

it.each([
  ["Al", "Example"],
  ["EXA", "Example"],
  ["Sam", "Sam Company"],
])(
  "fix 2 ignores short or company-contained first name %s",
  async (firstName, company) => {
    expect(
      await lookupPersonLinkedin(
        { ...lead, firstName, company, email: "info@example.com" },
        [
          website(
            "https://linkedin.com/in/unrelated",
            "LinkedIn",
            `${firstName} Other`
          ),
        ]
      )
    ).toBeNull();
    expect(searchWeb).toHaveBeenCalledOnce(); // The original search remains the fallback.
  }
);
