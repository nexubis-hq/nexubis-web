import { test } from "vitest";
import assert from "node:assert/strict";
import {
  BRAND_NEXUBIS_TAG_NAME,
  buildCustomFieldUpdates,
  normalizeScorecardLeadInput,
  SCORECARD_REPORT_URL_FIELD_ID,
  SCORECARD_REPORT_URL_FIELD_KEY,
  SCORECARD_REPORT_URL_FIELD_NAME,
  SCORECARD_REPORT_URL_MESSENGER_MIRROR_FIELD_NAME,
  SOURCE_SCORECARD_TAG_NAME,
  START_SCORECARD_SALES_TAG_NAME,
  submitScorecardLeadToFunnelr,
  type ScorecardLeadFunnelrClient,
  type ScorecardLeadInput,
} from "./lead-funnelr";
import type { FunnelrSystemFormField, FunnelrTag, FunnelrUser } from "@/lib/funnelr/client";

const routingTags: FunnelrTag[] = [
  { tagId: "tag-brand", name: BRAND_NEXUBIS_TAG_NAME },
  { tagId: "tag-source", name: SOURCE_SCORECARD_TAG_NAME },
  { tagId: "tag-trigger", name: START_SCORECARD_SALES_TAG_NAME },
];

const fields: FunnelrSystemFormField[] = [
  {
    formFieldId: SCORECARD_REPORT_URL_FIELD_ID,
    formFieldKey: SCORECARD_REPORT_URL_FIELD_KEY,
    formFieldTypeKey: "ContactProfile",
    formControlKey: "Text",
    name: SCORECARD_REPORT_URL_FIELD_NAME,
  },
];

function lead(overrides: Partial<ScorecardLeadInput> = {}): ScorecardLeadInput {
  return {
    firstName: "Mark",
    email: "MARK@VELTKAMP-DOSING.NL",
    company: "Veltkamp Dosing",
    marketingConsent: true,
    reportUrl: "https://www.nexubis.io/scorecard/r/abc12345",
    ...overrides,
  };
}

