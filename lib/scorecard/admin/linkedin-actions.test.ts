import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  lookupLinkedin,
  saveLinkedinProfile,
} from "@/app/audit/admin/profile-actions";
import { lookupCompanyLinkedin, lookupPersonLinkedin } from "./linkedin-lookup";
import {
  normalizeProfile,
  readLeadProfile,
  saveLeadProfile,
  writeLeadProfile,
  type LinkedinLink,
} from "./profiles";
import { readCompanyWebsite } from "./linkedin-website";
import { loadLeadsView } from "./data";
import { runLeadPlumbing } from "../unlock";
import { notifyFailedScan } from "../notify";
import { sendCapiEvent } from "@/lib/meta/capi";
import fixture from "../fixtures/scorecard-result.json";
const state = vi.hoisted(() => ({
  signedIn: true,
  failWrites: false,
  values: new Map<string, unknown>(),
  writes: vi.fn(),
  report: { result: {} as unknown },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "session" }) }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../auth", () => ({
  SESSION_COOKIE: "session",
  isValidSession: () => state.signedIn,
}));
vi.mock("../kv", () => ({
  getKv: () => ({
    get: async (key: string) => state.values.get(key) || null,
    set: async (key: string, value: unknown, opts: unknown) => {
      if (state.failWrites) throw new Error("store unavailable");
      state.writes(key, value, opts);
      state.values.set(key, structuredClone(value));
    },
    incr: async (key: string) => {
      const n = Number(state.values.get(key) || 0) + 1;
      state.values.set(key, n);
      return n;
    },
    expire: async () => 1,
    del: async (key: string) => Number(state.values.delete(key)),
  }),
}));
vi.mock("./data", () => ({
  loadLeadsView: vi.fn(async () => ({
    allRows: [
      {
        leadPath: "/audit/admin/lead123",
        company: "Example",
        firstName: "Alex",
        host: "example.com",
        email: "alex@example.com",
        reportPath: "/audit/r/lead123",
      },
    ],
    reports: { lead123: state.report },
  })),
}));
vi.mock("./linkedin-lookup", async (original) => ({
  ...(await original<typeof import("./linkedin-lookup")>()),
  lookupCompanyLinkedin: vi.fn(),
  lookupPersonLinkedin: vi.fn(),
}));
vi.mock("../unlock", () => ({ runLeadPlumbing: vi.fn() }));
vi.mock("../notify", () => ({ notifyFailedScan: vi.fn() }));
vi.mock("@/lib/meta/capi", () => ({ sendCapiEvent: vi.fn() }));
vi.mock("./linkedin-website", () => ({
  readCompanyWebsite: vi.fn(async () => ({ linkedin: [], companySocials: [] })),
}));
const path = "/audit/admin/lead123";
const company: LinkedinLink = {
  url: "https://www.linkedin.com/company/example/",
  source: "lookup",
  status: "likely",
  savedAt: "2026-10-29T10:00:00Z",
};
const person: LinkedinLink = {
  ...company,
  url: "https://www.linkedin.com/in/alex/",
  label: "Alex Example",
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readCompanyWebsite).mockResolvedValue({
    linkedin: [],
    companySocials: [],
  });
  state.values.clear();
  state.signedIn = true;
  state.failWrites = false;
  state.report = { result: structuredClone(fixture) };
  vi.mocked(lookupCompanyLinkedin).mockResolvedValue(company);
  vi.mocked(lookupPersonLinkedin).mockResolvedValue(person);
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Unexpected external call");
    })
  );
});
afterEach(() => {
  expect(runLeadPlumbing).not.toHaveBeenCalled(); // email and Funnelr plumbing
  expect(notifyFailedScan).not.toHaveBeenCalled();
  expect(sendCapiEvent).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("LK3 authenticates before reads, searches or writes, including Search again", async () => {
  state.signedIn = false;
  expect(await lookupLinkedin(path)).toMatchObject({
    error: true,
    message: "Not signed in.",
  });
  expect(await lookupLinkedin(path, true)).toMatchObject({ error: true });
  expect(
    await saveLinkedinProfile({ message: "" }, new FormData())
  ).toMatchObject({ error: true });
  expect(state.values.size).toBe(0);
  expect(loadLeadsView).not.toHaveBeenCalled();
  expect(lookupCompanyLinkedin).not.toHaveBeenCalled();
  expect(lookupPersonLinkedin).not.toHaveBeenCalled();
});
it("LK3 runs once per lead, writes the timestamp in the same private record and preserves the report", async () => {
  const before = JSON.stringify(state.report);
  expect(await lookupLinkedin(path)).toMatchObject({
    profile: {
      companyLinkedin: company,
      linkedinProfile: person,
      lookedUpAt: expect.any(String),
    },
  });
  expect(state.writes).toHaveBeenCalledExactlyOnceWith(
    `scorecard-lead-profile:${path}`,
    expect.any(Object),
    { ex: 180 * 86400 }
  );
  expect(JSON.stringify(state.report)).toBe(before);
  vi.mocked(loadLeadsView).mockClear();
  state.writes.mockClear();
  await lookupLinkedin(path);
  expect(loadLeadsView).not.toHaveBeenCalled();
  expect(state.writes).not.toHaveBeenCalled();
  expect(lookupCompanyLinkedin).toHaveBeenCalledTimes(1);
  expect(lookupPersonLinkedin).toHaveBeenCalledTimes(1);
});
it("LK3 saves Nothing found, skips later lookups, but Search again bypasses lookedUpAt", async () => {
  vi.mocked(lookupCompanyLinkedin).mockResolvedValue(null);
  vi.mocked(lookupPersonLinkedin).mockResolvedValue(null);
  expect(await lookupLinkedin(path)).toMatchObject({
    message: "Nothing found",
    profile: { lookedUpAt: expect.any(String) },
  });
  await lookupLinkedin(path);
  expect(lookupPersonLinkedin).toHaveBeenCalledTimes(1);
  await lookupLinkedin(path, true);
  expect(lookupCompanyLinkedin).toHaveBeenCalledTimes(2);
  expect(lookupPersonLinkedin).toHaveBeenCalledTimes(2);
});
it("LK3 starts searches in parallel and settles each failure or timeout independently", async () => {
  vi.useFakeTimers();
  vi.mocked(lookupCompanyLinkedin).mockImplementation(
    () => new Promise(() => {})
  );
  vi.mocked(lookupPersonLinkedin).mockRejectedValue(new Error("search down"));
  const pending = lookupLinkedin(path);
  await vi.advanceTimersByTimeAsync(0);
  expect(lookupCompanyLinkedin).toHaveBeenCalledOnce();
  expect(lookupPersonLinkedin).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(8000);
  expect(await pending).toMatchObject({
    message: "Nothing found",
    profile: { lookedUpAt: expect.any(String) },
  });
});
it("LK3 serializes concurrent lazy requests for the same lead", async () => {
  let finish!: (value: LinkedinLink) => void;
  vi.mocked(lookupPersonLinkedin).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const first = lookupLinkedin(path);
  await vi.waitFor(() => expect(lookupPersonLinkedin).toHaveBeenCalledOnce());
  expect(await lookupLinkedin(path)).toMatchObject({ error: true });
  finish(person);
  await first;
  await lookupLinkedin(path);
  expect(lookupPersonLinkedin).toHaveBeenCalledOnce();
});
it.each(["confirmed", "manual"] as const)(
  "L5 protects %s company and person links even on Search again",
  async (status) => {
    const protectedCompany = {
      ...company,
      status,
      url: "https://www.linkedin.com/company/kept/",
    };
    const protectedPerson = {
      ...person,
      status,
      url: "https://www.linkedin.com/in/kept/",
    };
    await writeLeadProfile(path, {
      companyLinkedin: protectedCompany,
      linkedinProfile: protectedPerson,
    });
    await lookupLinkedin(path);
    await lookupLinkedin(path, true);
    expect(await readLeadProfile(path)).toMatchObject({
      companyLinkedin: protectedCompany,
      linkedinProfile: protectedPerson,
    });
  }
);
it("L5 replaces likely links and fills empty fields", async () => {
  await writeLeadProfile(path, {
    companyLinkedin: null,
    linkedinProfile: { ...person, url: "https://linkedin.com/in/old/" },
  });
  await lookupLinkedin(path);
  expect(await readLeadProfile(path)).toMatchObject({
    companyLinkedin: company,
    linkedinProfile: person,
  });
});
it("LK5 reads old strings as manual, retaining them through a lookup", async () => {
  state.values.set(`scorecard-lead-profile:${path}`, {
    companyLinkedin: company.url,
    linkedinProfile: person.url,
  });
  expect(await readLeadProfile(path)).toMatchObject({
    companyLinkedin: { url: company.url, status: "manual" },
    linkedinProfile: { url: person.url, status: "manual" },
  });
  await lookupLinkedin(path);
  expect(await readLeadProfile(path)).toMatchObject({
    companyLinkedin: { url: company.url, status: "manual" },
    linkedinProfile: { url: person.url, status: "manual" },
  });
});
function form(kind: string, operation: string, url = "") {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    leadPath: path,
    kind,
    operation,
    url,
  }))
    data.set(key, value);
  return data;
}
it("L8 confirms a person and validates individual manual saves without losing the other link or timestamp", async () => {
  await lookupLinkedin(path);
  expect(
    await saveLinkedinProfile({ message: "" }, form("person", "confirm"))
  ).not.toHaveProperty("error");
  expect((await readLeadProfile(path))?.linkedinProfile?.status).toBe(
    "confirmed"
  );
  await lookupLinkedin(path, true);
  expect((await readLeadProfile(path))?.linkedinProfile?.status).toBe(
    "confirmed"
  );
  const before = await readLeadProfile(path);
  expect(
    await saveLinkedinProfile(
      { message: "" },
      form("company", "save", "https://evil.com/linkedin.com/company/bad")
    )
  ).toMatchObject({ error: true });
  expect(await readLeadProfile(path)).toEqual(before);
  await saveLinkedinProfile(
    { message: "" },
    form("company", "save", "https://linkedin.com/company/manual")
  );
  expect(await readLeadProfile(path)).toMatchObject({
    lookedUpAt: before!.lookedUpAt,
    linkedinProfile: before!.linkedinProfile,
    companyLinkedin: {
      url: "https://www.linkedin.com/company/manual/",
      status: "manual",
      source: "manual",
    },
  });
});
it("does not search arbitrary paths and returns a contained storage failure", async () => {
  expect(await lookupLinkedin("/audit/admin/missing")).toMatchObject({
    error: true,
  });
  expect(lookupPersonLinkedin).not.toHaveBeenCalled();
  state.failWrites = true;
  expect(await lookupLinkedin(path)).toMatchObject({ error: true });
});
it("legacy manual writer keeps the 180 day TTL and compatible normalized shape", async () => {
  await saveLeadProfile(path, person.url, company.url);
  expect(
    normalizeProfile(await readLeadProfile(path)).linkedinProfile
  ).toMatchObject({ status: "manual", source: "manual" });
  expect(state.writes).toHaveBeenLastCalledWith(
    `scorecard-lead-profile:${path}`,
    expect.any(Object),
    { ex: 180 * 86400 }
  );
});

