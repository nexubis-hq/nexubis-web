import { beforeEach, afterEach, expect, it, vi } from "vitest";
import fixture from "../fixtures/scorecard-result.json";
import type { SharedScorecard } from "../share";
import type { LeadRecord } from "../leads";
import type { ScanRunLog } from "../diagnostics";
import {
  derivedRunHistory,
  readRunHistory,
  appendRunHistory,
  reportRunCount,
} from "./run-history";
import { buildLeadsView } from "./leads-view";
import {
  buildActivityView,
  linkRunToLead,
  repeatViewsNote,
} from "./activity-view";
import { readRunLinks, runLinkId, runLinkKey, saveRunLink } from "./run-links";
import { linkActivityRun } from "@/app/audit/admin/run-link-actions";
const state = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  lists: new Map<string, unknown[]>(),
  set: vi.fn(),
  signedIn: true,
  view: {} as { allRows: unknown[]; now: number },
  log: [] as unknown[],
}));
vi.mock("../kv", () => ({
  getKv: () => ({
    get: async (key: string) => state.values.get(key) || null,
    set: async (key: string, value: unknown, opts: unknown) => {
      state.set(key, value, opts);
      state.values.set(key, value);
    },
    del: async (key: string) => Number(state.values.delete(key)),
    lrange: async (key: string, a: number, b: number) =>
      (state.lists.get(key) || []).slice(a, b + 1),
    lpush: async (key: string, item: unknown) =>
      state.lists.set(key, [item, ...(state.lists.get(key) || [])]),
    ltrim: async (key: string, a: number, b: number) =>
      state.lists.set(key, (state.lists.get(key) || []).slice(a, b + 1)),
    expire: async () => 1,
  }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "mock" }) }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/scorecard/auth", () => ({
  SESSION_COOKIE: "mock",
  isValidSession: () => state.signedIn,
}));
vi.mock("./data", () => ({ loadLeadsView: async () => state.view }));
vi.mock("../diagnostics", () => ({ readRecentScanLog: async () => state.log }));
const createdAt = "2026-10-23T10:00:00Z";
const shared = {
  result: { ...fixture, generatedAt: "2026-10-26T10:00:00Z" },
  createdAt,
  expiresAt: "2027-01-01T00:00:00Z",
} as unknown as SharedScorecard;
const lead = {
  reportSlug: "abc23456",
  company: "Jeka",
  name: "Jeka",
  email: "jeka@example.com",
  url: "jekashop.com",
  createdAt,
} as LeadRecord;
const run: ScanRunLog = {
  at: "2026-10-23T11:00:00Z",
  host: "jekashop.nl",
  outcome: "failed",
  ms: 3000,
  ad: { utm_content: "AD2", utm_source: "ig" },
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-28T12:00:00Z"));
  state.values.clear();
  state.lists.clear();
  state.set.mockClear();
  state.signedIn = true;
  state.log = [run];
  state.view = {
    ...buildLeadsView([lead], [], [], {}, { period: "all" }),
    now: Date.now(),
  };
});
afterEach(() => vi.useRealTimers());
it("derives first and historic admin re-run with a missing first score, and chooses the largest run count", async () => {
  const history = await readRunHistory("old", shared);
  expect(history).toHaveLength(2);
  expect(history[0]).toMatchObject({
    at: shared.result.generatedAt,
    by: "admin",
    kind: "re-run (before history was kept)",
  });
  expect(history[1]).toMatchObject({
    at: createdAt,
    by: "visitor",
    kind: "first run",
    score: null,
  });
  expect(history[0].score).not.toBeNull();
  expect(reportRunCount([], 1, shared)).toBe(2);
  expect(reportRunCount(history, 5, shared)).toBe(5);
  expect(reportRunCount([...history, ...history, ...history], 5, shared)).toBe(
    6
  );
  await appendRunHistory("new", shared, "admin", "re-run", shared);
  expect(
    (await readRunHistory("new"))
      .filter((r) => r.kind !== "first run")
      .every((r) => r.by !== "visitor")
  ).toBe(true);
});
it.each([0, 600000, 600001])(
  "only derives a second run more than ten minutes after creation (%s)",
  (delta) => {
    expect(
      derivedRunHistory({
        ...shared,
        result: {
          ...shared.result,
          generatedAt: new Date(Date.parse(createdAt) + delta).toISOString(),
        },
      })
    ).toHaveLength(delta > 600000 ? 2 : 1);
  }
);
it("retains stored history instead of inventing entries", async () => {
  state.lists.set("scorecard-run-history:known", [
    { at: createdAt, by: "manual", kind: "first run", score: 44, band: "wide" },
  ]);
  expect(await readRunHistory("known", shared)).toEqual(
    state.lists.get("scorecard-run-history:known")
  );
});
it("formats singular and plural repeat-view notes", () => {
  expect(repeatViewsNote(1)).toBe("1 repeat view not counted");
  expect(repeatViewsNote(0)).toBe("0 repeat views not counted");
  expect(repeatViewsNote(2)).toBe("2 repeat views not counted");
});
it("saves an explicit cross-host run link, uses it for Activity and timeline association, borrows its ad and unlinks", async () => {
  const rows = buildLeadsView([lead], [], [], {}, {}, Date.now()).allRows;
  expect(linkRunToLead(run, rows)).toBeUndefined();
  await saveRunLink(run, rows[0].leadPath);
  expect(state.set).toHaveBeenCalledWith(runLinkKey(run), rows[0].leadPath, {
    ex: 30 * 86400,
  });
  const links = await readRunLinks([run]);
  expect(linkRunToLead(run, rows, links)?.id).toBe(lead.reportSlug);
  const view = buildLeadsView([lead], [], [], {}, {}, Date.now(), [run], {
    runLinks: links,
  });
  expect(view.rows[0]).toMatchObject({ source: "ad", adLabel: "AD2 | ig" });
  expect(view.summary.fromAd).toBe(1);
  const activity = buildActivityView(
    [],
    [run],
    14,
    "ad",
    false,
    Date.now(),
    view.allRows,
    links
  );
  expect(activity.runs[0].lead?.leadPath).toBe(rows[0].leadPath);
  await saveRunLink(run, null);
  expect(await readRunLinks([run])).toEqual({});
  expect(
    buildLeadsView([lead], [], [], {}, {}, Date.now(), [run], {
      runLinks: await readRunLinks([run]),
    }).rows[0].adLabel
  ).toBeNull();
});
it("server link action validates session, actual run and recent destination before storing", async () => {
  const form = new FormData();
  form.set("runId", runLinkId(run));
  form.set("leadPath", "/audit/admin/abc23456");
  state.signedIn = false;
  await expect(linkActivityRun(form)).rejects.toThrow("Not signed in");
  state.signedIn = true;
  form.set("leadPath", "https://evil.example");
  await expect(linkActivityRun(form)).rejects.toThrow("last 30 days");
  form.set("leadPath", "/audit/admin/abc23456");
  await linkActivityRun(form);
  expect(state.values.get(runLinkKey(run))).toBe("/audit/admin/abc23456");
  form.set("leadPath", "");
  await linkActivityRun(form);
  expect(state.values.has(runLinkKey(run))).toBe(false);
});
it("rejects stopped, expired and malformed run links", async () => {
  await expect(
    saveRunLink({ ...run, outcome: "invalid" }, "/audit/admin/abc23456")
  ).rejects.toThrow("Only failed");
  await expect(
    saveRunLink({ ...run, at: "2026-01-01T00:00:00Z" }, "/audit/admin/abc23456")
  ).rejects.toThrow("older");
  await expect(saveRunLink(run, "/audit/admin/../../secret")).rejects.toThrow(
    "Invalid"
  );
});
