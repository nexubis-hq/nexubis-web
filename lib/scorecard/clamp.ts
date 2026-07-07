// Hard word-count ceiling for AI-generated report copy. The prompts already ask
// the model to stay short, but a model can run long; this enforces it so the
// report stays tight no matter what. Caps sit a few words above each prompt
// target, so normal output passes through untouched and only real outliers get
// trimmed. The per-block clamp table lives with the copy schemas (Prompt 3);
// this module holds the primitive.

export function clampWords(text: string, max: number): string {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/);
  if (words.length <= max) return trimmed;
  return words.slice(0, max).join(" ").replace(/[,;:.]+$/, "") + "…";
}

// The per-block clamp table for the report copy. Caps sit a few words above
// each prompt budget (verdict 85, finding 26, competitor note 22, first-fix
// why 75 / in-practice 85), so normal output passes untouched.
import type { DeckCopy } from "./result";

export const DECK_COPY_CAPS = {
  verdictParagraph: 95,
  finding: 30,
  competitorNote: 26,
  firstFixWhy: 85,
  firstFixInPractice: 95,
  maxFindingsPerCategory: 3,
} as const;

export function clampDeckCopy(copy: DeckCopy): DeckCopy {
  return {
    verdictParagraph: clampWords(copy.verdictParagraph, DECK_COPY_CAPS.verdictParagraph),
    categories: copy.categories.map((c) => ({
      ...c,
      findings: c.findings.slice(0, DECK_COPY_CAPS.maxFindingsPerCategory).map((f) => clampWords(f, DECK_COPY_CAPS.finding)),
      competitorNote: clampWords(c.competitorNote, DECK_COPY_CAPS.competitorNote),
    })),
    firstFix: {
      why: clampWords(copy.firstFix.why, DECK_COPY_CAPS.firstFixWhy),
      inPractice: clampWords(copy.firstFix.inPractice, DECK_COPY_CAPS.firstFixInPractice),
    },
  };
}
