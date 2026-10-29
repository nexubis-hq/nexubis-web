import { load } from "cheerio";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  LinkedinForm,
  LinkedinLookupProvider,
  LinkedinHeaderLinks,
  CompanySocialsRow,
  personLinkName,
} from "./LinkedinForm";
import { lookupLinkedin } from "@/app/audit/admin/profile-actions";
import type { NormalizedProfile } from "@/lib/scorecard/admin/profiles";
const state = vi.hoisted(() => ({
  effects: [] as (() => void)[],
  refresh: vi.fn(),
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useEffect: (effect: () => void) => {
    state.effects.push(effect);
  },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: state.refresh }),
}));
vi.mock("@/app/audit/admin/profile-actions", () => ({
  lookupLinkedin: vi.fn(),
  saveLinkedinProfile: vi.fn(),
}));
beforeEach(() => {
  state.effects = [];
  vi.clearAllMocks();
  vi.mocked(lookupLinkedin).mockResolvedValue({
    message: "Nothing found",
    profile: {
      companyLinkedin: null,
      linkedinProfile: null,
      lookedUpAt: "done",
      lookupVersion: 3,
    },
  });
});
afterEach(() => vi.restoreAllMocks());
function render(profile: NormalizedProfile) {
  return renderToStaticMarkup(
    createElement(LinkedinForm, {
      leadPath: "/audit/admin/example",
      profile,
      company: "Example",
      name: "Alex",
    })
  );
}
it("LK3 renders immediately, looks up after rendering, then does not repeat an effect", async () => {
  let finish!: (value: Awaited<ReturnType<typeof lookupLinkedin>>) => void;
  vi.mocked(lookupLinkedin).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const html = render({ companyLinkedin: null, linkedinProfile: null });
  expect(html).toContain("Finding LinkedIn\u2026");
  expect(lookupLinkedin).not.toHaveBeenCalled();
  state.effects[0]();
  state.effects[0](); // Strict Mode effect replay must not duplicate the request.
  expect(lookupLinkedin).toHaveBeenCalledExactlyOnceWith(
    "/audit/admin/example"
  );
  finish({
    message: "Nothing found",
    profile: {
      companyLinkedin: null,
      linkedinProfile: null,
      lookedUpAt: "done",
      lookupVersion: 3,
    },
  });
  await vi.waitFor(() => expect(state.refresh).toHaveBeenCalledOnce());
});
it("LK3 makes no lookup, refresh, fetch or extra request when lookedUpAt is set, even with no links", () => {
  const network = vi.spyOn(globalThis, "fetch");
  const html = render({
    companyLinkedin: null,
    linkedinProfile: null,
    lookedUpAt: "2026-10-29T10:00:00Z",
    lookupVersion: 3,
  });
  state.effects.forEach((effect) => effect());
  expect(lookupLinkedin).not.toHaveBeenCalled();
  expect(state.refresh).not.toHaveBeenCalled();
  expect(network).not.toHaveBeenCalled();
  expect(html).not.toContain("Finding LinkedIn\u2026");
  expect(html).not.toContain("sc-admin-likely");
  expect(html).toContain("companies/?keywords=Example");
  expect(html).toContain("people/?keywords=Alex%20Example");
});
it.each(["website", "audit", "lookup", "manual"] as const)(
  "LK6 shows %s attribution, inline menus and a likely person pill",
  (source) => {
    const html = render({
      lookedUpAt: "done",
      lookupVersion: 3,
      companyLinkedin: {
        url: "https://linkedin.com/company/example",
        status: "likely",
        source,
        savedAt: "",
      },
      linkedinProfile: {
        url: "https://linkedin.com/in/alex",
        status: "likely",
        source: "lookup",
        savedAt: "",
        label: "Alex Example",
      },
    });
    expect(html).toContain(
      source === "website"
        ? "from their website"
        : source === "audit"
          ? "found by the audit"
          : source === "lookup"
            ? "found automatically"
            : "added by hand"
    );
    expect(html).toContain("sc-admin-likely");
    expect(html.match(/Search again/g)).toHaveLength(2);
    expect(html).toContain("Edit link");
    expect(html).toContain("Right person");
    expect(html).toContain("Wrong person, change link");
    expect(html).toContain("<summary>about this</summary>");
    expect(html).not.toContain("Find LinkedIn");
  }
);
it("L8 confirmed/manual person links have no likely pill", () => {
  for (const status of ["confirmed", "manual"] as const) {
    const html = render({
      lookedUpAt: "done",
      lookupVersion: 3,
      companyLinkedin: null,
      linkedinProfile: {
        url: "https://linkedin.com/in/alex",
        source: "manual",
        status,
        savedAt: "",
      },
    });
    expect(html).not.toContain("sc-admin-likely");
  }
});

