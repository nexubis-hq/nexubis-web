import { test, vi, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

// In-memory KV shared by run records, shared reports, leads and dedupe keys.
const { store, lists } = vi.hoisted(() => ({ store: new Map<string, unknown>(), lists: new Map<string, unknown[]>() }));
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

import { buildFunnelrPayload, fireFunnelrWebhook, signPayload } from "./funnelr";
import { buildLeadRecord, runLeadPlumbing, readExistingUnlock, markUnlocked, promoteRun, dedupeKey, type UnlockInput } from "./unlock";
import { listLeads, readLead, type LeadRecord } from "./leads";
import { generateScorecardUncached } from "./generate";
import { prospectFromRunInput, runIdFor, storeRunRecord } from "./run";
import type { SharedScorecard } from "./share";

const unlockInput: UnlockInput = {
  runId: "run-x",
  firstName: "Mark",
  email: "Mark@Veltkamp-Dosing.nl",
  role: "CEO or MD",
  elapsedMs: 20_000,
};

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

test("the Funnelr payload carries the full lead snapshot with the scorecard source tag", async () => {
  const record = await makeSharedRecord();
  const lead = buildLeadRecord(record, unlockInput, "slug1234");
  const payload = buildFunnelrPayload(lead, "https://www.nexubis.io/scorecard/r/slug1234");
  assert.equal(payload.source, "scorecard");
  assert.deepEqual(payload.contact, { firstName: "Mark", email: "Mark@Veltkamp-Dosing.nl", role: "CEO or MD" });
  assert.equal(payload.company, "Veltkamp Dosing");
  assert.equal(payload.website, "https://veltkamp-dosing.nl");
  assert.equal(payload.reportUrl, "https://www.nexubis.io/scorecard/r/slug1234");
  assert.equal(typeof payload.credibilityScore, "number");
  assert.ok(["narrow", "visible", "wide"].includes(payload.verdict));
  assert.equal(payload.competitors.length, 2);
  assert.ok(payload.firstFixCategory);
});

test("the webhook is HMAC-signed over the exact body", () => {
  const body = JSON.stringify({ a: 1 });
  const sig = signPayload(body, "secret-1");
  assert.equal(sig, createHmac("sha256", "secret-1").update(body).digest("hex"));
  assert.notEqual(sig, signPayload(body, "secret-2"));
  assert.notEqual(sig, signPayload(JSON.stringify({ a: 2 }), "secret-1"));
});

test("the webhook retries 3 times with backoff, then reports failure", async () => {
  process.env.FUNNELR_WEBHOOK_URL = "https://funnelr.test/hook";
  process.env.FUNNELR_WEBHOOK_SECRET = "s";
  const calls: Array<{ url: string; sig: string | null }> = [];
  const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    calls.push({ url: String(url), sig: headers.get("X-Nexubis-Signature") });
    return new Response("nope", { status: 500 });
  }) as unknown as typeof fetch;
  const sleeps: number[] = [];
  const record = await makeSharedRecord();
  const lead = buildLeadRecord(record, unlockInput, "slug1234");
  const res = await fireFunnelrWebhook(buildFunnelrPayload(lead, "https://x/r/slug1234"), {
    fetchImpl,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
  });
  assert.equal(res.ok, false);
  assert.equal(res.attempts, 3);
  assert.equal(calls.length, 3);
  assert.deepEqual(sleeps, [1500, 4000]);
  // Every attempt carried the same valid signature.
  for (const c of calls) assert.ok(c.sig && c.sig.length === 64);
});

test("a first-attempt success fires exactly one request", async () => {
  process.env.FUNNELR_WEBHOOK_URL = "https://funnelr.test/hook";
  const fetchImpl = vi.fn(async () => new Response("ok", { status: 200 })) as unknown as typeof fetch;
  const record = await makeSharedRecord();
  const lead = buildLeadRecord(record, unlockInput, "slug1234");
  const res = await fireFunnelrWebhook(buildFunnelrPayload(lead, "https://x/r/slug1234"), { fetchImpl });
  assert.deepEqual(res, { ok: true, attempts: 1 });
  assert.equal((fetchImpl as unknown as { mock: { calls: unknown[] } }).mock.calls.length, 1);
});

