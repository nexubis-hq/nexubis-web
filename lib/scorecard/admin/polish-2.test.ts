import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RunLeadLink } from "@/components/scorecard/admin/RunLeadLink";
import LeadsLoading from "@/app/audit/admin/leads/loading";
import ScansLoading from "@/app/audit/admin/scans/loading";
import {
  recordMeeting,
  readMeetings,
  meetingKey,
  meetingSummary,
  meetingText,
  type MeetingEvent,
} from "./meetings";
import {
  handleCalWebhook,
  signCalWebhookBody,
  type CalFunnelrClient,
} from "@/lib/cal-webhook/handler";
import { NEXUBIS_TAG_IDS } from "@/lib/funnelr/nexubis-tags";
import {
  linkedinUrl,
  linkedinPeopleSearch,
  storedCompanyLinkedin,
} from "./linkedin";
import { saveLeadProfile, readLeadProfile } from "./profiles";
import { formatSast } from "./dates";
import { buildLeadsView } from "./leads-view";
import { linkRunToLead } from "./activity-view";
import { auditTimeline } from "./timeline";
import fixture from "../fixtures/scorecard-result.json";
import type { SharedScorecard } from "../share";
import type { LeadRecord } from "../leads";
import type { ScanRunLog } from "../diagnostics";
const state = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  lists: new Map<string, unknown[]>(),
  expiry: new Map<string, number>(),
  failMeeting: false,
}));
vi.mock("../kv", () => ({
  getKv: () => ({
    incr: async (key: string) => {
      const next = Number(state.values.get(key) || 0) + 1;
      state.values.set(key, next);
      return next;
    },
    del: async (key: string) => Number(state.values.delete(key)),
    get: async (key: string) => state.values.get(key) || null,
    set: async (key: string, value: unknown, opts?: { ex: number }) => {
      state.values.set(key, value);
      if (opts) state.expiry.set(key, opts.ex);
    },
    lrange: async (key: string, a: number, b: number) => {
      if (state.failMeeting && key.startsWith("scorecard-meeting:"))
        throw new Error("KV failure");
      return (state.lists.get(key) || []).slice(a, b + 1);
    },
    lpush: async (key: string, value: unknown) =>
      state.lists.set(key, [value, ...(state.lists.get(key) || [])]),
    ltrim: async (key: string, a: number, b: number) =>
      state.lists.set(key, (state.lists.get(key) || []).slice(a, b + 1)),
    expire: async (key: string, seconds: number) =>
      state.expiry.set(key, seconds),
  }),
}));
const now = Date.parse("2026-10-28T12:00:00Z");
const meeting: MeetingEvent = {
  event: "created",
  startTime: "2027-04-23T10:00:00Z",
  bookedAt: "2026-10-28T10:00:00Z",
  uid: "booking-1",
  attendeeName: "Alex",
};
const lead = {
  reportSlug: "abc23456",
  name: "Alex",
  email: "alex@example.com",
  company: "Example",
  url: "https://example.com",
  createdAt: "2026-10-28T10:00:00Z",
} as LeadRecord;
const shared = {
  result: { ...fixture, generatedAt: "2026-10-28T11:00:00Z" },
  createdAt: lead.createdAt,
  expiresAt: "2027-04-23T10:00:00Z",
} as unknown as SharedScorecard;
const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
const env = {
  CAL_WEBHOOK_SECRET: "fixture-secret",
  CAL_APPLICATION_EVENT_SLUG: "fixture-call",
};
function client(fails = false) {
  let tagged = true;
  const calls: string[] = [];
  const crm: CalFunnelrClient = {
    findContactByEmail: async () => {
      calls.push("find");
      if (fails) throw new Error("CRM unavailable");
      return { userId: 7 };
    },
    createContact: async () => {
      calls.push("create");
      return { userId: 7 };
    },
    findTagById: async () => {
      calls.push("tag");
      return { tagId: NEXUBIS_TAG_IDS.pipelineCallBooked };
    },
    findTagByName: async () => null,
    contactHasTag: async () => {
      calls.push("has");
      return tagged;
    },
    addTagToContact: async () => {
      calls.push("add");
      tagged = true;
    },
    removeTagFromContact: async () => {
      calls.push("remove");
      tagged = false;
    },
  };
  return { crm, calls };
}
function event(triggerEvent: string, slug = "fixture-call") {
  const raw = JSON.stringify({
    triggerEvent,
    payload: {
      uid: "uid-1",
      type: slug,
      startTime: meeting.startTime,
      attendees: [{ email: " ALEX@EXAMPLE.COM ", name: "Alex Fixture" }],
    },
  });
  return { raw, signature: signCalWebhookBody(raw, env.CAL_WEBHOOK_SECRET) };
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  state.values.clear();
  state.lists.clear();
  state.expiry.clear();
  state.failMeeting = false;
});
afterEach(() => vi.useRealTimers());
it.each([
  ["BOOKING_CREATED", "created"],
  ["BOOKING_RESCHEDULED", "rescheduled"],
  ["BOOKING_CANCELLED", "cancelled"],
])(
  "records %s before Funnelr, including a later CRM failure",
  async (trigger, recorded) => {
    const request = event(trigger);
    const mock = client(true);
    expect(
      (
        await handleCalWebhook(request.raw, request.signature, {
          env,
          client: mock.crm,
          logger,
          dedupe: false,
        })
      ).status
    ).toBe(500);
    expect(await readMeetings("alex@example.com")).toEqual([
      {
        event: recorded,
        startTime: meeting.startTime,
        bookedAt: new Date(now).toISOString(),
        uid: "uid-1",
        attendeeName: "Alex Fixture",
      },
    ]);
    expect(state.expiry.get(meetingKey("alex@example.com"))).toBe(400 * 86400);
  }
);
it.each(["BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED"])(
  "a meeting KV failure changes neither %s response nor CRM calls",
  async (trigger) => {
    const request = event(trigger);
    const first = client();
    const baseline = await handleCalWebhook(request.raw, request.signature, {
      env,
      client: first.crm,
      logger,
      dedupe: false,
    });
    state.failMeeting = true;
    const second = client();
    const result = await handleCalWebhook(request.raw, request.signature, {
      env,
      client: second.crm,
      logger,
      dedupe: false,
    });
    expect(JSON.stringify(result)).toBe(JSON.stringify(baseline));
    expect(second.calls).toEqual(first.calls);
  }
);
it("does not record rejected signatures, slugs or triggers and preserves webhook dedupe", async () => {
  const request = event("BOOKING_CREATED");
  const mock = client();
  await handleCalWebhook(request.raw, "bad", { env, client: mock.crm, logger });
  const unrelated = event("BOOKING_CREATED", "other");
  await handleCalWebhook(unrelated.raw, unrelated.signature, {
    env,
    client: mock.crm,
    logger,
  });
  const unsupported = event("PING");
  await handleCalWebhook(unsupported.raw, unsupported.signature, {
    env,
    client: mock.crm,
    logger,
  });
  expect(state.lists.size).toBe(0);
  expect(mock.calls).toHaveLength(0);
  await handleCalWebhook(request.raw, request.signature, {
    env,
    client: mock.crm,
    logger,
  });
  const count = mock.calls.length;
  expect(
    (
      await handleCalWebhook(request.raw, request.signature, {
        env,
        client: mock.crm,
        logger,
      })
    ).body.action
  ).toBe("duplicate_event");
  expect(mock.calls).toHaveLength(count);
  expect(await readMeetings(lead.email)).toHaveLength(1);
});
it("caps booking events, deduplicates retries and shows booking, reschedule and cancellation states", async () => {
  for (let i = 0; i < 25; i++)
    await recordMeeting(" ALEX@EXAMPLE.COM ", { ...meeting, uid: `uid-${i}` });
  const events = await readMeetings(lead.email);
  expect(events).toHaveLength(20);
  expect(events[0].uid).toBe("uid-24");
  await recordMeeting(lead.email, events[0]);
  expect(await readMeetings(lead.email)).toHaveLength(20);
  expect(meetingText(meeting)).toContain("Booked via cal.com for 23 Apr 2027");
  expect(meetingText({ ...meeting, event: "rescheduled" })).toContain(
    "Rescheduled to"
  );
  expect(meetingText({ ...meeting, event: "cancelled" })).toBe("Cancelled");
  expect(meetingText()).toBe("No meeting booked yet");
  expect(
    meetingSummary([
      { ...meeting, event: "cancelled", bookedAt: "2026-10-28T11:00:00Z" },
      meeting,
    ]).active
  ).toBe(false);
  expect(
    meetingSummary([
      { ...meeting, event: "cancelled", bookedAt: "2026-10-28T11:00:00Z" },
      { ...meeting, uid: "another" },
    ]).active
  ).toBe(true);
  const view = buildLeadsView(
    [lead],
    [],
    [],
    {},
    { status: "meeting" },
    now,
    [],
    { meetings: { [lead.email]: [meeting] } }
  );
  expect(view.rows[0].meetingBooked).toBe(true);
  expect(
    buildLeadsView([lead], [], [], {}, { status: "meeting" }, now).rows
  ).toHaveLength(0);
});
it("builds an encoded people search and validates admin profile overrides without fetching", async () => {
  expect(linkedinPeopleSearch("Alex & Sam", "A/B + Co")).toBe(
    "https://www.linkedin.com/search/results/people/?keywords=Alex%20%26%20Sam%20A%2FB%20%2B%20Co"
  );
  expect(linkedinUrl("https://www.linkedin.com/in/alex/", "in")).toBe(
    "https://www.linkedin.com/in/alex/"
  );
  for (const url of [
    "https://evil.example/in/alex",
    "https://linkedin.com.evil.example/in/alex",
    "javascript:alert(1)",
    "https://www.linkedin.com/company/example",
  ])
    expect(linkedinUrl(url, "in")).toBeNull();
  await saveLeadProfile(
    "/audit/admin/abc23456",
    "https://linkedin.com/in/alex",
    "https://linkedin.com/company/example"
  );
  expect(await readLeadProfile("/audit/admin/abc23456")).toEqual({
    linkedinProfile: {
      url: "https://www.linkedin.com/in/alex/",
      source: "manual",
      status: "manual",
      savedAt: expect.any(String),
    },
    companyLinkedin: {
      url: "https://www.linkedin.com/company/example/",
      source: "manual",
      status: "manual",
      savedAt: expect.any(String),
    },
  });
  await expect(
    saveLeadProfile("/audit/admin/abc23456", "https://evil.example/in/alex", "")
  ).rejects.toThrow("linkedin.com/in/");
});
it("finds company-specific LinkedIn URLs only in stored evidence", () => {
  const report = structuredClone(shared);
  report.result.scores[0].categories[0].checks[0].evidence =
    "LinkedIn company page found: https://www.linkedin.com/company/example. Snippet: industrial company";
  expect(storedCompanyLinkedin(report, "Example", true)).toBe(
    "https://www.linkedin.com/company/example/"
  );
  expect(storedCompanyLinkedin(report, "Missing competitor")).toBeNull();
  expect(storedCompanyLinkedin(shared, "Example", true)).toBeNull();
});
it("replays link to the latest host lead seen before the run, even outside the original capture window", () => {
  const rows = buildLeadsView(
    [
      lead,
      { ...lead, reportSlug: "new", createdAt: "2026-10-28T11:00:00Z" },
      { ...lead, reportSlug: "future", createdAt: "2026-10-28T13:00:00Z" },
    ],
    [],
    [],
    {},
    {},
    now
  ).allRows;
  const run: ScanRunLog = {
    at: "2026-10-28T12:00:00Z",
    host: "example.com",
    outcome: "success",
    ms: 1000,
    slug: lead.reportSlug,
  };
  expect(linkRunToLead(run, rows)?.id).toBe("new");
  expect(linkRunToLead({ ...run, ms: 3000, replay: true }, rows)?.id).toBe(
    "new"
  );
});
it("merges the first history and matching successful scan, keeping repeat ad visits distinct", () => {
  const run: ScanRunLog = {
    at: "2026-10-28T10:00:10Z",
    host: "example.com",
    outcome: "success",
    ms: 5000,
    ad: { utm_content: "AD2", utm_source: "ig" },
  };
  const history = [
    {
      at: lead.createdAt,
      score: null,
      band: "",
      kind: "first run" as const,
      by: "visitor" as const,
    },
  ];
  const timeline = auditTimeline(history, [
    run,
    { ...run, replay: true, at: "2026-10-28T11:00:00Z" },
  ]);
  expect(timeline).toHaveLength(2);
  expect(timeline[1].text).toBe(
    "Ran the audit, from AD2 | ig: report ready in 5.0s"
  );
  expect(timeline[0].text).toBe(
    "Came back via AD2 | ig and saw their existing report again"
  );
});
it("shows re-run and replay status context and years in dates", () => {
  const view = buildLeadsView(
    [lead],
    [],
    [],
    { [lead.reportSlug]: shared },
    {},
    now,
    [
      {
        at: "2026-10-28T12:00:00Z",
        host: "example.com",
        outcome: "success",
        ms: 1000,
      },
    ]
  );
  expect(view.rows[0].statusContext).toContain("Re-run 28 Oct, 13:00 (run 2)");
  expect(view.rows[0].statusContext).toContain("Came back 28 Oct, 14:00");
  expect(formatSast("2027-04-23T10:00:00Z", false, now)).toBe("23 Apr 2027");
  expect(formatSast(lead.createdAt, false, now)).toBe("28 Oct");
  expect(formatSast(lead.createdAt, false, now, true)).toBe("28 Oct 2026");
});

