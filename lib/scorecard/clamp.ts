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
  verdictLine: 16,
  verdictParagraph: 74,
  finding: 26,
  competitorNote: 22,
  claimTitle: 8,
  claimBody: 24,
  maxClaimsPerList: 5,
  topIssueTitle: 10,
  topIssueBody: 26,
  topIssueImpact: 20,
  maxTopIssues: 3,
  startItem: 24,
  maxStartItems: 5,
  stayingSame: 34,
  firstFixWhy: 48,
  firstFixInPractice: 54,
  maxFindingsPerCategory: 3,
} as const;

function clampClaims(items: Array<{ title: string; body: string }> | undefined) {
  if (!items) return undefined;
  return items.slice(0, DECK_COPY_CAPS.maxClaimsPerList).map((i) => ({
    title: clampWords(i.title, DECK_COPY_CAPS.claimTitle),
    body: clampWords(i.body, DECK_COPY_CAPS.claimBody),
  }));
}

export function clampDeckCopy(copy: DeckCopy): DeckCopy {
  return {
    ...(copy.verdictLine !== undefined ? { verdictLine: clampWords(copy.verdictLine, DECK_COPY_CAPS.verdictLine) } : {}),
    verdictParagraph: clampWords(copy.verdictParagraph, DECK_COPY_CAPS.verdictParagraph),
    categories: copy.categories.map((c) => ({
      ...c,
      findings: c.findings.slice(0, DECK_COPY_CAPS.maxFindingsPerCategory).map((f) => clampWords(f, DECK_COPY_CAPS.finding)),
      competitorNote: clampWords(c.competitorNote, DECK_COPY_CAPS.competitorNote),
      ...(c.working !== undefined ? { working: clampClaims(c.working) } : {}),
      ...(c.fix !== undefined ? { fix: clampClaims(c.fix) } : {}),
    })),
    firstFix: {
      why: clampWords(copy.firstFix.why, DECK_COPY_CAPS.firstFixWhy),
      inPractice: clampWords(copy.firstFix.inPractice, DECK_COPY_CAPS.firstFixInPractice),
    },
    ...(copy.topIssues !== undefined
      ? {
          topIssues: copy.topIssues.slice(0, DECK_COPY_CAPS.maxTopIssues).map((t) => ({
            title: clampWords(t.title, DECK_COPY_CAPS.topIssueTitle),
            body: clampWords(t.body, DECK_COPY_CAPS.topIssueBody),
            impact: clampWords(t.impact, DECK_COPY_CAPS.topIssueImpact),
          })),
        }
      : {}),
    ...(copy.startList !== undefined
      ? { startList: copy.startList.slice(0, DECK_COPY_CAPS.maxStartItems).map((i) => clampWords(i, DECK_COPY_CAPS.startItem)) }
      : {}),
    ...(copy.stayingSame !== undefined ? { stayingSame: clampWords(copy.stayingSame, DECK_COPY_CAPS.stayingSame) } : {}),
  };
}
