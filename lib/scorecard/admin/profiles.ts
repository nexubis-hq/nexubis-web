import type { CompanySocial } from "./company-socials";
import { Redis } from "@upstash/redis";
import { getKv } from "../kv";
import { linkedinUrl } from "./linkedin";
export interface LinkedinLink {
  url: string;
  label?: string;
  source: "audit" | "lookup" | "manual" | "website";
  status: "likely" | "confirmed" | "manual";
  savedAt: string;
}
// Retain the existing field and key. Strings are the admin-polish-2 shape.
export interface LeadProfile {
  linkedinProfile: LinkedinLink | string | null;
  companyLinkedin: LinkedinLink | string | null;
  lookedUpAt?: string;
  lookupVersion?: number;
  companySocials?: CompanySocial[];
}
export interface NormalizedProfile {
  linkedinProfile: LinkedinLink | null;
  companyLinkedin: LinkedinLink | null;
  lookedUpAt?: string;
  lookupVersion?: number;
  companySocials?: CompanySocial[];
}
export const PROFILE_TTL = 180 * 86400;
const key = (leadPath: string) => `scorecard-lead-profile:${leadPath}`;
export function normalizeProfile(
  profile?: LeadProfile | null
): NormalizedProfile {
  const normalize = (
    value: LeadProfile["linkedinProfile"]
  ): LinkedinLink | null =>
    typeof value === "string"
      ? { url: value, status: "manual", source: "manual", savedAt: "" }
      : value || null;
  return {
    linkedinProfile: normalize(profile?.linkedinProfile || null),
    companyLinkedin: normalize(profile?.companyLinkedin || null),
    ...(profile?.companySocials
      ? { companySocials: profile.companySocials }
      : {}),
    ...(profile?.lookupVersion !== undefined
      ? { lookupVersion: profile.lookupVersion }
      : {}),
    ...(profile?.lookedUpAt ? { lookedUpAt: profile.lookedUpAt } : {}),
  };
}
export async function readLeadProfile(
  leadPath: string
): Promise<NormalizedProfile | null> {
  const value = await getKv().get<LeadProfile>(key(leadPath));
  return value ? normalizeProfile(value) : null;
}
export async function writeLeadProfile(
  leadPath: string,
  profile: NormalizedProfile
): Promise<void> {
  await getKv().set(key(leadPath), profile, { ex: PROFILE_TTL });
}
// Serialize all admin writers, including manual saves. No public KV API changes.
export async function withProfileLock<T>(
  leadPath: string,
  work: () => Promise<T>
): Promise<T> {
  const kv = getKv();
  const lock = `${key(leadPath)}:lock`;
  const supportsNx = kv instanceof Redis;
  // Production returns the actual Upstash Redis client, which supports NX.
  // The development memory adapter ignores NX, so retain its legacy lock.
  if (supportsNx) {
    const acquired = await kv.set(lock, 1, { nx: true, ex: 30 });
    if (acquired !== "OK")
      throw new Error("LinkedIn update in progress. Try again shortly.");
  } else {
    const count = await kv.incr(lock);
    if (count !== 1)
      throw new Error("LinkedIn update in progress. Try again shortly.");
  }
  try {
    if (!supportsNx) await kv.expire(lock, 30);
    return await work();
  } finally {
    await kv.del(lock);
  }
}
export function mergeLookup(
  profile: NormalizedProfile,
  company: LinkedinLink | null,
  person: LinkedinLink | null,
  at: string,
  companySocials: CompanySocial[] = profile.companySocials || []
): NormalizedProfile {
  const fill = (old: LinkedinLink | null, next: LinkedinLink | null) =>
    !old || old.status === "likely" ? next || old : old;
  return {
    companyLinkedin: fill(profile.companyLinkedin, company),
    linkedinProfile: fill(profile.linkedinProfile, person),
    lookedUpAt: at,
    lookupVersion: 3,
    companySocials,
  };
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
      "Use a https://linkedin.com/in/ profile URL and a https://linkedin.com/company/ company URL."
    );
  await withProfileLock(leadPath, async () => {
    const profile = normalizeProfile(await readLeadProfile(leadPath));
    const manual = (url: string | null): LinkedinLink | null =>
      url
        ? {
            url,
            source: "manual",
            status: "manual",
            savedAt: new Date().toISOString(),
          }
        : null;
    await writeLeadProfile(leadPath, {
      ...profile,
      linkedinProfile: manual(linkedinProfile),
      companyLinkedin: manual(companyLinkedin),
    });
  });
}
