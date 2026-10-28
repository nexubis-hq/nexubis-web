import { expect, it, beforeEach, vi } from "vitest";
import fixture from "../fixtures/scorecard-result.json";
import {
  saveFailedLead,
  listFailedLeads,
  updateFailedLead,
  readFailedLead,
} from "./failed-leads";
import { appendRunHistory, readRunHistory } from "./run-history";
import type { SharedScorecard } from "../share";
const { values, lists } = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  lists: new Map<string, unknown[]>(),
}));
vi.mock("../kv", () => ({
  getKv: () => ({
    get: vi.fn(async (k: string) => values.get(k) ?? null),
    set: vi.fn(async (k: string, v: unknown) => values.set(k, v)),
    lpush: vi.fn(async (k: string, v: unknown) =>
      lists.set(k, [v, ...(lists.get(k) ?? [])])
    ),
    lrange: vi.fn(async (k: string, a: number, b: number) =>
      (lists.get(k) ?? []).slice(a, b + 1)
    ),
    ltrim: vi.fn(async (k: string, a: number, b: number) =>
      lists.set(k, (lists.get(k) ?? []).slice(a, b + 1))
    ),
    expire: vi.fn(async () => 1),
  }),
}));
beforeEach(() => {
  values.clear();
  lists.clear();
});
it("saves, caps, reads and links private failed leads with normalised emails", async () => {
  for (let i = 0; i < 502; i++)
    await saveFailedLead({
      at: new Date().toISOString(),
      firstName: "A",
      email: " A@EXAMPLE.COM ",
      url: "example.com",
      host: "example.com",
      outcome: i % 2 ? "failed" : "timeout",
      reason: "blocked",
      siteRead: "403",
      ad: null,
      source: "other",
    });
  const records = await listFailedLeads();
  expect(records).toHaveLength(500);
  expect(records[0].email).toBe("a@example.com");
  expect(records[0].linkedSlug).toBeNull();
  await updateFailedLead(records[0].id, {
    linkedSlug: "report",
    note: "follow up",
  });
  expect(await readFailedLead(records[0].id)).toMatchObject({
    linkedSlug: "report",
    note: "follow up",
  });
});
it("derives old reports and caps visitor, admin and manual history at 50", async () => {
  const shared = {
    result: fixture,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  } as unknown as SharedScorecard;
  expect(await readRunHistory("old", shared)).toHaveLength(1);
  for (const by of ["visitor", "admin", "manual"] as const)
    await appendRunHistory(
      "s",
      shared,
      by,
      by === "visitor" ? "first run" : "re-run"
    );
  expect((await readRunHistory("s")).map((r) => r.by)).toEqual([
    "manual",
    "admin",
    "visitor",
  ]);
  for (let i = 0; i < 60; i++)
    await appendRunHistory("s", shared, "admin", "re-run");
  expect(await readRunHistory("s")).toHaveLength(50);
});
