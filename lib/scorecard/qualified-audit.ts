import type { DetectionResult } from "./detect";

/** Reporting only: require a manufacturer read corroborated by named products
 * and an industrial/business buyer. No confidence score exists in this read;
 * unclear, hedged, thin or failed reads must not qualify. Keep this rule here
 * so it can be adjusted without changing audit scoring or lead routing. */
export function isQualifiedAudit(read: DetectionResult | null | undefined): boolean {
  if (read?.industryFit !== "manufacturer" || !read.productOneLiner.trim()) return false;
  const fingerprint = read.fingerprint;
  if (!fingerprint?.productFamilies.some((product) => product.trim())) return false;
  if (!fingerprint.industries.some((industry) => industry.trim())) return false;
  const description = `${read.productOneLiner} ${fingerprint.buyerPersona}`;
  if (/\b(unknown|unclear|uncertain|low confidence|possibly|probably|likely|might|may be|appears to)\b/i.test(description)) return false;
  if (/\b(software|consultancy|consulting|garage|repair services)\b/i.test(read.productOneLiner)) return false;
  if (read.flags.some((flag) => /could not read|detect.*failed/i.test(flag))) return false;
  return /\b(b2b|business|industrial|engineers?|procurement|manufacturers?|manufacturing|factories|factory|plants?|production)\b/i.test(fingerprint.buyerPersona);
}