function renderSocials(profile: NormalizedProfile) {
  return renderToStaticMarkup(
    createElement(LinkedinLookupProvider, {
      leadPath: "/audit/admin/example",
      profile,
      children: createElement(
        "div",
        {},
        createElement(
          "header",
          {},
          createElement(LinkedinHeaderLinks, {
            company: "Example",
            name: "Alex",
          })
        ),
        createElement("dl", {}, createElement(CompanySocialsRow)),
        createElement(LinkedinForm, {
          leadPath: "/audit/admin/example",
          profile,
          company: "Example",
          name: "Alex",
        })
      ),
    })
  );
}
it.each([false, true])(
  "D1 socials stay in the Contact row and Follow-up guidance remains (company found=%s)",
  (found) => {
    const html = renderSocials({
      lookupVersion: 3,
      linkedinProfile: null,
      companyLinkedin: found
        ? {
            url: "https://linkedin.com/company/example",
            source: "manual",
            status: "manual",
            savedAt: "",
          }
        : null,
      companySocials: [
        { network: "x", url: "https://x.com/example" },
        { network: "instagram", url: "https://instagram.com/example" },
        { network: "facebook", url: "https://facebook.com/example" },
      ],
    });
    const header = html.slice(
      html.indexOf("<header>"),
      html.indexOf("</header>")
    );
    expect(header).toContain("linkedin.com");
    expect(header).not.toContain("facebook.com");
    expect(header).not.toContain("instagram.com");
    expect(header).not.toContain("x.com");
    expect(header.match(/not found/g)).toHaveLength(found ? 1 : 2);
    expect(
      html.includes(
        "No LinkedIn page found. See Socials under Contact and source."
      )
    ).toBe(!found);
    const row = html.slice(html.indexOf("<dt>Socials"), html.indexOf("</dl>"));
    expect(row.indexOf("Facebook")).toBeLessThan(row.indexOf("Instagram"));
    expect(row.indexOf("Instagram")).toBeLessThan(row.indexOf(">X"));
  }
);
it("C4 empty socials row shows None found and adds no header social", () => {
  const html = renderSocials({
    lookupVersion: 3,
    companyLinkedin: null,
    linkedinProfile: null,
    companySocials: [],
  });
  expect(html).toContain("<dt>Socials</dt>");
  expect(html).toContain("None found");
  expect(html).not.toContain("Facebook");
});
it("C4 company LinkedIn always remains visible while an older profile reruns", () => {
  const html = renderSocials({
    lookupVersion: 2,
    companyLinkedin: null,
    linkedinProfile: null,
    companySocials: [
      { network: "facebook", url: "https://facebook.com/example" },
    ],
  });
  const header = html.slice(
    html.indexOf("<header>"),
    html.indexOf("</header>")
  );
  expect(header).toContain("linkedin.com/search/results/companies");
  expect(header).toContain("Finding LinkedIn");
  expect(header).not.toContain("facebook.com");
  expect(html).not.toContain("No LinkedIn page found.");
});

