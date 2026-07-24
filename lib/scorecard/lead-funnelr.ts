import { createFunnelrClient, type FunnelrSystemFormField, type FunnelrTag, type FunnelrUser, type FunnelrUserProfile } from "@/lib/funnelr/client";

export const SCORECARD_REPORT_URL_FIELD_ID = "6CDFB703-9B38-43A3-A2E4-311107F15424";
export const SCORECARD_REPORT_URL_FIELD_KEY = "NexubisScorecardReportURL";
export const SCORECARD_REPORT_URL_FIELD_NAME = "Nexubis | Scorecard Report URL";
export const SCORECARD_REPORT_URL_MESSENGER_MIRROR_FIELD_NAME = "Alternative Address";
export const SCORECARD_REPORT_URL_MESSENGER_MIRROR_API_FIELD = "street";

export const BRAND_NEXUBIS_TAG_NAME = "Brand: Nexubis";
export const SOURCE_SCORECARD_TAG_NAME = "Source: Nexubis | Scorecard";
export const START_SCORECARD_SALES_TAG_NAME = "Trigger: Nexubis | Start Scorecard Sales";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_TEXT = 500;
const MAX_URL = 1000;

export interface ScorecardLeadInput {
  firstName: string;
  lastName?: string;
  email: string;
  company?: string;
  marketingConsent?: boolean;
  reportUrl?: string;
}

export interface ScorecardLeadResult {
  ok: boolean;
  contactCreated?: boolean;
  tagsApplied?: string[];
  customFieldsUpdated?: string[];
  standardFieldsUpdated?: string[];
  error?: string;
}

