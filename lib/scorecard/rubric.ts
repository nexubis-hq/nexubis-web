// The Part 2B rubric: 5 categories, 5 checks each, every check scored 0 to 4
// from the EvidenceBundle. 0 to 20 per category, 0 to 100 overall. The same
// rubric runs on the prospect and every resolved competitor. This file is the
// single source of truth for category order, check definitions and the
// first-fix tie-break order; scoring, prompts and the report UI all read it.

export type CategoryKey =
  | "brand-identity"
  | "website"
  | "product-visuals"
  | "trade-show-print"
  | "message-clarity";

export interface CheckDef {
  key: string;
  /** Short label for internal/admin surfaces. */
  label: string;
  /** The check in plain words, for the report's "what we looked at" list. */
  plain: string;
  /** Scoring guidance handed to the model verbatim. */
  guidance: string;
  /** True when code, not the model, supplies this check's score. */
  deterministic?: boolean;
}

export interface CategoryDef {
  key: CategoryKey;
  label: string;
  checks: CheckDef[];
}

export const RUBRIC: readonly CategoryDef[] = [
  {
    key: "brand-identity",
    label: "Brand identity",
    checks: [
      {
        key: "visual-consistency",
        label: "Logo, colour and type consistency",
        plain: "Whether the logo, colours and typography hold together across the pages we saw",
        guidance: "Consistent logo, colour and type across the crawled pages and screenshots. 4 = one coherent system everywhere seen; 0 = clashing or improvised styling page to page.",
      },
      {
        key: "premium-feel",
        label: "Premium versus dated feel",
        plain: "Whether the brand reads premium or dated at first sight",
        guidance: "Premium versus dated feel, from the first-impression read and design signals. 4 = reads premium and current; 0 = clearly dated.",
      },
      {
        key: "language-reach",
        label: "Language coverage for export markets",
        plain: "Whether buyers in your export markets can read you in their language",
        guidance: "Language coverage, from the deterministic language page signal ONLY (never guess languages). 4 = the site covers its main buying markets' languages; 2 = one or two beyond the home language; 0 to 1 = a single language while the site names international customers, distributors or export markets. If no language signal is present or the site could not be crawled, mark not assessable.",
      },
      {
        key: "market-leader-look",
        label: "Market leader versus job shop",
        plain: "Whether the company looks like a market leader or a job shop",
        guidance: "Does the overall presentation read like a category leader or a small job shop? 4 = unmistakable leader; 0 = indistinguishable from a commodity supplier.",
      },
      {
        key: "touchpoint-cohesion",
        label: "Cohesion across touchpoints",
        plain: "Whether every touchpoint we found online tells the same brand story",
        guidance: "Cohesion across every touchpoint found online (site, LinkedIn, documents, exhibition listings). 4 = one brand everywhere; 0 = different company each place.",
      },
    ],
  },
  {
    key: "website",
    label: "Website",
    checks: [
      {
        key: "five-second-test",
        label: "Five-second test",
        plain: "Whether a first-time visitor can tell in five seconds what they make, for whom, and why it is worth more",
        guidance: "Five-second test on the first-load screenshot: is it clear what they make, for whom, and why it is worth more? 4 = all three instantly clear; 0 = a stranger could not say what the company does.",
      },
      {
        key: "design-quality",
        label: "Design quality next to competitors",
        plain: "How the design holds up next to the competitors in this report",
        guidance: "Design quality relative to the competitor first impressions provided. 4 = clearly the best-designed of the set; 0 = clearly the weakest.",
      },
      {
        key: "pagespeed",
        label: "Loading speed",
        plain: "Measured loading speed on mobile and desktop",
        guidance: "Set score to null; the pipeline supplies this from measured PageSpeed numbers.",
        deterministic: true,
      },
      {
        key: "mobile-rendering",
        label: "Mobile rendering",
        plain: "Whether the site works properly on a phone",
        guidance: "Mobile rendering quality from the mobile first-impression screenshot. Score only what is visible; if no mobile screenshot exists, mark not assessable.",
      },
      {
        key: "outdated-signals",
        label: "Outdated signals",
        plain: "Old copyright years, stock photos, broken layouts and other age giveaways",
        guidance: "Outdated signals: old copyright years, obvious stock photos, broken or legacy layouts, dead patterns. 4 = none seen; 0 = several clear signals.",
      },
    ],
  },
  {
    key: "product-visuals",
    label: "Product visuals",
    checks: [
      {
        key: "imagery-quality",
        label: "Product imagery quality",
        plain: "The quality of the product photography and renders",
        guidance: "Product imagery quality from screenshots and page signals. 4 = commissioned, sharp, well-lit product imagery; 0 = none or low-grade snapshots.",
      },
      {
        key: "three-d-cgi",
        label: "3D or CGI presence",
        plain: "Whether 3D renders or CGI show the product properly",
        guidance: "3D or CGI presence (renders, cutaways, configurators). 4 = high-grade 3D central to the product story; 0 = none found. Use the vision read and page signals.",
      },
      {
        key: "video",
        label: "Video presence",
        plain: "Whether video shows the product working",
        guidance: "Video presence showing the product or process. 4 = quality video prominent; 0 = none found. Page signals reporting embedded video count as positive proof.",
      },
      {
        key: "shows-function",
        label: "Visuals show what the machine does",
        plain: "Whether the visuals show what the machine actually does, inside and out, or just static photos",
        guidance: "Do visuals show what the machine actually does (process, internals, output), or only static exterior photos? 4 = function is visible; 0 = nothing shows what it does.",
      },
      {
        key: "competitor-level",
        label: "Visuals at competitor level",
        plain: "Whether the visuals are at the level of the competitors in this report, or above",
        guidance: "Visuals at competitor level or above, judged against the competitor first impressions provided. 4 = clearly above the set; 0 = clearly below.",
      },
    ],
  },
  {
    key: "trade-show-print",
    label: "Trade show and print",
    checks: [
      {
        key: "brochures-findable",
        label: "Brochures and spec sheets findable",
        plain: "Whether a buyer researching you can find brochures and spec sheets at all",
        guidance: "Downloadable brochures and spec sheets findable online, from the verified web evidence and PDF page signals. If nothing is found, that IS the finding: buyers researching the company cannot find a single brochure. Score 0 in that case, not null.",
      },
      {
        key: "brochure-design",
        label: "Brochure design quality",
        plain: "The design quality of the documents we could find",
        guidance: "Design quality of the found documents, judged from their titles, context and any visible previews. Score only if documents were found; otherwise mark not assessable.",
      },
      {
        key: "spec-sheets",
        label: "Technical documentation depth",
        plain: "Whether proper spec sheets and technical documentation are available",
        guidance: "Depth of technical documentation available to a researching buyer (spec sheets, datasheets, catalogues). Use the verified web evidence and downloads pages.",
      },
      {
        key: "exhibitions",
        label: "Trade show presence",
        plain: "Exhibition pages, fair listings or trade show photos",
        guidance: "Exhibition pages or trade show presence findable online (fair listings, exhibitor pages, event photos). Use the verified web evidence.",
      },
      {
        key: "print-web-consistency",
        label: "Print-to-web consistency",
        plain: "Whether the printed material matches the website's brand",
        guidance: "Print-to-web brand consistency, judged from found documents versus the site. Score only if documents were found; otherwise mark not assessable.",
      },
    ],
  },
  {
    key: "message-clarity",
    label: "Message clarity",
    checks: [
      {
        key: "worth-more",
        label: "Why this is worth more",
        plain: "Whether a buyer can tell in seconds why this product is worth more",
        guidance: "Can a buyer tell in seconds why this is worth more than cheaper alternatives? 4 = the value case is immediate; 0 = nothing distinguishes it.",
      },
      {
        key: "value-language",
        label: "Value language versus feature dump",
        plain: "Whether the copy sells outcomes or lists features",
        guidance: "Value language versus feature dump. 4 = benefits and outcomes lead, features support; 0 = spec-sheet language only.",
      },
      {
        key: "quote-path",
        label: "Path to a quote",
        plain: "What happens when a buyer wants a price: whether the enquiry path takes them seriously",
        guidance: "The path from interest to enquiry, judged from the crawled contact/enquiry pages and the enquiry-form page signal. 4 = a buyer can state their application properly (technical or application fields, guided product selection, a clear response promise); 2 = a standard generic contact form; 0 to 1 = the enquiry path is hard to find or a bare form for a custom-engineered product. Score ONLY what the crawled pages and form signals show; if no contact or enquiry page was crawled, mark not assessable (the form may exist but was not seen).",
      },
      {
        key: "proof-points",
        label: "Proof points",
        plain: "Numbers, cases and evidence that back the claims",
        guidance: "Proof points present: numbers, case results, references, certifications backing the claims. 4 = concrete proof throughout; 0 = unsupported claims.",
      },
      {
        key: "copy-quality",
        label: "Copy quality",
        plain: "The quality of the English or local-language copy",
        guidance: "Quality of the English or local-language copy: grammar, clarity, confidence. 4 = clean and confident; 0 = broken or machine-translated.",
      },
    ],
  },
] as const;

// First place to fix: lowest prospect category; ties broken by buyer
// visibility order. This order is the spec's, not the rubric's display order.
export const FIRST_FIX_ORDER: readonly CategoryKey[] = [
  "website",
  "message-clarity",
  "product-visuals",
  "brand-identity",
  "trade-show-print",
];

export const CATEGORY_KEYS: readonly CategoryKey[] = RUBRIC.map((c) => c.key);

export function categoryDef(key: CategoryKey): CategoryDef {
  const def = RUBRIC.find((c) => c.key === key);
  if (!def) throw new Error(`Unknown category: ${key}`);
  return def;
}

export function categoryLabel(key: CategoryKey): string {
  return categoryDef(key).label;
}
