import { test, vi, afterEach } from "vitest";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { REPORT, EMAIL_1, LANDING, UNLOCK, VERDICT_LINES, SCAN_STAGES, SCAN_STEPS, SCAN_SUBLINE } from "./copy";
import { verifyTurnstile } from "./unlock";
import type { ScorecardResult } from "./result";

// The acceptance gate: cross-cutting house rules that individual module tests
// do not own. Schema round-trips, verdict guardrails, em-dash and banned-word
// scans, idempotency and the webhook signature live in their module suites;
// this file covers the report-level rules.

const here = dirname(fileURLToPath(import.meta.url));
const resultPath = join(here, "fixtures/scorecard-result.json");

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.TURNSTILE_SECRET_KEY;
});

// ── Oxipack is named exactly once per report, on the proof page ──────────────
test("Oxipack appears exactly once in the report's fixed copy, with the locked result line", () => {
  const allCopy = JSON.stringify({ REPORT, EMAIL_1, LANDING, UNLOCK, VERDICT_LINES, SCAN_STAGES });
  const mentions = allCopy.match(/oxipack/gi) ?? [];
  assert.equal(mentions.length, 1, "Oxipack must be named exactly once across all fixed client-facing copy");
  assert.ok(REPORT.proofBody.includes("Oxipack"));
  assert.ok(REPORT.proofBody.includes("35% more output"));
  assert.ok(REPORT.proofBody.includes("33% lower effective rate"));
  assert.ok(REPORT.proofBody.includes("re-quote"));
});

test("no client name leaks into generated copy (recorded real run)", { skip: !existsSync(resultPath) }, () => {
  const result = JSON.parse(readFileSync(resultPath, "utf8")) as ScorecardResult;
  const generated = [
    result.verdict.paragraph,
    ...result.deckCopy.categories.flatMap((c) => [...c.findings, c.competitorNote]),
    result.firstFix?.why ?? "",
    result.firstFix?.inPractice ?? "",
  ].join(" ");
  assert.ok(!/oxipack/i.test(generated), "the model must never name the client; the fixed proof page owns that");
  assert.ok(!/nexubis/i.test(generated), "the model must never sell or name the agency in findings");
});

// ── No selling before the fixed closing pages ────────────────────────────────
test("the CTA lives only in the fixed closing copy, never in findings", { skip: !existsSync(resultPath) }, () => {
  const result = JSON.parse(readFileSync(resultPath, "utf8")) as ScorecardResult;
  const findings = [
    result.verdict.paragraph,
    ...result.deckCopy.categories.flatMap((c) => [...c.findings, c.competitorNote]),
  ].join(" ");
  assert.ok(!/book (a|an|your) (call|application)/i.test(findings));
  assert.ok(REPORT.nextStepButton === "Book an application call");
});

// ── Turnstile fails closed when configured ───────────────────────────────────
test("Turnstile: no secret means open, a secret means fail-closed on missing/bad tokens", async () => {
  delete process.env.TURNSTILE_SECRET_KEY;
  assert.equal(await verifyTurnstile(undefined, null), true);

  process.env.TURNSTILE_SECRET_KEY = "ts-secret";
  assert.equal(await verifyTurnstile(undefined, null), false, "a missing token must fail closed");

  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: false }), { status: 200 })));
  assert.equal(await verifyTurnstile("bad-token", "1.2.3.4"), false);

  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 })));
  assert.equal(await verifyTurnstile("good-token", "1.2.3.4"), true);
});

// ── Honest failure copy: every user-facing failure explains itself plainly ───
test("failure copy is honest, jargon-free and rule-clean", () => {
  const failureLines = [
    "The check could not finish this time. Nothing is broken on your side; give it another try in a few minutes.",
    "You have run a check recently. Your previous result is still at its link; try again in a few days.",
    "This company has been checked a few times today already. Try again tomorrow.",
    "The Scorecard is busy right now. Give it an hour and try again.",
    "This check has expired. Run a fresh one; it takes under 2 minutes.",
    "Use your work email. Your Scorecard link lands there and stays live for 180 days.",
    "The bot check did not pass. Reload the page and try again.",
  ];
  const EM = String.fromCharCode(0x2014);
  for (const line of failureLines) {
    assert.ok(!line.includes(EM));
    assert.ok(!/\baudit/i.test(line)); // audit-ok
    assert.ok(!/error code|exception|500|timeout/i.test(line), `no jargon: ${line}`);
  }
});

