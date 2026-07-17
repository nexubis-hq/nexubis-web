const DEFAULT_BASE_URL = "https://ab513.gappstack.com";
const DEFAULT_TIMEOUT_MS = 8000;

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
  isContact?: boolean;
  isDeleted?: boolean;
}

export interface CreateFunnelrContactInput {
  email: string;
  firstName?: string;
  lastName?: string;
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
      isAgent: false,
      isStaff: false,
      isUnsubscribed: false,
      originKey: "Optin",
    });
  }

  async listLists(): Promise<FunnelrList[]> {
    return this.get<FunnelrList[]>("/api/v1/user/lists");
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
