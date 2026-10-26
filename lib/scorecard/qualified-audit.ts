import type { DetectionResult } from "./detect";

export interface QualifiedAuditDecision {
  qualified: boolean;
  reason: string;
}

/** Reporting only. Buyer wording is not required: weak manufacturer sites
 * often omit it. Keep qualification separate from scoring and lead routing. */
export function qualifiedAuditDecision(read: DetectionResult | null | undefined): QualifiedAuditDecision {
  const reject = (reason: string): QualifiedAuditDecision => ({ qualified: false, reason });
  if (!read) return reject("site read not available");
  if (read.flags.some((flag) => /could not read|detect.*failed/i.test(flag))) return reject("site read or detection failed");
  if (read.industryFit !== "manufacturer") return reject(`not read as a manufacturer (${read.industryFit})`);
  if (!read.productOneLiner.trim()) return reject("no product description");
  const fingerprint = read.fingerprint;
  if (!fingerprint?.productFamilies.some((product) => product.trim())) return reject("no named product families");
  if (/\b(unknown|unclear|uncertain|low confidence|possibly|probably|likely|might|may be|appears to)\b/i.test(read.productOneLiner)) return reject("product description is uncertain");
  if (/\b(software|consultancy|consulting|garage|repair services)\b/i.test(read.productOneLiner)) return reject("product description is software or services");
  return { qualified: true, reason: "manufacturer with named products" };
}

export function isQualifiedAudit(read: DetectionResult | null | undefined): boolean {
  return qualifiedAuditDecision(read).qualified;
}

export function formatQualifiedAuditDecision(decision?: QualifiedAuditDecision): string {
  return decision ? `${decision.qualified ? "yes" : "no"} (${decision.reason})` : "not recorded";
}