// The failed-webhook path sits through the real retry backoff (1.5s + 4s),
// so this test carries its own timeout.
test("lead plumbing persists a complete lead, flags a failed webhook, and skips Email 1 when the flag is off", { timeout: 15000 }, async () => {
  process.env.FUNNELR_WEBHOOK_URL = "https://funnelr.test/hook";
  process.env.RESEND_API_KEY = "re_test";
  const sent: Array<{ url: string; body: Record<string, unknown> }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      if (u.includes("funnelr")) return new Response("down", { status: 500 });
      sent.push({ url: u, body: JSON.parse(String(init?.body)) });
      return new Response(JSON.stringify({ id: "email" }), { status: 200 });
    }),
  );

  const record = await makeSharedRecord();
  const lead = await runLeadPlumbing(record, unlockInput, "slug9999", "https://www.nexubis.io");

  // Lead record complete and queryable, webhook flagged failed.
  const storedLead = await readLead("slug9999");
  assert.ok(storedLead);
  assert.equal(storedLead.webhookStatus, "failed");
  assert.equal(storedLead.email, "Mark@Veltkamp-Dosing.nl");
  assert.equal(storedLead.loomStatus, "none");
  assert.equal(storedLead.routing.roleSeniority, "unknown"); // routing from record; role applied at promote in prod
  assert.equal((await listLeads()).length, 1);

  // Team email sent, carries the webhook warning; Email 1 skipped (flag off).
  assert.equal(sent.length, 1);
  const teamEmail = sent[0].body as { subject: string; text: string; to: string[] };
  assert.ok(teamEmail.subject.startsWith(`Scorecard lead: Veltkamp Dosing, ${lead.credibilityScore}/100`));
  assert.ok(teamEmail.text.includes("webhook FAILED"));
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
  await runLeadPlumbing(record, unlockInput, "slug7777", "https://www.nexubis.io");
  const email1 = sent.find((e) => (e.to as string[])[0] === "Mark@Veltkamp-Dosing.nl") as { subject: string; text: string };
  assert.ok(email1, "Email 1 should be sent when the flag is on");
  assert.equal(email1.subject, "Your Brand Credibility Scorecard is ready, Mark");
  assert.ok(email1.text.startsWith("Hi Mark,"));
  assert.ok(email1.text.includes("https://www.nexubis.io/scorecard/r/slug7777"));
  assert.ok(email1.text.includes("the first place to fix"));
  assert.ok(!/\baudit/i.test(email1.text)); // audit-ok
  assert.ok(!email1.text.includes(String.fromCharCode(0x2014)));
});

test("unlock idempotency: the dedupe marker returns the same slug and prevents a second fire", async () => {
  process.env.SCORECARD_MOCK = "1";
  const prospect = prospectFromRunInput({
    url: "veltkamp-dosing.nl",
    productOneLiner: "Precision dosing equipment for food production lines",
    competitors: ["dosatech.de", "flowserve-dosing.com"],
  });
  const result = await generateScorecardUncached(prospect);
  const runId = runIdFor(prospect);
  await storeRunRecord(runId, { prospectData: prospect, result, createdAt: new Date().toISOString() });

  const input = { ...unlockInput, runId };
  assert.equal(await readExistingUnlock(input), null);
  const first = await promoteRun(input);
  assert.ok(first.ok);
  if (first.ok) {
    await markUnlocked(input, first.slug);
    assert.equal(await readExistingUnlock(input), first.slug);
    // Same email in a different case still dedupes.
    assert.equal(await readExistingUnlock({ ...input, email: "mark@veltkamp-dosing.nl" }), first.slug);
    assert.ok(store.has(dedupeKey(input.email, runId)));
  }
});

test("lead updates preserve the slug and bump updatedAt", async () => {
  const record = await makeSharedRecord();
  const lead: LeadRecord = buildLeadRecord(record, unlockInput, "slugupd1");
  const { pushLead, updateLead } = await import("./leads");
  await pushLead(lead);
  const updated = await updateLead("slugupd1", { note: "call after interpack", loomStatus: "selected" });
  assert.ok(updated);
  assert.equal(updated.note, "call after interpack");
  assert.equal(updated.loomStatus, "selected");
  assert.equal(updated.reportSlug, "slugupd1");
});
