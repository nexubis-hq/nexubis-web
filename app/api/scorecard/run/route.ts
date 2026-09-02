// The public run endpoint: the whole Credibility Check in one request.
// Validates the URL + email, applies the abuse rails and bot checks,
// generates (or replays) the audit, promotes it STRAIGHT to its permanent
// shared report (there is no unlock gate), runs the lead plumbing, and
// streams stage events so the scan animation reflects real progress.
//
// Response: text/event-stream of JSON lines:
//   {"type":"stage","stage":"reading"|"speed"|"competitors"|"scoring"|"writing"}
//   {"type":"detected","oneLiner":"..."}   (what the site says they make)
//   {"type":"done","reportUrl":"/audit/r/...","slug":"..."}
//   {"type":"error","error":"...","reason":"invalid|limited|failed"}
import { NextRequest } from "next/server";
import { prospectFromRunInput, runInputIsValid, runIdFor, type RunInput } from "@/lib/scorecard/run";
import { detectProspectContext, applyDetection } from "@/lib/scorecard/detect";
import { generateScorecard } from "@/lib/scorecard/generate";
import type { ScanStage } from "@/lib/scorecard/orchestrator";
import {
  validateCaptureInput,
  verifyEmailMx,
  verifyTurnstile,
  promoteResult,
  readExistingCapture,
  markCaptured,
  runLeadPlumbing,
  type LeadCaptureInput,
} from "@/lib/scorecard/unlock";
import { validateUrl } from "@/lib/scorecard/fetch-site";
import { prospectScores } from "@/lib/scorecard/result";
import { notifyFailedScan, notifyBreakerTripped } from "@/lib/scorecard/notify";
import {
  checkGeneration,
  bumpCounters,
  markIpGenerated,
  ipLastKey,
  shouldNotifyBreaker,
  limitsConfigFromEnv,
  targetHash,
  type LimitsKv,
} from "@/lib/scorecard/limits";
import { getKv } from "@/lib/scorecard/kv";
import { recordScanOutcome, scanTargetHost, type ScanOutcome } from "@/lib/scorecard/diagnostics";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Input screening: hard length caps and control-character stripping, so junk
// and prompt-injection padding never reach the pipeline.
const CAPS = { url: 200, firstName: 80, email: 256 };
function cleanText(v: unknown, cap: number): string | null {
  if (typeof v !== "string") return null;
  const cleaned = v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length === 0 || cleaned.length > cap) return null;
  return cleaned;
}

// The form sends the URL plus the email (captured up front; the report is
// emailed there and the sequence starts from it). Product one-liner and
// competitors are detected from the site.
interface ParsedRun {
  input: RunInput;
  capture: LeadCaptureInput;
}
function parseRunInput(body: unknown): ParsedRun | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const url = cleanText(b.url, CAPS.url);
  if (!url) return null;
  const input: RunInput = { url, productOneLiner: "", competitors: [] };
  if (!runInputIsValid(input)) return null;
  const capture: LeadCaptureInput = {
    firstName: cleanText(b.firstName, CAPS.firstName) ?? "",
    email: cleanText(b.email, CAPS.email) ?? "",
    honeypot: typeof b.honeypot === "string" ? b.honeypot : "",
    turnstileToken: typeof b.turnstileToken === "string" ? b.turnstileToken : undefined,
    elapsedMs: typeof b.elapsedMs === "number" ? b.elapsedMs : undefined,
  };
  return { input, capture };
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}

function originOf(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "https://www.nexubis.io";
}

// Thin adapter: the limits module is pure over this interface.
function limitsKv(): LimitsKv {
  const kv = getKv();
  return {
    get: (k) => kv.get(k),
    incr: (k) => kv.incr(k),
    expire: async (k, ttl) => {
      await kv.expire(k, ttl);
    },
    set: async (k, v, ttl) => {
      await kv.set(k, v, { ex: ttl });
    },
  };
}

const LIMIT_MESSAGES: Record<string, string> = {
  ip: "You have run a check recently. Here is your previous report; try a fresh one again in a few days.",
  target: "This company has been checked a few times today already. Try again tomorrow.",
  global: "The audit is at capacity right now. Give it an hour and try again.",
};

