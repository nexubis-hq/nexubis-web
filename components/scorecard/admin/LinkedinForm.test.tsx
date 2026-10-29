import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LinkedinForm } from "./LinkedinForm";
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
  expect(html).toContain("Looking up LinkedIn");
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
  });
  state.effects.forEach((effect) => effect());
  expect(lookupLinkedin).not.toHaveBeenCalled();
  expect(state.refresh).not.toHaveBeenCalled();
  expect(network).not.toHaveBeenCalled();
  expect(html).not.toContain("Looking up LinkedIn");
  expect(html).not.toContain("sc-admin-likely");
  expect(html).toContain("companies/?keywords=Example");
  expect(html).toContain("people/?keywords=Alex%20Example");
});
it.each(["audit", "lookup", "manual"] as const)(
  "LK6 shows %s attribution, inline menus and a likely person pill",
  (source) => {
    const html = render({
      lookedUpAt: "done",
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
      source === "audit"
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
