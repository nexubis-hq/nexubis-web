import { getKv } from "../kv";
import { linkedinUrl } from "./linkedin";
export interface LeadProfile {
  linkedinProfile: string | null;
  companyLinkedin: string | null;
}
const key = (leadPath: string) => `scorecard-lead-profile:${leadPath}`;
export async function readLeadProfile(
  leadPath: string
): Promise<LeadProfile | null> {
  return getKv().get<LeadProfile>(key(leadPath));
}
export async function saveLeadProfile(
  leadPath: string,
  person: string,
  company: string
): Promise<void> {
  const linkedinProfile = linkedinUrl(person, "in");
  const companyLinkedin = linkedinUrl(company, "company");
  if (
    (person.trim() && !linkedinProfile) ||
    (company.trim() && !companyLinkedin)
  )
    throw new Error(
      "Use a linkedin.com/in/ profile URL and a linkedin.com/company/ company URL."
    );
  await getKv().set(
    key(leadPath),
    { linkedinProfile, companyLinkedin },
    { ex: 180 * 86400 }
  );
}