export interface ScorecardLeadFunnelrClient {
  findContactByEmail(email: string): Promise<FunnelrUser | null>;
  createContact(input: { email: string; firstName?: string; lastName?: string; company?: string; street?: string; hasAcceptedMarketing?: boolean }): Promise<FunnelrUser>;
  updateContact(input: {
    userId: number;
    email: string;
    firstName?: string;
    lastName?: string;
    company?: string;
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
  findTagByName(name: string): Promise<FunnelrTag | null>;
  contactHasTag(userId: number, tagId: string): Promise<boolean>;
  addTagToContact(userId: number, tagId: string): Promise<void>;
  listSystemFormFields(): Promise<FunnelrSystemFormField[]>;
  updateContactCustomFields(userId: number, userProfiles: Array<{ formFieldId: string; value: unknown }>): Promise<void>;
  getContactCustomFields(userId: number): Promise<FunnelrUserProfile[]>;
}

export interface NormalizedScorecardLead {
  firstName: string;
  lastName?: string;
  email: string;
  company?: string;
  marketingConsent?: boolean;
  reportUrl?: string;
}

const FIELD_MATCHES = {
  reportUrl: [SCORECARD_REPORT_URL_FIELD_NAME.toLowerCase(), SCORECARD_REPORT_URL_FIELD_KEY.toLowerCase(), SCORECARD_REPORT_URL_FIELD_ID.toLowerCase()],
} as const;

function cleanText(value: unknown, max = MAX_TEXT): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export function normalizeScorecardLeadInput(input: unknown): NormalizedScorecardLead | { error: string } {
  if (!input || typeof input !== "object") return { error: "Invalid payload." };
  const body = input as Record<string, unknown>;
  const firstName = cleanText(body.firstName, 80);
  const lastName = cleanText(body.lastName, 80);
  const email = cleanText(body.email, 256).toLowerCase();
  const company = cleanText(body.company, 160);
  const reportUrl = cleanText(body.reportUrl, MAX_URL);

  if (!firstName) return { error: "First name is required." };
  if (!EMAIL_RE.test(email)) return { error: "A valid email is required." };
  if (body.marketingConsent !== undefined && typeof body.marketingConsent !== "boolean") {
    return { error: "Marketing consent must be true or false." };
  }
  if (reportUrl && !/^https?:\/\//i.test(reportUrl)) return { error: "Report URL must be a valid URL." };

  return {
    firstName,
    ...(lastName ? { lastName } : {}),
    email,
    ...(company ? { company } : {}),
    ...(typeof body.marketingConsent === "boolean" ? { marketingConsent: body.marketingConsent } : {}),
    ...(reportUrl ? { reportUrl } : {}),
  };
}

export function scorecardSlugFromReportUrl(reportUrl: string, allowedOrigin?: string): string | null {
  try {
    const parsed = new URL(reportUrl);
    if (allowedOrigin && parsed.origin !== allowedOrigin) return null;
    const match = parsed.pathname.match(/^\/scorecard\/r\/([abcdefghjkmnpqrstuvwxyz23456789]{8})$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function normalizeIdentifier(value: string): string {
  return value.toLowerCase().replace(/[-_/|]+/g, " ").replace(/\s+/g, " ").trim();
}

function fieldLabel(field: FunnelrSystemFormField): string {
  return `${field.formFieldId ?? ""} ${field.formFieldKey ?? ""} ${field.name ?? ""} ${field.label ?? ""}`.toLowerCase();
}

function findField(fields: FunnelrSystemFormField[], names: readonly string[]): FunnelrSystemFormField | null {
  const normalizedNames = names.map(normalizeIdentifier);
  return (
    fields.find((field) => {
      if (field.formFieldTypeKey !== "ContactProfile") return false;
      if (field.formFieldId.toLowerCase() === SCORECARD_REPORT_URL_FIELD_ID.toLowerCase()) return true;
      if (field.formFieldKey?.toLowerCase() === SCORECARD_REPORT_URL_FIELD_KEY.toLowerCase()) return true;
      if (field.name === SCORECARD_REPORT_URL_FIELD_NAME) return true;
      const label = normalizeIdentifier(fieldLabel(field));
      return normalizedNames.some((name) => label === name || label.includes(name));
    }) ?? null
  );
}

function requireUserId(contact: FunnelrUser): number {
  if (typeof contact.userId !== "number") throw new Error("Funnelr contact did not include a userId.");
  return contact.userId;
}

function safeError(err: unknown): string {
  return err instanceof Error ? err.message.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]").slice(0, 240) : "Funnelr integration failed.";
}

function profileValue(profile: FunnelrUserProfile): string {
  const record = profile as FunnelrUserProfile & { plainTextValue?: unknown };
  const value = profile.value ?? record.plainTextValue;
  return typeof value === "string" ? value : "";
}

export function buildCustomFieldUpdates(input: NormalizedScorecardLead, fields: FunnelrSystemFormField[]): {
  updates: Array<{ formFieldId: string; value: unknown }>;
  updatedNames: string[];
} {
  const values = {
    reportUrl: input.reportUrl,
  };
  const updates: Array<{ formFieldId: string; value: unknown }> = [];
  const updatedNames: string[] = [];

  for (const [name, aliases] of Object.entries(FIELD_MATCHES)) {
    if (values[name as keyof typeof values] === undefined) continue;
    const field = findField(fields, aliases);
    if (!field?.formFieldId) throw new Error(`Required Funnelr custom field was not found: ${SCORECARD_REPORT_URL_FIELD_NAME}`);
    updates.push({ formFieldId: field.formFieldId, value: values[name as keyof typeof values] });
    updatedNames.push(name);
  }

  return { updates, updatedNames };
}

async function applyTag(client: ScorecardLeadFunnelrClient, userId: number, name: string): Promise<string> {
  const tag = await client.findTagByName(name);
  if (!tag?.tagId) throw new Error(`Required Funnelr tag was not found: ${name}`);
  if (!(await client.contactHasTag(userId, tag.tagId))) {
    await client.addTagToContact(userId, tag.tagId);
  }
  if (!(await client.contactHasTag(userId, tag.tagId))) throw new Error(`Funnelr tag application could not be verified: ${name}`);
  return name;
}

async function verifyReportUrlWrites(client: ScorecardLeadFunnelrClient, userId: number, email: string, reportUrl: string): Promise<void> {
  const [contact, profiles] = await Promise.all([client.findContactByEmail(email), client.getContactCustomFields(userId)]);
  if (contact?.street !== reportUrl) {
    throw new Error(`${SCORECARD_REPORT_URL_MESSENGER_MIRROR_FIELD_NAME} mirror was not saved correctly.`);
  }

  const reportProfile = profiles.find((profile) => {
    if (profile.formFieldId?.toLowerCase() === SCORECARD_REPORT_URL_FIELD_ID.toLowerCase()) return true;
    if (profile.formFieldKey?.toLowerCase() === SCORECARD_REPORT_URL_FIELD_KEY.toLowerCase()) return true;
    if (profile.formFieldName === SCORECARD_REPORT_URL_FIELD_NAME || profile.formFieldLabel === SCORECARD_REPORT_URL_FIELD_NAME) return true;
    return false;
  });
  if (profileValue(reportProfile ?? ({ formFieldId: SCORECARD_REPORT_URL_FIELD_ID } as FunnelrUserProfile)) !== reportUrl) {
    throw new Error(`${SCORECARD_REPORT_URL_FIELD_NAME} was not saved correctly.`);
  }
}

export async function submitScorecardLeadToFunnelr(
  input: ScorecardLeadInput,
  options: { client?: ScorecardLeadFunnelrClient; now?: Date } = {},
): Promise<ScorecardLeadResult> {
  const normalized = normalizeScorecardLeadInput(input);
  if ("error" in normalized) return { ok: false, error: normalized.error };

  const client = options.client ?? createFunnelrClient();

  try {
    const existing = await client.findContactByEmail(normalized.email);
    const contact =
      existing ??
      (await client.createContact({
        email: normalized.email,
        firstName: normalized.firstName,
        lastName: normalized.lastName,
        company: normalized.company,
        street: normalized.reportUrl,
        hasAcceptedMarketing: normalized.marketingConsent,
      }));
    const userId = requireUserId(contact);

    if (existing) {
      await client.updateContact({
        userId,
        email: normalized.email,
        firstName: normalized.firstName,
        lastName: normalized.lastName,
        company: normalized.company ?? existing.company ?? undefined,
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
        street: normalized.reportUrl ?? existing.street,
        unit: existing.unit,
        telephone: existing.telephone,
        timeZoneKey: existing.timeZoneKey,
        unsubscribeReasonKey: existing.unsubscribeReasonKey,
        companyTaxNumber: existing.companyTaxNumber,
        companyRegistrationNumber: existing.companyRegistrationNumber,
        statusId: existing.statusId,
        rankId: existing.rankId,
        hasAcceptedMarketing: normalized.marketingConsent,
      });
    }

    const fields = await client.listSystemFormFields();
    const { updates, updatedNames } = buildCustomFieldUpdates(normalized, fields);
    await client.updateContactCustomFields(userId, updates);
    if (normalized.reportUrl) {
      await verifyReportUrlWrites(client, userId, normalized.email, normalized.reportUrl);
    }

    const tagsApplied = [
      await applyTag(client, userId, BRAND_NEXUBIS_TAG_NAME),
      await applyTag(client, userId, SOURCE_SCORECARD_TAG_NAME),
      await applyTag(client, userId, START_SCORECARD_SALES_TAG_NAME),
    ];

    return {
      ok: true,
      contactCreated: !existing,
      tagsApplied,
      customFieldsUpdated: updatedNames,
      standardFieldsUpdated: normalized.reportUrl ? [SCORECARD_REPORT_URL_MESSENGER_MIRROR_FIELD_NAME] : [],
    };
  } catch (err) {
    return { ok: false, error: safeError(err) };
  }
}
