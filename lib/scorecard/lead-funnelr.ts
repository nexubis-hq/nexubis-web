import { createFunnelrClient, type FunnelrContactField, type FunnelrList, type FunnelrUser } from "@/lib/funnelr/client";

export const SCORECARD_LEADS_LIST_NAME = "Scorecard Leads - Sales Sequence";

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
  listMembershipConfirmed?: boolean;
  customFieldsUpdated?: string[];
  missingCustomFields?: string[];
  error?: string;
}

export interface ScorecardLeadFunnelrClient {
  findContactByEmail(email: string): Promise<FunnelrUser | null>;
  createContact(input: { email: string; firstName?: string; lastName?: string; company?: string; hasAcceptedMarketing?: boolean }): Promise<FunnelrUser>;
  updateContact(input: {
    userId: number;
    email: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    currencyCode?: string | null;
    isAgent?: boolean;
    hasAcceptedMarketing?: boolean;
  }): Promise<FunnelrUser>;
  findListByName(name: string): Promise<FunnelrList | null>;
  contactBelongsToList(userId: number, listId: string): Promise<boolean>;
  addContactToList(userId: number, listId: string): Promise<void>;
  listContactFields(): Promise<FunnelrContactField[]>;
  updateContactCustomFields(userId: number, userProfiles: Array<{ formFieldId: string; value: unknown }>): Promise<void>;
}

export interface NormalizedScorecardLead {
  firstName: string;
  lastName?: string;
  email: string;
  company?: string;
  marketingConsent?: boolean;
  reportUrl?: string;
  scorecardStartedAt: string;
}

const FIELD_MATCHES = {
  reportUrl: ["scorecard report url", "scorecard/report url", "report url", "scorecard url"],
  scorecardStartedAt: ["scorecard started timestamp", "scorecard started", "scorecard submitted at", "scorecard date"],
} as const;

function cleanText(value: unknown, max = MAX_TEXT): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export function normalizeScorecardLeadInput(input: unknown, now = new Date()): NormalizedScorecardLead | { error: string } {
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
    scorecardStartedAt: now.toISOString(),
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

function fieldLabel(field: FunnelrContactField): string {
  return `${field.label ?? ""} ${field.caption ?? ""} ${field.value ?? ""}`.toLowerCase().replace(/[-_/]+/g, " ").replace(/\s+/g, " ").trim();
}

function findField(fields: FunnelrContactField[], names: readonly string[]): FunnelrContactField | null {
  const normalizedNames = names.map((name) => name.toLowerCase().replace(/[-_/]+/g, " ").replace(/\s+/g, " ").trim());
  return (
    fields.find((field) => {
      const label = fieldLabel(field);
      return normalizedNames.some((name) => label === name || label.includes(name));
    }) ?? null
  );
}

function fieldId(field: FunnelrContactField): string | null {
  return typeof field.value === "string" && field.value ? field.value : null;
}

function requireUserId(contact: FunnelrUser): number {
  if (typeof contact.userId !== "number") throw new Error("Funnelr contact did not include a userId.");
  return contact.userId;
}

function safeError(err: unknown): string {
  return err instanceof Error ? err.message.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]").slice(0, 240) : "Funnelr integration failed.";
}

export function buildCustomFieldUpdates(input: NormalizedScorecardLead, fields: FunnelrContactField[]): {
  updates: Array<{ formFieldId: string; value: unknown }>;
  updatedNames: string[];
  missingNames: string[];
} {
  const values = {
    reportUrl: input.reportUrl,
    scorecardStartedAt: input.scorecardStartedAt,
  };
  const updates: Array<{ formFieldId: string; value: unknown }> = [];
  const updatedNames: string[] = [];
  const missingNames: string[] = [];

  for (const [name, aliases] of Object.entries(FIELD_MATCHES)) {
    if (values[name as keyof typeof values] === undefined) continue;
    const field = findField(fields, aliases);
    const id = field ? fieldId(field) : null;
    if (!id) {
      missingNames.push(name);
      continue;
    }
    updates.push({ formFieldId: id, value: values[name as keyof typeof values] });
    updatedNames.push(name);
  }

  return { updates, updatedNames, missingNames };
}

export async function submitScorecardLeadToFunnelr(
  input: ScorecardLeadInput,
  options: { client?: ScorecardLeadFunnelrClient; now?: Date } = {},
): Promise<ScorecardLeadResult> {
  const normalized = normalizeScorecardLeadInput(input, options.now);
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
        hasAcceptedMarketing: normalized.marketingConsent,
      });
    }

    const fields = await client.listContactFields();
    const { updates, updatedNames, missingNames } = buildCustomFieldUpdates(normalized, fields);
    await client.updateContactCustomFields(userId, updates);

    const list = await client.findListByName(SCORECARD_LEADS_LIST_NAME);
    if (!list) throw new Error(`Required Funnelr list was not found: ${SCORECARD_LEADS_LIST_NAME}`);

    if (!(await client.contactBelongsToList(userId, list.listId))) {
      await client.addContactToList(userId, list.listId);
    }
    const listMembershipConfirmed = await client.contactBelongsToList(userId, list.listId);
    if (!listMembershipConfirmed) throw new Error("Scorecard list membership could not be verified.");

    return {
      ok: true,
      contactCreated: !existing,
      listMembershipConfirmed,
      customFieldsUpdated: updatedNames,
      missingCustomFields: missingNames,
    };
  } catch (err) {
    return { ok: false, error: safeError(err) };
  }
}
