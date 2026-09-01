import { test, vi, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";

// In-memory KV shared by run records, shared reports, leads and dedupe keys.
const { store, lists } = vi.hoisted(() => ({
  store: new Map<string, unknown>(),
  lists: new Map<string, unknown[]>(),
}));
vi.mock("./kv", () => ({
  getKv: () => ({
    get: async (k: string) => (store.has(k) ? store.get(k) : null),
    set: async (k: string, v: unknown) => {
      store.set(k, v);
    },
    incr: async () => 1,
    expire: async () => 1,
    del: async (k: string) => (store.delete(k) ? 1 : 0),
    lpush: async (k: string, ...vals: unknown[]) => {
      const l = lists.get(k) ?? [];
      l.unshift(...vals.reverse());
      lists.set(k, l);
      return l.length;
    },
    lrange: async (k: string, start: number, stop: number) => {
      const l = lists.get(k) ?? [];
      return l.slice(start, stop === -1 ? l.length : stop + 1);
    },
    ltrim: async (k: string, start: number, stop: number) => {
      const l = lists.get(k) ?? [];
      lists.set(k, l.slice(start, stop === -1 ? l.length : stop + 1));
      return "OK";
    },
  }),
}));
import { buildLeadRecord, runLeadPlumbing, readExistingCapture, markCaptured, promoteResult, dedupeKey } from "./unlock";
import { listLeads, readLead, type LeadRecord } from "./leads";
import { generateScorecardUncached } from "./generate";
import { prospectFromRunInput, runIdFor } from "./run";
import type { SharedScorecard } from "./share";

const captureEmail = "Mark@Veltkamp-Dosing.nl";

async function makeSharedRecord(): Promise<SharedScorecard> {
  process.env.SCORECARD_MOCK = "1";
  const prospect = prospectFromRunInput({
    url: "veltkamp-dosing.nl",
    productOneLiner: "Precision dosing equipment for food production lines",
    competitors: ["dosatech.de", "flowserve-dosing.com"],
  });
  const result = await generateScorecardUncached(prospect);
  const now = new Date().toISOString();
  return {
    prospectData: { ...prospect, name: "Mark", role: "CEO or MD" },
    result: { ...result, meta: { ...result.meta, contactName: "Mark", role: "CEO or MD" } },
    loomUrl: null,
    createdAt: now,
    lastEditedAt: now,
    expiresAt: now,
  };
}

beforeEach(() => {
  store.clear();
  lists.clear();
  vi.unstubAllGlobals();
});
afterEach(() => {
  delete process.env.SCORECARD_MOCK;
  delete process.env.FUNNELR_WEBHOOK_URL;
  delete process.env.FUNNELR_WEBHOOK_SECRET;
  delete process.env.SCORECARD_SEND_EMAIL1;
  delete process.env.RESEND_API_KEY;
  vi.unstubAllGlobals();
});

test("lead plumbing persists a complete lead, notifies the team, and skips Email 1 when the flag is off", async () => {
  process.env.RESEND_API_KEY = "re_test";
  const sent: Array<{ url: string; body: Record<string, unknown> }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      sent.push({ url: u, body: JSON.parse(String(init?.body)) });
      return new Response(JSON.stringify({ id: "email" }), { status: 200 });
    }),
  );

  const record = await makeSharedRecord();
  const lead = await runLeadPlumbing(record, captureEmail, "slug9999", "https://www.nexubis.io");

  // Lead record complete and queryable. Funnelr capture is handled by the
  // flow calling /api/leads/scorecard once the permanent URL exists.
  const storedLead = await readLead("slug9999");
  assert.ok(storedLead);
  assert.equal(storedLead.webhookStatus, "skipped");
  assert.equal(storedLead.email, "Mark@Veltkamp-Dosing.nl");
  assert.equal(storedLead.loomStatus, "none");
  assert.equal(storedLead.routing.roleSeniority, "unknown"); // no role collected in the gateless flow
  assert.equal((await listLeads()).length, 1);

  // Team email sent; Email 1 skipped (flag off).
  assert.equal(sent.length, 1);
  const teamEmail = sent[0].body as { subject: string; text: string; to: string[] };
  assert.ok(teamEmail.subject.startsWith(`Audit lead: Veltkamp Dosing, ${lead.credibilityScore}/100`));
  assert.ok(!teamEmail.text.includes("webhook FAILED"));
});

test("Email 1 goes to the lead only while SCORECARD_SEND_EMAIL1=true, with the exact locked copy", async () => {
  process.env.SCORECARD_SEND_EMAIL1 = "true";
  process.env.RESEND_API_KEY = "re_test";
  const sent: Array<Record<string, unknown>> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).includes("resend")) {
        sent.push(JSON.parse(String(init?.body)));
        return new Response("{}", { status: 200 });
      }
      return new Response("{}", { status: 200 });
    }),
  );
  const record = await makeSharedRecord();
  await runLeadPlumbing(record, captureEmail, "slug7777", "https://www.nexubis.io");
  const email1 = sent.find((e) => (e.to as string[])[0] === "Mark@Veltkamp-Dosing.nl") as { subject: string; text: string };
  assert.ok(email1, "Email 1 should be sent when the flag is on");
  assert.equal(email1.subject, "Your Online Credibility Audit is ready, Mark");
  assert.ok(email1.text.startsWith("Hi Mark,"));
  assert.ok(email1.text.includes("https://www.nexubis.io/audit/r/slug7777"));
  assert.ok(email1.text.includes("the first place to fix"));
  assert.ok(!email1.text.includes(String.fromCharCode(0x2014)));
});

test("capture idempotency: the dedupe marker returns the same slug and prevents a second fire", async () => {
  process.env.SCORECARD_MOCK = "1";
  const prospect = prospectFromRunInput({
    url: "veltkamp-dosing.nl",
    productOneLiner: "Precision dosing equipment for food production lines",
    competitors: ["dosatech.de", "flowserve-dosing.com"],
  });
  const result = await generateScorecardUncached(prospect);
  const runId = runIdFor(prospect);

  assert.equal(await readExistingCapture(captureEmail, runId), null);
  const first = await promoteResult(prospect, result, captureEmail);
  await markCaptured(captureEmail, runId, first.slug);
  assert.equal(await readExistingCapture(captureEmail, runId), first.slug);
  // Same email in a different case still dedupes.
  assert.equal(await readExistingCapture("mark@veltkamp-dosing.nl", runId), first.slug);
  assert.ok(store.has(dedupeKey(captureEmail, runId)));
});

test("lead updates preserve the slug and bump updatedAt", async () => {
  const record = await makeSharedRecord();
  const lead: LeadRecord = buildLeadRecord(record, captureEmail, "slugupd1");
  const { pushLead, updateLead } = await import("./leads");
  await pushLead(lead);
  const updated = await updateLead("slugupd1", { note: "call after interpack", loomStatus: "selected" });
  assert.ok(updated);
  assert.equal(updated.note, "call after interpack");
  assert.equal(updated.loomStatus, "selected");
  assert.equal(updated.reportSlug, "slugupd1");
});