function client(
  existing: FunnelrUser | null = null,
  opts: {
    fail?: boolean;
    existingTagIds?: string[];
    fieldList?: FunnelrSystemFormField[];
    missingTag?: string;
    failTagAdd?: string;
    staleMirrorReadback?: boolean;
  } = {},
): ScorecardLeadFunnelrClient & {
  calls: string[];
  contactTags: Set<string>;
  updates: Array<{ formFieldId: string; value: unknown }>;
  findListByName(name: string): Promise<never>;
  contactBelongsToList(userId: number, listId: string): Promise<never>;
  addContactToList(userId: number, listId: string): Promise<never>;
  removeContactFromList(userId: number, listId: string): Promise<never>;
  findSequenceByName(name: string): Promise<never>;
  addContactToSequence(userId: number, sequenceId: string): Promise<never>;
  removeContactFromSequence(userId: number, sequenceId: string): Promise<never>;
} {
  const calls: string[] = [];
  const contactTags = new Set(opts.existingTagIds ?? []);
  const updates: Array<{ formFieldId: string; value: unknown }> = [];
  let storedContact: FunnelrUser | null = existing ? { ...existing } : null;

  return {
    calls,
    contactTags,
    updates,
    async findContactByEmail(email) {
      calls.push(`find:${email}`);
      if (opts.fail) throw new Error("Funnelr down");
      return storedContact;
    },
    async createContact(input) {
      calls.push(`create:${input.email}:${input.firstName ?? ""}:${input.lastName ?? ""}:${input.hasAcceptedMarketing}:${input.telephone ?? ""}`);
      storedContact = {
        userId: 101,
        email: input.email,
        firstName: input.firstName,
        lastName: opts.staleMirrorReadback ? "https://old.example/report" : input.lastName,
        telephone: input.telephone,
      };
      return storedContact;
    },
    async updateContact(input) {
      calls.push(`update:${input.userId}:${input.email}:${input.hasAcceptedMarketing}:${input.lastName ?? ""}:${input.telephone ?? ""}:${input.street ?? ""}`);
      storedContact = {
        ...(storedContact ?? {}),
        userId: input.userId,
        email: input.email,
        firstName: input.firstName,
        currencyCode: input.currencyCode,
        lastName: opts.staleMirrorReadback ? "https://old.example/report" : input.lastName,
        street: input.street,
        telephone: input.telephone,
      };
      return storedContact;
    },
    async findTagByName(name) {
      calls.push(`tag:${name}`);
      if (name === opts.missingTag) return null;
      return routingTags.find((tag) => tag.name === name) ?? null;
    },
    async contactHasTag(_userId, tagId) {
      calls.push(`has-tag:${tagId}`);
      return contactTags.has(tagId);
    },
    async addTagToContact(_userId, tagId) {
      calls.push(`add-tag:${tagId}`);
      if (tagId === opts.failTagAdd) throw new Error(`Tag write failed for ${tagId}`);
      contactTags.add(tagId);
    },
    async listSystemFormFields() {
      calls.push("fields");
      return opts.fieldList ?? fields;
    },
    async updateContactCustomFields(_userId, userProfiles) {
      calls.push(`custom:${userProfiles.length}`);
      updates.push(...userProfiles);
    },
    async getContactCustomFields(userId) {
      calls.push(`custom-read:${userId}`);
      return fields.map((field) => ({
        formFieldId: field.formFieldId,
        formFieldKey: field.formFieldKey,
        formFieldName: field.name,
        value: updates.find((update) => update.formFieldId === field.formFieldId)?.value ?? null,
      }));
    },
    async findListByName(name) {
      calls.push(`find-list:${name}`);
      throw new Error("Scorecard flow must not find Funnelr lists.");
    },
    async contactBelongsToList(userId, listId) {
      calls.push(`has-list:${userId}:${listId}`);
      throw new Error("Scorecard flow must not check Funnelr list membership.");
    },
    async addContactToList(userId, listId) {
      calls.push(`add-list:${userId}:${listId}`);
      throw new Error("Scorecard flow must not add Funnelr lists.");
    },
    async removeContactFromList(userId, listId) {
      calls.push(`remove-list:${userId}:${listId}`);
      throw new Error("Scorecard flow must not remove Funnelr lists.");
    },
    async findSequenceByName(name) {
      calls.push(`find-sequence:${name}`);
      throw new Error("Scorecard flow must not find Funnelr sequences.");
    },
    async addContactToSequence(userId, sequenceId) {
      calls.push(`add-sequence:${userId}:${sequenceId}`);
      throw new Error("Scorecard flow must not add Funnelr sequences.");
    },
    async removeContactFromSequence(userId, sequenceId) {
      calls.push(`remove-sequence:${userId}:${sequenceId}`);
      throw new Error("Scorecard flow must not remove Funnelr sequences.");
    },
  };
}

function assertNoDirectRouting(c: { calls: string[] }) {
  for (const prefix of ["find-list:", "has-list:", "add-list:", "remove-list:", "find-sequence:", "add-sequence:", "remove-sequence:"]) {
    assert.equal(c.calls.some((call) => call.startsWith(prefix)), false, `unexpected direct routing call: ${prefix}`);
  }
}

test("new contact is created, report URL is saved, and final routing tags are assigned", async () => {
  const c = client(null);
  const res = await submitScorecardLeadToFunnelr(lead(), { client: c });
  assert.equal(res.ok, true);
  assert.equal(res.contactCreated, true);
  assert.ok(c.calls.includes("create:mark@veltkamp-dosing.nl:Mark:https://www.nexubis.io/scorecard/r/abc12345:true:"));
  assert.deepEqual(res.standardFieldsUpdated, [SCORECARD_REPORT_URL_MESSENGER_MIRROR_FIELD_NAME]);
  assertNoDirectRouting(c);
  assert.ok(c.calls.includes("add-tag:tag-brand"));
  assert.ok(c.calls.includes("add-tag:tag-source"));
  assert.ok(c.calls.includes("add-tag:tag-trigger"));
  assert.ok(c.updates.some((u) => u.formFieldId === SCORECARD_REPORT_URL_FIELD_ID && u.value === "https://www.nexubis.io/scorecard/r/abc12345"));
});

