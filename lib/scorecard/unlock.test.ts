import { test, vi, beforeEach } from "vitest";
import assert from "node:assert/strict";

// In-memory KV behind run records and shared reports, so promoteRun is tested
// without a live store.
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

import { validateUnlockInput, isDisposableEmail, emailDomain, applyContact, promoteRun, type UnlockInput } from "./unlock";
import { generateScorecardUncached } from "./generate";
import { storeRunRecord, prospectFromRunInput, runIdFor } from "./run";

const good: UnlockInput = {
  runId: "run-1",
  firstName: "Mark",
  email: "mark@veltkamp-dosing.nl",
  role: "Marketing manager",
  honeypot: "",
  elapsedMs: 30_000,
};

beforeEach(() => {
  store.clear();
});

test("a clean submission validates", () => {
  assert.equal(validateUnlockInput(good).ok, true);
});

test("honeypot and too-fast submissions are rejected without a bot tell", () => {
  const hp = validateUnlockInput({ ...good, honeypot: "Acme" });
  assert.equal(hp.ok, false);
  assert.equal(hp.reason, "honeypot");
  assert.ok(!hp.error.toLowerCase().includes("bot"));
  const fast = validateUnlockInput({ ...good, elapsedMs: 300 });
  assert.equal(fast.ok, false);
  assert.equal(fast.reason, "too-fast");
});

test("disposable domains are blocked with helpful copy", () => {
  assert.equal(isDisposableEmail("x@mailinator.com"), true);
  assert.equal(isDisposableEmail("x@veltkamp-dosing.nl"), false);
  assert.equal(emailDomain("A@B.Com"), "b.com");
  const r = validateUnlockInput({ ...good, email: "x@yopmail.com" });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "disposable");
  assert.ok(r.error.includes("work email"));
});

test("missing fields fail with field-specific messages", () => {
  assert.equal(validateUnlockInput({ ...good, firstName: " " }).reason, "name");
  assert.equal(validateUnlockInput({ ...good, email: "not-an-email" }).reason, "email");
  assert.equal(validateUnlockInput({ ...good, role: "" }).reason, "role");
});

test("promoteRun turns a run record into a permanent shared report with contact applied", async () => {
  process.env.SCORECARD_MOCK = "1";
  try {
    const prospect = prospectFromRunInput({
      url: "veltkamp-dosing.nl",
      productOneLiner: "Precision dosing equipment for food production lines",
      competitors: ["dosatech.de", "flowserve-dosing.com"],
    });
    const result = await generateScorecardUncached(prospect);
    const runId = runIdFor(prospect);
    await storeRunRecord(runId, { prospectData: prospect, result, createdAt: new Date().toISOString() });

    const outcome = await promoteRun({ ...good, runId, role: "CEO or MD" });
    assert.ok(outcome.ok);
    if (outcome.ok) {
      assert.match(outcome.slug, /^[a-z2-9]{8}$/);
      assert.equal(outcome.reportUrl, `/scorecard/r/${outcome.slug}`);
      assert.equal(outcome.record.result.meta.contactName, "Mark");
      assert.equal(outcome.record.result.meta.role, "CEO or MD");
      assert.equal(outcome.record.result.routing.roleSeniority, "ceo");
      assert.equal(outcome.record.loomUrl, null);
      // The shared record is readable back at its slug key.
      assert.ok(store.has(`scorecard:${outcome.slug}`));
    }
  } finally {
    delete process.env.SCORECARD_MOCK;
  }
});

test("promoting an expired run fails honestly with a 410", async () => {
  const outcome = await promoteRun({ ...good, runId: "gone" });
  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.status, 410);
    assert.equal(outcome.reason, "run-expired");
    assert.ok(outcome.error.includes("expired"));
  }
});

test("applyContact recomputes the loom-candidate flag from seniority", async () => {
  process.env.SCORECARD_MOCK = "1";
  try {
    const prospect = prospectFromRunInput({
      url: "veltkamp-dosing.nl",
      productOneLiner: "Dosing pumps",
      competitors: ["dosatech.de", "flowserve-dosing.com"],
    });
    const result = await generateScorecardUncached(prospect);
    const applied = applyContact(prospect, result, { ...good, role: "CEO or MD" });
    assert.equal(applied.result.routing.loomCandidate, true);
    assert.equal(applied.prospect.name, "Mark");
  } finally {
    delete process.env.SCORECARD_MOCK;
  }
});
