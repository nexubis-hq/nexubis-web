import { beforeEach, test, vi } from "vitest";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { BRAND_NEXUBIS_TAG_NAME, SOURCE_SCORECARD_TAG_NAME, START_SCORECARD_SALES_TAG_NAME } from "@/lib/scorecard/lead-funnelr";

const { readSharedMock, submitScorecardLeadToFunnelrMock } = vi.hoisted(() => ({
  readSharedMock: vi.fn(),
  submitScorecardLeadToFunnelrMock: vi.fn(),
}));

vi.mock("@/lib/scorecard/share", () => ({
  readShared: readSharedMock,
}));

vi.mock("@/lib/scorecard/lead-funnelr", async () => {
  const actual = await vi.importActual<typeof import("@/lib/scorecard/lead-funnelr")>("@/lib/scorecard/lead-funnelr");
  return {
    ...actual,
    submitScorecardLeadToFunnelr: submitScorecardLeadToFunnelrMock,
  };
});

import { POST } from "@/app/api/leads/scorecard/route";

function request(body: unknown) {
  return new NextRequest("https://www.nexubis.io/api/leads/scorecard", {
    method: "POST",
    headers: { "Content-Type": "application/json", host: "www.nexubis.io" },
    body: JSON.stringify(body),
  });
}

function payload(overrides: Record<string, unknown> = {}) {
  return {
    firstName: "Mark",
    email: "mark@veltkamp-dosing.nl",
    ...overrides,
  };
}

beforeEach(() => {
  readSharedMock.mockReset();
  submitScorecardLeadToFunnelrMock.mockReset();
  readSharedMock.mockResolvedValue({ result: { meta: { company: "Veltkamp Dosing" } } });
  submitScorecardLeadToFunnelrMock.mockResolvedValue({
    ok: true,
    contactCreated: true,
    tagsApplied: [BRAND_NEXUBIS_TAG_NAME, SOURCE_SCORECARD_TAG_NAME, START_SCORECARD_SALES_TAG_NAME],
    customFieldsUpdated: ["reportUrl"],
  });
  delete process.env.NEXT_PUBLIC_SITE_URL;
});

test("scorecard lead endpoint rejects invalid email", async () => {
  const res = await POST(request(payload({ email: "not-email" })));
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.ok, false);
  assert.equal(submitScorecardLeadToFunnelrMock.mock.calls.length, 0);
});

test("scorecard lead endpoint accepts first name and email only", async () => {
  const res = await POST(request(payload()));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal("listMembershipConfirmed" in body, false);
  assert.equal("listMembership" in body, false);
  assert.deepEqual(body.tagsApplied, [BRAND_NEXUBIS_TAG_NAME, SOURCE_SCORECARD_TAG_NAME, START_SCORECARD_SALES_TAG_NAME]);
  assert.equal(readSharedMock.mock.calls.length, 0);
  assert.deepEqual(submitScorecardLeadToFunnelrMock.mock.calls[0][0], {
    firstName: "Mark",
    lastName: undefined,
    email: "mark@veltkamp-dosing.nl",
    company: undefined,
    marketingConsent: undefined,
    reportUrl: undefined,
  });
});

test("scorecard lead endpoint accepts optional marketing consent", async () => {
  const res = await POST(request(payload({ marketingConsent: true })));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(readSharedMock.mock.calls.length, 0);
  assert.equal(submitScorecardLeadToFunnelrMock.mock.calls[0][0].marketingConsent, true);
});

test("scorecard lead endpoint preserves saved-report validation when report URL is present", async () => {
  const res = await POST(request(payload({ marketingConsent: true, reportUrl: "https://www.nexubis.io/scorecard/r/abc23456" })));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(readSharedMock.mock.calls[0][0], "abc23456");
  assert.deepEqual(submitScorecardLeadToFunnelrMock.mock.calls[0][0], {
    firstName: "Mark",
    lastName: undefined,
    email: "mark@veltkamp-dosing.nl",
    company: "Veltkamp Dosing",
    marketingConsent: true,
    reportUrl: "https://www.nexubis.io/scorecard/r/abc23456",
  });
});

test("scorecard lead endpoint rejects unknown saved permanent report URL", async () => {
  readSharedMock.mockResolvedValue(null);
  const res = await POST(request(payload({ reportUrl: "https://www.nexubis.io/scorecard/r/abc23456" })));
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.ok, false);
  assert.equal(readSharedMock.mock.calls[0][0], "abc23456");
  assert.equal(submitScorecardLeadToFunnelrMock.mock.calls.length, 0);
});

test("scorecard lead endpoint returns safe success when Funnelr fails", async () => {
  submitScorecardLeadToFunnelrMock.mockResolvedValue({ ok: false, error: "Funnelr unavailable" });
  const res = await POST(request(payload()));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, false);
  assert.equal(body.error, "Lead capture is temporarily unavailable.");
  assert.equal("tagsApplied" in body, false);
});

test("scorecard lead endpoint does not claim full success when required tag application fails", async () => {
  submitScorecardLeadToFunnelrMock.mockResolvedValue({ ok: false, error: `Required Funnelr tag was not found: ${SOURCE_SCORECARD_TAG_NAME}` });
  const res = await POST(request(payload()));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, false);
  assert.equal(body.error, "Lead capture is temporarily unavailable.");
  assert.equal("tagsApplied" in body, false);
});