// ── Scan narration obeys the loading-copy house rules ───────────────────────
test("scan narration is calm and rule-clean: no jokes, no exclamations, no em dashes, phone-safe", () => {
  const EM = String.fromCharCode(0x2014);
  const holding = Object.values(SCAN_SUBLINE.holding);
  const lines = [...SCAN_STEPS.map((s) => s.label), ...holding, SCAN_SUBLINE.detected("packaging machinery")];
  for (const line of lines) {
    assert.ok(!line.includes(EM), `em dash in "${line}"`);
    assert.ok(!line.includes("!"), `exclamation mark in "${line}"`);
    assert.ok(!/hang tight|almost there|dad joke|joke/i.test(line), `banned filler in "${line}"`);
    // No emoji or pictographs: the Nexubis loading voice is plain text.
    assert.ok(!/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(line), `emoji in "${line}"`);
  }
  // Short enough not to wrap on a narrow phone (the interpolated detected line
  // is exempt: its length depends on the site's own one-liner).
  for (const label of [...SCAN_STEPS.map((s) => s.label), ...holding]) {
    assert.ok(label.length <= 45, `line too long (${label.length}): "${label}"`);
  }
});

// ── The five-second-test finding matches the screenshot read (real run) ─────
test("the recorded run's website findings trace to recorded evidence", { skip: !existsSync(resultPath) }, () => {
  const result = JSON.parse(readFileSync(resultPath, "utf8")) as ScorecardResult;
  const prospect = result.scores.find((s) => s.isProspect)!;
  const website = prospect.categories.find((c) => c.key === "website")!;
  const fiveSecond = website.checks.find((c) => c.key === "five-second-test")!;
  // The evidence sentence exists and refers to what is seen, not invented.
  assert.ok(fiveSecond.evidence.length > 10);
  // The deterministic PageSpeed check carries measured numbers.
  const ps = website.checks.find((c) => c.key === "pagespeed")!;
  if (ps.assessable) assert.match(ps.evidence, /Measured PageSpeed: .*mobile \d+/);
});

// ── House-rule sweep over every recorded real run ────────────────────────────
import { readdirSync } from "node:fs";

test("every recorded real run obeys the house rules in all client-facing text", () => {
  const dir = join(here, "fixtures/real-runs");
  if (!existsSync(dir)) return;
  const EM = String.fromCharCode(0x2014);
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const result = JSON.parse(readFileSync(join(dir, file), "utf8")) as ScorecardResult;
    const texts = [
      result.verdict.paragraph,
      ...result.deckCopy.categories.flatMap((c) => [...c.findings, c.competitorNote]),
      result.firstFix?.why ?? "",
      result.firstFix?.inPractice ?? "",
      ...result.scores.flatMap((s) => s.categories.flatMap((c) => c.checks.map((ch) => ch.evidence))),
    ];
    for (const t of texts) {
      assert.ok(!t.includes(EM), `${file}: em dash in "${t}"`);
      assert.ok(!/\baudit(s|ed|ing)?\b/i.test(t), `${file}: banned word in "${t}"`); // audit-ok
      assert.ok(!/oxipack/i.test(t), `${file}: client named in generated copy "${t}"`);
    }
    // Oxipack-once holds at report level: fixed proof copy only.
    const wholeReport = JSON.stringify(result) + REPORT.proofBody;
    const mentions = wholeReport.match(/oxipack/gi) ?? [];
    assert.equal(mentions.length, 1, `${file}: Oxipack must appear exactly once per rendered report`);
  }
});
