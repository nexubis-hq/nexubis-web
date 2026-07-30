import { config } from "dotenv";

config({ path: ".env.local", override: true, quiet: true });
config({ override: false, quiet: true });

type Method = "GET" | "POST" | "PUT" | "DELETE";
type RecordMap = Record<string, unknown>;
type IdKey = "tagId" | "listId" | "sequenceId" | "automationId" | "filterId" | "automationActionId";

const APPLY = process.argv.includes("--apply");
const VERIFY_ONLY = process.argv.includes("--verify-only");
const apiKey = process.env.FUNNELR_API_KEY?.trim();
const baseUrl = (process.env.FUNNELR_API_BASE_URL || "https://ab513.gappstack.com").replace(/\/$/, "");

if (!apiKey) throw new Error("FUNNELR_API_KEY is required.");
const funnelrApiKey = apiKey;

const IDS = {
  tags: {
    brand: "4B527D4D-3540-401D-A0B1-A1BBDF0FADFF",
    sourceContactForm: "B398BEA3-1E76-410D-AA8B-50F83F283684",
    triggerSales: "6B9DA797-9A52-4F4F-9854-66FFA1935C07",
    triggerNurture: "E654E2FA-B55E-4904-9336-9D45AA6837AB",
    callBooked: "93347D55-1901-4A2D-90A2-0FCBB6B8A492",
    replied: "3B0905B4-D0C6-4A2D-861D-64D9579D7DE6",
    historySales: "CD99688F-34FF-4942-9CDC-FF9A7E4A6735",
    historyNurture: "A4A6A094-AA39-4288-B2A7-54087866DC4B",
  },
  lists: {
    allContacts: "C4AF8E82-8363-4AC5-9B93-D28D1385C75E",
    sales: "984BD709-F993-498A-B5BF-0ED86CFA7AAB",
    nurture: "A8A408CE-DB84-415B-9FC1-8EABC2A391A6",
    manual: "49992A25-D155-4674-A0DB-3B8DA00F41E9",
    callBooked: "3169E25F-3B23-4E75-8E48-5AC4673E966F",
  },
  sequences: {
    sales: "2840DFB3-76CC-4B0D-8905-5ADE8CE9E2F7",
    nurture: "400843E0-EE89-4916-9828-FDE13E35AD61",
  },
  automations: {
    sales: "B96BE89F-6E20-4799-92A2-6D538680B251",
    nurture: "AB866C24-8D72-42AB-8D4A-AC97281FE5F0",
    booked: "5DC71700-3E79-42DB-92EE-04BDADC3BA83",
    replied: "5249EFD5-5193-4C73-9EF7-E8FD1E63A558",
  },
} as const;

const NAMES = {
  contactedTag: "Pipeline: Nexubis | Contacted",
  contactedAutomation: "Nexubis | Contacted - Exit Campaigns",
} as const;

const TAG_FILTER_TEMPLATE_ID = "ACB4A64D-15C9-4C1E-AA0E-0F3FAF2B5095";
const TAG_IS = "676AB9D4-C9EA-4186-928F-A02C23478CBB";
const TAG_IS_NOT = "6E8EE938-52BE-4103-AC51-EF5876B19567";

async function request<T>(method: Method, path: string, options: { query?: Record<string, string | number | boolean>; body?: unknown } = {}): Promise<T> {
  const url = new URL(path, baseUrl);
  url.searchParams.set("apiKey", funnelrApiKey);
  for (const [key, value] of Object.entries(options.query ?? {})) url.searchParams.set(key, String(value));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 180_000);
  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(`${method} ${path} HTTP ${response.status}: ${text.slice(0, 300)}`);
    return body as T;
  } finally {
    clearTimeout(timer);
  }
}

function lower(value: unknown): string {
  return String(value ?? "").toLowerCase();
}

function byName(items: RecordMap[], name: string): RecordMap[] {
  return items.filter((item) => item.name === name);
}

function byId(items: RecordMap[], key: IdKey, id: string): RecordMap | undefined {
  return items.find((item) => lower(item[key]) === id.toLowerCase());
}

