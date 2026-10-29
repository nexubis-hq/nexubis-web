import { SCORECARD_REPORT_URL_FIELD_ID } from "../lead-funnelr";
import { createFunnelrClient } from "@/lib/funnelr/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { funnelrFixture } from "./funnelr-test-fixture";
import { checkFunnelrLead } from "./funnelr-check";
import { performFunnelrAction, type FunnelrTarget } from "./funnelr-actions";
import {
  recordBrowserFunnelrResult,
  readFunnelrStatus,
  funnelrStatusKey,
  safeFunnelrError,
} from "./funnelr-status";
import { NEXUBIS_TAG_IDS } from "@/lib/funnelr/nexubis-tags";
import { funnelrLeadAction } from "@/app/audit/admin/funnelr-actions";
import type { loadLeadsView } from "./data";
import { funnelrProblem, funnelrTimelineText } from "./funnelr-view";
const state = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  expiry: new Map<string, number>(),
  failKv: false,
  signedIn: true,
  view: {} as Awaited<ReturnType<typeof loadLeadsView>>,
}));
vi.mock("../kv", () => ({
  getKv: () => {
    const alive = (key: string) => {
      if ((state.expiry.get(key) || Infinity) <= Date.now()) {
        state.values.delete(key);
        state.expiry.delete(key);
      }
    };
    return {
      get: async (key: string) => {
        if (state.failKv) throw new Error("KV unavailable");
        alive(key);
        return state.values.get(key) || null;
      },
      set: async (key: string, value: unknown, opts?: { ex?: number }) => {
        if (state.failKv) throw new Error("KV unavailable");
        state.values.set(key, value);
        if (opts?.ex) state.expiry.set(key, Date.now() + opts.ex * 1000);
      },
      incr: async (key: string) => {
        if (state.failKv) throw new Error("KV unavailable");
        alive(key);
        const n = Number(state.values.get(key) || 0) + 1;
        state.values.set(key, n);
        return n;
      },
      expire: async (key: string, seconds: number) =>
        state.expiry.set(key, Date.now() + seconds * 1000),
    };
  },
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
vi.mock("@/lib/funnelr/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/funnelr/client")>()),
  createFunnelrClient: vi.fn(),
}));
const target: FunnelrTarget = {
  firstName: "Alex",
  email: "alex@example.com",
  company: "Example",
  website: "example.com",
  reportUrl: "https://www.nexubis.io/audit/r/abc23456",
  manual: false,
};
beforeEach(() => {
  vi.useFakeTimers();
  state.values.clear();
  state.expiry.clear();
  state.failKv = false;
  state.signedIn = true;
});
afterEach(() => vi.useRealTimers());
it.each([false, true])(
  "read-only check is ok without trigger or list membership (name fallback=%s)",
  async (fallbackIds) => {
    const mock = funnelrFixture({ fallbackIds });
    expect(
      await checkFunnelrLead(target.email, target.reportUrl!, mock.client)
    ).toEqual({
      state: "ok",
      missing: [],
      triggerTag: false,
      salesList: false,
    });
    expect(mock.requests.every((r) => r.method === "GET")).toBe(true);
  }
);
it("read-only check reports missing and partial contacts without writing", async () => {
  const missing = funnelrFixture({ missing: true });
  expect(
    (await checkFunnelrLead(target.email, target.reportUrl!, missing.client))
      .state
  ).toBe("missing");
  const partial = funnelrFixture({ partial: true });
  expect(
    await checkFunnelrLead(target.email, target.reportUrl!, partial.client)
  ).toMatchObject({
    state: "partial",
    missing: [
      "Brand tag",
      "Source tag",
      "report link in Last name",
      "report link in Audit Report URL field",
    ],
  });
  expect(
    [...missing.requests, ...partial.requests].every((r) => r.method === "GET")
  ).toBe(true);
});
it("browser status records slug or normalised email keys, safe errors, attempts and TTL", async () => {
  await recordBrowserFunnelrResult(target, {
    ok: false,
    error: "secret=superprivate alex@example.com https://api.example/",
  });
  await recordBrowserFunnelrResult(target, { ok: true });
  const status = await readFunnelrStatus(target.email, target.reportUrl);
  expect(status).toMatchObject({ state: "ok", by: "browser", attempts: 2 });
  expect(status?.history).toHaveLength(2);
  expect(JSON.stringify(status)).not.toContain("superprivate");
  expect(
    state.expiry.get(funnelrStatusKey(target.email, target.reportUrl))
  ).toBe(Date.now() + 180 * 86400000);
  await recordBrowserFunnelrResult(
    { ...target, email: " ALEX@EXAMPLE.COM ", reportUrl: undefined },
    { ok: true }
  );
  expect(await readFunnelrStatus("alex@example.com")).toMatchObject({
    state: "ok",
  });
});
it("missing-contact retry follows the normal path, then stores the follow-up check once", async () => {
  const mock = funnelrFixture({ missing: true });
  const wait = vi.fn(async () => {
    expect(mock.tags.has(NEXUBIS_TAG_IDS.triggerStartScorecardSales)).toBe(
      true
    );
  });
  const result = await performFunnelrAction(target, "retry", "example", false, {
    client: mock.client,
    wait,
  });
  expect(result).toMatchObject({
    state: "ok",
    by: "admin-retry",
    attempts: 1,
    triggerTag: true,
    salesList: true,
  });
  expect(result.history).toHaveLength(1);
  expect(wait).toHaveBeenCalledOnce();
  expect(mock.requests.some((r) => r.method === "POST")).toBe(true);
  expect(await readFunnelrStatus(target.email, target.reportUrl)).toEqual(
    result
  );
});
it.each([false, true])(
  "partial contact repair only adds the sales trigger when explicitly selected (%s)",
  async (startSales) => {
    const mock = funnelrFixture({ partial: true });
    const result = await performFunnelrAction(
      target,
      "retry",
      "example",
      startSales,
      { client: mock.client, wait: async () => {} }
    );
    expect(result.state).toBe("ok");
    expect(mock.tags.has(NEXUBIS_TAG_IDS.triggerStartScorecardSales)).toBe(
      startSales
    );
    expect(mock.requests.some((r) => r.method === "POST")).toBe(false);
    expect(mock.contact?.isUnsubscribed).toBe(true);
    expect(
      mock.requests.find(
        (r) => r.method === "PUT" && r.path === "/api/v1/user/users"
      )?.body
    ).toMatchObject({
      firstName: "Alex",
      hasAcceptedMarketing: true,
      lastName: target.reportUrl,
      company: "Example",
    });
  }
);
it("wrong confirmation makes no CRM call; a second concurrent attempt is refused", async () => {
  const mock = funnelrFixture({ partial: true });
  await expect(
    performFunnelrAction(target, "retry", "wrong", false, {
      client: mock.client,
    })
  ).rejects.toThrow("confirmation");
  expect(mock.requests).toHaveLength(0);
  const first = performFunnelrAction(target, "check", null, false, {
    client: mock.client,
  });
  await expect(
    performFunnelrAction(target, "check", null, false, { client: mock.client })
  ).rejects.toThrow("60 seconds");
  await first;
  await vi.advanceTimersByTimeAsync(60000);
  expect(
    (
      await performFunnelrAction(target, "check", null, false, {
        client: mock.client,
      })
    ).attempts
  ).toBe(2);
});
it("uses a five-second follow-up delay after sending", async () => {
  const mock = funnelrFixture({ missing: true });
  const pending = performFunnelrAction(target, "retry", "example", false, {
    client: mock.client,
  });
  await vi.advanceTimersByTimeAsync(4999);
  expect(
    (await readFunnelrStatus(target.email, target.reportUrl))?.pending
  ).toBe(true);
  await vi.advanceTimersByTimeAsync(1);
  expect((await pending).state).toBe("ok");
});
it("manual send checks first and repairs an existing contact without restarting emails", async () => {
  const mock = funnelrFixture({ partial: true });
  expect(
    (
      await performFunnelrAction(
        { ...target, manual: true },
        "send",
        "example",
        false,
        { client: mock.client, wait: async () => {} }
      )
    ).by
  ).toBe("admin-send");
  expect(mock.requests[0].method).toBe("GET");
  expect(mock.tags.has(NEXUBIS_TAG_IDS.triggerStartScorecardSales)).toBe(false);
});
it("a failed status store prevents every CRM call", async () => {
  const mock = funnelrFixture({ missing: true });
  state.failKv = true;
  await expect(
    performFunnelrAction(target, "check", null, false, { client: mock.client })
  ).rejects.toThrow("KV");
  expect(mock.requests).toHaveLength(0);
});
it("server action requires a session before loading or calling anything", async () => {
  state.signedIn = false;
  expect(await funnelrLeadAction({ message: "" }, new FormData())).toEqual({
    message: "Not signed in.",
    error: true,
  });
});
it("safe errors and timeline labels never expose remote payloads", () => {
  expect(
    safeFunnelrError(new Error("apiKey=secret alex@example.com"))
  ).not.toMatch(/secret|alex/);
  expect(
    funnelrTimelineText({
      at: "",
      by: "admin-check",
      state: "partial",
      missing: ["report link"],
    })
  ).toBe("Check: partly in Funnelr, report link missing");
  expect(funnelrProblem({ at: "", by: "browser", state: "ok" })).toBe(false);
});

