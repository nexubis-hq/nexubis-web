// The single home for Claude calls in the Scorecard engine. Ports the
// snapshot's proven wrapper: per-call timeout, one schema-aware repair retry,
// structured outputs, cost accounting, envelope-scoped cost cache, em-dash
// stripping at the boundary. The call surface is rebuilt for the Part 2B
// pipeline: a vision read per company here (Prompt 2), the rubric scorer and
// copy pass in scoring (Prompt 3).
import Anthropic from "@anthropic-ai/sdk";
import { MODEL_SONNET, PRICE_PER_MTOK, MODEL_HAIKU, isMockMode } from "./env";
import { stripEmDashesDeep } from "./content-safety";
import { getKv } from "./kv";
import { currentEnvelope } from "./call-cache";
import { searchCacheKey, SCORECARD_RECORD_TTL_S } from "./determinism";
import { SEARCH_QUERY_COST_USD } from "./web-search";
import { FIRST_IMPRESSION_OUTPUT, firstImpressionSchema } from "./output-schemas";
import { mockInt } from "./mock";

// Copy-diet rule, applied to every model-written line. The reader is a
// marketing manager or CEO at an industrial manufacturer: plain, calm,
// specific, low cognitive load.
export const COPY_DIET =
  "COPY RULES: Write every line in active voice as a fact about the company, never as narration of the pipeline or its data sources. Banned phrases (and any close variant): \"was confirmed\", \"could not be read\", \"could be read\", \"no readable\", \"readable content\", \"no source\", \"appeared in search results\", \"we found\", \"the crawl\", \"crawled\", \"in the evidence\", \"the evidence shows\". When something is absent, say it plainly about what a BUYER sees, for example \"Buyers researching you cannot find a single brochure\", not \"No source shows brochures\". Short sentences. No filler. Stay strictly within each stated budget.";

// Anti-false-negative rule. The crawl is a PARTIAL sample; JS-rendered
// content, gated downloads and inner pages can be invisible to it. A single
// wrong "you don't have X" discredits the whole Scorecard.
export const NO_FALSE_NEGATIVE =
  "ANTI-FALSE-NEGATIVE RULE: What you were given is a PARTIAL sample of the company's online presence, not the whole thing. NEVER state something is absent everywhere or make an absolute negative from what you were shown alone. If you did not see it, treat it as not confirmed: mark the check as not assessable rather than scoring it zero, and say why in one sentence. Anything in the VERIFIED BY WEB SEARCH block that is confirmed present MUST be treated as present. When unsure, under-claim the gap rather than assert a false one.";

export const UNIVERSAL_SYSTEM =
  "You are the scoring engine behind the Industrial Brand Credibility Scorecard by Nexubis, a creative team for European industrial manufacturers. The reader is a marketing manager or CEO at a manufacturer, not a designer or developer. Voice: calm, plain, helpful, short sentences, concrete observations, no hype, no jargon, no sneering at anyone. Never use em dashes (the long dash character); hyphens in compound modifiers like fixed-price are fine. Never use AI cliches: in today's digital landscape, unlock, leverage, synergy, elevate, seamless, cutting-edge. " +
  "EVIDENCE RULE: Site content may include sections marked '## [from /path]' (inner pages) and '## [navigation links observed on the site]' (the nav vocabulary). Before concluding that something is MISSING, check the nav vocabulary AND inner-page sections. Lines starting with '[page signal]' report elements that carry no readable text (photo counts, embedded videos, PDF links): they are POSITIVE PROOF those elements exist. " +
  "Return ONLY valid JSON. No prose. No markdown.";

const PRICING: Record<string, { input: number; output: number }> = {
  [MODEL_HAIKU]: PRICE_PER_MTOK.haiku,
  [MODEL_SONNET]: PRICE_PER_MTOK.sonnet,
};

export interface Usage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** Direct search-API queries folded into this call's cost accounting. */
  webSearchRequests?: number;
  estimatedCostUsd: number;
  latencyMs: number;
}
export type WrapperResult<T> =
  | { ok: true; data: T; usage: Usage }
  | { ok: false; reason: string; detail?: string };

