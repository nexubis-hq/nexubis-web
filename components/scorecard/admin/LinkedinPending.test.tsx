import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  LinkedinForm,
  LinkedinHeaderLinks,
  LinkedinLookupProvider,
} from "./LinkedinForm";
import { lookupLinkedin } from "@/app/audit/admin/profile-actions";
import type { NormalizedProfile } from "@/lib/scorecard/admin/profiles";
// Retain state between SSR snapshots so deferred action completion can be observed
// without a DOM dependency. Context and component rendering remain real React.
const state = vi.hoisted(() => ({
  values: [] as unknown[],
  cursor: 0,
  effects: [] as (() => void)[],
  refresh: vi.fn(),
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.values)) state.values[index] = initial;
    return [
      state.values[index],
      (next: unknown) => {
        state.values[index] = next;
      },
    ];
  },
  useRef: (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.values)) state.values[index] = { current: initial };
    return state.values[index];
  },
  useEffect: (effect: () => void) => state.effects.push(effect),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: state.refresh }),
}));
vi.mock("@/app/audit/admin/profile-actions", () => ({
  lookupLinkedin: vi.fn(),
  saveLinkedinProfile: vi.fn(),
}));
beforeEach(() => {
  state.values = [];
  state.cursor = 0;
  state.effects = [];
  vi.clearAllMocks();
});
afterEach(() => vi.useRealTimers());
function render(profile: NormalizedProfile) {
  state.cursor = 0;
  return renderToStaticMarkup(
    createElement(LinkedinLookupProvider, {
      leadPath: "/audit/admin/example",
      profile,
      children: createElement(
        "main",
        {},
        createElement(
          "header",
          {},
          createElement("a", { href: "https://example.com" }, "Website"),
          createElement(LinkedinHeaderLinks, {
            company: "Example",
            name: "Jan",
          })
        ),
        createElement(LinkedinForm, {
          leadPath: "/audit/admin/example",
          company: "Example",
          name: "Jan",
          profile,
        })
      ) as ReactNode,
    })
  );
}
it("W6 both quiet spinners replace links while pending, then show returned links without blocking the website", async () => {
  let finish!: (value: Awaited<ReturnType<typeof lookupLinkedin>>) => void;
  vi.mocked(lookupLinkedin).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const initial = {
    companyLinkedin: null,
    linkedinProfile: null,
    lookupVersion: 1,
    lookedUpAt: "old",
  };
  const pending = render(initial);
  expect(pending.match(/Finding LinkedIn\u2026/g)).toHaveLength(2);
  expect(pending.match(/sc-admin-linkedin-spinner/g)).toHaveLength(2);
  expect(pending).toContain('href="https://example.com"');
  expect(pending).toContain("linkedin.com/search/results/companies");
  state.effects[0]();
  state.effects[0]();
  expect(lookupLinkedin).toHaveBeenCalledOnce();
  finish({
    message: "LinkedIn lookup complete.",
    profile: {
      lookupVersion: 3,
      lookedUpAt: "new",
      companyLinkedin: {
        url: "https://www.linkedin.com/company/example/",
        source: "website",
        status: "likely",
        savedAt: "",
      },
      linkedinProfile: {
        url: "https://www.linkedin.com/in/jan/",
        source: "website",
        status: "likely",
        savedAt: "",
      },
    },
  });
  await vi.waitFor(() => expect(state.values[2]).toBe(false));
  const complete = render(initial);
  expect(complete).not.toContain("Finding LinkedIn");
  expect(
    complete.match(/href="https:\/\/www.linkedin.com\/company\/example\/"/g)
  ).toHaveLength(2);
  expect(
    complete.match(/href="https:\/\/www.linkedin.com\/in\/jan\/"/g)
  ).toHaveLength(2);
  expect(complete).toContain("from their website");
  state.effects.at(-2)!();
  expect(lookupLinkedin).toHaveBeenCalledOnce();
});

it("C2 a failed lookup shows its error without falsely marking fallback links not found", async () => {
  vi.mocked(lookupLinkedin).mockResolvedValue({
    message: "LinkedIn lookup could not finish.",
    error: true,
  });
  const initial = { companyLinkedin: null, linkedinProfile: null };
  render(initial);
  state.effects[0]();
  await vi.waitFor(() => expect(state.values[2]).toBe(false));
  const failed = render(initial);
  expect(failed).toContain("LinkedIn lookup could not finish.");
  expect(failed).not.toContain("sc-admin-not-found");
  expect(failed).not.toContain("No LinkedIn page found.");
});

it("D4 lookup success disappears after three seconds", async () => {
  vi.useFakeTimers();
  vi.mocked(lookupLinkedin).mockResolvedValue({
    message: "LinkedIn lookup complete.",
    profile: { lookupVersion: 3, companyLinkedin: null, linkedinProfile: null },
  });
  const initial = { companyLinkedin: null, linkedinProfile: null };
  render(initial);
  state.effects[0]();
  await vi.advanceTimersByTimeAsync(0);
  expect(render(initial)).toContain("LinkedIn lookup complete.");
  await vi.advanceTimersByTimeAsync(2999);
  expect(render(initial)).toContain("LinkedIn lookup complete.");
  await vi.advanceTimersByTimeAsync(1);
  expect(render(initial)).not.toContain("LinkedIn lookup complete.");
});
it("D4 lookup errors remain after three seconds", async () => {
  vi.useFakeTimers();
  vi.mocked(lookupLinkedin).mockResolvedValue({
    message: "LinkedIn lookup could not finish.",
    error: true,
  });
  const initial = { companyLinkedin: null, linkedinProfile: null };
  render(initial);
  state.effects[0]();
  await vi.advanceTimersByTimeAsync(4000);
  expect(render(initial)).toContain("LinkedIn lookup could not finish.");
});