it.each([undefined, 1, 2])(
  "W5 reruns old lookup version %s once, then makes no lookup call",
  async (lookupVersion) => {
    await writeLeadProfile(path, {
      companyLinkedin: null,
      linkedinProfile: null,
      lookedUpAt: "old",
      lookupVersion,
    });
    await lookupLinkedin(path);
    expect(await readLeadProfile(path)).toMatchObject({ lookupVersion: 3 });
    await lookupLinkedin(path);
    expect(lookupCompanyLinkedin).toHaveBeenCalledOnce();
    expect(lookupPersonLinkedin).toHaveBeenCalledOnce();
    expect(readCompanyWebsite).toHaveBeenCalledOnce();
  }
);
it("W5 version 3 makes no call even without a timestamp or links", async () => {
  await writeLeadProfile(path, {
    companyLinkedin: null,
    linkedinProfile: null,
    lookupVersion: 3,
  });
  await lookupLinkedin(path);
  expect(lookupCompanyLinkedin).not.toHaveBeenCalled();
  expect(lookupPersonLinkedin).not.toHaveBeenCalled();
  expect(loadLeadsView).not.toHaveBeenCalled();
});
it.each(["confirmed", "manual"] as const)(
  "W5 version 1 rerun preserves %s links",
  async (status) => {
    const keptCompany = {
      ...company,
      status,
      url: "https://www.linkedin.com/company/keep/",
    };
    const keptPerson = {
      ...person,
      status,
      url: "https://www.linkedin.com/in/keep/",
    };
    await writeLeadProfile(path, {
      companyLinkedin: keptCompany,
      linkedinProfile: keptPerson,
      lookupVersion: 1,
      lookedUpAt: "old",
    });
    await lookupLinkedin(path);
    await lookupLinkedin(path);
    expect(await readLeadProfile(path)).toMatchObject({
      companyLinkedin: keptCompany,
      linkedinProfile: keptPerson,
      lookupVersion: 3,
    });
    expect(lookupCompanyLinkedin).toHaveBeenCalledOnce();
    expect(lookupPersonLinkedin).toHaveBeenCalledOnce();
    expect(readCompanyWebsite).toHaveBeenCalledOnce();
  }
);

