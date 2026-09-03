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
import { FIRST_IMPRESSION_OUTPUT, firstImpressionSchema, DETECT_CONTEXT_OUTPUT, detectContextSchema, COMPETITOR_RESCUE_OUTPUT, competitorRescueSchema } from "./output-schemas";
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
  "You are the scoring engine behind The Online Credibility Audit by Nexubis, a creative team for European industrial manufacturers. The reader is a marketing manager or CEO at a manufacturer, not a designer or developer. Voice: calm, plain, helpful, short sentences, concrete observations, no hype, no jargon, no sneering at anyone. Never use em dashes (the long dash character); hyphens in compound modifiers like fixed-price are fine. Never use AI cliches: in today's digital landscape, unlock, leverage, synergy, elevate, seamless, cutting-edge. " +
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
  /** Per-call timeout override. The default suits short calls; the deck-copy
   *  pass writes far more tokens and needs longer. */
  timeoutMs?: number;
}

export async function runJson<T>({ label, model, user, maxTokens, images, outputFormat, schema, timeoutMs }: JsonCall): Promise<WrapperResult<T>> {
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
              source: { type: "base64", media_type: img.mediaType as "image/jpeg", data: img.data },
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
        { timeout: timeoutMs ?? CALL_TIMEOUT_MS },
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
    ...(args.desktopBase64 ? [{ data: args.desktopBase64, mediaType: "image/jpeg" }] : []),
    ...(args.mobileBase64 ? [{ data: args.mobileBase64, mediaType: "image/jpeg" }] : []),
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

// ── Auto-detect: read the site, infer what they make and who they rival ──────
// Powers the website-only entry. From the prospect's own crawled homepage text,
// Claude names what they make in one buyer-facing line and up to four real
// companies a buyer would cross-shop against. Only companies it is genuinely
// confident exist are named; the competitor resolver (Serper) validates each
// one downstream, so a shaky guess simply fails to resolve rather than poisoning
// the benchmark. Cheap model: this is inference over given text, not judgment.
export interface DetectedContext {
  /** What they make, one buyer-facing line. */
  productOneLiner: string;
  /** Up to 4 competitor names or domains, real companies only. */
  competitors: string[];
  /** The company's own name as written on its site ("DMN-Westinghouse"), so
   *  reports never address a prospect by a mangled domain guess. */
  companyName?: string;
  /** Whether this site belongs to the Scorecard's audience. "outside" is the
   *  only blocking value; "unclear" always proceeds (a wrongly rejected real
   *  prospect costs more than a wasted run). */
  industryFit?: "manufacturer" | "adjacent" | "outside" | "unclear";
  /** Industry fingerprint, extractive only. Optional: payloads cached before
   *  these fields existed omit them; detect.ts normalises to safe defaults. */
  industries?: string[];
  certifications?: string[];
  productFamilies?: string[];
  salesModel?: "direct" | "distributors" | "mixed" | "unclear";
  buyerPersona?: string;
}

export async function detectProductContext(args: {
  company: string;
  url: string;
  siteText: string | null;
  siteTitle: string | null;
}): Promise<WrapperResult<DetectedContext>> {
  if (isMockMode()) {
    const seed = `detect:${args.company}`;
    const kinds = ["dosing pumps", "leak detection systems", "bulk-solids handling", "packaging machinery", "process valves"];
    const models: Array<DetectedContext["salesModel"]> = ["direct", "distributors", "mixed", "unclear"];
    const data: DetectedContext = {
      productOneLiner: `${kinds[mockInt(seed, kinds.length)]} for industrial production lines (mock read for ${args.company})`,
      competitors: ["altrix-systems.de", "vorne-industrial.com", "meridian-pack.eu"],
      companyName: `${args.company} GmbH`,
      industryFit: "manufacturer",
      industries: [["food", "pharma"], ["dairy", "chemicals"], ["plastics"]][mockInt(seed + "ind", 3)],
      certifications: mockInt(seed + "cert", 2) === 0 ? ["ATEX", "EHEDG"] : [],
      productFamilies: [`${args.company.slice(0, 3).toUpperCase()} series`],
      salesModel: models[mockInt(seed + "sales", models.length)],
      buyerPersona: `a process engineer at an industrial plant (mock persona for ${args.company})`,
    };
    return { ok: true, data, usage: zeroUsage("mock") };
  }

  if (!args.siteText) return { ok: false, reason: "no-site-text" };

  const user = `You are reading the website of an industrial company to set up a brand assessment. Company: "${args.company}" (${args.url}).${args.siteTitle ? ` Page title: "${args.siteTitle}".` : ""}

From the SITE CONTENT below, return:
- industryFit: whose site this is. "manufacturer" = makes or builds physical industrial products, machinery, equipment or components for business customers. "adjacent" = industrial B2B but not a manufacturer (system integrator, industrial service or engineering firm, technical distributor). "outside" = clearly none of that (consumer products or services, software, agencies, shops, restaurants, media, personal sites). "unclear" = the content does not say enough to tell. Choose "outside" ONLY when you are certain; when torn between two values, pick the more industrial one.
- companyName: the company's own name exactly as it writes it on its site (max 6 words, e.g. "DMN-Westinghouse"). No legal suffixes unless the site leads with them. Empty string if the site never states a name.
- productOneLiner: what this company makes or does, in one buyer-facing line (max 15 words). Say it the way the company would to a buyer, plain and specific. Example shape: "leak detection systems for packaging lines".
- competitors: up to 4 real companies a buyer would cross-shop against this one, as company names or domains. Name ONLY companies you are genuinely confident exist in this industry; a company name that is right beats four that are guesses. If you are unsure, return fewer. Never invent a plausible-sounding name. Do not list the company itself, marketplaces, directories or trade bodies. When the company is Dutch (a .nl domain or a Dutch-language site), prefer credible Dutch competitors where they genuinely exist; when they do not, name the real closest competitors regardless of country.
- The industry fingerprint. EXTRACTIVE ONLY: each field may contain ONLY what the site content literally states. Empty arrays and empty strings are correct answers; a wrong entry is far worse than a missing one.
  - industries: industries or sectors the site names serving (max 5, as written, e.g. "dairy", "pharmaceutical").
  - certifications: certification and standard names literally present in the text (max 6, e.g. "ATEX", "EHEDG", "FDA"). Never add one the text does not contain.
  - productFamilies: named product families, series or model names as written (max 6).
  - salesModel: "direct" | "distributors" | "mixed" | "unclear". Only "distributors" or "mixed" when the text mentions distributors, dealers or resellers; otherwise "unclear" beats a guess.
  - buyerPersona: one line (max 12 words) describing the likely buyer, grounded in who the site addresses (e.g. "a process engineer specifying equipment for a dairy line"). Empty string if the site gives no basis.

${COPY_DIET}

## SITE CONTENT (crawled)
${args.siteText.slice(0, SITE_TEXT_BUDGET)}

Return ONLY: { "industryFit": "...", "companyName": "...", "productOneLiner": "...", "competitors": ["..."], "industries": ["..."], "certifications": ["..."], "productFamilies": ["..."], "salesModel": "...", "buyerPersona": "..." }`;

  return runJson<DetectedContext>({
    label: "detect-context",
    model: MODEL_HAIKU,
    user,
    maxTokens: 400,
    outputFormat: DETECT_CONTEXT_OUTPUT,
    schema: detectContextSchema,
  });
}

// ── Competitor rescue: pick real rivals out of live search results ───────────
// Runs only when the site-only detection found fewer than two competitors
// (niche industries where model knowledge alone is too thin to name rivals
// confidently). The candidates are grounded in the search results handed in,
// and the downstream resolver still validates every name against the live
// web, so a wrong pick fails to resolve rather than poisoning the benchmark.
export async function pickCompetitorsFromSearch(args: {
  company: string;
  productOneLiner: string;
  searchBlock: string;
}): Promise<WrapperResult<{ competitors: string[] }>> {
  if (isMockMode()) {
    return { ok: true, data: { competitors: ["altrix-systems.de", "vorne-industrial.com"] }, usage: zeroUsage("mock") };
  }
  if (!args.searchBlock.trim()) return { ok: false, reason: "no-search-results" };

  const user = `You are completing the setup of a brand benchmark for "${args.company}", which makes: ${args.productOneLiner}.

From the SEARCH RESULTS below, name up to 4 real competitor MANUFACTURERS a buyer would cross-shop against "${args.company}", as company names or domains. Rules:
- Only companies that appear in the search results or that you are genuinely confident exist in this industry.
- Never "${args.company}" itself, its distributors or resellers, marketplaces, directories, trade bodies or media sites.
- Manufacturers of the same product category only. Fewer right names beat four guesses. Return an empty list if nothing qualifies.

${COPY_DIET}

## SEARCH RESULTS
${args.searchBlock.slice(0, 5000)}

Return ONLY: { "competitors": ["...", "..."] }`;

  return runJson<{ competitors: string[] }>({
    label: "competitor-rescue",
    model: MODEL_HAIKU,
    user,
    maxTokens: 300,
    outputFormat: COMPETITOR_RESCUE_OUTPUT,
    schema: competitorRescueSchema,
  });
}

// Industry-fingerprint context block for the scorer and copy pass. Extractive
// facts from the prospect's own site, so the model can speak the buyer's
// language (industries, certifications, product families) without inventing
// any of it. Empty fingerprint -> empty block, prompts render without it.
import type { DetectedFingerprint } from "./types";

export function companyContextBlock(fp: DetectedFingerprint | undefined | null): string {
  if (!fp) return "";
  const lines = [
    fp.industries.length ? `- Industries they name serving: ${fp.industries.join(", ")}` : null,
    fp.certifications.length ? `- Certifications named on their site: ${fp.certifications.join(", ")}` : null,
    fp.productFamilies.length ? `- Named product families: ${fp.productFamilies.join(", ")}` : null,
    fp.salesModel && fp.salesModel !== "unclear" ? `- Sales model stated on the site: ${fp.salesModel === "distributors" ? "via distributors" : fp.salesModel === "mixed" ? "direct and via distributors" : "direct"}` : null,
    fp.buyerPersona ? `- The likely buyer: ${fp.buyerPersona}` : null,
  ].filter(Boolean);
  if (lines.length === 0) return "";
  return `## COMPANY CONTEXT (stated on their own site; use these exact terms where relevant, never add to them)\n${lines.join("\n")}`;
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

// ── Rubric scorer: 25 checks for one company ─────────────────────────────────
// The identical rubric runs on the prospect and every resolved competitor.
// The model scores 0 to 4 per check with one evidence sentence citing what was
// actually seen. Checks it cannot assess come back score:null,
// assessable:false with the reason in the evidence sentence. The PageSpeed
// check is ALWAYS overridden deterministically in code (scoring.ts); the model
// is told to return null for it.
import type { CompanyEvidence } from "./evidence";
import type { RawCheck } from "./scoring";
import { RUBRIC } from "./rubric";
import { RUBRIC_SCORES_OUTPUT, rubricScoresSchema, DECK_CATEGORIES_OUTPUT, deckCategoriesSchema, DECK_NARRATIVE_OUTPUT, deckNarrativeSchema, type DeckCopyReply, type DeckCategoriesReply, type DeckNarrativeReply } from "./output-schemas";

const SITE_TEXT_BUDGET = 8000;

function rubricBlock(): string {
  return RUBRIC.map((cat) => {
    const checks = cat.checks
      .map((ch) => `- key "${ch.key}": ${ch.guidance}`)
      .join("\n");
    return `## ${cat.label}\n${checks}`;
  }).join("\n\n");
}

function evidenceBlock(e: CompanyEvidence): string {
  const parts: string[] = [];
  if (e.siteText) parts.push(`## SITE CONTENT (crawled)\n${e.siteText.slice(0, SITE_TEXT_BUDGET)}`);
  else parts.push(`## SITE CONTENT\nThe site could not be fetched (${e.fetchReason ?? "unreachable"}). Only score checks the remaining evidence supports.`);
  if (e.firstImpression) {
    parts.push(`## FIRST-IMPRESSION READ (from the first-load homepage screenshots)\n${JSON.stringify(e.firstImpression)}`);
  }
  if (e.pageSpeed) {
    parts.push(
      `## MEASURED PAGESPEED (context only; the pagespeed check itself is filled in by the pipeline)\nmobile performance: ${e.pageSpeed.mobile?.performance ?? "not measured"}, desktop performance: ${e.pageSpeed.desktop?.performance ?? "not measured"}, LCP: ${e.pageSpeed.lcp ?? "n/a"}`,
    );
  }
  if (e.offsiteFacts.length) {
    const lines = e.offsiteFacts.map((f) => `- ${f.key}: ${f.present ? "PRESENT" : "not found"}. ${f.evidence}`);
    parts.push(`## VERIFIED BY WEB SEARCH\n${lines.join("\n")}`);
  }
  if (e.searchBlock) parts.push(`## RAW SEARCH EVIDENCE\n${e.searchBlock.slice(0, 2500)}`);
  return parts.join("\n\n");
}

// Compact cross-company context so relative checks (design next to
// competitors, visuals at competitor level) are assessable inside a
// per-company call.
export function competitorContextBlock(others: CompanyEvidence[]): string {
  const lines = others.map((o) => {
    const fi = o.firstImpression;
    if (!fi) return `- ${o.company}: no first-impression read available.`;
    return `- ${o.company}: design reads ${fi.designEra}, feel ${fi.premiumFeel}, imagery ${fi.imageryQuality}, 3D/CGI ${fi.threeDOrCgi ? "yes" : "not seen"}, video ${fi.videoPresent ? "yes" : "not seen"}. Apparent offer: ${fi.apparentOffer}.`;
  });
  return lines.length ? `## THE OTHER COMPANIES IN THIS COMPARISON (first-impression reads)\n${lines.join("\n")}` : "";
}

export async function scoreCompanyRubric(args: {
  evidence: CompanyEvidence;
  productOneLiner: string;
  competitorContext: string;
  /** Preformatted company-context block (prospect only). Empty for rivals. */
  companyContext?: string;
}): Promise<WrapperResult<{ checks: RawCheck[] }>> {
  const e = args.evidence;
  if (isMockMode()) {
    const checks: RawCheck[] = RUBRIC.flatMap((cat) =>
      cat.checks.map((ch) => {
        if (ch.key === "pagespeed") return { key: ch.key, score: null, assessable: false, evidence: "Filled by the pipeline." };
        const roll = mockInt(`score:${e.company}:${ch.key}`, 24);
        if (roll === 0) {
          return { key: ch.key, score: null, assessable: false, evidence: `Mock: ${ch.label} could not be assessed for ${e.company}.` };
        }
        return {
          key: ch.key,
          score: roll % 5,
          assessable: true,
          evidence: `Mock evidence sentence for ${ch.label} at ${e.company}.`,
        };
      }),
    );
    return { ok: true, data: { checks }, usage: zeroUsage("mock") };
  }

  const user = `Score "${e.company}" on The Online Credibility Audit rubric below. They make: ${args.productOneLiner || "(not stated)"}.

${rubricBlock()}

SCORING RULES:
- Score each check 0 to 4 (integers). 4 is genuinely strong against the wider industrial market, 2 is unremarkable, 0 is a real liability.
- ONE evidence sentence per check, citing what was actually seen: a screenshot observation, a crawled page, a PageSpeed number, a web finding. Maximum 25 words.\n- When you need a name for this assessment, call it the audit.
- If a check cannot be assessed from the evidence, set score null and assessable false, and say why in the evidence sentence. Do NOT guess and do NOT punish missing evidence with a low score. Exception: for "brochures-findable", nothing found in the verified web evidence IS the finding; score it 0 with that evidence, not null.
- For the "pagespeed" check: always return score null, assessable false, evidence "Filled by the pipeline." The pipeline supplies it from measured numbers.
- Relative checks ("design-quality", "competitor-level") are judged against the other companies listed below; if no other company has a first-impression read, mark those checks not assessable.

${NO_FALSE_NEGATIVE}

${COPY_DIET}

${args.companyContext ? `${args.companyContext}\n\n` : ""}${args.competitorContext || "## THE OTHER COMPANIES IN THIS COMPARISON\n(none available)"}

${evidenceBlock(e)}

Return ONLY: { "checks": [ { "key": "...", "score": 0-4 or null, "assessable": true|false, "evidence": "..." }, ... ] } with exactly one entry per rubric check key.`;

  return runJson<{ checks: RawCheck[] }>({
    label: `rubric:${e.company.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24)}`,
    model: MODEL_SONNET,
    user,
    maxTokens: 3000,
    outputFormat: RUBRIC_SCORES_OUTPUT,
    schema: rubricScoresSchema,
  });
}

// ── Report copy pass ─────────────────────────────────────────────────────────
// A second Claude pass writes the report copy blocks in the house tone: calm,
// plain, short sentences, helped then concerned then clear. Findings must
// reference the prospect's and competitors' real evidence. No selling: the
// fixed closing pages carry the CTA.
export interface DeckCopyInput {
  company: string;
  productOneLiner: string;
  verdictBand: "narrow" | "visible" | "wide";
  stance: "ahead" | "level" | "behind" | "no-benchmark";
  overall: number;
  bestRival: { company: string; overall: number } | null;
  aheadRivals: Array<{ company: string; overall: number; leadCategory: string | null }>;
  firstFixCategory: string;
  firstFixLabel: string;
  /** Compact per-category summary lines: totals plus notable check evidence. */
  scoreSummary: string;
  /** Preformatted company-context block (industry fingerprint). May be "". */
  companyContext: string;
  /** Code-computed concrete competitor advantages ("X offers 9 language
   *  versions; your site shows one"). Measured facts, never model output. */
  competitorEdges: string[];
}

export async function writeDeckCopy(input: DeckCopyInput): Promise<WrapperResult<DeckCopyReply>> {
  if (isMockMode()) {
    const data: DeckCopyReply = {
      verdictLine: `A solid base, yet ${input.firstFixLabel.toLowerCase()} is leaking buyers (mock).`,
      verdictParagraph: `Mock verdict for ${input.company}: the overall score is ${input.overall} and the gap is ${input.verdictBand}. The benchmark stance is ${input.stance}.`,
      categories: RUBRIC.map((c, ci) => ({
        key: c.key,
        findings: [
          `Mock finding one for ${c.label} at ${input.company}.`,
          `Mock finding two for ${c.label}, citing real evidence in production.`,
        ],
        competitorNote: `Mock competitor note for ${c.label}.`,
        working: [
          { title: `Mock strength ${ci + 1}`, body: `Mock sentence on what is working in ${c.label.toLowerCase()}.` },
        ],
        fix: [
          { title: `Mock gap ${ci + 1}`, body: `Mock sentence on what to fix in ${c.label.toLowerCase()}, with the fix hinted.` },
        ],
      })),
      firstFix: {
        why: `Mock reasoning: ${input.firstFixLabel} scored lowest, and it is where buyers look first.`,
        inPractice: `Mock practice paragraph for fixing ${input.firstFixLabel}.`,
      },
      topIssues: [
        { title: "Mock issue one", body: "Mock sentence on what this costs and why.", impact: "Likely 20-40% of undecided buyers lost" },
        { title: "Mock issue two", body: "Mock sentence on what this costs and why.", impact: "Likely a meaningful share of enquiries never sent" },
        { title: "Mock issue three", body: "Mock sentence on what this costs and why.", impact: "Likely shortlists lost to better-presented rivals" },
      ],
      startList: [
        "Clear homepage message so buyers know why to choose you (mock)",
        "Show the machines working so buyers can judge the product (mock)",
        "Proper brochures so researching buyers have something to share (mock)",
      ],
      stayingSame: `Mock staying-the-same sentence for ${input.company}.`,
    };
    return { ok: true, data, usage: zeroUsage("mock") };
  }

  const stanceRule =
    input.stance === "ahead"
      ? `They lead all named competitors. Open the verdict with the lead, then the sharpening notes.`
      : input.stance === "level"
        ? `They are level with the best competitor (${input.bestRival?.company ?? "the best rival"}). Say the credibility tie-breaker is even right now, and small gains tip it their way.`
        : input.stance === "behind"
          ? input.aheadRivals.length
            ? `They trail ${input.aheadRivals.map((r) => `${r.company} (${r.overall}/100${r.leadCategory ? `, pulls ahead on ${r.leadCategory}` : ""})`).join(" and ")}. Name the strongest rival as the live reason to act and point to the category where they pull ahead. The verdict stays where the score put it; never inflate or soften the band because of the comparison.`
            : `They trail the stronger names buyers compare them against in this report. Point to the comparison as the live reason to act WITHOUT naming any specific company. The verdict stays where the score put it.`
          : `No competitor could be benchmarked. Say the comparison could not be made, plainly, and keep the verdict on their own score.`;

  const bandTone =
    input.verdictBand === "wide"
      ? "Tone: direct but kind. Never mocking. The findings speak."
      : input.verdictBand === "visible"
        ? "Tone: encouraging. They are closer than most. The fixes are specific and contained."
        : "Tone: respectful. Acknowledge the work done. The notes show where to sharpen.";

  const edgesBlock = input.competitorEdges.length
    ? `\nCONCRETE COMPETITOR ADVANTAGES (measured on their sites by the same pipeline; use these in findings and competitorNotes where relevant, never invent others):\n${input.competitorEdges.map((e) => `- ${e}`).join("\n")}\n`
    : "";

  // Shared context header both calls receive verbatim, so the categories and
  // the narrative are written against the exact same numbers and evidence and
  // never drift apart.
  const context = `${input.companyContext ? `${input.companyContext}\n\n` : ""}THE NUMBERS (already computed, never change them):
- Overall Gap Score: ${input.overall}/100. Verdict: ${input.verdictBand} gap.
- Benchmark stance: ${input.stance}. ${stanceRule}
- First place to fix: ${input.firstFixLabel}.

PER-CATEGORY SCORES AND EVIDENCE:
${input.scoreSummary}
${edgesBlock}`;

  // Shared closing rules, applied identically to both calls.
  const hardRules = `HARD RULES: When you need a name for this assessment, call it the audit, the check or the report. Findings are facts, never sneering, about the prospect or the competitors. No hype words, no jargon, no em dashes, no selling anywhere in these blocks. Never mention Nexubis or any agency. Never invent anything not present in the evidence. Industry terms, certification names, product family names and buyer descriptions may ONLY come from the company context or the evidence above, exactly as written there.

${COPY_DIET}`;

  // Call A: the five per-category blocks (the bulk of the tokens).
  const categoriesUser = `Write the per-category copy blocks for The Online Credibility Audit of "${input.company}" (they make: ${input.productOneLiner}).

${context}Tight and skimmable: every sentence earns its place, no filler or restating the obvious, but never drop a concrete fact (a number, a named product family, a specific gap). Shorter is better as long as the substance survives.

categories: for EVERY category key:
   - findings: exactly 2 or 3 (each maximum 22 words) stating specifically what is working and what is costing them, referencing the real evidence above (name competitors where the evidence does). If a category's checks were mostly not assessable, one finding must say plainly what could not be assessed and why that matters.
   - competitorNote: one note (maximum 18 words) on where the named competitors stand on this category.
   - working: one entry per check that scored 3 or 4 in this category ([3] or [4] in the evidence above). Each entry: "title" = a short plain label for the strength (maximum 6 words, never the raw check name), "body" = ONE sentence (maximum 20 words) grounded in that check's evidence.
   - fix: one entry per check that scored 0, 1 or 2. Each entry: "title" = a short plain label for the gap (maximum 6 words), "body" = ONE sentence (maximum 20 words) that names the problem AND hints at the fix ("Add X so buyers can Y"), grounded in that check's evidence. Skip not-assessable checks in both lists. Empty arrays are correct when nothing qualifies.

${hardRules}

Return ONLY: { "categories": [ { "key": "...", "findings": ["..."], "competitorNote": "...", "working": [ { "title": "...", "body": "..." } ], "fix": [ { "title": "...", "body": "..." } ] } ] }`;

  // Call B: the narrative pieces that frame the report (helped, then concerned,
  // then clear on what to do).
  const narrativeUser = `Write the framing copy blocks for The Online Credibility Audit of "${input.company}" (they make: ${input.productOneLiner}). The reader should feel helped, then concerned, then clear on what to do, in that order.

${context}Across ALL of these: tight and skimmable, every sentence earning its place, no filler, but never drop a concrete fact. Shorter is better as long as the substance survives.

WRITE THESE BLOCKS:
1. verdictLine: ONE line for the report header, maximum 14 words, plain language, naming the biggest leak specifically. Same spirit as "A real foundation, yet the basics and getting found are leaking customers." Never restate the score.
2. verdictParagraph: one TIGHT paragraph, maximum 65 words. State the verdict plainly, weave the benchmark stance per the rule above, end on the first place to fix. No filler, no restating the obvious. ${bandTone}
3. topIssues: EXACTLY 3 entries, the three problems across all categories most likely to be costing them customers, worst first. Each: "title" (maximum 8 words, plain, e.g. "No proof of expertise online"), "body" = ONE sentence (maximum 22 words) on what it costs and why, "impact" = one short estimate line, maximum 12 words, starting with "Likely", stated as a RANGE or an order of magnitude a reasonable person could defend from the findings (e.g. "Likely 20-40% of undecided buyers lost", "Likely a meaningful share of enquiries never sent"). No justification clause after it; never invent precision; never exceed what the evidence supports.
4. startList: 3 to 4 lines, the prioritised fixes in the order we would do them, each written as an OUTCOME, maximum 11 words, no trailing clauses (e.g. "Clear homepage message so buyers know why to choose you"). Start from the first place to fix.
5. stayingSame: ONE sentence (maximum 20 words) naming what stays broken if they change nothing, concrete to their findings${input.bestRival ? ` and to ${input.bestRival.company} as the comparison buyers keep running` : ""}.
6. firstFix: keep BOTH parts tight and skimmable, no preamble, no restating the heading. "why" (maximum 26 words): in one or two short sentences, why the first place to fix (${input.firstFixLabel}) comes first, tied to where buyers look and, where the context supports it, to THEIR buyer. "inPractice" (maximum 30 words): the concrete first moves, specific to their evidence; name their actual product families, industries or certifications where the context states them. Describe the work, do not sell, do not mention any company that would do it.

${hardRules}

Return ONLY: { "verdictLine": "...", "verdictParagraph": "...", "firstFix": { "why": "...", "inPractice": "..." }, "topIssues": [ { "title": "...", "body": "...", "impact": "..." } ], "startList": ["..."], "stayingSame": "..." }`;

  // Both calls run concurrently. Each writes roughly half the tokens of the old
  // single pass, so the stage now costs about one call's latency, not two.
  // Kick both off before awaiting either, so they run concurrently.
  const catsPromise = runJson<DeckCategoriesReply>({
    label: "deck-categories",
    model: MODEL_SONNET,
    user: categoriesUser,
    maxTokens: 3000,
    timeoutMs: 90_000,
    outputFormat: DECK_CATEGORIES_OUTPUT,
    schema: deckCategoriesSchema,
  });
  const narrPromise = runJson<DeckNarrativeReply>({
    label: "deck-narrative",
    model: MODEL_SONNET,
    user: narrativeUser,
    maxTokens: 2000,
    timeoutMs: 90_000,
    outputFormat: DECK_NARRATIVE_OUTPUT,
    schema: deckNarrativeSchema,
  });
  const catsRes = await catsPromise;
  const narrRes = await narrPromise;

  // If either half fails, the whole pass fails and the caller uses its
  // templated fallback, exactly as the single call did. No partial copy ships.
  if (!catsRes.ok) return catsRes;
  if (!narrRes.ok) return narrRes;

  const n = narrRes.data;
  const data: DeckCopyReply = {
    verdictLine: n.verdictLine,
    verdictParagraph: n.verdictParagraph,
    categories: catsRes.data.categories,
    firstFix: n.firstFix,
    topIssues: n.topIssues,
    startList: n.startList,
    stayingSame: n.stayingSame,
  };
  const usage: Usage = {
    model: MODEL_SONNET,
    inputTokens: catsRes.usage.inputTokens + narrRes.usage.inputTokens,
    outputTokens: catsRes.usage.outputTokens + narrRes.usage.outputTokens,
    webSearchRequests: 0,
    estimatedCostUsd: Number((catsRes.usage.estimatedCostUsd + narrRes.usage.estimatedCostUsd).toFixed(4)),
    // Wall-clock: the two calls overlap, so the stage cost is the slower of them.
    latencyMs: Math.max(catsRes.usage.latencyMs, narrRes.usage.latencyMs),
  };
  return { ok: true, data, usage };
}
