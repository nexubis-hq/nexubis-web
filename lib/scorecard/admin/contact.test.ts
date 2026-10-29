import { funnelrLeadAction } from "@/app/audit/admin/funnelr-actions";
import { performFunnelrAction } from "./funnelr-actions";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { saveAdminContact } from "@/app/audit/admin/contact-actions";
import { loadLeadsView } from "./data";
import {
  readAdminContact,
  writeAdminContact,
  parseLinkedinContact,
} from "./contact";
import {
  lookupLinkedin,
  saveLinkedinProfile,
} from "@/app/audit/admin/profile-actions";
import { lookupPersonLinkedin } from "./linkedin-lookup";
import { LeadDetail } from "@/components/scorecard/admin/LeadDetail";
import LeadsPage from "@/app/audit/admin/leads/page";
import { withProfileLock } from "./profiles";
import { buildLeadsView } from "./leads-view";
import type { FailedLead } from "./failed-leads";
import type { ManualAuditRecord } from "../manual/run";
import type { LeadRecord } from "../leads";
import type { SharedScorecard } from "../share";
import fixture from "../fixtures/scorecard-result.json";

const state = vi.hoisted(() => ({
  signedIn: true,
  values: new Map<string, unknown>(),
  writes: vi.fn(),
  report: null as SharedScorecard | null,
}));
const path = "/audit/admin/abc23456";
vi.mock("./funnelr-actions", () => ({
  performFunnelrAction: vi.fn(async () => null),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "fixture" }) }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../auth", () => ({
  SESSION_COOKIE: "fixture",
  isValidSession: () => state.signedIn,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => path,
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error("not found");
  },
  redirect: () => {
    throw new Error("redirect");
  },
}));
vi.mock("../kv", () => ({
  getKv: () => ({
    get: async (key: string) => state.values.get(key) ?? null,
    set: async (key: string, value: unknown, opts: unknown) => {
      state.writes(key, value, opts);
      state.values.set(key, structuredClone(value));
    },
    lrange: async () => [],
    incr: async (key: string) => {
      const count = Number(state.values.get(key) || 0) + 1;
      state.values.set(key, count);
      return count;
    },
    expire: async () => 1,
    del: async (key: string) => Number(state.values.delete(key)),
  }),
}));
vi.mock("../leads", () => ({
  listLeads: async () => [
    {
      reportSlug: "abc23456",
      name: "Alex",
      email: "alex@example.com",
      role: "Founder",
      company: "Example",
      url: "https://example.com",
      createdAt: new Date().toISOString(),
    } as LeadRecord,
  ],
}));
vi.mock("../manual/run", () => ({ listManualAudits: async () => [] }));
vi.mock("./failed-leads", () => ({ listFailedLeads: async () => [] }));
vi.mock("../share", () => ({ readShared: async () => state.report }));
vi.mock("../diagnostics", () => ({ readRecentScanLog: async () => [] }));
vi.mock("./linkedin-website", () => ({
  readLinkedinWebsite: vi.fn(async () => []),
  readCompanyWebsite: vi.fn(async () => ({ linkedin: [], companySocials: [] })),
}));
vi.mock("./linkedin-lookup", async (original) => ({
  ...(await original<typeof import("./linkedin-lookup")>()),
  lookupCompanyLinkedin: vi.fn(async () => null),
  lookupPersonLinkedin: vi.fn(async () => null),
}));

