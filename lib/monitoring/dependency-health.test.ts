import { test, afterEach } from "vitest";
import assert from "node:assert/strict";
import {
  checkSerper,
  checkScreenshotOne,
  checkAnthropic,
  checkResend,
  checkUpstash,
  problemsFrom,
  formatAlertEmail,
  alertStateKey,
  sumCostCents,
  monthStartIso,
  type DependencyCheck,
} from "./dependency-health";

// A fetch stub that returns a canned JSON response with a chosen status.
function stubFetch(status: number, body: unknown): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })) as unknown as typeof fetch;
}

afterEach(() => {
  for (const k of [
    "SERPER_API_KEY", "SERPER_LOW_BALANCE", "SCREENSHOTONE_ACCESS_KEY", "SCREENSHOTONE_LOW_BALANCE",
    "ANTHROPIC_API_KEY", "ANTHROPIC_ADMIN_KEY", "ANTHROPIC_MONTHLY_BUDGET_USD",
    "RESEND_API_KEY", "KV_REST_API_URL", "KV_REST_API_TOKEN",
  ]) delete process.env[k];
});

test("Serper: healthy balance is ok, below threshold is low, and each carries the number", async () => {
  process.env.SERPER_API_KEY = "k";
  process.env.SERPER_LOW_BALANCE = "5000";
  const ok = await checkSerper({ fetchImpl: stubFetch(200, { balance: 49996 }) });
  assert.equal(ok.status, "ok");
  assert.equal(ok.balance, 49996);

  const low = await checkSerper({ fetchImpl: stubFetch(200, { balance: 1200 }) });
  assert.equal(low.status, "low");
  assert.ok(low.message.includes("1,200"));
});

test("ScreenshotOne: thresholds on `available`; low when short, error on missing key", async () => {
  const noKey = await checkScreenshotOne({ fetchImpl: stubFetch(200, { available: 1 }) });
  assert.equal(noKey.status, "error"); // key unset

  process.env.SCREENSHOTONE_ACCESS_KEY = "k";
  process.env.SCREENSHOTONE_LOW_BALANCE = "200";
  assert.equal((await checkScreenshotOne({ fetchImpl: stubFetch(200, { available: 1996 }) })).status, "ok");
  const low = await checkScreenshotOne({ fetchImpl: stubFetch(200, { available: 40 }) });
  assert.equal(low.status, "low");
  assert.equal(low.balance, 40);
});

test("sumCostCents adds every bucket result; monthStartIso is the UTC first-of-month", () => {
  const body = {
    data: [
      { results: [{ amount: "123.45" }, { amount: "76.55" }] },
      { results: [{ amount: "800" }] },
      { results: [] },
    ],
  };
  assert.equal(sumCostCents(body), 1000); // cents ($10.00)
  assert.equal(sumCostCents({}), 0);
  assert.equal(monthStartIso(new Date("2026-08-24T13:00:00Z")), "2026-08-01T00:00:00.000Z");
});

test("Anthropic: with an Admin key + budget, thresholds on month-to-date spend", async () => {
  process.env.ANTHROPIC_ADMIN_KEY = "sk-ant-admin01-x";
  process.env.ANTHROPIC_MONTHLY_BUDGET_USD = "100";
  // 500000 cents = $5000... use a small spend: 5000 cents = $50 of $100 -> ok
  const ok = await checkAnthropic({ fetchImpl: stubFetch(200, { data: [{ results: [{ amount: "5000" }] }] }) });
  assert.equal(ok.status, "ok");
  // 9000 cents = $90 of $100 -> within 15% -> low
  const low = await checkAnthropic({ fetchImpl: stubFetch(200, { data: [{ results: [{ amount: "9000" }] }] }) });
  assert.equal(low.status, "low");
  // A rejected admin key is an error
  const bad = await checkAnthropic({ fetchImpl: stubFetch(401, {}) });
  assert.equal(bad.status, "error");
});

test("Anthropic: without an Admin key it falls back to key validity", async () => {
  process.env.ANTHROPIC_API_KEY = "k";
  assert.equal((await checkAnthropic({ fetchImpl: stubFetch(200, { data: [] }) })).status, "ok");
  assert.equal((await checkAnthropic({ fetchImpl: stubFetch(401, {}) })).status, "error");
});

test("Upstash: reachable ping is ok; missing creds or a failed ping is an error", async () => {
  assert.equal((await checkUpstash({ fetchImpl: stubFetch(200, { result: "PONG" }) })).status, "error"); // creds unset
  process.env.KV_REST_API_URL = "https://x.upstash.io";
  process.env.KV_REST_API_TOKEN = "t";
  assert.equal((await checkUpstash({ fetchImpl: stubFetch(200, { result: "PONG" }) })).status, "ok");
  assert.equal((await checkUpstash({ fetchImpl: stubFetch(500, {}) })).status, "error");
});

test("Resend: full-access ok; 401/403 is a send-scoped key (ok, no false alarm); 5xx is an error", async () => {
  process.env.RESEND_API_KEY = "k";
  assert.equal((await checkResend({ fetchImpl: stubFetch(200, { data: [] }) })).status, "ok");
  assert.equal((await checkResend({ fetchImpl: stubFetch(401, {}) })).status, "ok");
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
  assert.equal(alertStateKey("ScreenshotOne (screenshots)"), "monitor-alert:screenshotone-screenshots");
});
