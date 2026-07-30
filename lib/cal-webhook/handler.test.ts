import { beforeEach, test, vi } from "vitest";
import assert from "node:assert/strict";
import { calEventSlug, handleCalWebhook, signCalWebhookBody, verifyCalSignature, type CalFunnelrClient } from "./handler";
import type { FunnelrTag, FunnelrUser } from "@/lib/funnelr/client";

const secret = "cal-secret";
const slug = "30min";
const bookedTag: FunnelrTag = { tagId: "tag-booked", name: "Pipeline: Nexubis | Call Booked" };
const user: FunnelrUser = { userId: 42, email: "lead@example.com", firstName: "Lead", lastName: "Example" };
const env = { CAL_WEBHOOK_SECRET: secret, CAL_APPLICATION_EVENT_SLUG: slug };
const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

function signed(body: unknown): { raw: string; signature: string } {
  const raw = JSON.stringify(body);
  return { raw, signature: signCalWebhookBody(raw, secret) };
}

function booking(triggerEvent = "BOOKING_CREATED", overrides: Record<string, unknown> = {}) {
  return {
    triggerEvent,
    payload: {
      type: slug,
      eventTypeId: 123,
      uid: "booking-uid",
      startTime: "2026-08-01T10:00:00.000Z",
      endTime: "2026-08-01T10:30:00.000Z",
      attendees: [{ email: " Lead@Example.com ", name: "Lead Example" }],
      responses: {},
      ...overrides,
    },
  };
}

function makeClient(existingUser: FunnelrUser | null = user, initialTags: string[] = []): CalFunnelrClient & { calls: string[]; tags: Set<string> } {
  const tags = new Set(initialTags);
  const calls: string[] = [];
  return {
    calls,
    tags,
    async findContactByEmail(email) {
      calls.push(`find:${email}`);
      return existingUser;
    },
    async createContact(input) {
      calls.push(`create:${input.email}:${input.firstName ?? ""}:${input.lastName ?? ""}`);
      return { userId: 99, email: input.email, firstName: input.firstName, lastName: input.lastName };
    },
    async findTagByName(name) {
      calls.push(`tag:${name}`);
      if (name === "Pipeline: Nexubis | Call Booked") return bookedTag;
      return null;
    },
    async contactHasTag(_userId, tagId) {
      calls.push(`has:${tagId}`);
      return tags.has(tagId);
    },
    async addTagToContact(_userId, tagId) {
      calls.push(`add:${tagId}`);
      tags.add(tagId);
    },
    async removeTagFromContact(_userId, tagId) {
      calls.push(`remove:${tagId}`);
      tags.delete(tagId);
    },
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
  logger.info.mockClear();
  logger.warn.mockClear();
  logger.error.mockClear();
});

test("valid webhook signature", () => {
  const { raw, signature } = signed(booking());
  assert.equal(verifyCalSignature(raw, signature, secret), true);
  assert.equal(verifyCalSignature(raw, `sha256=${signature}`, secret), true);
});

test("invalid signature", async () => {
  const { raw } = signed(booking());
  const res = await handleCalWebhook(raw, "bad", { env, client: makeClient(), dedupe: false });
  assert.equal(res.status, 401);
});

test("missing signature", async () => {
  const { raw } = signed(booking());
  const res = await handleCalWebhook(raw, null, { env, client: makeClient(), dedupe: false });
  assert.equal(res.status, 401);
});

test("unrelated event slug is ignored", async () => {
  const client = makeClient();
  const body = booking("BOOKING_CREATED", { type: "other-event", eventType: { slug: "other-event" } });
  const { raw, signature } = signed(body);
  const res = await handleCalWebhook(raw, signature, { env, client, dedupe: false, logger });
  assert.equal(res.status, 200);
  assert.equal(res.body.ignored, true);
  assert.deepEqual(client.calls, []);
  assert.equal(logger.info.mock.calls[0]?.[1]?.reason, "ignored_event_type");
  assert.equal(logger.info.mock.calls[0]?.[1]?.funnelrRequestAttempted, false);
});

test("BOOKING_CREATED with a matching Funnelr contact applies Call Booked", async () => {
  const client = makeClient(user);
  const { raw, signature } = signed(booking());
  const res = await handleCalWebhook(raw, signature, { env, client, dedupe: false, logger });
  assert.equal(res.status, 200);
  assert.ok(client.calls.includes("find:lead@example.com"));
  assert.equal(client.tags.has(bookedTag.tagId), true);
  assert.ok(client.calls.includes("add:tag-booked"));
  assert.equal(client.calls.some((call) => call.includes("Pipeline: Call Booked")), false);
  assert.equal(client.calls.some((call) => call.includes("Pipeline: LekkeWeb | Call Booked")), false);
  assert.equal(logger.info.mock.calls.some((call) => call[1]?.reason === "funnelr_update_attempt"), true);
});