it("keeps link/change controls closed and defers their dropdown until opened", () => {
  const run: ScanRunLog = {
    at: lead.createdAt,
    host: "example.com",
    outcome: "failed",
    ms: 5000,
  };
  const choices = [
    {
      leadPath: "/audit/admin/abc23456",
      company: "Example",
      firstName: "Alex",
    },
  ];
  const unlinked = renderToStaticMarkup(
    createElement(RunLeadLink, { run, leads: choices })
  );
  const linked = renderToStaticMarkup(
    createElement(RunLeadLink, {
      run,
      leads: choices,
      selected: choices[0].leadPath,
    })
  );
  expect(unlinked).toContain("Link to lead");
  expect(linked).toContain("change");
  for (const html of [unlinked, linked]) {
    expect(html).not.toContain("<select");
    expect(html).not.toContain(" open=");
  }
});
it("shows an accessible loading state on both admin routes", () => {
  for (const Loading of [LeadsLoading, ScansLoading]) {
    const html = renderToStaticMarkup(createElement(Loading));
    expect(html).toContain('role="status"');
    expect(html).toContain("Loading...");
  }
});
it("shows failed scan and manual completion dates for a linked manual report", () => {
  const failure = {
    id: "failed1",
    at: lead.createdAt,
    firstName: "Alex",
    email: lead.email,
    url: lead.url,
    host: "example.com",
    outcome: "failed" as const,
    reason: "blocked",
    siteRead: "",
    ad: null,
    source: "other" as const,
    linkedSlug: "manual1",
  };
  const manual = {
    slug: "manual1",
    url: lead.url,
    companyName: lead.company,
    contactName: lead.name,
    contactEmail: lead.email,
    createdAt: "2026-10-28T11:00:00Z",
    runCount: 1,
  } as unknown as import("../manual/run").ManualAuditRecord;
  const view = buildLeadsView(
    [],
    [failure],
    [manual],
    { manual1: shared },
    {},
    now
  );
  expect(
    view.rows.find((row) => row.id === "manual1")?.statusContext
  ).toContain("Scan failed 28 Oct, 12:00: blocked. Made by hand");
});