function requireExactOne(items: RecordMap[], name: string, key: IdKey): RecordMap {
  if (items.length !== 1) throw new Error(`Expected exactly one ${name}, found ${items.length}.`);
  if (!items[0][key]) throw new Error(`${name} is missing ${key}.`);
  return items[0];
}

function hasFilter(filters: RecordMap[], tagId: string, operatorId: string): boolean {
  return filters.some((filter) => lower(filter.primaryValue) === tagId.toLowerCase() && filter.primaryFilterOperatorId === operatorId);
}

function actionKey(action: { tagId?: string | null; listId?: string | null; sequenceId?: string | null; isRevoke: boolean }): string {
  return `${action.tagId ? `tag:${action.tagId}` : action.listId ? `list:${action.listId}` : `sequence:${action.sequenceId}`}:${action.isRevoke}`;
}

function hasAction(actions: RecordMap[], action: { tagId?: string | null; listId?: string | null; sequenceId?: string | null; isRevoke: boolean }): boolean {
  return actions.some((item) => {
    if (action.tagId && lower(item.tagId) !== action.tagId.toLowerCase()) return false;
    if (action.listId && lower(item.listId) !== action.listId.toLowerCase()) return false;
    if (action.sequenceId && lower(item.sequenceId) !== action.sequenceId.toLowerCase()) return false;
    return item.isRevoke === action.isRevoke;
  });
}

async function readResources() {
  const [tags, lists, sequences, automations] = await Promise.all([
    request<RecordMap[]>("GET", "/api/v1/user/tags"),
    request<RecordMap[]>("GET", "/api/v1/user/lists"),
    request<RecordMap[]>("GET", "/api/v1/messenger/sequences"),
    request<RecordMap[]>("GET", "/api/v1/query/automations"),
  ]);
  return { tags, lists, sequences, automations };
}

async function createContactedTagIfNeeded(tags: RecordMap[]): Promise<string> {
  const existing = byName(tags, NAMES.contactedTag);
  if (existing.length > 1) throw new Error(`Duplicate ${NAMES.contactedTag} tags exist.`);
  if (existing.length === 1) return String(existing[0].tagId);
  if (!APPLY || VERIFY_ONLY) throw new Error(`${NAMES.contactedTag} does not exist. Re-run with --apply to create it.`);

  console.log(`Creating tag: ${NAMES.contactedTag}`);
  await request<RecordMap>("POST", "/api/v1/user/tags", { body: { name: NAMES.contactedTag } });
  const after = await request<RecordMap[]>("GET", "/api/v1/user/tags");
  const created = requireExactOne(byName(after, NAMES.contactedTag), NAMES.contactedTag, "tagId");
  return String(created.tagId);
}

async function createContactedAutomationIfNeeded(automations: RecordMap[]): Promise<string> {
  const existing = byName(automations, NAMES.contactedAutomation);
  if (existing.length > 1) throw new Error(`Duplicate ${NAMES.contactedAutomation} automations exist.`);
  if (existing.length === 1) return String(existing[0].automationId);
  if (!APPLY || VERIFY_ONLY) throw new Error(`${NAMES.contactedAutomation} does not exist. Re-run with --apply to create it.`);

  console.log(`Creating disabled automation: ${NAMES.contactedAutomation}`);
  await request<RecordMap>("POST", "/api/v1/query/automations", {
    body: {
      automationTypeKey: "Contacts",
      name: NAMES.contactedAutomation,
      sortOrder: 8,
      isEnabled: false,
    },
  });
  const after = await request<RecordMap[]>("GET", "/api/v1/query/automations");
  const created = requireExactOne(byName(after, NAMES.contactedAutomation), NAMES.contactedAutomation, "automationId");
  return String(created.automationId);
}

