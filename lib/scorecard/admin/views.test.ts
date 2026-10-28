import { expect, it } from "vitest";
import fixture from "../fixtures/scorecard-result.json";
import type { SharedScorecard } from "../share";
import type { LeadRecord } from "../leads";
import type { ManualAuditRecord } from "../manual/run";
import type { FailedLead } from "./failed-leads";
import { buildLeadsView, normalHost, ordinal } from "./leads-view";
import {
  buildActivityView,
  OUTCOME_LABELS,
  runWhy,
  runSource,
} from "./activity-view";
import { isTestContact } from "./test-contacts";
import { confirmationMatches } from "./confirmation";
import type { FunnelDayRow } from "@/lib/funnel/counter";
const now = Date.parse("2026-10-28T12:00:00Z");
const at = "2026-10-27T10:00:00Z";
const shared = {
  result: fixture,
  createdAt: at,
  expiresAt: "2027-01-01T00:00:00Z",
} as unknown as SharedScorecard;
const lead = {
  reportSlug: "a",
  name: "Alex",
  email: "alex@example.com",
  company: "Machines",
  url: "https://WWW.Example.com/path",
  createdAt: at,
  credibilityScore: 1,
  qualifiedDecision: { qualified: true, reason: "manufacturer" },
  source: "ad",
} as LeadRecord;
const failure = {
  id: "f",
  at: "2026-10-26T10:00:00Z",
  firstName: "Alex",
  email: "alex@example.com",
  url: "example.com",
  host: "example.com",
  outcome: "failed",
  reason: "blocked",
  siteRead: "403",
  source: "other",
  linkedSlug: null,
} as FailedLead;
const manual = {
  slug: "m",
  url: "example.com",
  companyName: "Hand",
  contactName: "M",
  contactEmail: "m@example.com",
  createdAt: at,
  qualifiedDecision: { qualified: false, reason: "services" },
} as ManualAuditRecord;
it.each(["ME@nexubis.io", "SHANNAHDT9+test@gmail.com", "shannahdt9@gmail.com"])(
  "recognises test %s",
  (email) => expect(isTestContact(email)).toBe(true)
);
it.each(["real@example.com", "x@nexubis.io.bad", "", undefined])(
  "keeps real contacts %s",
  (email) => expect(isTestContact(email)).toBe(false)
);
it("merges people, reads live scores and groups hosts in chronological order", () => {
  const v = buildLeadsView(
    [lead],
    [failure],
    [manual],
    { a: shared, m: shared },
    { period: "all" },
    now
  );
  expect(v.rows).toHaveLength(3);
  expect(v.rows.find((r) => r.id === "a")?.score).not.toBe(1);
  expect(v.rows.find((r) => r.id === "f")).toMatchObject({
    status: "hand",
    reportPath: "/audit/r/a",
    auditNumber: 1,
  });
  expect(v.rows.find((r) => r.id === "a")?.auditNumber).toBeGreaterThan(1);
  expect(v.rows.find((r) => r.id === "m")?.status).toBe("hand");
  expect(normalHost(lead.url)).toBe("example.com");
  expect(ordinal(2)).toBe("2nd");
  expect(ordinal(11)).toBe("11th");
});
it("keeps unresolved failures actionable and resolves explicit links or a manual audit by email", () => {
  expect(
    buildLeadsView([], [failure], [], {}, { status: "action" }, now).rows[0]
      .status
  ).toBe("failed");
  expect(
    buildLeadsView(
      [],
      [{ ...failure, linkedSlug: "m" }],
      [],
      { m: shared },
      {},
      now
    ).rows[0]
  ).toMatchObject({ status: "hand", reportPath: "/audit/r/m" });
  expect(
    buildLeadsView(
      [],
      [failure],
      [{ ...manual, contactEmail: failure.email }],
      { m: shared },
      {},
      now
    ).rows.find((r) => r.id === "f")?.status
  ).toBe("hand");
});
it("filters status, qualification, source, periods and tests with an independent period summary", () => {
  const test = { ...lead, reportSlug: "t", email: "qa@nexubis.io" };
  const old = { ...lead, reportSlug: "old", createdAt: "2026-01-01T00:00:00Z" };
  const v = buildLeadsView(
    [lead, test, old],
    [{ ...failure, email: "other@example.com" }],
    [manual],
    { a: shared, m: shared, t: shared, old: shared },
    { status: "ready", qualified: "yes", source: "ad", period: "7" },
    now
  );
  expect(v.rows.map((r) => r.id)).toEqual(["a"]);
  expect(v.testCount).toBe(1);
  expect(v.summary).toEqual({
    newCompanies: 1,
    qualified: 1,
    needsAction: 1,
    fromAd: 1,
    total: 3,
  });
  expect(
    buildLeadsView([test], [], [], { t: shared }, { showTests: true }, now).rows
  ).toHaveLength(1);
  expect(
    buildLeadsView([lead], [], [], { a: shared }, { qualified: "no" }, now).rows
  ).toHaveLength(0);
});
it("builds SAST daily funnels, source fallback and outcome totals without needing new log fields", () => {
  const funnel = [
    {
      day: "2026-10-28",
      counts: {
        arrived: { ad: 100, other: 20 },
        touched: { ad: 10, other: 5 },
        submitted: { ad: 4, other: 2 },
      },
    },
  ] as FunnelDayRow[];
  const log = [
    {
      at: "2026-10-27T23:00:00Z",
      outcome: "success" as const,
      ms: 1,
      host: "example.com",
      ad: { utm_source: "facebook" },
    },
    {
      at: "2026-10-28T01:00:00Z",
      outcome: "failed" as const,
      ms: 2,
      host: null,
      source: "other" as const,
      reason: "blocked",
    },
  ];
  const v = buildActivityView(funnel, log, 7, "ad", false, now);
  expect(v.totals).toEqual({
    visited: 100,
    started: 10,
    submitted: 4,
    ready: 1,
  });
  expect(v.daily[0].ready).toBe(1);
  expect(
    buildActivityView(funnel, log, 14, "other", false, now).outcomes.failed
  ).toBe(1);
  expect(runSource(log[0])).toBe("ad");
  expect(runSource({ ...log[0], ad: null })).toBe("other");
  expect(runWhy(log[0])).toBe("reason not recorded (before this update)");
  expect(runWhy({ ...log[0], siteRead: "403" })).toBe("403");
  expect(OUTCOME_LABELS).toEqual({
    success: "Report ready",
    failed: "Scan failed",
    timeout: "Took too long",
    invalid: "Stopped",
    limited: "Rate limit hit",
    "out-of-scope": "Rejected (old rule)",
  });
  expect(
    buildActivityView(
      [],
      [{ ...log[0], email: "qa@nexubis.io" }],
      30,
      "ad",
      false,
      now
    ).runs
  ).toHaveLength(0);
});
it("confirmation requires a nonempty host keyword", () => {
  expect(confirmationMatches("https://www.euroboor.com", " EUROBOOR ")).toBe(
    true
  );
  expect(confirmationMatches("example.com", null)).toBe(false);
  expect(confirmationMatches("example.com", "wrong")).toBe(false);
});

it("multiple failures for one email resolve to the real report slug", () => {
  const v = buildLeadsView(
    [lead],
    [failure, { ...failure, id: "older", at: "2026-10-25T00:00:00Z" }],
    [],
    { a: shared },
    { period: "all" },
    now
  );
  expect(
    v.rows.filter((r) => r.kind === "failed").map((r) => r.reportPath)
  ).toEqual(["/audit/r/a", "/audit/r/a"]);
});