function form(
  firstName = "  Peter-Paul  ",
  lastName = "  Blom  ",
  role = "  Director  "
) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    leadPath: path,
    firstName,
    lastName,
    role,
  }))
    data.set(key, value);
  return data;
}
beforeEach(() => {
  vi.clearAllMocks();
  state.values.clear();
  state.signedIn = true;
  state.report = {
    result: structuredClone(fixture),
    prospectData: {
      name: "Alex",
      role: "Original role",
      url: "https://example.com",
    },
    createdAt: new Date().toISOString(),
    expiresAt: "2027-12-01T00:00:00Z",
  } as unknown as SharedScorecard;
  state.values.set(`scorecard-lead-profile:${path}`, {
    linkedinProfile: null,
    companyLinkedin: null,
    lookupVersion: 3,
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Unexpected network call");
    })
  );
});
afterEach(() => {
  expect(fetch).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

it("E1-E4 saves a private override and renders it on the lead, list, Email button, fallback and timeline without changing report JSON", async () => {
  const before = JSON.stringify(state.report);
  const initial = renderToStaticMarkup(await LeadDetail({ id: "abc23456" }));
  expect(initial).toContain("Edit contact");
  expect(initial).toContain('class="btn btn-secondary" aria-expanded="false"');
  expect(await saveAdminContact({ message: "" }, form())).toEqual({
    message: "Contact saved.",
  });
  expect(await readAdminContact(path)).toMatchObject({
    firstName: "Peter-Paul",
    lastName: "Blom",
    role: "Director",
  });
  expect(state.writes).toHaveBeenCalledExactlyOnceWith(
    `scorecard-admin-contact:${path}`,
    expect.any(Object),
    { ex: 180 * 86400 }
  );
  const view = await loadLeadsView({ period: "all" });
  expect(view.allRows[0]).toMatchObject({
    firstName: "Peter-Paul",
    lastName: "Blom",
    role: "Director",
  });
  const detail = renderToStaticMarkup(await LeadDetail({ id: "abc23456" }));
  expect(detail).toContain("<h1>Peter-Paul Blom</h1>");
  expect(detail).toContain("<dt>First name</dt><dd>Peter-Paul</dd>");
  expect(detail).toContain("<dt>Last name</dt><dd>Blom</dd>");
  expect(detail).toContain("<dt>Role</dt><dd>Director</dd>");
  expect(detail).toContain("Email Peter-Paul</a>");
  expect(detail).toContain("keywords=Peter-Paul%20Blom%20Director%20Bakon");
  expect(detail).toContain("Contact edited by admin: Alex to Peter-Paul");
  const list = renderToStaticMarkup(
    await LeadsPage({ searchParams: Promise.resolve({ period: "all" }) })
  );
  expect(list).toContain("Peter-Paul Blom");
  expect(list).toContain("Director");
  expect(JSON.stringify(state.report)).toBe(before);
  expect(view.leads[0].name).toBe("Alex");
  expect(view.leads[0].role).toBe("Founder");
  await saveAdminContact({ message: "" }, form("Jan", "", ""));
  expect(
    (await readAdminContact(path))?.edits.map((event) => event.text)
  ).toEqual([
    "Contact edited by admin: Peter-Paul to Jan",
    "Contact edited by admin: Alex to Peter-Paul",
  ]);
  expect((await loadLeadsView({ period: "all" })).allRows[0]).toMatchObject({
    firstName: "Jan",
    lastName: "",
    role: "",
  });
});
it("E3 authenticates before reading or writing", async () => {
  state.signedIn = false;
  expect(await saveAdminContact({ message: "" }, form())).toEqual({
    message: "Not signed in.",
    error: true,
  });
  expect(state.writes).not.toHaveBeenCalled();
});
it.each([
  ["   ", "Blom", "Director"],
  ["a".repeat(61), "", ""],
  ["Alex", "b".repeat(61), ""],
  ["Alex", "", "r".repeat(61)],
  ["<b>Alex</b>", "", ""],
  ["Alex", "<img>", ""],
  ["Alex", "", "<script>"],
])("E3 refuses invalid contact values (%s)", async (first, last, role) => {
  expect(
    await saveAdminContact({ message: "" }, form(first, last, role))
  ).toMatchObject({ error: true });
  expect(state.writes).not.toHaveBeenCalled();
});
it("E3 shares the profile lock and refuses unknown leads", async () => {
  await withProfileLock(path, async () => {
    expect(await saveAdminContact({ message: "" }, form())).toMatchObject({
      error: true,
      message: expect.stringContaining("in progress"),
    });
  });
  const unknown = form();
  unknown.set("leadPath", "/audit/admin/missing");
  expect(await saveAdminContact({ message: "" }, unknown)).toMatchObject({
    error: true,
    message: "Lead not found.",
  });
  expect(state.writes).not.toHaveBeenCalled();
});
it("E2 automatic admin lookup also uses the override first name", async () => {
  await saveAdminContact({ message: "" }, form());
  await lookupLinkedin(path, true);
  expect(lookupPersonLinkedin).toHaveBeenCalledWith(
    expect.objectContaining({ firstName: "Peter-Paul" }),
    []
  );
});

it("E2 overrides manual and failed rows independently using their private lead paths", () => {
  const at = new Date().toISOString();
  const edited = {
    firstName: "Jan",
    lastName: "Jansen",
    role: "Owner",
    edits: [],
  };
  const view = buildLeadsView(
    [],
    [
      {
        id: "failed",
        firstName: "Old",
        email: "old@example.com",
        url: "https://example.com",
        at,
        source: "other",
      } as FailedLead,
    ],
    [
      {
        slug: "manual",
        contactName: "Original",
        contactEmail: "manual@example.com",
        companyName: "Example",
        url: "https://example.com",
        createdAt: at,
      } as ManualAuditRecord,
    ],
    {},
    { period: "all" },
    Date.now(),
    [],
    {
      contacts: {
        "/audit/admin/manual": edited,
        "/audit/admin/failed/failed": {
          ...edited,
          firstName: "Peter",
          lastName: "",
          role: "",
        },
      },
    }
  );
  expect(view.allRows.find((row) => row.kind === "manual")).toMatchObject({
    firstName: "Jan",
    lastName: "Jansen",
    role: "Owner",
  });
  expect(view.allRows.find((row) => row.kind === "failed")).toMatchObject({
    firstName: "Peter",
    lastName: "",
    role: "",
  });
});

it.each([
  [
    "Peter-Paul Blom - General Manager - JekaShop.com | LinkedIn",
    { firstName: "Peter-Paul", lastName: "Blom", role: "General Manager" },
  ],
  [
    "Jan de Vries \u2013 Owner \u2013 Example | LinkedIn",
    { firstName: "Jan", lastName: "de Vries", role: "Owner" },
  ],
  ["Jan Jansen | LinkedIn", { firstName: "Jan", lastName: "Jansen", role: "" }],
  ["Jan | LinkedIn", null],
  ["", null],
  ["<b>Jan</b> Jansen - Owner", null],
  [`${"x".repeat(61)} Jansen - Owner`, null],
] as const)("C1 parses saved LinkedIn title: %s", (label, expected) =>
  expect(parseLinkedinContact(label)).toEqual(expected)
);
function confirmPerson() {
  const data = new FormData();
  data.set("leadPath", path);
  data.set("kind", "person");
  data.set("operation", "confirm");
  return data;
}
function linkedinPerson(
  label = "Peter-Paul Blom - General Manager - JekaShop.com | LinkedIn"
) {
  state.values.set(`scorecard-lead-profile:${path}`, {
    lookupVersion: 3,
    companyLinkedin: null,
    linkedinProfile: {
      url: "https://www.linkedin.com/in/pp-blom/",
      label,
      source: "lookup",
      status: "likely",
      savedAt: "",
    },
  });
}
it("C1 Right person fills the private contact, confirms the link and updates all admin readers without changing the report", async () => {
  linkedinPerson();
  const before = JSON.stringify(state.report);
  expect(
    await saveLinkedinProfile({ message: "" }, confirmPerson())
  ).not.toHaveProperty("error");
  expect(await readAdminContact(path)).toMatchObject({
    firstName: "Peter-Paul",
    lastName: "Blom",
    role: "General Manager",
    editedFields: [],
    edits: [
      {
        text: "Contact filled from LinkedIn: Peter-Paul Blom, General Manager",
        at: expect.any(String),
      },
    ],
  });
  expect(state.values.get(`scorecard-lead-profile:${path}`)).toMatchObject({
    linkedinProfile: { status: "confirmed" },
  });
  const html = renderToStaticMarkup(await LeadDetail({ id: "abc23456" }));
  expect(html).toContain("<h1>Peter-Paul Blom</h1>");
  expect(html).toContain("Email Peter-Paul</a>");
  expect(html).toContain(
    "Contact filled from LinkedIn: Peter-Paul Blom, General Manager"
  );
  const list = renderToStaticMarkup(
    await LeadsPage({ searchParams: Promise.resolve({ period: "all" }) })
  );
  expect(list).toContain("Peter-Paul Blom");
  expect(JSON.stringify(state.report)).toBe(before);
  const crmForm = new FormData();
  crmForm.set("mode", "check");
  crmForm.set("leadPath", path);
  expect(await funnelrLeadAction({ message: "" }, crmForm)).not.toHaveProperty(
    "error"
  );
  expect(performFunnelrAction).toHaveBeenCalledWith(
    expect.objectContaining({ firstName: "Peter-Paul" }),
    "check",
    null,
    false
  );
  expect(vi.mocked(performFunnelrAction).mock.calls[0][0]).not.toHaveProperty(
    "lastName"
  );
  expect(vi.mocked(performFunnelrAction).mock.calls[0][0]).not.toHaveProperty(
    "role"
  );
});
it("C1 refuses an unreadable label without changing either private record", async () => {
  linkedinPerson("Peter-Paul | LinkedIn");
  const before = JSON.stringify([...state.values]);
  expect(await saveLinkedinProfile({ message: "" }, confirmPerson())).toEqual({
    error: true,
    message: "Couldn't read the name from LinkedIn. Use Edit contact.",
  });
  expect(JSON.stringify([...state.values])).toBe(before);
  expect(state.writes).not.toHaveBeenCalled();
});
it("C1 preserves every field set through Edit contact, including intentionally empty fields", async () => {
  await saveAdminContact({ message: "" }, form("Manual", "", "Director"));
  const before = await readAdminContact(path);
  linkedinPerson();
  expect(
    await saveLinkedinProfile({ message: "" }, confirmPerson())
  ).not.toHaveProperty("error");
  expect(await readAdminContact(path)).toEqual(before);
});
it("C1 fills only fields without manual provenance and protects legacy Edit contact records", async () => {
  linkedinPerson();
  await writeAdminContact(path, {
    firstName: "Manual",
    lastName: "",
    role: "",
    edits: [],
    editedFields: ["firstName"],
  });
  await saveLinkedinProfile({ message: "" }, confirmPerson());
  expect(await readAdminContact(path)).toMatchObject({
    firstName: "Manual",
    lastName: "Blom",
    role: "General Manager",
    editedFields: ["firstName"],
  });
  const legacy = {
    firstName: "Legacy",
    lastName: "Name",
    role: "Owner",
    edits: [],
  };
  await writeAdminContact(path, legacy);
  await saveLinkedinProfile({ message: "" }, confirmPerson());
  expect(await readAdminContact(path)).toEqual(legacy);
});
it("C1 confirmation requires admin auth and uses the same profile lock as Edit contact", async () => {
  linkedinPerson();
  state.signedIn = false;
  expect(
    await saveLinkedinProfile({ message: "" }, confirmPerson())
  ).toMatchObject({ error: true });
  state.signedIn = true;
  await withProfileLock(path, async () =>
    expect(
      await saveLinkedinProfile({ message: "" }, confirmPerson())
    ).toMatchObject({ error: true })
  );
  expect(await readAdminContact(path)).toBeNull();
});
