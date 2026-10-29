import { searchWeb, hostFromUrl } from "../web-search";
import type { SharedScorecard } from "../share";
import {
  leadBrand,
  linkedinUrl,
  personSearchWords,
  storedCompanyLinkedin,
} from "./linkedin";
import type { LinkedinLink } from "./profiles";
import { isTestContact } from "./test-contacts";

export interface LinkedinLead {
  company: string;
  firstName: string;
  url: string;
  email: string;
  report?: SharedScorecard | null;
}
export async function lookupCompanyLinkedin(
  lead: LinkedinLead
): Promise<LinkedinLink | null> {
  const company = leadBrand(lead.company, lead.firstName, lead.url);
  const stored = storedCompanyLinkedin(lead.report, lead.company, true);
  if (stored)
    return {
      url: stored,
      source: "audit",
      status: "likely",
      savedAt: new Date().toISOString(),
    };
  if (!company) return null;
  const res = await searchWeb(`"${company}" site:linkedin.com/company`);
  // Selection copied from linkedinFact in lib/scorecard/offsite.ts.
  // Deliberately no extra company-name matching: LK2 checks exact parity.
  const hit = res?.organic.find((o) => {
    const host = hostFromUrl(o.url) ?? "";
    return host.includes("linkedin.com") && /\/company\//i.test(o.url);
  });
  return hit
    ? {
        url: hit.url,
        source: "lookup",
        status: "likely",
        savedAt: new Date().toISOString(),
      }
    : null;
}
export async function lookupPersonLinkedin(
  lead: LinkedinLead
): Promise<LinkedinLink | null> {
  const firstName = lead.firstName.trim().split(/\s+/)[0];
  if (!firstName || isTestContact(lead.email)) return null;
  const company = leadBrand(lead.company, firstName, lead.url);
  if (!company) return null;
  const res = await searchWeb(
    `${personSearchWords(firstName, company)} site:linkedin.com/in`
  );
  const hit = res?.organic[0];
  const url = hit && linkedinUrl(hit.url, "in");
  if (
    !hit ||
    !url ||
    !hit.title.toLowerCase().includes(firstName.toLowerCase()) ||
    !`${hit.title} ${hit.snippet}`.toLowerCase().includes(company.toLowerCase())
  )
    return null;
  return {
    url,
    label: hit.title,
    source: "lookup",
    status: "likely",
    savedAt: new Date().toISOString(),
  };
}
// Independent caps: a failed/hung company search cannot block the person.
export async function boundedLookup(
  work: () => Promise<LinkedinLink | null>
): Promise<LinkedinLink | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work(),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), 8000);
      }),
    ]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
