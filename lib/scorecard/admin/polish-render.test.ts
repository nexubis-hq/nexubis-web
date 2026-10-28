import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { buildLeadsView } from "./leads-view";
import type { LeadRecord } from "../leads";
import type { ScanRunLog } from "../diagnostics";
import type { SharedScorecard } from "../share";
import fixture from "../fixtures/scorecard-result.json";
import LeadsPage from "@/app/audit/admin/leads/page";
import ActivityPage from "@/app/audit/admin/scans/page";
import { LeadDetail } from "@/components/scorecard/admin/LeadDetail";
const state = vi.hoisted(() => ({
  view: {} as ReturnType<typeof buildLeadsView> & {
    now: number;
    reports: Record<string, SharedScorecard>;
    leads: LeadRecord[];
    manual: [];
    failed: [];
  },
  log: [] as ScanRunLog[],
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
    throw new Error("unexpected redirect");
  },
  notFound: () => {
    throw new Error("unexpected notFound");
  },
}));
vi.mock("@/lib/scorecard/admin/data", () => ({
  loadLeadsView: async () => state.view,
}));
vi.mock("@/lib/scorecard/diagnostics", () => ({
  readRecentScanLog: async () => state.log,
  readScanCounts: async () => ({
    success: 12,
    failed: 3,
    timeout: 1,
    invalid: 2,
    limited: 1,
    "out-of-scope": 0,
  }),
}));
vi.mock("@/lib/funnel/counter", () => ({ readFunnel: async () => [] }));
vi.mock("@/lib/scorecard/admin/notes", () => ({
  readAdminNote: async () => null,
}));
vi.mock("@/lib/scorecard/manual/rerun", () => ({
  readAdminRunHistory: async () => null,
}));
vi.mock("@/lib/scorecard/admin/run-history", () => ({
  readRunHistory: async () => [],
}));
vi.mock("@/lib/scorecard/share", () => ({ readShared: async () => null }));
vi.mock("@/app/audit/admin/actions", () => ({
  saveLeadNote: vi.fn(),
  attachLoom: vi.fn(),
}));
vi.mock("@/components/scorecard/admin/RerunAuditForm", () => ({
  RerunAuditForm: () => null,
}));

it("renders fixture Leads, lead detail and Activity with reciprocal links, replay pills and comma footer", async () => {
  const now = Date.parse("2026-10-28T12:00:00Z");
  const leads = [
    {
      reportSlug: "live",
      name: "Alex",
      email: "alex.with.a.very.long.address@example-fixture.com",
      company: "Live District",
      url: "live-district.com",
      createdAt: "2026-10-28T10:00:00Z",
    },
    {
      reportSlug: "collective",
      name: "Alex",
      email: "alex.with.a.very.long.address@example-fixture.com",
      company: "Collective Consciousness",
      url: "cc-lifestyle.com",
      createdAt: "2026-10-28T10:05:00Z",
    },
    {
      reportSlug: "cars",
      name: "Sam",
      email: "sam@cars.example",
      company: "All Mobiel Cars",
      url: "cars.example",
      createdAt: "2026-10-28T10:10:00Z",
    },
  ] as LeadRecord[];
  const result = fixture as unknown as SharedScorecard["result"];
  const reports = Object.fromEntries(
    leads.map((lead) => [
      lead.reportSlug,
      {
        result: {
          ...structuredClone(result),
          meta: { ...result.meta, company: lead.company },
          verdict: { ...result.verdict, band: "wide" },
        },
        loomUrl: null,
        lastEditedAt: lead.createdAt,
        prospectData: {
          url: lead.url,
          name: lead.name,
          company: lead.company,
          role: "",
          productOneLiner: "",
          competitors: [],
        },
        createdAt: lead.createdAt,
        expiresAt: "2027-01-01T00:00:00Z",
        qualifiedDecision: {
          qualified: false,
          reason: "Services company with a very long qualification explanation",
        },
      } as SharedScorecard,
    ])
  );
  state.log = [
    {
      at: "2026-10-28T10:11:00Z",
      outcome: "success",
      host: "cars.example",
      ms: 5000,
      source: "ad",
      ad: { utm_content: "AD2_A_NL_NEW - CLEAN", utm_source: "ig" },
    },
    {
      at: "2026-10-28T10:12:00Z",
      outcome: "success",
      host: "cars.example",
      ms: 800,
      replay: true,
      source: "ad",
      slug: "cars",
    },
    {
      at: "2026-10-28T10:13:00Z",
      outcome: "failed",
      host: "blocked.example",
      ms: 5000,
      source: "ad",
    },
  ];
  state.view = {
    ...buildLeadsView(leads, [], [], reports, {}, now, state.log),
    now,
    leads,
    reports,
    failed: [],
    manual: [],
  };
  // Keep the exact two-digit regression case visible regardless of fixture rubric changes.
  state.view.rows.find((row) => row.id === "cars")!.score = 44;
  const leadsHtml = renderToStaticMarkup(
    await LeadsPage({ searchParams: Promise.resolve({}) })
  );
  expect(leadsHtml).toContain(
    'href="/audit/admin/collective">Collective Consciousness</a>'
  );
  expect(leadsHtml).toContain('href="/audit/admin/live">Live District</a>');
  expect(leadsHtml).toContain("wide gap");
  const detailHtml = renderToStaticMarkup(await LeadDetail({ id: "live" }));
  expect(detailHtml).toContain("Same contact as");
  expect(detailHtml).toContain('href="/audit/admin/collective"');
  const activityHtml = renderToStaticMarkup(
    await ActivityPage({ searchParams: Promise.resolve({}) })
  );
  expect(activityHtml).toContain("Same report shown again");
  expect(activityHtml).toContain("1 repeat views not counted");
  expect(activityHtml).toContain(
    "Report ready: 12, Scan failed: 3, Took too long: 1"
  );
  expect(activityHtml).not.toContain(" ? ");
  if (process.env.ADMIN_POLISH_FIXTURES === "1") {
    mkdirSync(".shipstudio/admin-polish-fixtures", { recursive: true });
    for (const [name, body] of Object.entries({
      leads: leadsHtml,
      activity: activityHtml,
      detail: detailHtml,
    }))
      writeFileSync(
        `.shipstudio/admin-polish-fixtures/${name}.html`,
        `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><main class="sc-admin">${body}</main></body></html>`
      );
  }
});
