const DEFAULT_BASE_URL = "https://ab513.gappstack.com";
const DEFAULT_TIMEOUT_MS = 180000;

type QueryValue = string | number | boolean | undefined;

export interface FunnelrClientOptions {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export interface FunnelrUser {
  userId?: number;
  userGuid?: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  currencyCode?: string | null;
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
  isAgent?: boolean;
  isStaff?: boolean;
  isBouncing?: boolean;
  isPlaced?: boolean;
  isUnsubscribed?: boolean;
  hasAcceptedMarketing?: boolean | null;
  isContact?: boolean;
  isDeleted?: boolean;
  rating?: number | null;
}

export interface CreateFunnelrContactInput {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  street?: string | null;
  hasAcceptedMarketing?: boolean;
}

export interface UpdateFunnelrContactInput extends CreateFunnelrContactInput {
  userId: number;
  currencyCode?: string | null;
  isAgent?: boolean;
  isStaff?: boolean;
  isBouncing?: boolean;
  isPlaced?: boolean;
  isUnsubscribed?: boolean;
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
  rating?: number | null;
}

export interface FunnelrList {
  listId: string;
  name?: string | null;
  userCount?: number;
  isArchived?: boolean;
}

export interface FunnelrTag {
  tagId: string;
  name?: string | null;
  userCount?: number;
  isArchived?: boolean;
}

export interface FunnelrSequence {
  sequenceId: string;
  name?: string | null;
  statusKey?: string | null;
  sequenceUserCount?: number;
  isComplete?: boolean;
}

export interface FunnelrContactField {
  value?: string | null;
  caption?: string | null;
  label?: string | null;
}

export interface FunnelrSystemFormField {
  formFieldId: string;
  formFieldKey?: string | null;
  formFieldTypeKey?: string | null;
  formControlKey?: string | null;
  label?: string | null;
  name?: string | null;
  description?: string | null;
  value?: string | null;
  isUnique?: boolean;
  isSystem?: boolean;
}

export interface FunnelrUserProfile {
  formFieldId: string;
  formFieldKey?: string | null;
  value?: unknown;
  formFieldLabel?: string | null;
  formFieldName?: string | null;
  plainTextValue?: string | null;
}

export class FunnelrApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly bodyPreview: string;

  constructor(message: string, status: number, statusText: string, bodyPreview: string) {
    super(message);
    this.name = "FunnelrApiError";
    this.status = status;
    this.statusText = statusText;
    this.bodyPreview = bodyPreview;
  }
}

export function requireServerRuntime(): void {
  if (typeof window !== "undefined") {
    throw new Error("Funnelr client is server-only and must not be imported into browser code.");
  }
}

function cleanBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim() || DEFAULT_BASE_URL;
  const parsed = new URL(trimmed);
  if (parsed.protocol !== "https:") {
    throw new Error("FUNNELR_API_BASE_URL must use https.");
  }
  return parsed.toString().replace(/\/$/, "");
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function sanitizeBodyPreview(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/apiKey=([^&\s"']+)/gi, "apiKey=[redacted]")
    .replace(/api[_-]?key["']?\s*[:=]\s*["']?[^"',\s&]+/gi, "api_key=[redacted]")
    .slice(0, 300);
}

async function safeBodyPreview(res: Response): Promise<string> {
  try {
    return sanitizeBodyPreview(await res.text());
  } catch {
    return "";
  }
}

function makeUrl(baseUrl: string, path: string, apiKey: string, query: Record<string, QueryValue> = {}): string {
  const url = new URL(path, `${baseUrl}/`);
  url.searchParams.set("apiKey", apiKey);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  return url.toString();
}

export class FunnelrClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: FunnelrClientOptions = {}) {
    requireServerRuntime();
    this.apiKey = options.apiKey ?? requiredEnv("FUNNELR_API_KEY");
    this.baseUrl = cleanBaseUrl(options.baseUrl ?? process.env.FUNNELR_API_BASE_URL ?? DEFAULT_BASE_URL);
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async testAuthentication(): Promise<boolean> {
    await this.get<unknown>("/api/v1/user/users/count");
    return true;
  }

  async listUsers(options: { page?: number; size?: number } = {}): Promise<FunnelrUser[]> {
    return this.get<FunnelrUser[]>("/api/v1/user/users", {
      Page: options.page ?? 1,
      Size: options.size ?? 1,
    });
  }

  async listContacts(options: { page?: number; size?: number } = {}): Promise<FunnelrUser[]> {
    return this.listUsers(options);
  }

  async findContactByEmail(email: string): Promise<FunnelrUser | null> {
    const normalized = email.trim();
    if (!normalized) throw new Error("email is required.");

    const users = await this.get<FunnelrUser[]>("/api/v1/user/users", {
      Email: normalized,
      Page: 1,
      Size: 1,
    });

    return users[0] ?? null;
  }

  async createContact(input: CreateFunnelrContactInput): Promise<FunnelrUser> {
    const email = input.email.trim().toLowerCase();
    if (!email) throw new Error("email is required.");

    return this.request<FunnelrUser>("POST", "/api/v1/user/users", {
      email,
      firstName: input.firstName?.trim() || null,
      lastName: input.lastName?.trim() || null,
      company: input.company?.trim() || null,
      street: input.street?.trim() || null,
      isAgent: false,
      isStaff: false,
      isUnsubscribed: false,
      hasAcceptedMarketing: input.hasAcceptedMarketing ?? true,
      originKey: "Optin",
    });
  }

  async updateContact(input: UpdateFunnelrContactInput): Promise<FunnelrUser> {
    const email = input.email.trim().toLowerCase();
    if (!email) throw new Error("email is required.");
    if (!input.currencyCode) {
      throw new Error("Funnelr contact update requires an existing currencyCode.");
    }

    return this.request<FunnelrUser>("PUT", "/api/v1/user/users", {
      userId: input.userId,
      email,
      currencyCode: input.currencyCode,
      isAgent: input.isAgent ?? false,
      isStaff: input.isStaff ?? false,
      isUnsubscribed: input.isUnsubscribed ?? false,
      isBouncing: input.isBouncing ?? false,
      isPlaced: input.isPlaced ?? false,
      rating: input.rating ?? 0,
      firstName: input.firstName?.trim() || null,
      lastName: input.lastName?.trim() || null,
      company: input.company?.trim() || null,
      cultureCode: input.cultureCode ?? null,
      countryCode: input.countryCode ?? null,
      subdivisionCode: input.subdivisionCode ?? null,
      city: input.city ?? null,
      postalCode: input.postalCode ?? null,
      street: input.street ?? null,
      unit: input.unit ?? null,
      telephone: input.telephone ?? null,
      timeZoneKey: input.timeZoneKey ?? null,
      unsubscribeReasonKey: input.unsubscribeReasonKey ?? null,
      companyTaxNumber: input.companyTaxNumber ?? null,
      companyRegistrationNumber: input.companyRegistrationNumber ?? null,
      statusId: input.statusId ?? null,
      rankId: input.rankId ?? null,
      hasAcceptedMarketing: input.hasAcceptedMarketing ?? true,
    });
  }

  async listLists(): Promise<FunnelrList[]> {
    return this.get<FunnelrList[]>("/api/v1/user/lists");
  }

  async findListByName(name: string): Promise<FunnelrList | null> {
    const normalized = name.trim();
    if (!normalized) throw new Error("list name is required.");
    const lists = await this.listLists();
    return lists.find((list) => list.name === normalized) ?? null;
  }

  async getContactLists(userId: number): Promise<FunnelrList[]> {
    return this.get<FunnelrList[]>(`/api/v1/user/users/${userId}/lists`);
  }

  async contactBelongsToList(userId: number, listId: string): Promise<boolean> {
    const lists = await this.getContactLists(userId);
    return lists.some((list) => list.listId.toLowerCase() === listId.toLowerCase());
  }

  async addContactToList(userId: number, listId: string): Promise<void> {
    await this.request("POST", `/api/v1/user/users/${userId}/lists/${listId}`, { userListOriginKey: "Optin" });
  }

  async listTags(): Promise<FunnelrTag[]> {
    return this.get<FunnelrTag[]>("/api/v1/user/tags");
  }

  async findTagByName(name: string): Promise<FunnelrTag | null> {
    const normalized = name.trim();
    if (!normalized) throw new Error("tag name is required.");
    const tags = await this.listTags();
    return tags.find((tag) => tag.name === normalized) ?? null;
  }

  async getContactTags(userId: number): Promise<FunnelrTag[]> {
    return this.get<FunnelrTag[]>(`/api/v1/user/users/${userId}/tags`);
  }

  async contactHasTag(userId: number, tagId: string): Promise<boolean> {
    const tags = await this.getContactTags(userId);
    return tags.some((tag) => tag.tagId.toLowerCase() === tagId.toLowerCase());
  }

  async addTagToContact(userId: number, tagId: string): Promise<void> {
    await this.request("PUT", `/api/v1/user/users/${userId}/tags`, { addTagIds: [tagId] });
  }

  async removeTagFromContact(userId: number, tagId: string): Promise<void> {
    await this.request("PUT", `/api/v1/user/users/${userId}/tags`, { deleteTagIds: [tagId] });
  }

  async listSequences(): Promise<FunnelrSequence[]> {
    return this.get<FunnelrSequence[]>("/api/v1/messenger/sequences");
  }

  async listContactFields(): Promise<FunnelrContactField[]> {
    return this.get<FunnelrContactField[]>("/api/v1/user/option/contactFields");
  }

  async listSystemFormFields(): Promise<FunnelrSystemFormField[]> {
    return this.get<FunnelrSystemFormField[]>("/api/v1/system/formFields");
  }

  async getContactCustomFields(userId: number): Promise<FunnelrUserProfile[]> {
    return this.get<FunnelrUserProfile[]>(`/api/v1/user/users/${userId}/custom`);
  }

  async updateContactCustomFields(userId: number, userProfiles: Array<{ formFieldId: string; value: unknown }>): Promise<void> {
    if (!userProfiles.length) return;
    await this.request("PUT", `/api/v1/user/users/${userId}/profile`, { userProfiles });
  }

  private async get<T>(path: string, query?: Record<string, QueryValue>): Promise<T> {
    return this.request<T>("GET", path, undefined, query);
  }

  private async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: unknown,
    query?: Record<string, QueryValue>,
  ): Promise<T> {
    requireServerRuntime();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await this.fetchImpl(makeUrl(this.baseUrl, path, this.apiKey, query), {
        method,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      if (!res.ok) {
        throw new FunnelrApiError(
          `Funnelr request failed with HTTP ${res.status}.`,
          res.status,
          res.statusText,
          await safeBodyPreview(res),
        );
      }

      if (res.status === 204) return undefined as T;
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) return (await res.json()) as T;
      return (await res.text()) as T;
    } catch (err) {
      if (err instanceof FunnelrApiError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Funnelr request timed out.");
      }
      throw new Error(err instanceof Error ? sanitizeBodyPreview(err.message) : "Funnelr request failed.");
    } finally {
      clearTimeout(timer);
    }
  }
}

export function createFunnelrClient(options: FunnelrClientOptions = {}): FunnelrClient {
  return new FunnelrClient(options);
}
