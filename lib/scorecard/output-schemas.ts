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
export const DECK_COPY_OUTPUT: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["verdictParagraph", "categories", "firstFix"],
  properties: {
    verdictParagraph: { type: "string" },
    categories: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "findings", "competitorNote"],
        properties: {
          key: { type: "string", enum: [...CATEGORY_KEYS] },
          findings: { type: "array", items: { type: "string" } },
          competitorNote: { type: "string" },
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
  },
};

export const deckCopySchema = z
  .object({
    verdictParagraph: z.string(),
    categories: z.array(
      z
        .object({
          key: z.enum(CATEGORY_KEYS as [string, ...string[]]),
          findings: z.array(z.string()),
          competitorNote: z.string(),
        })
        .passthrough(),
    ),
    firstFix: z.object({ why: z.string(), inPractice: z.string() }).passthrough(),
  })
  .passthrough();

export type DeckCopyReply = z.infer<typeof deckCopySchema>;
