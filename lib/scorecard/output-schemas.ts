// Structured-output JSON Schemas (enforced by the API via output_config) and
// their zod twins (belt-and-braces validation at the boundary, plus the
// repair-retry signal).
//
// API constraint discovered live: output_config.format.schema rejects
// maxLength / maxItems / minimum / maximum. Keep these schemas structural
// (types, enums, required); length and range discipline lives in prompts, zod
// and the code-side clamps.
import { z } from "zod";
import { RUBRIC, CATEGORY_KEYS } from "./rubric";

// ── First-impression vision read ─────────────────────────────────────────────
export const FIRST_IMPRESSION_OUTPUT: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
    "apparentOffer",
    "offerClearInFiveSeconds",
    "designEra",
    "premiumFeel",
    "imageryQuality",
    "threeDOrCgi",
    "videoPresent",
    "productVisualsPresent",
    "notes",
  ],
  // NOTE: the structured-output API rejects maxLength/maxItems constraints;
  // length discipline lives in the prompt and the zod clamp downstream.
  properties: {
    apparentOffer: { type: "string" },
    offerClearInFiveSeconds: { type: "boolean" },
    designEra: { type: "string", enum: ["current", "aging", "dated"] },
    premiumFeel: { type: "string", enum: ["premium", "solid", "dated"] },
    imageryQuality: { type: "string", enum: ["professional", "mixed", "weak"] },
    threeDOrCgi: { type: "boolean" },
    videoPresent: { type: "boolean" },
    productVisualsPresent: { type: "boolean" },
    notes: { type: "array", items: { type: "string" } },
  },
};

export const firstImpressionSchema = z
  .object({
    apparentOffer: z.string(),
    offerClearInFiveSeconds: z.boolean(),
    designEra: z.enum(["current", "aging", "dated"]),
    premiumFeel: z.enum(["premium", "solid", "dated"]),
    imageryQuality: z.enum(["professional", "mixed", "weak"]),
    threeDOrCgi: z.boolean(),
    videoPresent: z.boolean(),
    productVisualsPresent: z.boolean(),
    notes: z.array(z.string()).max(3),
  })
  .passthrough();

// ── Rubric scorer (25 checks per company) ────────────────────────────────────
const ALL_CHECK_KEYS = RUBRIC.flatMap((c) => c.checks.map((ch) => ch.key));

export const RUBRIC_SCORES_OUTPUT: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["checks"],
  properties: {
    checks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "score", "assessable", "evidence"],
        properties: {
          key: { type: "string", enum: ALL_CHECK_KEYS },
          score: { anyOf: [{ type: "integer" }, { type: "null" }] },
          assessable: { type: "boolean" },
          evidence: { type: "string" },
        },
      },
    },
  },
};

export const rubricScoresSchema = z
  .object({
    checks: z.array(
      z
        .object({
          key: z.string(),
          score: z.number().int().nullable(),
          assessable: z.boolean(),
          evidence: z.string(),
        })
        .passthrough(),
    ),
  })
  .passthrough();

export type RubricScoresReply = z.infer<typeof rubricScoresSchema>;

// ── Report copy pass ─────────────────────────────────────────────────────────
const CLAIM_ITEM = {
  type: "object",
  additionalProperties: false,
  required: ["title", "body"],
  properties: {
    title: { type: "string" },
    body: { type: "string" },
  },
} as const;

