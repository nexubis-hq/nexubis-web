import { createElement } from "react";
import AdminLayout from "@/app/audit/admin/layout";
import { buildLeadsView } from "./leads-view";
import { linkRunToLead } from "./activity-view";
import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { performance } from "node:perf_hooks";
import { mkdirSync, writeFileSync } from "node:fs";
import fixture from "../fixtures/scorecard-result.json";
import type { LeadRecord } from "../leads";
import type { ScanRunLog } from "../diagnostics";
import type { SharedScorecard } from "../share";
import LeadsPage from "@/app/audit/admin/leads/page";
import ActivityPage from "@/app/audit/admin/scans/page";
const state = vi.hoisted(() => ({
  leads: [] as LeadRecord[],
  log: [] as ScanRunLog[],
  reports: {} as Record<string, SharedScorecard>,
  calls: {} as Record<string, number>,
  latency: 10,
}));
async function read<T>(name: string, value: T): Promise<T> {
  state.calls[name] = (state.calls[name] || 0) + 1;
  await new Promise((resolve) => setTimeout(resolve, state.latency));
  return value;
}
vi.mock("../leads", () => ({ listLeads: () => read("leads", state.leads) }));
vi.mock("../manual/run", () => ({
  listManualAudits: () => read("manual", []),
}));
vi.mock("./failed-leads", () => ({
  listFailedLeads: () => read("failed", []),
}));
vi.mock("../share", () => ({
  readShared: (slug: string) => read("report", state.reports[slug]),
}));
vi.mock("../diagnostics", () => ({
  readRecentScanLog: () => read("scanLog", state.log),
  readScanCounts: () => read("counts", {}),
}));
vi.mock("../kv", () => ({
  getKv: () => ({
    get: () => read("kvGet", null),
    lrange: () => read("kvList", []),
  }),
}));
vi.mock("@/lib/funnel/counter", () => ({
  readFunnel: () => read("funnel", []),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "fixture" }) }),
}));
vi.mock("@/lib/scorecard/auth", () => ({
  SESSION_COOKIE: "fixture",
  isValidSession: () => true,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/audit/admin/leads",
  useSearchParams: () => new URLSearchParams(),
  redirect: () => {
    throw new Error("Unexpected redirect");
  },
}));
it("measures real page rendering with 50 fixture leads and 500 runs", async () => {
  const now = Date.now();
  state.leads = Array.from(
    { length: 50 },
    (_, i) =>
      ({
        reportSlug: `abcdef${String.fromCharCode(97 + Math.floor(i / 20))}${String.fromCharCode(97 + (i % 20))}`,
        name: `Buyer ${i}`,
        email: `buyer${i}@example.com`,
        company: `Company ${i}`,
        url: `https://company${i}.example`,
        createdAt: new Date(now - i * 3600000).toISOString(),
      }) as LeadRecord
  );
  state.reports = Object.fromEntries(
    state.leads.map((l) => [
      l.reportSlug,
      {
        result: {
          ...structuredClone(fixture),
          meta: { ...fixture.meta, company: l.company },
          generatedAt: l.createdAt,
        },
        createdAt: l.createdAt,
        expiresAt: new Date(now + 180 * 86400000).toISOString(),
        loomUrl: null,
        lastEditedAt: l.createdAt,
        prospectData: { url: l.url },
      } as unknown as SharedScorecard,
    ])
  );
  state.log = Array.from(
    { length: 500 },
    (_, i) =>
      ({
        at: new Date(now - i * 60000).toISOString(),
        host: `company${i % 50}.example`,
        outcome: i % 5 === 0 ? "failed" : "success",
        ms: 5000,
        source: "ad",
      }) as ScanRunLog
  );
  const results: Record<string, unknown> = {
    latencyMs: state.latency,
    leads: 50,
    runs: 500,
  };
  for (const [name, Page] of [
    ["leads", LeadsPage],
    ["scans", ActivityPage],
  ] as const) {
    await Page({
      searchParams: Promise.resolve({ period: name === "leads" ? "30" : "30" }),
    });
    const timings = [];
    let html = "";
    for (let sample = 0; sample < 5; sample++) {
      state.calls = {};
      const start = performance.now();
      html = renderToStaticMarkup(
        await Page({ searchParams: Promise.resolve({ period: "30" }) })
      );
      timings.push(Math.round((performance.now() - start) * 10) / 10);
    }
    expect(html).toContain(name === "leads" ? "Company 0" : "Audit runs");
    if (process.env.ADMIN_TIMING_LABEL === "after") {
      mkdirSync(".shipstudio/admin-polish-2", { recursive: true });
      const body = renderToStaticMarkup(
        createElement(
          AdminLayout,
          null,
          createElement("div", {
            dangerouslySetInnerHTML: { __html: html },
          })
        )
      );
      writeFileSync(
        `.shipstudio/admin-polish-2/${name}.html`,
        `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body>${body}<script src="/client.js"></script></body></html>`
      );
    }
    expect(state.calls.report).toBe(50);
    expect(state.calls.scanLog).toBe(1);
    results[name] = {
      timings,
      median: [...timings].sort((a, b) => a - b)[2],
      reads: { ...state.calls },
    };
  }
  if (process.env.ADMIN_TIMING_LABEL === "after") {
    const view = buildLeadsView(
      state.leads,
      [],
      [],
      state.reports,
      { period: "all" },
      Date.now(),
      state.log
    );
    writeFileSync(
      ".shipstudio/admin-polish-2/fixture-data.json",
      JSON.stringify({
        choices: view.rows.map(({ leadPath, company, firstName }) => ({
          leadPath,
          company,
          firstName,
        })),
        links: state.log
          .filter((run) => run.outcome === "failed")
          .sort((a, b) => b.at.localeCompare(a.at))
          .map((run) => ({
            run,
            selected: linkRunToLead(run, view.allRows)?.leadPath || "",
          })),
      })
    );
  }
  if (process.env.ADMIN_TIMING_LABEL) {
    mkdirSync(".shipstudio/admin-polish-2", { recursive: true });
    writeFileSync(
      `.shipstudio/admin-polish-2/${process.env.ADMIN_TIMING_LABEL}-timings.json`,
      JSON.stringify(results, null, 2)
    );
  }
  console.log(JSON.stringify(results));
});
