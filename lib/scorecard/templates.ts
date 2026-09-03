// Templated fallback copy, used when the model's copy pass fails or a block
// trips the content-safety scan. Plain, factual, built from the computed
// numbers only, so it can never invent evidence. Duller than the generated
// copy by design: safe beats sparkling when the generated block was unsafe.
import { categoryLabel, type CategoryKey } from "./rubric";
import { VERDICT_LINES } from "./copy";
import { workingItems, fixItems, deriveTopIssues, deriveStartList, deriveStayingSame } from "./report-derive";
import type { Benchmark, CompanyScores, VerdictBand } from "./scoring";
import type { CategoryCopy, DeckCopy } from "./result";

export function fallbackVerdictParagraph(args: {
  company: string;
  overall: number;
  band: VerdictBand;
  benchmark: Benchmark;
  firstFixLabel: string | null;
}): string {
  const bandLine =
    args.band === "narrow"
      ? `Your brand largely matches your product. The notes in this report show where to sharpen.`
      : args.band === "visible"
        ? `Your brand undersells your product where buyers look first. The fixes are specific and contained.`
        : `Your brand is costing you sales. The findings in this report show where, and the first fix is clear.`;
  const stanceLine =
    args.benchmark.stance === "ahead"
      ? ` You lead the competitors in this benchmark.`
      : args.benchmark.stance === "level"
        ? ` You are level with ${args.benchmark.bestRival?.company ?? "your strongest rival"}; small gains tip the tie-breaker your way.`
        : args.benchmark.stance === "behind"
          ? ` ${args.benchmark.bestRival?.company ?? "A named rival"} currently looks more credible, which makes this worth acting on now.`
          : "";
  const fixLine = args.firstFixLabel ? ` The first place to fix is ${args.firstFixLabel.toLowerCase()}.` : "";
  return `${args.company} scores ${args.overall} out of 100. ${bandLine}${stanceLine}${fixLine}`;
}

export function fallbackCategoryCopy(prospect: CompanyScores, rivals: CompanyScores[]): CategoryCopy[] {
  return prospect.categories.map((cat) => {
    const label = categoryLabel(cat.key);
    const findings: string[] = [];
    if (cat.total === null) {
      findings.push(`${label} could not be assessed from what is publicly visible. That itself is worth a closer look.`);
    } else {
      findings.push(`${label} scores ${cat.total} out of 20 across ${cat.assessedChecks} checks.`);
      const weakest = cat.checks
        .filter((c) => c.assessable && c.score !== null)
        .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];
      if (weakest) findings.push(weakest.evidence);
    }
    const rivalTotals = rivals
      .filter((r) => r.scored)
      .map((r) => {
        const rc = r.categories.find((c) => c.key === cat.key);
        return rc?.total != null ? `${r.company} ${rc.total}/20` : null;
      })
      .filter(Boolean);
    return {
      key: cat.key,
      findings,
      competitorNote: rivalTotals.length ? `Competitors here: ${rivalTotals.join(", ")}.` : "The competitors could not be compared on this category.",
      // Working/fix lists from the check scores and evidence sentences: the
      // same deterministic derivation the report used before the generator
      // produced these, so the fallback stays complete.
      working: workingItems(cat).map((i) => ({ title: i.title, body: i.body })),
      fix: fixItems(cat).map((i) => ({ title: i.title, body: i.body })),
    };
  });
}

export function fallbackFirstFix(category: CategoryKey): { why: string; inPractice: string } {
  const label = categoryLabel(category);
  return {
    why: `${label} is your lowest-scoring category, and it sits where buyers look when they size you up. Improving it moves the whole first impression.`,
    inPractice: `Fixing it starts with reviewing every finding in the ${label.toLowerCase()} section of this report, deciding what standard the brand should hold, and closing the specific gaps named there.`,
  };
}

export function fallbackDeckCopy(args: {
  company: string;
  overall: number;
  band: VerdictBand;
  benchmark: Benchmark;
  firstFix: CategoryKey | null;
  prospect: CompanyScores;
  rivals: CompanyScores[];
}): DeckCopy {
  return {
    verdictLine: VERDICT_LINES[args.band],
    verdictParagraph: fallbackVerdictParagraph({
      company: args.company,
      overall: args.overall,
      band: args.band,
      benchmark: args.benchmark,
      firstFixLabel: args.firstFix ? categoryLabel(args.firstFix) : null,
    }),
    categories: fallbackCategoryCopy(args.prospect, args.rivals),
    firstFix: args.firstFix ? fallbackFirstFix(args.firstFix) : { why: "", inPractice: "" },
    topIssues: deriveTopIssues(args.prospect).map((t) => ({ title: t.title, body: t.body, impact: t.impact })),
    startList: deriveStartList(args.prospect, args.firstFix),
    stayingSame: deriveStayingSame(args.band, args.benchmark.bestRival?.company ?? null),
  };
}