it.each(["likely", "confirmed", "manual", "missing"] as const)(
  "C2 company and person pills match saved status: %s",
  (status) => {
    const link =
      status === "missing"
        ? null
        : {
            url: "https://linkedin.com/company/example",
            source: "lookup" as const,
            status,
            savedAt: "",
          };
    const html = renderSocials({
      lookupVersion: 3,
      companyLinkedin: link,
      linkedinProfile: link
        ? { ...link, url: "https://linkedin.com/in/alex" }
        : null,
    });
    expect((html.match(/sc-admin-not-found/g) || []).length).toBe(
      status === "missing" ? 4 : 0
    );
    expect((html.match(/sc-admin-likely/g) || []).length).toBe(
      status === "likely" ? 4 : 0
    );
    if (status === "missing") {
      expect(html).toContain("companies/?keywords=Example");
      expect(html).toContain("people/?keywords=Alex%20Example");
    }
  }
);

it.each([
  [
    "Peter-Paul Blom - General Manager - JekaShop.com | LinkedIn",
    undefined,
    "Jeka General Manager",
    "General Manager",
    "Peter-Paul Blom",
  ],
  [
    "Peter-Paul Blom \u2013 General Manager \u2013 JekaShop.com | LinkedIn",
    undefined,
    "Jeka",
    "General Manager",
    "Peter-Paul Blom",
  ],
  [
    "Peter-Paul Blom General Manager",
    undefined,
    "Jeka",
    "General Manager",
    "Peter-Paul Blom",
  ],
  [
    "Peter-Paul Blom - General Manager",
    "Jan de Vries",
    "Jeka",
    "General Manager",
    "Jan de Vries",
  ],
  [
    undefined,
    "Peter-Paul Blom",
    "Peter-Paul Blom General Manager",
    "General Manager",
    "Peter-Paul Blom",
  ],
  [undefined, undefined, "Jeka General Manager", "General Manager", "Jeka"],
] as const)(
  "D1-D2 display only the name from %s",
  (label, contactName, name, role, expected) => {
    expect(personLinkName(label, contactName, name, role)).toBe(expected);
    const profile: NormalizedProfile = {
      lookupVersion: 3,
      companyLinkedin: null,
      linkedinProfile: label
        ? {
            url: "https://linkedin.com/in/person",
            label,
            source: "lookup",
            status: "likely",
            savedAt: "",
          }
        : null,
    };
    const html = renderToStaticMarkup(
      createElement(LinkedinLookupProvider, {
        leadPath: "/audit/admin/example",
        profile,
        children: createElement(
          "div",
          {},
          createElement(
            "header",
            {},
            createElement(LinkedinHeaderLinks, {
              company: "Example",
              name,
              contactName,
              role,
            })
          ),
          createElement(LinkedinForm, {
            leadPath: "/audit/admin/example",
            profile,
            company: "Example",
            name,
            contactName,
            role,
          })
        ),
      })
    );
    const $ = load(html);
    expect(
      $("header a")
        .last()
        .text()
        .replace(/^in\s+/, "")
        .trim()
    ).toBe(expected);
    expect(
      $(".sc-admin-linkedin-line")
        .last()
        .find(".sc-admin-linkedin-title > a")
        .text()
        .trim()
    ).toBe(`${expected} \u2197`);
  }
);
it("D6 shows the exact revised LinkedIn explanation", () => {
  const $ = load(
    render({ lookupVersion: 3, linkedinProfile: null, companyLinkedin: null })
  );
  expect(
    $(".sc-admin-linkedin > .sc-admin-about p")
      .text()
      .replace(/\s+/g, " ")
      .trim()
  ).toBe(
    "The person was found by a search on name + company, so check it once. The company page can be wrong: open the person's LinkedIn profile, click their current company, and paste that link with Edit link. A confirmed or hand-pasted link is never overwritten."
  );
});
