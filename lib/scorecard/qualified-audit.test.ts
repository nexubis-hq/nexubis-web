import { expect, it } from "vitest";
import { isQualifiedAudit } from "./qualified-audit";
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
  ["no business buyer", { ...manufacturerRead, fingerprint: { ...manufacturerRead.fingerprint!, buyerPersona: "" } }],
  ["consumer buyer", { ...manufacturerRead, fingerprint: { ...manufacturerRead.fingerprint!, buyerPersona: "Homeowners" } }],
  ["conflicting software description", { ...manufacturerRead, productOneLiner: "Software for factory production" }],
  ["missing read", null],
  ["absent read", undefined],
] as [string, DetectionResult | null | undefined][])("does not qualify %s", (_label, read) => {
  expect(isQualifiedAudit(read)).toBe(false);
});
