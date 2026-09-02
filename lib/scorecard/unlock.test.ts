import { test, vi, beforeEach } from "vitest";
import assert from "node:assert/strict";

// In-memory KV behind shared reports and dedupe keys, so promoteResult is
// tested without a live store.
const { store } = vi.hoisted(() => ({ store: new Map<string, unknown>() }));
vi.mock("./kv", () => ({
  getKv: () => ({
    get: async (k: string) => (store.has(k) ? store.get(k) : null),
    set: async (k: string, v: unknown) => {
      store.set(k, v);
    },
    incr: async () => 1,
    expire: async () => 1,
    del: async () => 1,
    lpush: async () => 1,
    lrange: async () => [],
    ltrim: async () => "OK",
  }),
}));

import {
  validateCaptureInput,
  isDisposableEmail,
  emailDomain,
  applyContact,
  promoteResult,
  readExistingCapture,
  markCaptured,
  type LeadCaptureInput,
} from "./unlock";
import { firstNameFromEmail } from "./lead-name";
import { generateScorecardUncached } from "./generate";
import { prospectFromRunInput, runIdFor } from "./run";

const good: LeadCaptureInput = {
  firstName: "Mark",
  email: "mark@veltkamp-dosing.nl",
  honeypot: "",
  elapsedMs: 30_000,
};

beforeEach(() => {
  store.clear();
});

test("a clean submission validates", () => {
  assert.equal(validateCaptureInput(good).ok, true);
});

test("honeypot and too-fast submissions are rejected without a bot tell", () => {
  const hp = validateCaptureInput({ ...good, honeypot: "Acme" });
  assert.equal(hp.ok, false);
  assert.equal(hp.reason, "honeypot");
  assert.ok(!hp.error.toLowerCase().includes("bot"));
  const fast = validateCaptureInput({ ...good, elapsedMs: 300 });
  assert.equal(fast.ok, false);
  assert.equal(fast.reason, "too-fast");
});

test("disposable domains are blocked with helpful copy", () => {
  assert.equal(isDisposableEmail("x@mailinator.com"), true);
  assert.equal(isDisposableEmail("x@veltkamp-dosing.nl"), false);
  assert.equal(emailDomain("A@B.Com"), "b.com");
  const r = validateCaptureInput({ ...good, email: "x@yopmail.com" });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "disposable");
  assert.ok(r.error.includes("work email"));
});

test("a malformed email fails with a field-specific message", () => {
  assert.equal(validateCaptureInput({ ...good, email: "not-an-email" }).reason, "email");
  assert.equal(validateCaptureInput({ ...good, email: "" }).reason, "email");
});

test("an empty first name is rejected (a nameless lead is broken)", () => {
  const blank = validateCaptureInput({ ...good, firstName: "" });
  assert.equal(blank.ok, false);
  assert.equal(blank.reason, "first-name");
  assert.equal(validateCaptureInput({ ...good, firstName: "   " }).reason, "first-name");
  assert.ok(blank.error.toLowerCase().includes("first name"));
});

test("firstNameFromEmail reads personal mailboxes and skips generic ones", () => {
  assert.equal(firstNameFromEmail("mark@veltkamp-dosing.nl"), "Mark");
  assert.equal(firstNameFromEmail("mark.jansen@example.nl"), "Mark");
  assert.equal(firstNameFromEmail("info@example.nl"), null);
  assert.equal(firstNameFromEmail("sales@example.nl"), null);
  assert.equal(firstNameFromEmail("m@example.nl"), null);
  assert.equal(firstNameFromEmail("mark123@example.nl"), null);
});

test("promoteResult turns a finished generation into a permanent shared report", async () => {
  process.env.SCORECARD_MOCK = "1";
  try {
    const prospect = prospectFromRunInput({
      url: "veltkamp-dosing.nl",
      productOneLiner: "Precision dosing equipment for food production lines",
      competitors: ["dosatech.de", "flowserve-dosing.com"],
    });
    const result = await generateScorecardUncached(prospect);

    const outcome = await promoteResult(prospect, result, good.email);
    assert.match(outcome.slug, /^[a-z2-9]{8}$/);
    assert.equal(outcome.reportUrl, `/audit/r/${outcome.slug}`);
    assert.equal(outcome.record.result.meta.contactName, "Mark");
    assert.equal(outcome.record.loomUrl, null);
    // The shared record is readable back at its slug key.
    assert.ok(store.has(`scorecard:${outcome.slug}`));
  } finally {
    delete process.env.SCORECARD_MOCK;
  }
});

test("capture dedupe returns the same slug for the same email and site", async () => {
  const prospect = prospectFromRunInput({ url: "veltkamp-dosing.nl", productOneLiner: "", competitors: [] });
  const runId = runIdFor(prospect);
  assert.equal(await readExistingCapture(good.email, runId), null);
  await markCaptured(good.email, runId, "slug1234");
  assert.equal(await readExistingCapture(good.email, runId), "slug1234");
  // A different email on the same site is not deduped.
  assert.equal(await readExistingCapture("other@veltkamp-dosing.nl", runId), null);
});

test("applyContact uses the form first name, falling back to the email, keeps loom band-driven", async () => {
  process.env.SCORECARD_MOCK = "1";
  try {
    const prospect = prospectFromRunInput({
      url: "veltkamp-dosing.nl",
      productOneLiner: "Dosing pumps",
      competitors: ["dosatech.de", "flowserve-dosing.com"],
    });
    const result = await generateScorecardUncached(prospect);
    // The explicit form first name is used verbatim, even over a generic mailbox.
    const applied = applyContact(prospect, result, "info@veltkamp-dosing.nl", "Anja");
    assert.equal(applied.prospect.name, "Anja");
    assert.equal(applied.result.meta.contactName, "Anja");
    assert.equal(applied.result.routing.loomCandidate, applied.result.verdict.band !== "narrow");

    // With no form name given, it falls back to the email local part, then "".
    const fallback = applyContact(prospect, result, good.email);
    assert.equal(fallback.prospect.name, "Mark");
    const generic = applyContact(prospect, result, "info@veltkamp-dosing.nl");
    assert.equal(generic.prospect.name, "");
  } finally {
    delete process.env.SCORECARD_MOCK;
  }
});
