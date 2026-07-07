// Structured-output JSON Schemas (enforced by the API via output_config) and
// their zod twins (belt-and-braces validation at the boundary, plus the
// repair-retry signal). Rubric and copy schemas join in the scoring prompt;
// this file starts with the evidence-stage reads.
import { z } from "zod";

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
