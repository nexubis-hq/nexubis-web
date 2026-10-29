import { readLinkedinWebsite, type WebsiteLinkedin } from "./linkedin-website";
import { searchWeb, hostFromUrl } from "../web-search";
import type { SharedScorecard } from "../share";
import {
  leadBrand,
  emailName,
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
  lead: LinkedinLead,
  website?: WebsiteLinkedin[]
): Promise<LinkedinLink | null> {
  const company = leadBrand(lead.company, lead.firstName, lead.url);
  const links = website ?? (await readLinkedinWebsite(lead.url));
  const companies = links.filter((link) => linkedinUrl(link.url, "company"));
  const brand = company.toLowerCase();
  const found =
    companies.find(
      (link) =>
        brand &&
        `${new URL(link.url).pathname} ${link.text}`
          .toLowerCase()
          .includes(brand)
    ) || companies[0];
  if (found)
    return {
      url: linkedinUrl(found.url, "company")!,
      source: "website",
      status: "likely",
      savedAt: new Date().toISOString(),
    };
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
        url: linkedinUrl(hit.url, "company") || hit.url,
        source: "lookup",
        status: "likely",
        savedAt: new Date().toISOString(),
      }
    : null;
}
export async function lookupPersonLinkedin(
  lead: LinkedinLead,
  website?: WebsiteLinkedin[]
): Promise<LinkedinLink | null> {
  const firstName = lead.firstName.trim().split(/\s+/)[0];
  if (isTestContact(lead.email)) return null;
  const company = leadBrand(lead.company, firstName, lead.url);
  if (!company) return null;
  const { lastName } = emailName(lead.email, firstName);
  const links = website ?? (await readLinkedinWebsite(lead.url));
  const found = links.find(
    (link) =>
      linkedinUrl(link.url, "in") &&
      [firstName, lastName].some(
        (name) =>
          name &&
          `${link.text} ${link.surrounding}`
            .toLowerCase()
            .includes(name.toLowerCase())
      )
  );
  if (found)
    return {
      url: linkedinUrl(found.url, "in")!,
      label: found.text,
      source: "website",
      status: "likely",
      savedAt: new Date().toISOString(),
    };
  if (lastName) {
    const result = await searchWeb(
      `${lastName} ${company} site:linkedin.com/in`
    );
    const top = result?.organic[0];
    const url = top && linkedinUrl(top.url, "in");
    if (
      top &&
      url &&
      top.title.toLowerCase().includes(lastName.toLowerCase()) &&
      `${top.title} ${top.snippet}`
        .toLowerCase()
        .includes(company.toLowerCase())
    )
      return {
        url,
        label: top.title,
        source: "lookup",
        status: "likely",
        savedAt: new Date().toISOString(),
      };
  }
  if (!firstName) return null;
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