async function ensureFilter(automationId: string, tagId: string, operatorId: string, sortOrder: number): Promise<void> {
  const filters = await request<RecordMap[]>("GET", "/api/v1/query/filters", { query: { automationId } });
  if (hasFilter(filters, tagId, operatorId)) return;
  if (!APPLY || VERIFY_ONLY) throw new Error(`Missing filter ${tagId} ${operatorId} on ${automationId}.`);

  console.log(`Creating filter on ${automationId}: ${tagId} ${operatorId}`);
  await request<RecordMap>("POST", "/api/v1/query/filters", {
    body: {
      automationId,
      filterTemplateId: TAG_FILTER_TEMPLATE_ID,
      primaryFilterOperatorId: operatorId,
      primaryValue: tagId,
      secondaryFilterOperatorId: null,
      secondaryValue: null,
      sortOrder,
    },
  });
  const after = await request<RecordMap[]>("GET", "/api/v1/query/filters", { query: { automationId } });
  if (!hasFilter(after, tagId, operatorId)) throw new Error(`Filter read-back failed: ${tagId} ${operatorId}`);
}

async function ensureAction(automationId: string, action: { tagId?: string | null; listId?: string | null; sequenceId?: string | null; isRevoke: boolean }): Promise<void> {
  const actions = await request<RecordMap[]>("GET", `/api/v1/query/automations/${automationId}/actions`);
  if (hasAction(actions, action)) return;
  if (!APPLY || VERIFY_ONLY) throw new Error(`Missing action ${actionKey(action)} on ${automationId}.`);

  console.log(`Creating action on ${automationId}: ${actionKey(action)}`);
  await request<RecordMap>("POST", `/api/v1/query/automations/${automationId}/actions`, {
    body: {
      automationId,
      accessCardId: null,
      listId: action.listId ?? null,
      sequenceId: action.sequenceId ?? null,
      tagId: action.tagId ?? null,
      agentUserId: null,
      departmentId: null,
      ticketTypeId: null,
      isRevoke: action.isRevoke,
    },
  });
  const after = await request<RecordMap[]>("GET", `/api/v1/query/automations/${automationId}/actions`);
  if (!hasAction(after, action)) throw new Error(`Action read-back failed: ${actionKey(action)}`);
}

async function setAutomationEnabled(automationId: string, enabled: boolean): Promise<void> {
  const current = await request<RecordMap>("GET", `/api/v1/query/automations/${automationId}`);
  if (current.isEnabled === enabled) return;
  if (!APPLY || VERIFY_ONLY) throw new Error(`${current.name} isEnabled=${String(current.isEnabled)}, expected ${enabled}.`);

  console.log(`${enabled ? "Enabling" : "Disabling"} automation: ${String(current.name)}`);
  await request<RecordMap>("PUT", "/api/v1/query/automations", {
    body: {
      automationId,
      automationTypeKey: current.automationTypeKey ?? "Contacts",
      name: current.name,
      sortOrder: current.sortOrder ?? 8,
      isEnabled: enabled,
    },
  });
  const after = await request<RecordMap>("GET", `/api/v1/query/automations/${automationId}`);
  if (after.isEnabled !== enabled) throw new Error(`Automation enabled read-back failed for ${automationId}.`);
}

function expectedContactedActions(contactedTagId: string) {
  return [
    { tagId: contactedTagId, isRevoke: false },
    { sequenceId: IDS.sequences.sales, isRevoke: true },
    { sequenceId: IDS.sequences.nurture, isRevoke: true },
    { listId: IDS.lists.sales, isRevoke: true },
    { listId: IDS.lists.nurture, isRevoke: true },
    { listId: IDS.lists.manual, isRevoke: true },
    { tagId: IDS.tags.triggerSales, isRevoke: true },
    { tagId: IDS.tags.triggerNurture, isRevoke: true },
  ];
}