export const DECK_COPY_OUTPUT: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["verdictLine", "verdictParagraph", "categories", "firstFix", "topIssues", "startList", "stayingSame"],
  properties: {
    verdictLine: { type: "string" },
    verdictParagraph: { type: "string" },
    categories: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "findings", "competitorNote", "working", "fix"],
        properties: {
          key: { type: "string", enum: [...CATEGORY_KEYS] },
          findings: { type: "array", items: { type: "string" } },
          competitorNote: { type: "string" },
          working: { type: "array", items: CLAIM_ITEM },
          fix: { type: "array", items: CLAIM_ITEM },
        },
      },
    },
    firstFix: {
      type: "object",
      additionalProperties: false,
      required: ["why", "inPractice"],
      properties: {
        why: { type: "string" },
        inPractice: { type: "string" },
      },
    },
    topIssues: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "body", "impact"],
        properties: {
          title: { type: "string" },
          body: { type: "string" },
          impact: { type: "string" },
        },
      },
    },
    startList: { type: "array", items: { type: "string" } },
    stayingSame: { type: "string" },
  },
};

const claimItemSchema = z.object({ title: z.string(), body: z.string() }).passthrough();

export const deckCopySchema = z
  .object({
    verdictLine: z.string(),
    verdictParagraph: z.string(),
    categories: z.array(
      z
        .object({
          key: z.enum(CATEGORY_KEYS as [string, ...string[]]),
          findings: z.array(z.string()),
          competitorNote: z.string(),
          working: z.array(claimItemSchema),
          fix: z.array(claimItemSchema),
        })
        .passthrough(),
    ),
    firstFix: z.object({ why: z.string(), inPractice: z.string() }).passthrough(),
    topIssues: z.array(z.object({ title: z.string(), body: z.string(), impact: z.string() }).passthrough()),
    startList: z.array(z.string()),
    stayingSame: z.string(),
  })
  .passthrough();

export type DeckCopyReply = z.infer<typeof deckCopySchema>;

// ── Auto-detect: product one-liner + likely competitors from the site ────────
// Powers the website-only entry: the prospect enters a URL, the pipeline reads
// their site and infers what they make and who they cross-shop against, so the
// form asks for nothing else. Structural schema only (no length caps: the API
// rejects them); discipline lives in the prompt.
export const DETECT_CONTEXT_OUTPUT: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["industryFit", "companyName", "productOneLiner", "competitors", "industries", "certifications", "productFamilies", "salesModel", "buyerPersona"],
  properties: {
    industryFit: { type: "string", enum: ["manufacturer", "adjacent", "outside", "unclear"] },
    companyName: { type: "string" },
    productOneLiner: { type: "string" },
    competitors: { type: "array", items: { type: "string" } },
    // Industry fingerprint: extractive only (what the site itself states).
    industries: { type: "array", items: { type: "string" } },
    certifications: { type: "array", items: { type: "string" } },
    productFamilies: { type: "array", items: { type: "string" } },
    salesModel: { type: "string", enum: ["direct", "distributors", "mixed", "unclear"] },
    buyerPersona: { type: "string" },
  },
};

// Competitor rescue: when the site-only detection finds fewer than two
// competitors, a second cheap call picks real candidates out of live search
// results. Names only; the downstream resolver still validates each one.
export const COMPETITOR_RESCUE_OUTPUT: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["competitors"],
  properties: {
    competitors: { type: "array", items: { type: "string" } },
  },
};

export const competitorRescueSchema = z
  .object({
    competitors: z.array(z.string()),
  })
  .passthrough();

// The fingerprint fields are optional with safe defaults so detection
// payloads cached before these fields existed still validate; they simply
// carry an empty fingerprint.
export const detectContextSchema = z
  .object({
    // "unclear" always proceeds: a wrongly rejected real prospect costs more
    // than one wasted run, so only an explicit "outside" ever blocks.
    industryFit: z.enum(["manufacturer", "adjacent", "outside", "unclear"]).default("unclear"),
    companyName: z.string().default(""),
    productOneLiner: z.string(),
    competitors: z.array(z.string()),
    industries: z.array(z.string()).default([]),
    certifications: z.array(z.string()).default([]),
    productFamilies: z.array(z.string()).default([]),
    salesModel: z.enum(["direct", "distributors", "mixed", "unclear"]).default("unclear"),
    buyerPersona: z.string().default(""),
  })
  .passthrough();
