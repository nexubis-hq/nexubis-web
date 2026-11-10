import { expect, test } from "vitest";
import type { SequenceStatus } from "@/lib/sequences/client";
import { canStart, canStop, sequenceHeadline } from "./sequence-view";

const base: SequenceStatus = { found: true, email: "a@x.com", suppressed: false, enrolments: [], sends: [] };
const sales = {
  sequence: "Audit Sales", sequenceKey: "audit_sales", group: "sales", status: "active", origin: "live",
  step: 2, totalSteps: 6, nextDueAt: null, startedAt: "2026-11-06T08:00:00Z",
};

test("reads the running state", () => {
  expect(sequenceHeadline({ ...base, enrolments: [sales] })).toBe("Running: Audit Sales, 2 of 6 sent");
  expect(canStart({ ...base, enrolments: [sales] })).toBe(false);
  expect(canStop({ ...base, enrolments: [sales] })).toBe(true);
});

test("a stopped lead cannot be started again", () => {
  const stopped = { ...base, stopReason: "booked", enrolments: [{ ...sales, status: "stopped" }] };
  expect(sequenceHeadline(stopped)).toBe("Stopped: booked a call");
  expect(canStart(stopped)).toBe(false);
  expect(canStop(stopped)).toBe(false);
});

test("a blocked address and an unknown lead", () => {
  expect(sequenceHeadline({ ...base, suppressed: true })).toBe("Blocked: never emailed");
  expect(canStart({ ...base, suppressed: true })).toBe(false);
  expect(sequenceHeadline({ ...base, found: false })).toBe("Not in a sequence");
  expect(canStart({ ...base, found: false })).toBe(true);
  expect(sequenceHeadline(null)).toBe("Sequence app not reachable");
});

test("next step tells Laine what the automated emails are doing", async () => {
  const { sequenceNextStep } = await import("./sequence-view");
  expect(sequenceNextStep(null)).toContain("can't be reached");
  expect(sequenceNextStep({ ...base, suppressed: true })).toContain("Don't email them");
  expect(sequenceNextStep({ ...base, stopReason: "replied" })).toContain("They replied");
  expect(sequenceNextStep({ ...base, stopReason: "admin" })).toContain("stopped by hand");
  expect(sequenceNextStep({ ...base, found: false })).toContain("Start the sequence below");
  expect(sequenceNextStep({ ...base, enrolments: [{ ...sales, nextDueAt: "2026-11-13T12:33:00Z" }] })).toBe(
    "Automated emails running, next one on Fri 13 Nov. Waiting for a reply or a booking.",
  );
  expect(sequenceNextStep({ ...base, enrolments: [{ ...sales, status: "running_in_funnelr" }] })).toContain("Funnelr");
  expect(sequenceNextStep({ ...base, enrolments: [{ ...sales, status: "done", step: 6 }] })).toContain("All automated emails sent");
});