test("first name and email only creates a contact and applies final routing tags", async () => {
  const c = client(null);
  const res = await submitScorecardLeadToFunnelr({ firstName: "Mark", email: "MARK@VELTKAMP-DOSING.NL" }, { client: c });
  assert.equal(res.ok, true);
  assert.equal(res.contactCreated, true);
  assert.ok(c.calls.includes("find:mark@veltkamp-dosing.nl"));
  assert.ok(c.calls.includes("create:mark@veltkamp-dosing.nl:Mark::undefined:"));
  assert.ok(c.calls.includes("add-tag:tag-trigger"));
  assertNoDirectRouting(c);
  assert.equal(c.updates.some((u) => u.formFieldId === SCORECARD_REPORT_URL_FIELD_ID), false);
});

test("optional marketing consent is passed through when present", async () => {
  const c = client(null);
  const res = await submitScorecardLeadToFunnelr({ firstName: "Mark", email: "mark@veltkamp-dosing.nl", marketingConsent: true }, { client: c });
  assert.equal(res.ok, true);
  assert.ok(c.calls.includes("create:mark@veltkamp-dosing.nl:Mark::true:"));
});

test("existing contact is reused and not duplicated", async () => {
  const c = client({ userId: 7, email: "mark@veltkamp-dosing.nl", currencyCode: "USD", isAgent: false });
  const res = await submitScorecardLeadToFunnelr(lead(), { client: c });
  assert.equal(res.ok, true);
  assert.equal(res.contactCreated, false);
  assert.equal(c.calls.some((call) => call.startsWith("create:")), false);
  assert.ok(c.calls.includes("update:7:mark@veltkamp-dosing.nl:true:https://www.nexubis.io/scorecard/r/abc12345::"));
  assert.ok(c.calls.includes("add-tag:tag-trigger"));
  assertNoDirectRouting(c);
});

test("invalid email is rejected", () => {
  const res = normalizeScorecardLeadInput(lead({ email: "not-email" }));
  assert.equal("error" in res, true);
});

test("optional report URL updates the report custom field", async () => {
  const c = client(null);
  const res = await submitScorecardLeadToFunnelr(lead(), { client: c });
  assert.equal(res.ok, true);
  assert.ok(c.updates.some((u) => u.formFieldId === SCORECARD_REPORT_URL_FIELD_ID && u.value === "https://www.nexubis.io/scorecard/r/abc12345"));
});

test("new-contact report URL is mirrored to Last name", async () => {
  const c = client(null);
  const res = await submitScorecardLeadToFunnelr(lead(), { client: c });
  assert.equal(res.ok, true);
  assert.ok(c.calls.includes("create:mark@veltkamp-dosing.nl:Mark:https://www.nexubis.io/scorecard/r/abc12345:true:"));
  assert.equal(c.calls.some((call) => call.includes(":true:https://www.nexubis.io/scorecard/r/abc12345")), false);
  assert.deepEqual(res.customFieldsUpdated, ["reportUrl"]);
  assert.deepEqual(res.standardFieldsUpdated, [SCORECARD_REPORT_URL_MESSENGER_MIRROR_FIELD_NAME]);
  assertNoDirectRouting(c);
});

test("existing-contact report URL is mirrored to Last name without writing Address or Telephone", async () => {
  const c = client({ userId: 7, email: "mark@veltkamp-dosing.nl", currencyCode: "USD", isAgent: false, street: null });
  const res = await submitScorecardLeadToFunnelr(lead(), { client: c });
  assert.equal(res.ok, true);
  assert.ok(c.calls.includes("update:7:mark@veltkamp-dosing.nl:true:https://www.nexubis.io/scorecard/r/abc12345::"));
  assert.equal(c.calls.some((call) => call.startsWith("create:")), false);
  assert.ok(c.updates.some((u) => u.formFieldId === SCORECARD_REPORT_URL_FIELD_ID && u.value === "https://www.nexubis.io/scorecard/r/abc12345"));
  assertNoDirectRouting(c);
});