it("server retry validates confirmation and stored failure, then uses saved report data and refreshes status", async () => {
  const mock = funnelrFixture({ partial: true });
  vi.mocked(createFunnelrClient).mockReturnValue(mock.client);
  state.view = {
    allRows: [
      {
        firstName: "Alex",
        email: target.email,
        company: "Old name",
        host: "example.com",
        status: "ready",
        leadPath: "/audit/admin/abc23456",
        reportPath: "/audit/r/abc23456",
      },
    ],
    reports: { abc23456: { result: { meta: { company: "Report company" } } } },
  } as unknown as Awaited<ReturnType<typeof loadLeadsView>>;
  const form = new FormData();
  form.set("mode", "retry");
  form.set("leadPath", "/audit/admin/abc23456");
  form.set("confirm", "wrong");
  await recordBrowserFunnelrResult(target, { ok: false });
  const rejected = await funnelrLeadAction({ message: "" }, form);
  expect(rejected).toMatchObject({ error: true });
  expect(rejected.message).toContain("confirmation");
  expect(mock.requests).toHaveLength(0);
  form.set("confirm", "example");
  const pending = funnelrLeadAction({ message: "" }, form);
  await vi.advanceTimersByTimeAsync(5000);
  expect(await pending).toMatchObject({
    message: "Funnelr result saved. See the status and timeline.",
  });
  expect(mock.contact?.company).toBe("Report company");
  expect(mock.tags.has(NEXUBIS_TAG_IDS.triggerStartScorecardSales)).toBe(false);
  expect(await readFunnelrStatus(target.email, target.reportUrl)).toMatchObject(
    { state: "ok", by: "admin-retry" }
  );
});
it("informational trigger and list read failures do not turn an otherwise valid contact into a failure", async () => {
  const mock = funnelrFixture();
  vi.spyOn(mock.client, "contactBelongsToList").mockRejectedValue(
    new Error("List read unavailable")
  );
  expect(
    (await checkFunnelrLead(target.email, target.reportUrl!, mock.client)).state
  ).toBe("ok");
});