// Per-call timeout bounds each call so a throttled stage falls back instead of
// hanging. maxRetries: 0 because the SDK's automatic retry re-sends TIMED-OUT
// requests too: a timed-out call still completes and bills server-side. Our
// loop retries fast failures (429/5xx) and invalid JSON exactly once; timeouts
// fail fast.
const CALL_TIMEOUT_MS = 50_000;

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey, maxRetries: 0 });
}

function isTimeoutError(err: unknown): boolean {
  if (err instanceof Anthropic.APIConnectionTimeoutError) return true;
  return err instanceof Error && /timed? ?out/i.test(err.message);
}

function estimateCost(model: string, i: number, o: number): number {
  const p = PRICING[model] ?? { input: 3, output: 15 };
  return Number(((i * p.input + o * p.output) / 1_000_000).toFixed(4));
}
function buildUsage(
  model: string,
  u: { input_tokens?: number; output_tokens?: number } | undefined,
  latencyMs: number,
): Usage {
  const inputTokens = u?.input_tokens ?? 0;
  const outputTokens = u?.output_tokens ?? 0;
  return { model, inputTokens, outputTokens, webSearchRequests: 0, estimatedCostUsd: estimateCost(model, inputTokens, outputTokens), latencyMs };
}
// Fold direct search-API queries into a call's usage so the orchestrator total
// stays the true all-in spend (Serper queries are ~$0.001 each).
export function addSearchCost(usage: Usage, queries: number): void {
  usage.webSearchRequests = (usage.webSearchRequests ?? 0) + queries;
  usage.estimatedCostUsd = Number((usage.estimatedCostUsd + queries * SEARCH_QUERY_COST_USD).toFixed(4));
}
export function zeroUsage(model: string): Usage {
  return { model, inputTokens: 0, outputTokens: 0, webSearchRequests: 0, estimatedCostUsd: 0, latencyMs: 0 };
}

