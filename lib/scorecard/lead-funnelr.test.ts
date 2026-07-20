import { test } from "vitest";
import assert from "node:assert/strict";
import { buildCustomFieldUpdates, normalizeScorecardLeadInput, SCORECARD_LEADS_LIST_NAME, submitScorecardLeadToFunnelr, type ScorecardLeadFunnelrClient, type ScorecardLeadInput } from "./lead-funnelr";
import type { FunnelrContactField, FunnelrList, FunnelrUser } from "@/lib/funnelr/client";

const scorecardList: FunnelrList = { listId: "list-scorecard", name: SCORECARD_LEADS_LIST_NAME };
const fields: FunnelrContactField[] = [
  { value: "field-started", label: "Scorecard Started Timestamp" },
  { value: "field-url", label: "Scorecard Report URL" },
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

function client(existing: FunnelrUser | null = null, opts: { fail?: boolean; alreadyInList?: boolean } = {}): ScorecardLeadFunnelrClient & { calls: string[]; listMembers: Set<number>; updates: Array<{ formFieldId: string; value: unknown }> } {
  const calls: string[] = [];
  const listMembers = new Set<number>(opts.alreadyInList && existing?.userId ? [existing.userId] : []);
  const updates: Array<{ formFieldId: string; value: unknown }> = [];
  return {
    calls,
    listMembers,
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
    async findListByName(name) {
      calls.push(`list:${name}`);
      return name === SCORECARD_LEADS_LIST_NAME ? scorecardList : null;
    },
    async contactBelongsToList(userId, listId) {
      calls.push(`has-list:${userId}:${listId}`);
      return listMembers.has(userId);
    },
    async addContactToList(userId, listId) {
      calls.push(`add-list:${userId}:${listId}`);
      listMembers.add(userId);
    },
    async listContactFields() {
      calls.push("fields");
      return fields;
    },
    async updateContactCustomFields(_userId, userProfiles) {
      calls.push(`custom:${userProfiles.length}`);
      updates.push(...userProfiles);
    },
  };
}

test("new contact is created, custom fields are updated and Scorecard list is assigned", async () => {
  const c = client(null);
  const res = await submitScorecardLeadToFunnelr(lead(), { client: c });
  assert.equal(res.ok, true);
  assert.equal(res.contactCreated, true);
  assert.equal(res.listMembershipConfirmed, true);
  assert.ok(c.calls.includes("create:mark@veltkamp-dosing.nl:Mark:true"));
  assert.ok(c.calls.includes("add-list:101:list-scorecard"));
  assert.ok(c.updates.some((u) => u.formFieldId === "field-url" && u.value === "https://www.nexubis.io/scorecard/r/abc12345"));
  assert.ok(c.updates.some((u) => u.formFieldId === "field-started"));
});

test("first name and email only creates a contact and assigns the Scorecard list", async () => {
  const c = client(null);
  const res = await submitScorecardLeadToFunnelr({ firstName: "Mark", email: "MARK@VELTKAMP-DOSING.NL" }, { client: c });
  assert.equal(res.ok, true);
  assert.equal(res.contactCreated, true);
  assert.ok(c.calls.includes("find:mark@veltkamp-dosing.nl"));
  assert.ok(c.calls.includes("create:mark@veltkamp-dosing.nl:Mark:undefined"));
  assert.ok(c.calls.includes("add-list:101:list-scorecard"));
  assert.equal(c.updates.some((u) => u.formFieldId === "field-url"), false);
  assert.ok(c.updates.some((u) => u.formFieldId === "field-started"));
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
  assert.ok(c.calls.includes("add-list:7:list-scorecard"));
});

test("invalid email is rejected", () => {
  const res = normalizeScorecardLeadInput(lead({ email: "not-email" }));
  assert.equal("error" in res, true);
});

test("optional report URL updates the report custom field", async () => {
  const c = client(null);
  const res = await submitScorecardLeadToFunnelr(lead(), { client: c });
  assert.equal(res.ok, true);
  assert.ok(c.updates.some((u) => u.formFieldId === "field-url" && u.value === "https://www.nexubis.io/scorecard/r/abc12345"));
});

test("non-boolean consent is rejected", () => {
  const res = normalizeScorecardLeadInput({ firstName: "Mark", email: "mark@veltkamp-dosing.nl", marketingConsent: "yes" });
  assert.equal("error" in res, true);
});

test("duplicate submission updates contact without duplicating list membership", async () => {
  const c = client({ userId: 7, email: "mark@veltkamp-dosing.nl", currencyCode: "USD", isAgent: false }, { alreadyInList: true });
  const res = await submitScorecardLeadToFunnelr(lead(), { client: c });
  assert.equal(res.ok, true);
  assert.equal(c.calls.some((call) => call.startsWith("create:")), false);
  assert.equal(c.calls.includes("add-list:7:list-scorecard"), false);
  assert.ok(c.calls.includes("update:7:mark@veltkamp-dosing.nl:true"));
  assert.ok(c.calls.includes("custom:2"));
});

test("successful Scorecard list assignment is verified", async () => {
  const c = client({ userId: 7, email: "mark@veltkamp-dosing.nl", currencyCode: "USD", isAgent: false });
  const res = await submitScorecardLeadToFunnelr(lead(), { client: c });
  assert.equal(res.listMembershipConfirmed, true);
});

test("Funnelr API failure is sanitized and non-throwing", async () => {
  const res = await submitScorecardLeadToFunnelr(lead(), { client: client(null, { fail: true }) });
  assert.equal(res.ok, false);
  assert.ok(res.error);
  assert.equal(res.error?.includes("MARK@"), false);
});

test("custom field mapping reports missing live fields without blocking list assignment", async () => {
  const normalized = normalizeScorecardLeadInput(lead());
  assert.ok(!("error" in normalized));
  const mapped = buildCustomFieldUpdates(normalized, fields.filter((f) => f.label !== "Scorecard Report URL"));
  assert.ok(mapped.updatedNames.includes("scorecardStartedAt"));
  assert.ok(mapped.missingNames.includes("reportUrl"));
});
