import { test } from "vitest";
import assert from "node:assert/strict";
import {
  isNurtureDateEligible,
  runNurtureHandoff,
  DEFAULT_NURTURE_AFTER_DAYS,
  type NurtureLead,
} from "./nurture-scheduler";
import { NEXUBIS_TAGS } from "./nexubis-tags";

const NOW = new Date("2026-07-23T12:00:00Z");
const SALES = NEXUBIS_TAGS.historyScorecardSalesStarted;
const NURTURE_TRIGGER = NEXUBIS_TAGS.triggerStartNurture;

function lead(overrides: Partial<NurtureLead> = {}): NurtureLead {
  return { email: "mark@example.com", createdAt: "2026-07-03T12:00:00Z", reportSlug: "slug1", ...overrides };
}

interface Contact {
  userId: number;
  isUnsubscribed?: boolean;
  tags: string[];
}

async function run(opts: {
  leads: NurtureLead[];
  contacts: Record<string, Contact | null>;
  now?: Date;
  config?: { afterDays: number; from: Date | null };
  handedOff?: string[];
  dryRun?: boolean;
}) {
  const handoffSet = new Set<string>(opts.handedOff ?? []);
  const applied: Array<{ userId: number; tagId: string }> = [];
  const client = {
    async findContactByEmail(email: string) {
      const c = opts.contacts[email.toLowerCase()];
      return c ? { userId: c.userId, isUnsubscribed: c.isUnsubscribed } : null;
    },
    async getContactTags(userId: number) {
      const c = Object.values(opts.contacts).find((x) => x && x.userId === userId);
      return (c?.tags ?? []).map((name) => ({ tagId: "id-" + name, name }));
    },
    async findTagByName(name: string) {
      return { tagId: "id-" + name };
    },
    async addTagToContact(userId: number, tagId: string) {
      applied.push({ userId, tagId });
    },
  };
  const result = await runNurtureHandoff({
    client,
    listLeads: async () => opts.leads,
    now: opts.now ?? NOW,
    config: opts.config ?? { afterDays: DEFAULT_NURTURE_AFTER_DAYS, from: null },
    alreadyHandedOff: async (l) => handoffSet.has(l.email),
    markHandedOff: async (l) => {
      handoffSet.add(l.email);
    },
    dryRun: opts.dryRun ?? false,
  });
  return { result, applied, handoffSet };
}

test("date eligibility: past the sales window, after the floor, valid date", () => {
  const cfg = { afterDays: 14, from: null };
  assert.equal(isNurtureDateEligible(lead(), NOW, cfg), true); // 20 days old
  assert.equal(isNurtureDateEligible(lead({ createdAt: "2026-07-18T12:00:00Z" }), NOW, cfg), false); // 5 days
  assert.equal(isNurtureDateEligible(lead(), NOW, { afterDays: 14, from: new Date("2026-07-10T00:00:00Z") }), false); // before floor
  assert.equal(isNurtureDateEligible(lead({ createdAt: "not-a-date" }), NOW, cfg), false);
});

test("happy path: eligible sales lead gets the nurture Trigger and is memoed", async () => {
  const { result, applied, handoffSet } = await run({
    leads: [lead()],
    contacts: { "mark@example.com": { userId: 7, tags: [SALES] } },
  });
  assert.equal(result.handedOff, 1);
  assert.deepEqual(applied, [{ userId: 7, tagId: "id-" + NURTURE_TRIGGER }]);
  assert.equal(handoffSet.has("mark@example.com"), true);
});

test("booked contacts are excluded", async () => {
  const { result, applied } = await run({
    leads: [lead()],
    contacts: { "mark@example.com": { userId: 7, tags: [SALES, NEXUBIS_TAGS.pipelineCallBooked] } },
  });
  assert.equal(result.handedOff, 0);
  assert.equal(result.skipped.booked, 1);
  assert.equal(applied.length, 0);
});

test("replied contacts are excluded", async () => {
  const { result } = await run({
    leads: [lead()],
    contacts: { "mark@example.com": { userId: 7, tags: [SALES, NEXUBIS_TAGS.pipelineReplied] } },
  });
  assert.equal(result.skipped.replied, 1);
  assert.equal(result.handedOff, 0);
});

test("contacts already in nurture are excluded", async () => {
  const { result } = await run({
    leads: [lead()],
    contacts: { "mark@example.com": { userId: 7, tags: [SALES, NEXUBIS_TAGS.historyNurtureStarted] } },
  });
  assert.equal(result.skipped["already-nurture"], 1);
  assert.equal(result.handedOff, 0);
});

test("contacts not in sales are excluded", async () => {
  const { result } = await run({
    leads: [lead()],
    contacts: { "mark@example.com": { userId: 7, tags: [] } },
  });
  assert.equal(result.skipped["not-in-sales"], 1);
  assert.equal(result.handedOff, 0);
});

test("unsubscribed contacts are excluded", async () => {
  const { result } = await run({
    leads: [lead()],
    contacts: { "mark@example.com": { userId: 7, isUnsubscribed: true, tags: [SALES] } },
  });
  assert.equal(result.skipped.unsubscribed, 1);
  assert.equal(result.handedOff, 0);
});

test("contacts missing from Funnelr are skipped", async () => {
  const { result } = await run({ leads: [lead()], contacts: { "mark@example.com": null } });
  assert.equal(result.skipped["not-in-funnelr"], 1);
  assert.equal(result.handedOff, 0);
});

test("a pending nurture Trigger is not re-applied but is memoed", async () => {
  const { result, applied, handoffSet } = await run({
    leads: [lead()],
    contacts: { "mark@example.com": { userId: 7, tags: [SALES, NURTURE_TRIGGER] } },
  });
  assert.equal(result.skipped["trigger-pending"], 1);
  assert.equal(applied.length, 0);
  assert.equal(handoffSet.has("mark@example.com"), true);
});

test("already-handed-off leads are skipped without touching Funnelr", async () => {
  const { result, applied } = await run({
    leads: [lead()],
    contacts: { "mark@example.com": { userId: 7, tags: [SALES] } },
    handedOff: ["mark@example.com"],
  });
  assert.equal(result.skipped["already-handed-off"], 1);
  assert.equal(applied.length, 0);
});

test("dry run reports eligibility but applies no tag", async () => {
  const { result, applied, handoffSet } = await run({
    leads: [lead()],
    contacts: { "mark@example.com": { userId: 7, tags: [SALES] } },
    dryRun: true,
  });
  assert.equal(result.handedOff, 1);
  assert.equal(result.dryRun, true);
  assert.equal(applied.length, 0);
  assert.equal(handoffSet.has("mark@example.com"), false);
});

test("leads still inside the sales window are never scanned as eligible", async () => {
  const { result, applied } = await run({
    leads: [lead({ createdAt: "2026-07-20T12:00:00Z" })], // 3 days old
    contacts: { "mark@example.com": { userId: 7, tags: [SALES] } },
  });
  assert.equal(result.scanned, 1);
  assert.equal(result.dateEligible, 0);
  assert.equal(applied.length, 0);
});