test("BOOKING_CREATED with no existing Funnelr contact creates one", async () => {
  const client = makeClient(null);
  const { raw, signature } = signed(booking());
  const res = await handleCalWebhook(raw, signature, { env, client, dedupe: false });
  assert.equal(res.status, 200);
  assert.ok(client.calls.includes("create:lead@example.com:Lead:Example"));
  assert.equal(client.tags.has(bookedTag.tagId), true);
});

test("BOOKING_CREATED eventType slug fixture reaches Funnelr", async () => {
  const client = makeClient(user);
  const body = booking("BOOKING_CREATED", { type: "nexubis/30min", eventType: { slug } });
  const { raw, signature } = signed(body);
  const res = await handleCalWebhook(raw, signature, { env, client, dedupe: false, logger });
  assert.equal(calEventSlug(body), slug);
  assert.equal(res.status, 200);
  assert.ok(client.calls.includes("find:lead@example.com"));
  assert.ok(client.calls.includes("add:tag-booked"));
});

test("BOOKING_CREATED with attendeeEmail fallback applies Call Booked", async () => {
  const client = makeClient(user);
  const { raw, signature } = signed(booking("BOOKING_CREATED", { attendees: [], attendeeEmail: "Lead@Example.com" }));
  const res = await handleCalWebhook(raw, signature, { env, client, dedupe: false });
  assert.equal(res.status, 200);
  assert.ok(client.calls.includes("find:lead@example.com"));
  assert.ok(client.calls.includes("add:tag-booked"));
});

test("repeated BOOKING_CREATED delivery is idempotent", async () => {
  const client = makeClient(user, [bookedTag.tagId]);
  const { raw, signature } = signed(booking());
  const res = await handleCalWebhook(raw, signature, { env, client, dedupe: false });
  assert.equal(res.status, 200);
  assert.equal(client.calls.includes("add:tag-booked"), false);
});

test("BOOKING_RESCHEDULED keeps Call Booked applied", async () => {
  const client = makeClient(user);
  const { raw, signature } = signed(booking("BOOKING_RESCHEDULED"));
  const res = await handleCalWebhook(raw, signature, { env, client, dedupe: false });
  assert.equal(res.status, 200);
  assert.equal(client.tags.has(bookedTag.tagId), true);
});

test("BOOKING_CANCELLED removes Call Booked and does not add Call Cancelled", async () => {
  const client = makeClient(user, [bookedTag.tagId]);
  const { raw, signature } = signed(booking("BOOKING_CANCELLED"));
  const res = await handleCalWebhook(raw, signature, { env, client, dedupe: false });
  assert.equal(res.status, 200);
  assert.equal(client.tags.has(bookedTag.tagId), false);
  assert.equal(client.calls.some((call) => call.includes("Call Cancelled")), false);
});

test("webhook ping/test request returns success without Funnelr changes", async () => {
  const client = makeClient(user);
  const { raw, signature } = signed({ triggerEvent: "PING", payload: { type: slug } });
  const res = await handleCalWebhook(raw, signature, { env, client, dedupe: false, logger });
  assert.equal(res.status, 200);
  assert.equal(res.body.ignored, true);
  assert.deepEqual(client.calls, []);
  assert.equal(logger.info.mock.calls[0]?.[1]?.reason, "ignored_trigger");
  assert.equal(logger.info.mock.calls[0]?.[1]?.funnelrRequestAttempted, false);
});

test("missing attendee email fails without Funnelr changes", async () => {
  const client = makeClient(user);
  const { raw, signature } = signed(booking("BOOKING_CREATED", { attendees: [], responses: {} }));
  const res = await handleCalWebhook(raw, signature, { env, client, dedupe: false });
  assert.equal(res.status, 400);
  assert.deepEqual(client.calls, []);
});

test("Funnelr API failure returns 500", async () => {
  const client = makeClient(user);
  client.addTagToContact = async () => {
    throw new Error("Funnelr request failed with HTTP 500.");
  };
  const { raw, signature } = signed(booking());
  const res = await handleCalWebhook(raw, signature, { env, client, dedupe: false, logger });
  assert.equal(res.status, 500);
  assert.equal(logger.error.mock.calls[0]?.[1]?.reason, "funnelr_update_failed");
});
