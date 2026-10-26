import { expect, it } from "vitest";
import { isQualifiedAudit, qualifiedAuditDecision, formatQualifiedAuditDecision } from "./qualified-audit";
import type { DetectionResult } from "./detect";

const manufacturerRead: DetectionResult = {
  industryFit: "manufacturer", companyName: "Example Machines",
  productOneLiner: "Builds packaging machinery for industrial production lines",
  competitors: [], flags: [],
  fingerprint: { industries: ["food processing"], productFamilies: ["PX packaging line"], certifications: [], salesModel: "direct", buyerPersona: "Production engineers at food factories" },
};

it.each([
  ["machine maker", manufacturerRead],
  ["component maker", { ...manufacturerRead, productOneLiner: "Manufactures precision valves for industrial plants" }],
  ["metal fabricators and contractors", { ...manufacturerRead, fingerprint: { ...manufacturerRead.fingerprint!, buyerPersona: "metal fabricators and contractors" } }],
  ["unstated buyer", { ...manufacturerRead, fingerprint: { ...manufacturerRead.fingerprint!, buyerPersona: "" } }],
  ["uncertain buyer wording only", { ...manufacturerRead, fingerprint: { ...manufacturerRead.fingerprint!, buyerPersona: "Possibly contractors" } }],
  ["consumer buyer wording", { ...manufacturerRead, fingerprint: { ...manufacturerRead.fingerprint!, buyerPersona: "Homeowners" } }],
])("qualifies a clear %s", (_label, read) => {
  expect(isQualifiedAudit(read)).toBe(true);
});

it.each([
  ["software company", { ...manufacturerRead, industryFit: "outside", productOneLiner: "Business software" }],
  ["HR consultancy", { ...manufacturerRead, industryFit: "outside", productOneLiner: "HR consulting services" }],
  ["car garage", { ...manufacturerRead, industryFit: "outside", productOneLiner: "Car garage and repair services" }],
  ["adjacent distributor", { ...manufacturerRead, industryFit: "adjacent" }],
  ["unknown", { ...manufacturerRead, industryFit: "unclear" }],
  ["empty product", { ...manufacturerRead, productOneLiner: " " }],
  ["failed read", { ...manufacturerRead, flags: ["Auto-detect could not read the site"] }],
  ["failed model", { ...manufacturerRead, flags: ["Auto-detect of product and competitors failed"] }],
  ["hedged read", { ...manufacturerRead, productOneLiner: "Possibly builds industrial equipment" }],
  ["low confidence", { ...manufacturerRead, productOneLiner: "Industrial equipment (low confidence)" }],
  ["no fingerprint", { ...manufacturerRead, fingerprint: null }],
  ["no named products", { ...manufacturerRead, fingerprint: { ...manufacturerRead.fingerprint!, productFamilies: [] } }],
  ["no industry", { ...manufacturerRead, fingerprint: { ...manufacturerRead.fingerprint!, industries: [] } }],
  ["conflicting software description", { ...manufacturerRead, productOneLiner: "Software for factory production" }],
  ["consulting description", { ...manufacturerRead, productOneLiner: "Consulting for factory production" }],
  ["consultancy description", { ...manufacturerRead, productOneLiner: "Industrial consultancy" }],
  ["garage description", { ...manufacturerRead, productOneLiner: "Garage equipment and repair services" }],
  ["missing read", null],
  ["absent read", undefined],
] as [string, DetectionResult | null | undefined][])("does not qualify %s", (_label, read) => {
  expect(isQualifiedAudit(read)).toBe(false);
});

it("returns a plain decision reason and formats older records as not recorded", () => {
  expect(qualifiedAuditDecision(manufacturerRead)).toEqual({ qualified: true, reason: "manufacturer with named products" });
  const adjacent = qualifiedAuditDecision({ ...manufacturerRead, industryFit: "adjacent" });
  expect(adjacent).toEqual({ qualified: false, reason: "not read as a manufacturer (adjacent)" });
  expect(formatQualifiedAuditDecision(adjacent)).toBe("no (not read as a manufacturer (adjacent))");
  expect(formatQualifiedAuditDecision(qualifiedAuditDecision(manufacturerRead))).toBe("yes (manufacturer with named products)");
  expect(formatQualifiedAuditDecision()).toBe("not recorded");
});
