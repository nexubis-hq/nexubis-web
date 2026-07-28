import { describe, expect, it } from "vitest";
import { getAllCaseStudies, getCaseStudyBySlug, getRelatedCaseStudies } from "./data";

describe("case-study data", () => {
  it("exposes the recovered Webflow CMS slugs only", () => {
    expect(getAllCaseStudies().map((caseStudy) => caseStudy.slug)).toEqual([
      "altify",
      "circuit",
      "oxipack",
    ]);
  });

  it("returns case studies by slug and rejects unknown slugs", () => {
    expect(getCaseStudyBySlug("circuit")?.title).toBe("Circuit Rebrand and Website launch");
    expect(getCaseStudyBySlug("sataya")).toBeUndefined();
  });

  it("keeps related project navigation within known slugs", () => {
    for (const caseStudy of getAllCaseStudies()) {
      expect(getRelatedCaseStudies(caseStudy.relatedSlugs)).toHaveLength(caseStudy.relatedSlugs.length);
    }
  });
});