test("previously mirrored Scorecard report URL is removed from Address on repeat unlock", async () => {
  const c = client({ userId: 7, email: "mark@veltkamp-dosing.nl", currencyCode: "USD", isAgent: false, street: "https://www.nexubis.io/scorecard/r/abc23456" });
  const latest = "https://www.nexubis.io/scorecard/r/latest42";
  const res = await submitScorecardLeadToFunnelr(lead({ reportUrl: latest }), { client: c });
  assert.equal(res.ok, true);
  assert.ok(c.calls.includes(`update:7:mark@veltkamp-dosing.nl:true:${latest}::`));
  assert.ok(c.updates.some((u) => u.formFieldId === SCORECARD_REPORT_URL_FIELD_ID && u.value === latest));
  assert.equal(c.calls.some((call) => call.startsWith("create:")), false);
  assertNoDirectRouting(c);
});

test("previously mirrored Scorecard report URL is removed from Telephone on repeat unlock", async () => {
  const c = client({ userId: 7, email: "mark@veltkamp-dosing.nl", currencyCode: "USD", isAgent: false, telephone: "https://www.nexubis.io/scorecard/r/abc23456" });
  const latest = "https://www.nexubis.io/scorecard/r/latest42";
  const res = await submitScorecardLeadToFunnelr(lead({ reportUrl: latest }), { client: c });
  assert.equal(res.ok, true);
  assert.ok(c.calls.includes(`update:7:mark@veltkamp-dosing.nl:true:${latest}::`));
  assert.ok(c.updates.some((u) => u.formFieldId === SCORECARD_REPORT_URL_FIELD_ID && u.value === latest));
  assertNoDirectRouting(c);
});

test("genuine existing Address and Telephone are preserved when Last name receives the report URL", async () => {
  const c = client({ userId: 7, email: "mark@veltkamp-dosing.nl", currencyCode: "USD", isAgent: false, street: "12 Market Street", telephone: "+27110000000" });
  const res = await submitScorecardLeadToFunnelr(lead(), { client: c });
  assert.equal(res.ok, true);
  assert.ok(c.calls.includes("update:7:mark@veltkamp-dosing.nl:true:https://www.nexubis.io/scorecard/r/abc12345:+27110000000:12 Market Street"));
  assertNoDirectRouting(c);
});

test("invalid non-HTTPS report URL does not update Last name", async () => {
  const c = client({ userId: 7, email: "mark@veltkamp-dosing.nl", currencyCode: "USD", isAgent: false, lastName: "Veltkamp", telephone: "+27110000000" });
  const res = await submitScorecardLeadToFunnelr(lead({ reportUrl: "http://www.nexubis.io/scorecard/r/abc12345" }), { client: c });
  assert.equal(res.ok, true);
  assert.ok(c.calls.includes("update:7:mark@veltkamp-dosing.nl:true:Veltkamp:+27110000000:"));
  assert.deepEqual(res.standardFieldsUpdated, []);
  assertNoDirectRouting(c);
});

test("unrelated contact without a report URL keeps existing Last name, Telephone, Address and custom report URL untouched", async () => {
  const c = client({ userId: 7, email: "mark@veltkamp-dosing.nl", currencyCode: "USD", isAgent: false, lastName: "Veltkamp", telephone: "+27110000000", street: "12 Market Street" });
  const res = await submitScorecardLeadToFunnelr({ firstName: "Mark", email: "mark@veltkamp-dosing.nl" }, { client: c });
  assert.equal(res.ok, true);
  assert.ok(c.calls.includes("update:7:mark@veltkamp-dosing.nl:undefined:Veltkamp:+27110000000:12 Market Street"));
  assert.equal(c.updates.some((u) => u.formFieldId === SCORECARD_REPORT_URL_FIELD_ID), false);
  assert.deepEqual(res.standardFieldsUpdated, []);
});

test("non-boolean consent is rejected", () => {
  const res = normalizeScorecardLeadInput({ firstName: "Mark", email: "mark@veltkamp-dosing.nl", marketingConsent: "yes" });
  assert.equal("error" in res, true);
});

