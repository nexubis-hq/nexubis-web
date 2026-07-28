import { test } from "vitest";
import assert from "node:assert/strict";
import {
  firstNameFromFullName,
  normalizeContactLeadForFunnelr,
  submitContactLeadToFunnelr,
  type ContactLeadFunnelrClient,
} from "./funnelr";
import { NEXUBIS_LIST_IDS, NEXUBIS_TAG_IDS, NEXUBIS_TAGS } from "@/lib/funnelr/nexubis-tags";
import type { FunnelrTag, FunnelrUser } from "@/lib/funnelr/client";

const safeTags: FunnelrTag[] = [
  { tagId: NEXUBIS_TAG_IDS.brand, name: NEXUBIS_TAGS.brand },
  { tagId: NEXUBIS_TAG_IDS.sourceContactForm, name: NEXUBIS_TAGS.sourceContactForm },
];

function client(
  existing: FunnelrUser | null = null,
  opts: { existingTagIds?: string[]; fail?: boolean; failTagAdd?: string; skipTagWrite?: string } = {},
): ContactLeadFunnelrClient & {
  calls: string[];
  tags: Set<string>;
  storedContact: () => FunnelrUser | null;
  addContactToList(userId: number, listId: string): Promise<never>;
  addContactToSequence(userId: number, sequenceId: string): Promise<never>;
  updateContactCustomFields(userId: number, updates: unknown[]): Promise<never>;
} {
  const calls: string[] = [];
  const tags = new Set(opts.existingTagIds ?? []);
  let storedContact: FunnelrUser | null = existing ? { ...existing } : null;

  return {
    calls,
    tags,
    storedContact: () => storedContact,
    async findContactByEmail(email) {
      calls.push(`find:${email}`);
      if (opts.fail) throw new Error("Funnelr unavailable for test@example.com");
      return storedContact;
    },
    async createContact(input) {
      calls.push(`create:${input.email}:${input.firstName ?? ""}:${input.hasAcceptedMarketing}:${"lastName" in input ? "lastName-present" : "lastName-omitted"}`);
      storedContact = {
        userId: 101,
        email: input.email,
        firstName: input.firstName,
      };
      return storedContact;
    },
    async updateContact(input) {
      calls.push(
        `update:${input.userId}:${input.email}:${input.firstName ?? ""}:${input.lastName ?? ""}:${input.street ?? ""}:${input.telephone ?? ""}:${input.company ?? ""}`,
      );
      storedContact = {
        ...(storedContact ?? {}),
        userId: input.userId,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        street: input.street,
        telephone: input.telephone,
        company: input.company,
        currencyCode: input.currencyCode,
      };
      return storedContact;
    },
    async contactHasTag(_userId, tagId) {
      calls.push(`has-tag:${tagId}`);
      return tags.has(tagId);
    },
    async addTagToContact(_userId, tagId) {
      calls.push(`add-tag:${tagId}`);
      if (opts.failTagAdd === tagId) throw new Error("tag write failed");
      if (opts.skipTagWrite !== tagId) tags.add(tagId);
    },
    async getContactTags(userId) {
      calls.push(`read-tags:${userId}`);
      return safeTags.filter((tag) => tags.has(tag.tagId)).map((tag) => ({ tagId: tag.tagId, name: null }));
    },
    async addContactToList(userId, listId) {
      calls.push(`add-list:${userId}:${listId}`);
      throw new Error("Contact flow must not add lists.");
    },
    async addContactToSequence(userId, sequenceId) {
      calls.push(`add-sequence:${userId}:${sequenceId}`);
      throw new Error("Contact flow must not add sequences.");
    },
    async updateContactCustomFields(userId, updates) {
      calls.push(`custom:${userId}:${updates.length}`);
      throw new Error("Contact flow must not update custom fields.");
    },
  };
}

function lead(overrides: Partial<{ name: string; email: string }> = {}) {
  return { name: "Jane Example", email: "JANE@EXAMPLE.COM", ...overrides };
}

function assertNoUnsafeOperations(c: { calls: string[] }) {
  for (const forbidden of ["add-list:", "add-sequence:", "custom:"]) {
    assert.equal(c.calls.some((call) => call.startsWith(forbidden)), false, `unexpected unsafe call: ${forbidden}`);
  }
  for (const forbiddenTag of [
    NEXUBIS_TAG_IDS.triggerStartScorecardSales,
    NEXUBIS_TAG_IDS.triggerStartNurture,
    NEXUBIS_TAG_IDS.pipelineCallBooked,
    NEXUBIS_TAG_IDS.pipelineReplied,
    NEXUBIS_TAG_IDS.historyScorecardSalesStarted,
    NEXUBIS_TAG_IDS.historyNurtureStarted,
  ]) {
    assert.equal(c.calls.includes(`add-tag:${forbiddenTag}`), false, `unexpected forbidden tag: ${forbiddenTag}`);
  }
  assert.equal(c.calls.some((call) => call.includes(NEXUBIS_LIST_IDS.manualHolding)), false, "Manual Holding must not be touched.");
}

