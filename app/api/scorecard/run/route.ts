// The public run endpoint: step 1 of the Credibility Check. Validates and
// normalises the input, applies the abuse rails, generates (or replays) the
// Scorecard, stores the short-lived run record the teaser and unlock read,
// and streams stage events so the scan animation reflects real progress.
//
// Response: text/event-stream of JSON lines:
//   {"type":"stage","stage":"reading"|"impressions"|"competitors"|"scoring"}
//   {"type":"detected","oneLiner":"..."}   (what the site says they make)
//   {"type":"done","runId":"...","teaser":{...redacted result...}}
//   {"type":"error","error":"...","reason":"invalid|limited|out-of-scope|failed"}
import { NextRequest } from "next/server";
import { prospectFromRunInput, runInputIsValid, runIdFor, storeRunRecord, type RunInput } from "@/lib/scorecard/run";
import { detectProspectContext, applyDetection } from "@/lib/scorecard/detect";
import { generateScorecard } from "@/lib/scorecard/generate";
import type { ScanStage } from "@/lib/scorecard/orchestrator";
import { redactForTeaser } from "@/lib/scorecard/result";
import { checkGeneration, bumpCounters, limitsConfigFromEnv, targetHash, type LimitsKv } from "@/lib/scorecard/limits";
import { getKv } from "@/lib/scorecard/kv";
import { recordScanOutcome, scanTargetHost, type ScanOutcome } from "@/lib/scorecard/diagnostics";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Input screening: hard length caps and control-character stripping, so junk
// and prompt-injection padding never reach the pipeline. Rejects rather than
// truncates: a truncated competitor name would be scored dishonestly.
const CAPS = { url: 200, oneLiner: 160, competitor: 120 };
function cleanText(v: unknown, cap: number): string | null {
  if (typeof v !== "string") return null;
  // eslint-disable-next-line no-control-regex
  const cleaned = v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length === 0 || cleaned.length > cap) return null;
  return cleaned;
}

// Website-only entry: the form sends just a URL. The product one-liner and
// competitors are detected from the site (see detect.ts), so nothing else is
// read off the request. cleanText still runs so a hostile URL cannot smuggle
// control characters into the pipeline.
function parseRunInput(body: unknown): RunInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const url = cleanText(b.url, CAPS.url);
  if (!url) return null;
  const input: RunInput = { url, productOneLiner: "", competitors: [] };
  return runInputIsValid(input) ? input : null;
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
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
  ip: "You have run a check recently. Your previous result is still at its link; try again in a few days.",
  target: "This company has been checked a few times today already. Try again tomorrow.",
  global: "The Scorecard is busy right now. Give it an hour and try again.",
};

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const body = await req.json().catch(() => null);
  const input = parseRunInput(body);

  // Diagnosis-only telemetry (never a Meta event): outcome + duration per run,
  // so an abandoned wait is distinguishable from a broken scan. Logged once, on
  // whichever terminal state the run reaches.
  const startedAt = Date.now();
  const targetHostForLog = scanTargetHost(input?.url);
  // We no longer BLOCK on audience fit (a wrong reject costs a paid click), but
  // we still record what the classifier thought, purely as insight in the admin
  // Scans view. Populated once detection has run.
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
      // Heartbeat. The scan has long silent stretches: screenshots + PageSpeed,
      // then rubric scoring, can each run ~50s with no stage event between them.
      // An SSE comment line every 10s keeps the connection warm so a browser,
      // proxy or VPN idle timeout never drops it mid-scan (which surfaced to the
      // user as "the check could not finish"). Comment lines start with ":", so
      // the client's data:-only parser ignores them.
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
        if (!input) {
          await fail("That website address does not look right. A plain domain like example.com works.", "invalid");
          return;
        }
        const prospect = prospectFromRunInput(input);

        // Abuse rails. KV failures fall open (a broken store must not take the
        // tool down), but are logged.
        const ip = clientIp(req);
        const target = targetHash(prospect);
        const cfg = limitsConfigFromEnv(Date.now());
        try {
          const decision = await checkGeneration(ip, target, limitsKv(), cfg);
          if (!decision.allow) {
            await fail(LIMIT_MESSAGES[decision.reason] ?? LIMIT_MESSAGES.global, "limited");
            return;
          }
          await bumpCounters(target, limitsKv(), cfg);
        } catch (err) {
          console.error("[scorecard-run] limits unavailable, failing open:", err instanceof Error ? err.message : err);
        }

        // Auto-detect: read the prospect's own site and infer what they make
        // and who they cross-shop against, so the form only ever asked for a
        // URL. Deterministic and cached per site (see detect.ts). Emit the
        // "reading" stage up front so the scan animation reflects it.
        send({ type: "stage", stage: "reading" });
        const detection = await detectProspectContext(prospect);
        detectedFit = detection.industryFit;

        // No audience gate: we never turn a submitted link away, because a
        // misclassified manufacturer is a lost paid click. Off-topic sites are
        // held back only by the abuse rails above (per-IP, per-target, global).
        // The detected fit is recorded (not enforced) for visibility.

        const enriched = applyDetection(prospect, detection);
        // The first personal beat of the scan: tell them what their site says
        // they make, the moment we know it.
        if (detection.productOneLiner) send({ type: "detected", oneLiner: detection.productOneLiner });

        // Generate (or replay). Stage events stream as the pipeline reaches
        // each real phase boundary.
        const { result } = await generateScorecard(enriched, {
          onStage: (stage: ScanStage) => send({ type: "stage", stage }),
        });

        // The run record is what the unlock gate promotes. Short-lived. Keyed
        // on the prospect URL so the id is stable per site; the enriched
        // prospect (with detected one-liner and competitors) is what we store.
        const runId = runIdFor(prospect);
        await storeRunRecord(runId, { prospectData: enriched, result, createdAt: new Date().toISOString() });

        send({ type: "done", runId, teaser: redactForTeaser(result) });
        controller.close();
        await logOutcome("success");
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
