import type { LeadProfile } from "./profiles";
import type { MeetingEvent } from "./meetings";
import { FunnelrStatus as FunnelrStatusRow } from "@/components/scorecard/admin/FunnelrStatus";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import type { FunnelrStatus } from "./funnelr-status";
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
    scanLog?: ScanRunLog[];
    meetings?: Record<string, MeetingEvent[]>;
  },
  profile: null as LeadProfile | null,
  status: null as FunnelrStatus | null,
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
vi.mock("@/lib/scorecard/admin/run-history", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./run-history")>();
  return {
    ...actual,
    readRunHistory: async (_slug: string, shared: SharedScorecard) =>
      actual.derivedRunHistory(shared),
  };
});
vi.mock("@/lib/scorecard/admin/funnelr-status", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./funnelr-status")>()),
  readFunnelrStatus: async () => state.status,
}));
vi.mock("./profiles", () => ({ readLeadProfile: async () => state.profile }));
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
          generatedAt: new Date(
            Date.parse(lead.createdAt) + 3600000
          ).toISOString(),
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
    scanLog: state.log,
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
  expect(leadsHtml).toContain("New companies, last 30 days");
  state.view.period = "7";
  expect(
    renderToStaticMarkup(
      await LeadsPage({ searchParams: Promise.resolve({ period: "7" }) })
    )
  ).toContain("New companies, last 7 days");
  state.view.period = "30";
  const detailHtml = renderToStaticMarkup(await LeadDetail({ id: "live" }));
  expect(detailHtml).toContain("Same contact as");
  expect(detailHtml).toContain("Not checked yet");
  expect(detailHtml).toContain("Check Funnelr");
  expect(detailHtml).toContain("First run by visitor (score not recorded)");
  expect(detailHtml).toContain("Re-run (before history was kept)");
  expect(detailHtml).toContain("SAST (admin)");
  const header = detailHtml.slice(
    detailHtml.indexOf("<header"),
    detailHtml.indexOf("</header>")
  );
  expect(header).toContain("Not qualified");
  expect(header).not.toContain(">No</span>");
  expect(header).toContain("Website:");
  expect(header).toContain(String.fromCharCode(8599));
  expect(
    readFileSync("components/scorecard/admin/LeadDetail.tsx", "utf8")
  ).toContain("&middot;");
  state.status = {
    at: new Date(now).toISOString(),
    state: "partial",
    by: "admin-check",
    missing: ["report link"],
    attempts: 1,
    history: [],
  };
  state.view.allRows.find((row) => row.id === "live")!.funnelrStatus =
    state.status;
  const partialHtml = renderToStaticMarkup(await LeadDetail({ id: "live" }));
  expect(partialHtml).toContain("Partly in Funnelr: report link");
  expect(partialHtml).toContain("Retry sending to Funnelr");
  state.status = { ...state.status!, state: "other-report" };
  state.view.allRows.find((row) => row.id === "live")!.funnelrStatus =
    state.status;
  const otherHtml = renderToStaticMarkup(await LeadDetail({ id: "live" }));
  expect(otherHtml).toContain("In Funnelr with another report");
  expect(otherHtml).not.toContain("Retry sending to Funnelr");
  const manualOtherHtml = renderToStaticMarkup(
    FunnelrStatusRow({
      status: state.status,
      leadPath: "/audit/admin/live",
      name: "Alex",
      website: "example.com",
      test: false,
      manual: true,
      hasReport: true,
      email: "alex@example.com",
    })
  );
  expect(manualOtherHtml).not.toContain("Send to Funnelr");
  expect(manualOtherHtml).not.toContain("Retry sending to Funnelr");
  state.view.rows[0].funnelrStatus = state.status;
  const otherLeadsHtml = renderToStaticMarkup(
    await LeadsPage({ searchParams: Promise.resolve({}) })
  );
  expect(otherLeadsHtml).not.toContain("Not in Funnelr");
  expect(otherLeadsHtml).not.toContain("Funnelr failed");
  state.view.rows[0].funnelrStatus = null;
  state.status = null;
  state.view.allRows.find((row) => row.id === "live")!.funnelrStatus = null;
  expect(detailHtml).toContain('href="/audit/admin/collective"');
  expect(detailHtml).toContain(String.fromCharCode(8592));
  expect(detailHtml).toContain("Find on LinkedIn");
  expect(detailHtml).toContain("keywords=Alex%20Live%20District");
  expect(detailHtml).toContain("No meeting booked yet");
  state.view.meetings = {
    [leads[0].email]: [
      {
        event: "created",
        startTime: "2027-04-23T10:00:00Z",
        bookedAt: "2026-10-28T11:00:00Z",
        uid: "booking",
        attendeeName: "Alex",
      },
    ],
  };
  const meetingHtml = renderToStaticMarkup(await LeadDetail({ id: "live" }));
  expect(meetingHtml).toContain("Booked via cal.com for 23 Apr 2027");
  expect(meetingHtml).toContain("Bookings Laine makes outside cal.com");
  expect(meetingHtml).toContain('target="_blank"');
  state.profile = {
    linkedinProfile: "https://www.linkedin.com/in/alex/",
    companyLinkedin: "https://www.linkedin.com/company/live-district/",
  };
  const overrideHtml = renderToStaticMarkup(await LeadDetail({ id: "live" }));
  expect(overrideHtml).toContain('href="https://www.linkedin.com/in/alex/"');
  expect(overrideHtml).toContain(
    'href="https://www.linkedin.com/company/live-district/"'
  );
  expect(overrideHtml).not.toContain("Find on LinkedIn");
  state.profile = null;
  state.view.meetings = {};

  const activityHtml = renderToStaticMarkup(
    await ActivityPage({ searchParams: Promise.resolve({}) })
  );
  expect(activityHtml).toContain("Same report shown again");
  expect(activityHtml).toContain("1 repeat view not counted");
  expect(activityHtml).toContain(
    "Report ready: 12, Scan failed: 3, Took too long: 1"
  );
  expect(activityHtml).not.toContain(" ? ");
  expect(activityHtml).toContain("Link to lead");
  expect(
    activityHtml.match(/href="\/audit\/admin\/scans\?runs=problems"/g)
  ).toHaveLength(4);
  expect(
    activityHtml.match(/href="\/audit\/admin\/scans\?runs=all"/g)
  ).toHaveLength(2);
  expect(activityHtml).not.toContain("Lead from the last 30 days");
  if (process.env.ADMIN_POLISH_FIXTURES === "1") {
    mkdirSync(".shipstudio/admin-polish-fixtures", { recursive: true });
    for (const [name, body] of Object.entries({
      leads: leadsHtml,
      activity: activityHtml,
      detail: detailHtml,
    }))
      writeFileSync(
        `.shipstudio/admin-polish-fixtures/${name}.html`,
        `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><main class="sc-admin">${body}</main></body></html>`
      );
  }
});
