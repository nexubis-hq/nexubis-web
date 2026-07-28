import { createFunnelrClient, type FunnelrTag, type FunnelrUser } from "@/lib/funnelr/client";
import { NEXUBIS_TAG_IDS, NEXUBIS_TAGS } from "@/lib/funnelr/nexubis-tags";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface ContactLeadInput {
  name: string;
  email: string;
}

export interface ContactLeadResult {
  ok: boolean;
  contactId?: number;
  contactCreated?: boolean;
  tagsApplied?: string[];
  error?: string;
}

export interface ContactLeadFunnelrClient {
  findContactByEmail(email: string): Promise<FunnelrUser | null>;
  createContact(input: { email: string; firstName?: string; hasAcceptedMarketing?: boolean }): Promise<FunnelrUser>;
  updateContact(input: {
    userId: number;
    email: string;
    firstName?: string;
    lastName?: string | null;
    company?: string | null;
    currencyCode?: string | null;
    isAgent?: boolean;
    isStaff?: boolean;
    isBouncing?: boolean;
    isPlaced?: boolean;
    isUnsubscribed?: boolean;
    rating?: number | null;
    cultureCode?: string | null;
    countryCode?: string | null;
    subdivisionCode?: string | null;
    city?: string | null;
    postalCode?: string | null;
    street?: string | null;
    unit?: string | null;
    telephone?: string | null;
    timeZoneKey?: string | null;
    unsubscribeReasonKey?: string | null;
    companyTaxNumber?: string | null;
    companyRegistrationNumber?: string | null;
    statusId?: string | null;
    rankId?: string | null;
    hasAcceptedMarketing?: boolean;
  }): Promise<FunnelrUser>;
  contactHasTag(userId: number, tagId: string): Promise<boolean>;
  addTagToContact(userId: number, tagId: string): Promise<void>;
  getContactTags(userId: number): Promise<FunnelrTag[]>;
}

export interface NormalizedContactLead {
  email: string;
  firstName: string;
}

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export function firstNameFromFullName(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean)[0] ?? "";
}

export function normalizeContactLeadForFunnelr(input: ContactLeadInput): NormalizedContactLead | { error: string } {
  const email = cleanText(input.email, 254).toLowerCase();
  const firstName = cleanText(firstNameFromFullName(input.name), 80);
  if (!firstName) return { error: "Name is required." };
  if (!EMAIL_RE.test(email)) return { error: "A valid email is required." };
  return { email, firstName };
}

function requireUserId(contact: FunnelrUser): number {
  if (typeof contact.userId !== "number") throw new Error("Funnelr contact did not include a userId.");
  return contact.userId;
}

function safeError(err: unknown): string {
  return err instanceof Error ? err.message.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]").slice(0, 240) : "Funnelr integration failed.";
}

function buildPreservingUpdate(existing: FunnelrUser, input: NormalizedContactLead) {
  const userId = requireUserId(existing);
  return {
    userId,
    email: input.email,
    firstName: input.firstName,
    lastName: existing.lastName ?? null,
    company: existing.company ?? null,
    currencyCode: existing.currencyCode,
    isAgent: existing.isAgent,
    isStaff: existing.isStaff,
    isUnsubscribed: existing.isUnsubscribed,
    isBouncing: existing.isBouncing,
    isPlaced: existing.isPlaced,
    rating: existing.rating,
    cultureCode: existing.cultureCode,
    countryCode: existing.countryCode,
    subdivisionCode: existing.subdivisionCode,
    city: existing.city,
    postalCode: existing.postalCode,
    street: existing.street,
    unit: existing.unit,
    telephone: existing.telephone,
    timeZoneKey: existing.timeZoneKey,
    unsubscribeReasonKey: existing.unsubscribeReasonKey,
    companyTaxNumber: existing.companyTaxNumber,
    companyRegistrationNumber: existing.companyRegistrationNumber,
    statusId: existing.statusId,
    rankId: existing.rankId,
    hasAcceptedMarketing: existing.hasAcceptedMarketing ?? undefined,
  };
}

async function ensureTag(client: ContactLeadFunnelrClient, userId: number, tagId: string, name: string): Promise<string> {
  if (!(await client.contactHasTag(userId, tagId))) {
    await client.addTagToContact(userId, tagId);
  }
  const tags = await client.getContactTags(userId);
  if (!tags.some((tag) => tag.tagId.toLowerCase() === tagId.toLowerCase())) {
    throw new Error(`Funnelr tag application could not be verified: ${name}`);
  }
  return name;
}

export async function submitContactLeadToFunnelr(
  input: ContactLeadInput,
  options: { client?: ContactLeadFunnelrClient } = {},
): Promise<ContactLeadResult> {
  const normalized = normalizeContactLeadForFunnelr(input);
  if ("error" in normalized) return { ok: false, error: normalized.error };

  const client = options.client ?? createFunnelrClient();

  try {
    const existing = await client.findContactByEmail(normalized.email);
    const contact =
      existing ??
      (await client.createContact({
        email: normalized.email,
        firstName: normalized.firstName,
        hasAcceptedMarketing: false,
      }));
    const userId = requireUserId(contact);

    if (existing?.currencyCode) {
      await client.updateContact(buildPreservingUpdate(existing, normalized));
    }

    const tagsApplied = [
      await ensureTag(client, userId, NEXUBIS_TAG_IDS.brand, NEXUBIS_TAGS.brand),
      await ensureTag(client, userId, NEXUBIS_TAG_IDS.sourceContactForm, NEXUBIS_TAGS.sourceContactForm),
    ];

    return {
      ok: true,
      contactId: userId,
      contactCreated: !existing,
      tagsApplied,
    };
  } catch (err) {
    return { ok: false, error: safeError(err) };
  }
}
