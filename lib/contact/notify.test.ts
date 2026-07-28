import { afterEach, test, vi } from "vitest";
import assert from "node:assert/strict";
import {
  contactNotificationFrom,
  contactNotificationRecipients,
  formatContactNotification,
  notifyContactSubmission,
} from "./notify";

const input = {
  name: "<Jane>",
  email: "jane@example.com",
  companyName: "Example & Co",
  websiteLink: "https://example.com",
  package: "Momentum",
  additionalNotes: "Needs <strategy> & delivery.",
  funnelrContactId: 123,
  contactCreated: true,
  submittedAt: new Date("2026-07-28T10:00:00.000Z"),
};

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
  delete process.env.CONTACT_EMAIL_FROM;
  delete process.env.SCORECARD_EMAIL_FROM;
});

test("Contact notification uses approved recipients", () => {
  assert.deepEqual(contactNotificationRecipients(), ["hello@nexubis.io", "laine@nexubis.io"]);
});

test("Contact notification uses existing verified sender env before fallback", () => {
  process.env.SCORECARD_EMAIL_FROM = "Nexubis <alerts@nexubis.io>";
  assert.equal(contactNotificationFrom(), "Nexubis <alerts@nexubis.io>");
  process.env.CONTACT_EMAIL_FROM = "Nexubis Onboarding <onboarding@nexubis.io>";
  assert.equal(contactNotificationFrom(), "Nexubis Onboarding <onboarding@nexubis.io>");
});

test("Contact notification formats text and escaped HTML", () => {
  const formatted = formatContactNotification(input);
  assert.match(formatted.text, /Name: <Jane>/);
  assert.match(formatted.text, /Funnelr contact ID: 123/);
  assert.match(formatted.text, /Funnelr contact state: Created/);
  assert.match(formatted.html, /&lt;Jane&gt;/);
  assert.match(formatted.html, /Example &amp; Co/);
  assert.equal(formatted.html.includes("Needs <strategy>"), false);
});

test("Contact notification sends Reply-To through Resend", async () => {
  process.env.RESEND_API_KEY = "test-key";
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
  vi.stubGlobal("fetch", fetchMock);
  const ok = await notifyContactSubmission(input);
  assert.equal(ok, true);
  const body = JSON.parse(fetchMock.mock.calls[0][1].body);
  assert.deepEqual(body.to, ["hello@nexubis.io", "laine@nexubis.io"]);
  assert.equal(body.reply_to, "jane@example.com");
  assert.equal(body.subject, "New onboarding message from a client on contact-form");
});