async function verifyFinal(contactedTagId: string, contactedAutomationId: string) {
  const { tags, lists, sequences, automations } = await readResources();
  requireExactOne(byName(tags, NAMES.contactedTag), NAMES.contactedTag, "tagId");
  for (const [name, id] of Object.entries(IDS.tags)) {
    if (!byId(tags, "tagId", id)) throw new Error(`Missing tag ${name}: ${id}`);
  }
  for (const [name, id] of Object.entries(IDS.lists)) {
    if (!byId(lists, "listId", id)) throw new Error(`Missing list ${name}: ${id}`);
  }
  for (const [name, id] of Object.entries(IDS.sequences)) {
    if (!byId(sequences, "sequenceId", id)) throw new Error(`Missing sequence ${name}: ${id}`);
  }
  requireExactOne(byName(automations, NAMES.contactedAutomation), NAMES.contactedAutomation, "automationId");

  const contacted = await request<RecordMap>("GET", `/api/v1/query/automations/${contactedAutomationId}`);
  if (contacted.name !== NAMES.contactedAutomation) throw new Error(`Contacted automation name mismatch: ${String(contacted.name)}`);
  if (contacted.isEnabled !== true) throw new Error("Contacted automation is not enabled.");

  const filters = await request<RecordMap[]>("GET", "/api/v1/query/filters", { query: { automationId: contactedAutomationId } });
  if (filters.length !== 1) throw new Error(`Contacted automation must have exactly one filter, found ${filters.length}.`);
  if (!hasFilter(filters, IDS.tags.sourceContactForm, TAG_IS)) throw new Error("Contacted automation Source tag trigger missing.");

  const actions = await request<RecordMap[]>("GET", `/api/v1/query/automations/${contactedAutomationId}/actions`);
  const expected = expectedContactedActions(contactedTagId);
  if (actions.length !== expected.length) throw new Error(`Contacted automation must have exactly ${expected.length} actions, found ${actions.length}.`);
  for (const action of expected) if (!hasAction(actions, action)) throw new Error(`Contacted automation action missing: ${actionKey(action)}`);
  for (const forbidden of [
    { listId: IDS.lists.allContacts, isRevoke: true },
    { listId: IDS.lists.callBooked, isRevoke: false },
    { tagId: contactedTagId, isRevoke: true },
    { tagId: IDS.tags.callBooked, isRevoke: true },
    { tagId: IDS.tags.replied, isRevoke: true },
    { tagId: IDS.tags.historySales, isRevoke: true },
    { tagId: IDS.tags.historyNurture, isRevoke: true },
  ]) {
    if (hasAction(actions, forbidden)) throw new Error(`Forbidden Contacted action exists: ${actionKey(forbidden)}`);
  }

  for (const [label, id] of [
    ["sales", IDS.automations.sales],
    ["nurture", IDS.automations.nurture],
  ] as const) {
    const entryFilters = await request<RecordMap[]>("GET", "/api/v1/query/filters", { query: { automationId: id } });
    if (!hasFilter(entryFilters, contactedTagId, TAG_IS_NOT)) throw new Error(`${label} automation missing Contacted exclusion.`);
  }

  console.log("Verification passed.");
  console.log(`CONTACTED_TAG_ID=${contactedTagId}`);
  console.log(`CONTACTED_AUTOMATION_ID=${contactedAutomationId}`);
}

async function main() {
  const beforeSequences = await request<RecordMap[]>("GET", "/api/v1/messenger/sequences");
  const { tags, automations } = await readResources();
  const contactedTagId = await createContactedTagIfNeeded(tags);
  const contactedAutomationId = await createContactedAutomationIfNeeded(automations);

  if (VERIFY_ONLY) {
    await verifyFinal(contactedTagId, contactedAutomationId);
    return;
  }

  await setAutomationEnabled(contactedAutomationId, false);
  await ensureFilter(contactedAutomationId, IDS.tags.sourceContactForm, TAG_IS, 0);
  for (const action of expectedContactedActions(contactedTagId)) await ensureAction(contactedAutomationId, action);
  await ensureFilter(IDS.automations.sales, contactedTagId, TAG_IS_NOT, 4);
  await ensureFilter(IDS.automations.nurture, contactedTagId, TAG_IS_NOT, 4);
  await setAutomationEnabled(contactedAutomationId, true);

  const afterSequences = await request<RecordMap[]>("GET", "/api/v1/messenger/sequences");
  for (const id of [IDS.sequences.sales, IDS.sequences.nurture]) {
    const before = byId(beforeSequences, "sequenceId", id);
    const after = byId(afterSequences, "sequenceId", id);
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      throw new Error(`Sequence changed unexpectedly: ${id}`);
    }
  }

  await verifyFinal(contactedTagId, contactedAutomationId);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
