import { test, afterEach } from "vitest";
import assert from "node:assert/strict";
import {
  checkSerper,
  checkAnthropic,
  checkResend,
  problemsFrom,
  formatAlertEmail,
  alertStateKey,
  type DependencyCheck,
} from "./dependency-health";

// A fetch stub that returns a canned JSON response with a chosen status.
function stubFetch(status: number, body: unknown): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })) as unknown as typeof fetch;
}

afterEach(() => {
  delete process.env.SERPER_API_KEY;
  delete process.env.SERPER_LOW_BALANCE;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.RESEND_API_KEY;
});

test("Serper: healthy balance is ok, below threshold is low, and each carries the number", async () => {
  process.env.SERPER_API_KEY = "k";
  process.env.SERPER_LOW_BALANCE = "5000";

  const ok = await checkSerper({ fetchImpl: stubFetch(200, { balance: 49996 }) });
  assert.equal(ok.status, "ok");
  assert.equal(ok.balance, 49996);

  const low = await checkSerper({ fetchImpl: stubFetch(200, { balance: 1200 }) });
  assert.equal(low.status, "low");
  assert.equal(low.threshold, 5000);
  assert.ok(low.message.includes("1,200"));
});

test("Serper: a missing key or a bad response is an error, never a false ok", async () => {
  const noKey = await checkSerper({ fetchImpl: stubFetch(200, { balance: 1 }) });
  assert.equal(noKey.status, "error"); // SERPER_API_KEY unset

  process.env.SERPER_API_KEY = "k";
  const http = await checkSerper({ fetchImpl: stubFetch(402, {}) });
  assert.equal(http.status, "error");

  const noBalance = await checkSerper({ fetchImpl: stubFetch(200, { rateLimit: 50 }) });
  assert.equal(noBalance.status, "error");
});

test("Anthropic: a live key is ok, a rejected key is an error", async () => {
  process.env.ANTHROPIC_API_KEY = "k";
  assert.equal((await checkAnthropic({ fetchImpl: stubFetch(200, { data: [] }) })).status, "ok");
  assert.equal((await checkAnthropic({ fetchImpl: stubFetch(401, {}) })).status, "error");
});

test("Resend: full-access ok; 401/403 is a send-scoped key (ok, no false alarm); 5xx is an error", async () => {
  process.env.RESEND_API_KEY = "k";
  assert.equal((await checkResend({ fetchImpl: stubFetch(200, { data: [] }) })).status, "ok");
  // A sending-only key legitimately cannot read /domains; must NOT alert.
  assert.equal((await checkResend({ fetchImpl: stubFetch(401, {}) })).status, "ok");
  assert.equal((await checkResend({ fetchImpl: stubFetch(403, {}) })).status, "ok");
  // A real outage still surfaces.
  assert.equal((await checkResend({ fetchImpl: stubFetch(503, {}) })).status, "error");
});

test("problemsFrom keeps only low/error; formatAlertEmail leads with them and lists the healthy", () => {
  const checks: DependencyCheck[] = [
    { name: "Serper (web search)", status: "low", message: "only 1,200 credits left." },
    { name: "Anthropic (Claude)", status: "error", message: "key rejected (401)." },
    { name: "Resend (email)", status: "ok", message: "key valid." },
  ];
  const problems = problemsFrom(checks);
  assert.equal(problems.length, 2);

  const { subject, text } = formatAlertEmail(problems, checks.filter((c) => c.status === "ok"));
  assert.ok(subject.includes("1 running low"));
  assert.ok(subject.includes("1 failing"));
  assert.ok(text.includes("Serper (web search) — LOW"));
  assert.ok(text.includes("Anthropic (Claude) — ERROR"));
  assert.ok(text.includes("Resend (email) — key valid.")); // healthy footer
});

test("alertStateKey slugifies the dependency name for a stable cooldown key", () => {
  assert.equal(alertStateKey("Serper (web search)"), "monitor-alert:serper-web-search");
  assert.equal(alertStateKey("Anthropic (Claude)"), "monitor-alert:anthropic-claude");
});