// The whole generation races this deadline. Nested budgets: each external
// call caps at 8-110s, this ceiling bounds the sum, and Vercel's maxDuration
// (300s) backstops the route itself. Losing the race is a failed scan: the
// visitor gets the friendly failure message and the team gets the lead.
const GENERATION_DEADLINE_MS = 240_000;
class DeadlineError extends Error {}
function withDeadline<T>(work: Promise<T>): Promise<T> {
  return Promise.race([
    work,
    new Promise<never>((_, reject) => setTimeout(() => reject(new DeadlineError("generation-deadline")), GENERATION_DEADLINE_MS)),
  ]);
}

// A scan failed after a valid email capture: apologise honestly, promise the
// manual follow-up we are actually going to do (the team was just emailed),
// and never lose the lead.
const FAILED_SCAN_MESSAGE =
  "The check could not finish this time. Nothing is broken on your side: we have your address, we will run your audit ourselves and email you the report.";

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const body = await req.json().catch(() => null);
  const parsed = parseRunInput(body);

  // Diagnosis-only telemetry (never a Meta event): outcome + duration per run,
  // so an abandoned wait is distinguishable from a broken scan.
  const startedAt = Date.now();
  const targetHostForLog = scanTargetHost(parsed?.input.url);
  let detectedFit: string | null = null;
  let outcomeLogged = false;
  const logOutcome = async (outcome: ScanOutcome) => {
    if (outcomeLogged) return;
    outcomeLogged = true;
    await recordScanOutcome({ outcome, ms: Date.now() - startedAt, host: targetHostForLog, fit: detectedFit, at: new Date().toISOString() });
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      // Heartbeat: the scan has long silent stretches; an SSE comment line
      // every 10s keeps the connection warm through proxy idle timeouts.
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keep-alive\n\n`));
        } catch {
          // controller already closed; nothing to keep alive.
        }
      }, 10_000);
      const fail = async (error: string, reason: ScanOutcome) => {
        send({ type: "error", error, reason });
        controller.close();
        await logOutcome(reason);
      };
      try {
        if (!parsed) {
          await fail("That website address does not look right. A plain domain like example.com works.", "invalid");
          return;
        }
        const { input, capture } = parsed;

        // Email + URL + bot checks first, cheapest first: nothing generates
        // (and nothing costs) until the capture passes.
        const validation = validateCaptureInput(capture);
        if (!validation.ok) {
          await fail(validation.error, "invalid");
          return;
        }
        // Full URL validation (scheme, parseability, SSRF blocklist) with the
        // specific plain-English reason, BEFORE any spend. fetchSite would
        // catch these later, but later means a wasted scan and a vague error.
        const urlCheck = validateUrl(input.url ?? "");
        if (!urlCheck.ok) {
          await fail(urlCheck.reason, "invalid");
          return;
        }
        const ip = clientIp(req);
        const human = await verifyTurnstile(capture.turnstileToken, ip);
        if (!human) {
          await fail("The bot check did not pass. Reload the page and try again.", "invalid");
          return;
        }
        // MX lookup: catches typo domains before a scan is spent on them.
        // Fails open on anything transient; only a definitive "this domain
        // cannot receive mail" rejects.
        const mx = await verifyEmailMx(capture.email);
        if (!mx.ok) {
          await fail(mx.error ?? "That email address does not look right.", "invalid");
          return;
        }

        const prospect = prospectFromRunInput(input);
        const runId = runIdFor(prospect);
        const email = capture.email.trim();
        const firstName = capture.firstName.trim();

        // Idempotency: the same email re-running the same site gets its
        // existing report back instantly and fires nothing twice.
        const existing = await readExistingCapture(email, runId);
        if (existing) {
          send({ type: "done", reportUrl: `/audit/r/${existing}`, slug: existing });
          controller.close();
          await logOutcome("success");
          return;
        }

        // Abuse rails. KV failures fall open (a broken store must not take the
        // tool down), but are logged.
        const target = targetHash(prospect);
        const cfg = limitsConfigFromEnv(Date.now());
        try {
          const decision = await checkGeneration(ip, target, limitsKv(), cfg);
          if (!decision.allow) {
            if (decision.reason === "global" && (await shouldNotifyBreaker(limitsKv(), cfg))) {
              await notifyBreakerTripped(cfg.globalHourlyCap).catch(() => {});
            }
            // The IP bounce carries the visitor's previous report link, so
            // the dead end becomes a way back to their result.
            let previousUrl: string | null = null;
            if (decision.reason === "ip") {
              try {
                const last = await getKv().get<string>(ipLastKey(ip));
                if (last) previousUrl = `/audit/r/${last}`;
              } catch {
                // best-effort; the message still works without the link
              }
            }
            send({
              type: "error",
              error: LIMIT_MESSAGES[decision.reason] ?? LIMIT_MESSAGES.global,
              reason: "limited",
              ...(previousUrl ? { reportUrl: previousUrl } : {}),
            });
            controller.close();
            await logOutcome("limited");
            return;
          }
          await bumpCounters(target, limitsKv(), cfg);
        } catch (err) {
          console.error("[scorecard-run] limits unavailable, failing open:", err instanceof Error ? err.message : err);
        }

        // The generation itself races a hard deadline; a valid email is in
        // hand from here on, so every failure below becomes a captured lead,
        // never a lost one.
        try {
          const outcome = await withDeadline(
            (async () => {
              // Auto-detect: read the prospect's own site and infer what they
              // make and who they cross-shop against. Cached per site.
              send({ type: "stage", stage: "reading" });
              const detection = await detectProspectContext(prospect);
              detectedFit = detection.industryFit;
              const enriched = applyDetection(prospect, detection);
              if (detection.productOneLiner) send({ type: "detected", oneLiner: detection.productOneLiner });

              // Generate (or replay). Stage events stream as the pipeline
              // reaches each real phase boundary.
              const { result } = await generateScorecard(enriched, {
                onStage: (stage: ScanStage) => send({ type: "stage", stage }),
              });

              // Readiness gate: a report scored on fewer than 3 of the 5
              // pillars is too degraded to ship as "your audit". (A fully
              // unscorable prospect already threw inside generation.)
              const scoredPillars = prospectScores(result)?.categories.filter((c) => c.total !== null).length ?? 0;
              if (scoredPillars < 3) {
                throw new Error(`report-not-ready: only ${scoredPillars} of 5 pillars scored`);
              }

              // No gate: straight to the permanent slug; the lead plumbing
              // runs before "done" so a frozen instance can never swallow it.
              // Funnelr capture stays browser-fired.
              const promoted = await promoteResult(enriched, result, email, firstName);
              await markCaptured(email, runId, promoted.slug);
              try {
                await runLeadPlumbing(promoted.record, email, promoted.slug, originOf(req), firstName);
              } catch (plumbErr) {
                console.error("[scorecard-run] lead plumbing failed:", plumbErr instanceof Error ? plumbErr.message : plumbErr);
              }
              return promoted;
            })(),
          );

          // Success: burn the visitor's IP allowance (never on failure) and
          // remember their report for the rate-limit bounce screen.
          try {
            await markIpGenerated(ip, outcome.slug, limitsKv(), cfg);
            await getKv().set(ipLastKey(ip), outcome.slug, { ex: cfg.windowDays * 86_400 });
          } catch {
            // best-effort
          }

          send({ type: "done", reportUrl: outcome.reportUrl, slug: outcome.slug });
          controller.close();
          await logOutcome("success");
        } catch (err) {
          // Failed or timed out AFTER a valid email capture: the lead goes to
          // the team for a manual run, and the visitor hears exactly that.
          const detail = err instanceof DeadlineError ? "generation exceeded the deadline" : err instanceof Error ? err.message : String(err);
          console.error("[scorecard-run] failed after capture:", detail);
          await notifyFailedScan(email, prospect.url, detail).catch(() => {});
          await fail(FAILED_SCAN_MESSAGE, err instanceof DeadlineError ? "timeout" : "failed");
        }
      } catch (err) {
        console.error("[scorecard-run] failed:", err instanceof Error ? err.message : err);
        await fail("The check could not finish this time. Nothing is broken on your side; give it another try in a few minutes.", "failed");
      } finally {
        clearInterval(heartbeat);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
