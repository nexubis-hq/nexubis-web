import { test } from "vitest";
import assert from "node:assert/strict";
import {
  BRAND_NEXUBIS_TAG_NAME,
  buildCustomFieldUpdates,
  normalizeScorecardLeadInput,
  SCORECARD_REPORT_URL_FIELD_ID,
  SCORECARD_REPORT_URL_FIELD_KEY,
  SCORECARD_REPORT_URL_FIELD_NAME,
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
  opts: { fail?: boolean; existingTagIds?: string[]; fieldList?: FunnelrSystemFormField[] } = {},
): ScorecardLeadFunnelrClient & { calls: string[]; contactTags: Set<string>; updates: Array<{ formFieldId: string; value: unknown }> } {
  const calls: string[] = [];
  const contactTags = new Set(opts.existingTagIds ?? []);
  const updates: Array<{ formFieldId: string; value: unknown }> = [];

  return {
    calls,
    contactTags,
    updates,
    async findContactByEmail(email) {
      calls.push(`find:${email}`);
      if (opts.fail) throw new Error("Funnelr down");
      return existing;
    },
    async createContact(input) {
      calls.push(`create:${input.email}:${input.firstName ?? ""}:${input.hasAcceptedMarketing}`);
      return { userId: 101, email: input.email, firstName: input.firstName };
    },
    async updateContact(input) {
      calls.push(`update:${input.userId}:${input.email}:${input.hasAcceptedMarketing}`);
      return { userId: input.userId, email: input.email, firstName: input.firstName, currencyCode: input.currencyCode };
    },
    async findTagByName(name) {
      calls.push(`tag:${name}`);
      return routingTags.find((tag) => tag.name === name) ?? null;
    },
    async contactHasTag(_userId, tagId) {
      calls.push(`has-tag:${tagId}`);
      return contactTags.has(tagId);
    },
    async addTagToContact(_userId, tagId) {
      calls.push(`add-tag:${tagId}`);
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
  };
}

test("new contact is created, report URL is saved, and final routing tags are assigned", async () => {
  const c = client(null);
  const res = await submitScorecardLeadToFunnelr(lead(), { client: c });
  assert.equal(res.ok, true);
  assert.equal(res.contactCreated, true);
  assert.ok(c.calls.includes("create:mark@veltkamp-dosing.nl:Mark:true"));
  assert.equal(c.calls.some((call) => call.startsWith("add-list:")), false);
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
  assert.ok(c.calls.includes("create:mark@veltkamp-dosing.nl:Mark:undefined"));
  assert.ok(c.calls.includes("add-tag:tag-trigger"));
  assert.equal(c.updates.some((u) => u.formFieldId === SCORECARD_REPORT_URL_FIELD_ID), false);
});

test("optional marketing consent is passed through when present", async () => {
  const c = client(null);
  const res = await submitScorecardLeadToFunnelr({ firstName: "Mark", email: "mark@veltkamp-dosing.nl", marketingConsent: true }, { client: c });
  assert.equal(res.ok, true);
  assert.ok(c.calls.includes("create:mark@veltkamp-dosing.nl:Mark:true"));
});

test("existing contact is reused and not duplicated", async () => {
  const c = client({ userId: 7, email: "mark@veltkamp-dosing.nl", currencyCode: "USD", isAgent: false });
  const res = await submitScorecardLeadToFunnelr(lead(), { client: c });
  assert.equal(res.ok, true);
  assert.equal(res.contactCreated, false);
  assert.equal(c.calls.some((call) => call.startsWith("create:")), false);
  assert.ok(c.calls.includes("update:7:mark@veltkamp-dosing.nl:true"));
  assert.ok(c.calls.includes("add-tag:tag-trigger"));
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
  assert.ok(c.calls.includes("update:7:mark@veltkamp-dosing.nl:true"));
  assert.ok(c.calls.includes("custom:1"));
});

test("successful routing tag assignment is verified", async () => {
  const c = client({ userId: 7, email: "mark@veltkamp-dosing.nl", currencyCode: "USD", isAgent: false });
  const res = await submitScorecardLeadToFunnelr(lead(), { client: c });
  assert.deepEqual(res.tagsApplied, [BRAND_NEXUBIS_TAG_NAME, SOURCE_SCORECARD_TAG_NAME, START_SCORECARD_SALES_TAG_NAME]);
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

test("unsubscribed existing contact is updated but not given the sales trigger", async () => {
  const c = client({ userId: 7, email: "mark@veltkamp-dosing.nl", currencyCode: "USD", isAgent: false, isUnsubscribed: true });
  const res = await submitScorecardLeadToFunnelr(lead(), { client: c });
  assert.equal(res.ok, true);
  assert.equal(res.triggerTagSkipped, true);
  assert.ok(c.calls.includes("add-tag:tag-brand"));
  assert.ok(c.calls.includes("add-tag:tag-source"));
  assert.equal(c.calls.includes("add-tag:tag-trigger"), false);
});
