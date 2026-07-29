import { beforeEach, test, vi } from "vitest";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";

const { submitContactLeadToFunnelrMock, notifyContactSubmissionMock } = vi.hoisted(() => ({
  submitContactLeadToFunnelrMock: vi.fn(),
  notifyContactSubmissionMock: vi.fn(),
}));

vi.mock("@/lib/contact/funnelr", async () => {
  const actual = await vi.importActual<typeof import("@/lib/contact/funnelr")>("@/lib/contact/funnelr");
  return {
    ...actual,
    submitContactLeadToFunnelr: submitContactLeadToFunnelrMock,
  };
});

vi.mock("@/lib/contact/notify", async () => {
  const actual = await vi.importActual<typeof import("@/lib/contact/notify")>("@/lib/contact/notify");
  return {
    ...actual,
    notifyContactSubmission: notifyContactSubmissionMock,
  };
});

import { POST } from "@/app/api/contact/route";

function request(body: unknown) {
  return new NextRequest("https://www.nexubis.io/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json", host: "www.nexubis.io", "x-forwarded-for": "203.0.113.10" },
    body: JSON.stringify(body),
  });
}

function payload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Jane Example",
    email: "jane@example.com",
    companyName: "Example Co",
    websiteLink: "example.com",
    package: "Momentum",
    additionalNotes: "We need help.",
    honeypot: "",
    elapsedMs: 5000,
    ...overrides,
  };
}

beforeEach(() => {
  process.env.FUNNELR_API_KEY = "test-key";
  submitContactLeadToFunnelrMock.mockReset();
  notifyContactSubmissionMock.mockReset();
  submitContactLeadToFunnelrMock.mockResolvedValue({ ok: true, contactId: 123, contactCreated: true, tagsApplied: ["Brand: Nexubis", "Source: Nexubis | Contact Form"] });
  notifyContactSubmissionMock.mockResolvedValue(true);
});

test("Contact endpoint rejects invalid fields before provider calls", async () => {
  const res = await POST(request(payload({ email: "bad" })));
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.ok, false);
  assert.equal(submitContactLeadToFunnelrMock.mock.calls.length, 0);
  assert.equal(notifyContactSubmissionMock.mock.calls.length, 0);
});

test("Contact endpoint rejects unexpected Turnstile-era token fields", async () => {
  const res = await POST(request(payload({ spamToken: "unused" })));
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.error, "Unexpected form field.");
  assert.equal(submitContactLeadToFunnelrMock.mock.calls.length, 0);
});

test("Contact endpoint rejects honeypot submissions", async () => {
  const res = await POST(request(payload({ honeypot: "filled" })));
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.ok, false);
  assert.equal(submitContactLeadToFunnelrMock.mock.calls.length, 0);
});

test("Contact endpoint rejects too-fast submissions", async () => {
  const res = await POST(request(payload({ elapsedMs: 500 })));
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.ok, false);
  assert.equal(submitContactLeadToFunnelrMock.mock.calls.length, 0);
});

test("Contact endpoint captures to Funnelr before notifying", async () => {
  const res = await POST(request(payload()));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.notificationSent, true);
  assert.deepEqual(submitContactLeadToFunnelrMock.mock.calls[0][0], {
    name: "Jane Example",
    email: "jane@example.com",
  });
  assert.equal(notifyContactSubmissionMock.mock.calls[0][0].funnelrContactId, 123);
  assert.equal(notifyContactSubmissionMock.mock.calls[0][0].contactCreated, true);
});

test("Contact endpoint accepts every visible package option", async () => {
  for (const packageValue of ["Momentum", "Scale", "Partner", "I'm not sure"]) {
    submitContactLeadToFunnelrMock.mockClear();
    notifyContactSubmissionMock.mockClear();

    const localPart = packageValue.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const res = await POST(request(payload({ email: `${localPart}@example.com`, package: packageValue })));
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.ok, true);
    assert.equal(notifyContactSubmissionMock.mock.calls[0][0].package, packageValue);
  }
});

test("Contact endpoint rejects accidental unpunctuated fallback package value", async () => {
  const res = await POST(request(payload({ package: "Im not sure" })));
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.equal(body.error, "Choose a valid package.");
  assert.equal(submitContactLeadToFunnelrMock.mock.calls.length, 0);
  assert.equal(notifyContactSubmissionMock.mock.calls.length, 0);
});

test("Contact endpoint rejects retired package values", async () => {
  const res = await POST(request(payload({ package: "Flex" })));
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.equal(body.error, "Choose a valid package.");
  assert.equal(submitContactLeadToFunnelrMock.mock.calls.length, 0);
  assert.equal(notifyContactSubmissionMock.mock.calls.length, 0);
});

test("Contact endpoint fails safely when Funnelr capture fails and does not notify", async () => {
  submitContactLeadToFunnelrMock.mockResolvedValue({ ok: false, error: "Funnelr down" });
  const res = await POST(request(payload({ email: "fail@example.com" })));
  const body = await res.json();
  assert.equal(res.status, 502);
  assert.equal(body.ok, false);
  assert.equal(notifyContactSubmissionMock.mock.calls.length, 0);
});

test("Contact endpoint succeeds when Resend notification fails after Funnelr capture", async () => {
  notifyContactSubmissionMock.mockResolvedValue(false);
  const res = await POST(request(payload({ email: "notify-fail@example.com" })));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.notificationSent, false);
});

test("Contact endpoint rejects oversized values", async () => {
  const res = await POST(request(payload({ additionalNotes: "x".repeat(5001) })));
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.error, "Additional notes are too long.");
});