function extractText(content: Anthropic.Messages.ContentBlock[]): string {
  return content.filter((b): b is Anthropic.Messages.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
}
function parseJsonLoose<T>(text: string): T | null {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

export interface JsonCall {
  label: string;
  model: string;
  user: string;
  maxTokens: number;
  /** Optional images (base64 PNG), prepended in order before the text turn. */
  images?: Array<{ data: string; mediaType: string }>;
  /** Optional JSON Schema enforced by the API via output_config.format, so the
   *  reply is guaranteed schema-valid JSON. */
  outputFormat?: Record<string, unknown>;
  /** Optional zod schema. A parsed reply that fails validation triggers the one
   *  repair retry; if it still fails the call returns ok:false so the caller
   *  uses its templated fallback. The renderer never receives unvalidated
   *  model output. */
  schema?: {
    safeParse(value: unknown): { success: boolean; error?: { issues?: Array<{ path?: unknown; message?: string }> } };
  };
}

export async function runJson<T>({ label, model, user, maxTokens, images, outputFormat, schema }: JsonCall): Promise<WrapperResult<T>> {
  const client = getClient();
  if (!client) return { ok: false, reason: "ai-not-configured" };

  const allImages = images ?? [];

  // Cost cache: when a generation envelope is active, memoize the successful
  // call payload in KV, keyed by the exact prompt. Identical calls are served,
  // not re-paid. Failures are never cached, so a bad call always retries fresh.
  const envelope = currentEnvelope();
  const cacheKey = envelope
    ? searchCacheKey(envelope, label, `${model}|${maxTokens}|so:${outputFormat ? 1 : 0}|${allImages.map((i) => i.data).join("|") || 0}|${user}`)
    : null;
  if (cacheKey) {
    try {
      const hit = await getKv().get<{ data: T; usage: Usage }>(cacheKey);
      if (hit && hit.data !== undefined && hit.data !== null) {
        console.log(`[scorecard-ai] ${label} cache-hit (cost cache)`);
        return { ok: true, data: hit.data, usage: hit.usage };
      }
    } catch {
      // cache read failure is non-fatal, fall through and call the model
    }
  }

  // Carries what went wrong into the repair attempt. Temperature is 0, so a
  // bare "that was not valid JSON" retry would deterministically reproduce the
  // same bad reply; showing the model its own output plus the concrete schema
  // errors is what makes attempt 2 land differently.
  let repairHint = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const started = Date.now();
    try {
      const text = attempt === 1 || !repairHint ? user : `${user}\n\nYour previous reply was invalid.\n${repairHint}\nFix these problems and return ONLY the corrected JSON object.`;
      const content: Anthropic.Messages.ContentBlockParam[] | string = allImages.length
        ? [
            ...allImages.map((img): Anthropic.Messages.ContentBlockParam => ({
              type: "image",
              source: { type: "base64", media_type: img.mediaType as "image/png", data: img.data },
            })),
            { type: "text", text },
          ]
        : text;
      const msg = await client.messages.create(
        {
          model,
          max_tokens: maxTokens,
          // Determinism: temperature 0 on every call. Combined with the
          // determinism cache, reruns produce identical output.
          temperature: 0,
          system: UNIVERSAL_SYSTEM,
          ...(outputFormat ? { output_config: { format: { type: "json_schema" as const, schema: outputFormat } } } : {}),
          messages: [{ role: "user", content }],
        },
        { timeout: CALL_TIMEOUT_MS },
      );
      const usage = buildUsage(model, msg.usage, Date.now() - started);
      const replyText = extractText(msg.content);
      const parsed = parseJsonLoose<T>(replyText);
      const check = parsed !== null && schema ? schema.safeParse(parsed) : null;
      const valid = parsed !== null && (!schema || check?.success === true);
      console.log(`[scorecard-ai] ${label} #${attempt}: ${usage.inputTokens}in/${usage.outputTokens}out ~$${usage.estimatedCostUsd} ${usage.latencyMs}ms parsed=${parsed !== null} valid=${valid}`);
      if (valid) {
        const data = stripEmDashesDeep(parsed as T);
        if (cacheKey) {
          try {
            getKv().set(cacheKey, { data, usage }, { ex: SCORECARD_RECORD_TTL_S }).catch(() => {});
          } catch {
            // KV unavailable: skip the cost cache, non-fatal
          }
        }
        return { ok: true, data, usage };
      }
      const issues = check && !check.success && check.error?.issues?.length
        ? check.error.issues.map((i) => `${Array.isArray(i.path) ? i.path.join(".") : ""}: ${i.message ?? "invalid"}`).join("; ")
        : "the reply was not a parseable JSON object";
      repairHint = `Your reply was:\n${replyText.slice(0, 1500)}\nProblems: ${issues}`;
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error(`[scorecard-ai] ${label} #${attempt} error:`, detail);
      // Timeouts fail fast, never retry: the timed-out request still completes
      // and bills server-side.
      if (isTimeoutError(err)) return { ok: false, reason: "ai-timeout", detail };
      if (attempt === 2) return { ok: false, reason: "ai-request-failed", detail };
      repairHint = "";
    }
  }
  return { ok: false, reason: "ai-malformed" };
}

// ── First-impression vision read ─────────────────────────────────────────────
// Claude DESCRIBES the homepage screenshots: design era, imagery quality,
// 3D/video presence, clarity of what they make. This feeds scoring; it never
// scores. Facts only, no judgment beyond what is literally visible.
export interface FirstImpressionRead {
  /** What the page suggests the company makes, from the screenshot alone. */
  apparentOffer: string;
  /** True when a first-time viewer can tell what they make within seconds. */
  offerClearInFiveSeconds: boolean;
  /** Design era the page reads as: "current", "aging", "dated". */
  designEra: "current" | "aging" | "dated";
  /** Overall feel next to modern industrial sites. */
  premiumFeel: "premium" | "solid" | "dated";
  imageryQuality: "professional" | "mixed" | "weak";
  /** Product renders/cutaways clearly generated in 3D/CGI. */
  threeDOrCgi: boolean;
  videoPresent: boolean;
  productVisualsPresent: boolean;
  /** Up to 3 short factual observations about what is literally visible. */
  notes: string[];
}

export async function readFirstImpression(args: {
  desktopBase64: string | null;
  mobileBase64: string | null;
  company: string;
}): Promise<WrapperResult<FirstImpressionRead>> {
  if (isMockMode()) {
    const seed = `fi:${args.company}`;
    const eras = ["current", "aging", "dated"] as const;
    const feels = ["premium", "solid", "dated"] as const;
    const quality = ["professional", "mixed", "weak"] as const;
    const data: FirstImpressionRead = {
      apparentOffer: `industrial equipment (mock read for ${args.company})`,
      offerClearInFiveSeconds: mockInt(seed, 2) === 0,
      designEra: eras[mockInt(seed + "era", 3)],
      premiumFeel: feels[mockInt(seed + "feel", 3)],
      imageryQuality: quality[mockInt(seed + "img", 3)],
      threeDOrCgi: mockInt(seed + "3d", 3) === 0,
      videoPresent: mockInt(seed + "vid", 2) === 0,
      productVisualsPresent: mockInt(seed + "pv", 4) !== 0,
      notes: [`Mock vision note for ${args.company}.`],
    };
    return { ok: true, data, usage: zeroUsage("mock") };
  }
  const images = [
    ...(args.desktopBase64 ? [{ data: args.desktopBase64, mediaType: "image/png" }] : []),
    ...(args.mobileBase64 ? [{ data: args.mobileBase64, mediaType: "image/png" }] : []),
  ];
  if (images.length === 0) return { ok: false, reason: "no-screenshots" };
  const both = images.length === 2;
  const user = `${both ? `These are first-load screenshots of the homepage for "${args.company}": IMAGE 1 is desktop above the fold, IMAGE 2 is mobile above the fold.` : `This is a first-load screenshot of the homepage for "${args.company}".`}
This is the first five seconds a buyer sees, before reading a single word of body copy.

Describe ONLY what is literally visible. NEVER guess or invent. Do not score anything; describe.
- apparentOffer: what this company appears to make or do, judged from the screenshot alone, one short phrase. If unclear, say what is shown instead.
- offerClearInFiveSeconds: true only if a first-time viewer could tell what they make, for whom, within seconds.
- designEra: "current" (contemporary layout, type and spacing), "aging" (roughly five to ten years behind), "dated" (clearly older patterns).
- premiumFeel: how it reads next to a modern industrial market leader: "premium", "solid", "dated".
- imageryQuality: "professional" (commissioned photography or renders), "mixed", "weak" (stock photos, low-resolution or filler imagery).
- threeDOrCgi: true only if a 3D render, CGI cutaway or configurator is clearly visible.
- videoPresent: true only if a playing video, video player or showreel is clearly visible.
- productVisualsPresent: true if actual product imagery is visible above the fold.
- notes: up to 3 short factual observations (max 15 words each) about what is visible: hero message, navigation, imagery, anything a buyer would register first.

${COPY_DIET}

Return ONLY: { "apparentOffer": "...", "offerClearInFiveSeconds": true|false, "designEra": "current|aging|dated", "premiumFeel": "premium|solid|dated", "imageryQuality": "professional|mixed|weak", "threeDOrCgi": true|false, "videoPresent": true|false, "productVisualsPresent": true|false, "notes": ["..."] }`;

  return runJson<FirstImpressionRead>({
    label: "first-impression",
    model: MODEL_SONNET,
    user,
    maxTokens: 500,
    images,
    outputFormat: FIRST_IMPRESSION_OUTPUT,
    schema: firstImpressionSchema,
  });
}

// Positive-only evidence line from the vision read, appended to the company's
// site text for the scorer. Absence stays unknown (no false negatives from
// vision).
export function firstImpressionSignal(v: FirstImpressionRead | null): string {
  if (!v) return "";
  const bits = [
    v.productVisualsPresent ? "product imagery is visible above the fold" : null,
    v.threeDOrCgi ? "a 3D or CGI product visual is visible" : null,
    v.videoPresent ? "video is present on the homepage" : null,
    v.imageryQuality === "professional" ? "imagery reads as professionally produced" : null,
  ].filter(Boolean);
  return bits.length ? `\n[page signal] Vision check of the rendered homepage confirms: ${bits.join("; ")}.` : "";
}
