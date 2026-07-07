// The public run endpoint: step 1 of the Credibility Check. Validates and
// normalises the input, applies the abuse rails, generates (or replays) the
// Scorecard, stores the short-lived run record the teaser and unlock read,
// and streams stage events so the scan animation reflects real progress.
//
// Response: text/event-stream of JSON lines:
//   {"type":"stage","stage":"reading"|"impressions"|"competitors"|"scoring"}
//   {"type":"done","runId":"...","teaser":{...redacted result...}}
//   {"type":"error","error":"...","reason":"invalid|limited|failed"}
import { NextRequest } from "next/server";
import { prospectFromRunInput, runInputIsValid, runIdFor, storeRunRecord, type RunInput } from "@/lib/scorecard/run";
import { generateScorecard } from "@/lib/scorecard/generate";
import type { ScanStage } from "@/lib/scorecard/orchestrator";
import { redactForTeaser } from "@/lib/scorecard/result";
import { checkGeneration, bumpCounters, limitsConfigFromEnv, targetHash, type LimitsKv } from "@/lib/scorecard/limits";
import { getKv } from "@/lib/scorecard/kv";

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

function parseRunInput(body: unknown): RunInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const url = cleanText(b.url, CAPS.url);
  const productOneLiner = cleanText(b.productOneLiner, CAPS.oneLiner);
  const rawCompetitors = Array.isArray(b.competitors) ? b.competitors : null;
  if (!url || !productOneLiner || !rawCompetitors) return null;
  const competitors: string[] = [];
  for (const c of rawCompetitors.slice(0, 4)) {
    const cleaned = cleanText(c, CAPS.competitor);
    if (cleaned) competitors.push(cleaned);
  }
  const input: RunInput = { url, productOneLiner, competitors };
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

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      const fail = (error: string, reason: string) => {
        send({ type: "error", error, reason });
        controller.close();
      };
      try {
        if (!input) {
          fail("Check the form: a website, a one-line product description and 2 or 3 competitors are required.", "invalid");
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
            fail(LIMIT_MESSAGES[decision.reason] ?? LIMIT_MESSAGES.global, "limited");
            return;
          }
          await bumpCounters(target, limitsKv(), cfg);
        } catch (err) {
          console.error("[scorecard-run] limits unavailable, failing open:", err instanceof Error ? err.message : err);
        }

        // Generate (or replay). Stage events stream as the pipeline reaches
        // each real phase boundary.
        const { result } = await generateScorecard(prospect, {
          onStage: (stage: ScanStage) => send({ type: "stage", stage }),
        });

        // The run record is what the unlock gate promotes. Short-lived.
        const runId = runIdFor(prospect);
        await storeRunRecord(runId, { prospectData: prospect, result, createdAt: new Date().toISOString() });

        send({ type: "done", runId, teaser: redactForTeaser(result) });
        controller.close();
      } catch (err) {
        console.error("[scorecard-run] failed:", err instanceof Error ? err.message : err);
        fail("The check could not finish this time. Nothing is broken on your side; give it another try in a few minutes.", "failed");
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