it.each([
  "https://nexubis.io/audit/r/abc23456",
  "http://www.nexubis.io/audit/r/abc23456",
  "http://nexubis.io/scorecard/r/abc23456",
])(
  "matches both stored report links by slug despite URL differences: %s",
  async (reportUrl) => {
    const mock = funnelrFixture({ reportUrl });
    expect(
      (await checkFunnelrLead(target.email, target.reportUrl!, mock.client))
        .state
    ).toBe("ok");
    expect(mock.requests.every((request) => request.method === "GET")).toBe(
      true
    );
  }
);
it.each(["mirror", "field", "both"])(
  "a different slug in %s is other-report and never writes, even from an old Send form",
  async (field) => {
    const mock = funnelrFixture();
    const otherUrl = "http://nexubis.io/audit/r/def23456";
    if (field !== "field") mock.contact!.lastName = otherUrl;
    if (field !== "mirror")
      vi.spyOn(mock.client, "getContactCustomFields").mockResolvedValue([
        { formFieldId: SCORECARD_REPORT_URL_FIELD_ID, value: otherUrl },
      ]);
    const checked = await checkFunnelrLead(
      target.email,
      target.reportUrl!,
      mock.client
    );
    expect(checked.state).toBe("other-report");
    expect(funnelrProblem({ ...checked, at: "", by: "admin-check" })).toBe(
      false
    );
    expect(
      (
        await performFunnelrAction(
          { ...target, manual: true },
          "send",
          "example",
          true,
          { client: mock.client }
        )
      ).state
    ).toBe("other-report");
    expect(mock.requests.every((request) => request.method === "GET")).toBe(
      true
    );
  }
);
it("an unrelated domain with a report-shaped path is not a valid Nexubis report", async () => {
  const mock = funnelrFixture({
    reportUrl: "https://unrelated.example/audit/r/def23456",
  });
  expect(
    (await checkFunnelrLead(target.email, target.reportUrl!, mock.client)).state
  ).toBe("partial");
});

it.each(["send", "retry"] as const)(
  "E2 admin %s sends only the override first name and preserves the report URL Last name mirror",
  async (mode) => {
    const mock = funnelrFixture({ missing: true });
    vi.mocked(createFunnelrClient).mockReturnValue(mock.client);
    const path = "/audit/admin/abc23456";
    state.values.set(`scorecard-admin-contact:${path}`, {
      firstName: "Peter-Paul",
      lastName: "Blom",
      role: "Director",
      edits: [],
    });
    state.view = {
      allRows: [
        {
          firstName: "Alex",
          email: target.email,
          company: "Example",
          host: "example.com",
          status: "hand",
          leadPath: path,
          reportPath: "/audit/r/abc23456",
        },
      ],
      reports: { abc23456: { result: { meta: { company: "Example" } } } },
    } as unknown as Awaited<ReturnType<typeof loadLeadsView>>;
    const before = JSON.stringify(state.view.reports);
    if (mode === "retry")
      await recordBrowserFunnelrResult(target, { ok: false });
    const form = new FormData();
    form.set("mode", mode);
    form.set("leadPath", path);
    form.set("confirm", "example");
    const pending = funnelrLeadAction({ message: "" }, form);
    await vi.advanceTimersByTimeAsync(5000);
    expect(await pending).not.toHaveProperty("error");
    const payload = mock.requests.find(
      (request) =>
        request.method === "POST" && request.path === "/api/v1/user/users"
    )?.body;
    expect(payload).toMatchObject({
      firstName: "Peter-Paul",
      lastName: target.reportUrl,
      company: "Example",
      email: target.email,
    });
    expect(JSON.stringify(mock.requests)).not.toContain("Blom");
    expect(JSON.stringify(mock.requests)).not.toContain("Director");
    expect(mock.contact?.lastName).toBe(target.reportUrl);
    expect(JSON.stringify(state.view.reports)).toBe(before);
  }
);