it.each(["manual", "confirmed"] as const)(
  "C4 version 2 reruns once, saves socials and preserves %s links",
  async (status) => {
    const keptCompany = { ...company, status };
    const keptPerson = { ...person, status };
    await writeLeadProfile(path, {
      companyLinkedin: keptCompany,
      linkedinProfile: keptPerson,
      lookupVersion: 2,
    });
    const socials = [
      { network: "facebook" as const, url: "https://facebook.com/example" },
    ];
    vi.mocked(readCompanyWebsite).mockResolvedValue({
      linkedin: [],
      companySocials: socials,
    });
    await lookupLinkedin(path);
    await lookupLinkedin(path);
    expect(await readLeadProfile(path)).toMatchObject({
      companyLinkedin: keptCompany,
      linkedinProfile: keptPerson,
      lookupVersion: 3,
      companySocials: socials,
    });
    expect(readCompanyWebsite).toHaveBeenCalledExactlyOnceWith(
      "example.com",
      "Example"
    );
    expect(lookupCompanyLinkedin).toHaveBeenCalledOnce();
    expect(lookupPersonLinkedin).toHaveBeenCalledOnce();
    await saveLinkedinProfile(
      { message: "" },
      form("person", "save", "https://linkedin.com/in/manual")
    );
    expect((await readLeadProfile(path))?.companySocials).toEqual(socials);
  }
);
