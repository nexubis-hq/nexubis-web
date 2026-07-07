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