test("firstNameFromFullName uses only the first-name portion", () => {
  assert.equal(firstNameFromFullName(" Jane Mary Example "), "Jane");
});

test("normalizes email and rejects invalid input", () => {
  assert.deepEqual(normalizeContactLeadForFunnelr(lead()), { email: "jane@example.com", firstName: "Jane" });
  assert.equal("error" in normalizeContactLeadForFunnelr(lead({ email: "bad" })), true);
});

test("new Funnelr contact omits Last Name and applies only safe tags", async () => {
  const c = client(null);
  const result = await submitContactLeadToFunnelr(lead(), { client: c });
  assert.equal(result.ok, true);
  assert.equal(result.contactCreated, true);
  assert.ok(c.calls.includes("create:jane@example.com:Jane:false:lastName-omitted"));
  assert.ok(c.calls.includes(`add-tag:${NEXUBIS_TAG_IDS.brand}`));
  assert.ok(c.calls.includes(`add-tag:${NEXUBIS_TAG_IDS.sourceContactForm}`));
  assert.deepEqual(result.tagsApplied, [NEXUBIS_TAGS.brand, NEXUBIS_TAGS.sourceContactForm]);
  assertNoUnsafeOperations(c);
});

test("existing Funnelr contact is updated without creating a duplicate", async () => {
  const c = client({ userId: 7, email: "jane@example.com", currencyCode: "USD", lastName: "Existing" });
  const result = await submitContactLeadToFunnelr(lead(), { client: c });
  assert.equal(result.ok, true);
  assert.equal(result.contactCreated, false);
  assert.equal(c.calls.some((call) => call.startsWith("create:")), false);
  assert.ok(c.calls.includes("update:7:jane@example.com:Jane:Existing:::"));
  assertNoUnsafeOperations(c);
});

test("existing Scorecard URL in Last Name is preserved byte-for-byte", async () => {
  const reportUrl = "https://www.nexubis.io/scorecard/r/abc12345";
  const c = client({ userId: 7, email: "jane@example.com", currencyCode: "USD", lastName: reportUrl, street: "12 Market", telephone: "+2711" });
  const result = await submitContactLeadToFunnelr(lead(), { client: c });
  assert.equal(result.ok, true);
  assert.equal(c.storedContact()?.lastName, reportUrl);
  assert.equal(c.storedContact()?.street, "12 Market");
  assert.equal(c.storedContact()?.telephone, "+2711");
  assertNoUnsafeOperations(c);
});

test("existing normal Last Name is preserved byte-for-byte", async () => {
  const c = client({ userId: 7, email: "jane@example.com", currencyCode: "USD", lastName: "Van der Merwe" });
  const result = await submitContactLeadToFunnelr(lead(), { client: c });
  assert.equal(result.ok, true);
  assert.equal(c.storedContact()?.lastName, "Van der Merwe");
});

test("duplicate email submission reuses contact and does not duplicate existing tags", async () => {
  const c = client(
    { userId: 7, email: "jane@example.com", currencyCode: "USD", lastName: "Existing" },
    { existingTagIds: [NEXUBIS_TAG_IDS.brand, NEXUBIS_TAG_IDS.sourceContactForm] },
  );
  const result = await submitContactLeadToFunnelr(lead(), { client: c });
  assert.equal(result.ok, true);
  assert.equal(c.calls.some((call) => call.startsWith("create:")), false);
  assert.equal(c.calls.some((call) => call.startsWith("add-tag:")), false);
  assertNoUnsafeOperations(c);
});

test("Brand and Contact Form source tags are verified by stable IDs", async () => {
  const c = client(null);
  const result = await submitContactLeadToFunnelr(lead(), { client: c });
  assert.equal(result.ok, true);
  assert.equal(c.calls.filter((call) => call === "read-tags:101").length, 2);
  assert.ok(c.tags.has(NEXUBIS_TAG_IDS.brand));
  assert.ok(c.tags.has(NEXUBIS_TAG_IDS.sourceContactForm));
});

test("Funnelr failure returns safe error without throwing", async () => {
  const result = await submitContactLeadToFunnelr(lead(), { client: client(null, { fail: true }) });
  assert.equal(result.ok, false);
  assert.ok(result.error);
  assert.equal(result.error?.includes("test@example.com"), false);
});

test("failed source tag verification fails the capture", async () => {
  const result = await submitContactLeadToFunnelr(lead(), { client: client(null, { skipTagWrite: NEXUBIS_TAG_IDS.sourceContactForm }) });
  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /could not be verified/);
});