test("duplicate submission updates contact without duplicating tags", async () => {
  const c = client(
    { userId: 7, email: "mark@veltkamp-dosing.nl", currencyCode: "USD", isAgent: false },
    { existingTagIds: ["tag-brand", "tag-source", "tag-trigger"] },
  );
  const res = await submitScorecardLeadToFunnelr(lead(), { client: c });
  assert.equal(res.ok, true);
  assert.equal(c.calls.some((call) => call.startsWith("create:")), false);
  assert.equal(c.calls.some((call) => call.startsWith("add-tag:")), false);
  assert.ok(c.calls.includes("update:7:mark@veltkamp-dosing.nl:true:https://www.nexubis.io/scorecard/r/abc12345::"));
  assert.ok(c.calls.includes("custom:1"));
  assertNoDirectRouting(c);
});

test("successful routing tag assignment is verified", async () => {
  const c = client({ userId: 7, email: "mark@veltkamp-dosing.nl", currencyCode: "USD", isAgent: false });
  const res = await submitScorecardLeadToFunnelr(lead(), { client: c });
  assert.deepEqual(res.tagsApplied, [BRAND_NEXUBIS_TAG_NAME, SOURCE_SCORECARD_TAG_NAME, START_SCORECARD_SALES_TAG_NAME]);
  assertNoDirectRouting(c);
});

test("Funnelr API failure is sanitized and non-throwing", async () => {
  const res = await submitScorecardLeadToFunnelr(lead(), { client: client(null, { fail: true }) });
  assert.equal(res.ok, false);
  assert.ok(res.error);
  assert.equal(res.error?.includes("MARK@"), false);
});

test("custom field mapping fails when the target report field is missing", () => {
  const normalized = normalizeScorecardLeadInput(lead());
  assert.ok(!("error" in normalized));
  assert.throws(() => buildCustomFieldUpdates(normalized, []), /Required Funnelr custom field/);
});

test("custom field mapping resolves the target field by key", () => {
  const normalized = normalizeScorecardLeadInput(lead());
  assert.ok(!("error" in normalized));
  const mapped = buildCustomFieldUpdates(normalized, [{ formFieldId: "field-key", formFieldKey: SCORECARD_REPORT_URL_FIELD_KEY, formFieldTypeKey: "ContactProfile" }]);
  assert.deepEqual(mapped.updates, [{ formFieldId: "field-key", value: "https://www.nexubis.io/scorecard/r/abc12345" }]);
});

test("unsubscribed existing contact is still given the required sales trigger", async () => {
  const c = client({ userId: 7, email: "mark@veltkamp-dosing.nl", currencyCode: "USD", isAgent: false, isUnsubscribed: true });
  const res = await submitScorecardLeadToFunnelr(lead(), { client: c });
  assert.equal(res.ok, true);
  assert.ok(c.calls.includes("add-tag:tag-brand"));
  assert.ok(c.calls.includes("add-tag:tag-source"));
  assert.ok(c.calls.includes("add-tag:tag-trigger"));
  assertNoDirectRouting(c);
});

test("missing Scorecard URL field returns a useful safe error and does not silently skip the update", async () => {
  const res = await submitScorecardLeadToFunnelr(lead(), { client: client(null, { fieldList: [] }) });
  assert.equal(res.ok, false);
  assert.match(res.error ?? "", /Required Funnelr custom field was not found/);
});

test("failed required tag operation returns a useful safe error", async () => {
  const res = await submitScorecardLeadToFunnelr(lead(), { client: client(null, { missingTag: SOURCE_SCORECARD_TAG_NAME }) });
  assert.equal(res.ok, false);
  assert.match(res.error ?? "", /Required Funnelr tag was not found/);
});

test("failed required tag write returns a useful safe error", async () => {
  const res = await submitScorecardLeadToFunnelr(lead(), { client: client(null, { failTagAdd: "tag-source" }) });
  assert.equal(res.ok, false);
  assert.match(res.error ?? "", /Tag write failed/);
});

test("failed Last name mirror read-back returns a useful safe error after tags are applied", async () => {
  const c = client(null, { staleMirrorReadback: true });
  const res = await submitScorecardLeadToFunnelr(lead(), { client: c });
  assert.equal(res.ok, false);
  assert.match(res.error ?? "", /Last name mirror was not saved correctly/);
  assert.ok(c.calls.includes("add-tag:tag-brand"));
  assert.ok(c.calls.includes("add-tag:tag-source"));
  assert.ok(c.calls.includes("add-tag:tag-trigger"));
});
