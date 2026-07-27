import { config } from "dotenv";

config({ path: ".env.local", override: true, quiet: true });
config({ override: false, quiet: true });

const apiKey = process.env.FUNNELR_API_KEY?.trim();
const baseUrl = (process.env.FUNNELR_API_BASE_URL || "https://ab513.gappstack.com").replace(/\/$/, "");

if (!apiKey) throw new Error("FUNNELR_API_KEY is required.");
const funnelrApiKey = apiKey;

const ids = {
  automations: {
    brandToAllContacts: "301AD7BD-F256-4F81-90FB-966BF345AFB4",
    manualHoldingTags: "8977A9AF-0E3E-4FB1-9417-5B946C6476ED",
    auditFull: "48B6CCE0-BAB2-4871-B392-68B7CADE1B4F",
    nurture: "96441BD0-AD7F-4A5F-AD8C-7DF5E38697A3",
    booked: "25457BA6-554C-488A-9E17-0B516D06E215",
    replied: "D8424132-9ECB-4FF1-AFD7-CF3462DBD9BD",
  },
  lists: {
    allContacts: "0A17B990-A8DF-49AC-B2FA-F2C2BEE459CB",
    manual: "8549B002-C386-4809-864D-B38723B48663",
    auditFull: "82EA6A5C-0E17-4D18-BA32-D7D4D71C7534",
    auditNoFull: "D1262321-6D89-4C75-B7E3-8B88845DDBD2",
    nurture: "199E6A23-EC82-47E2-AD3D-A64A99BBA35E",
    booked: "DF97E786-2F16-435A-8C2E-D4A2421A00B7",
  },
  sequences: {
    auditFull: "A586ACA7-7A67-45F9-9972-CC6A95B256FE",
    auditNoFull: "5BB36DBF-3F1F-4390-A54C-09818BFB2840",
    nurture: "B2FC5E91-FAD0-433C-A735-7A2D27B46CFD",
  },
  tags: {
    brand: "D7F84530-6722-4BEB-B0DD-D99A749DC731",
    sourceManual: "E09C8B71-D6EF-434F-B928-625761821C7C",
    sourceStoepAudit: "9C2FB5A0-0879-4D49-BC13-E88A6E580853",
    triggerAuditFull: "51EE549A-F2C3-4944-928E-96AF31FCA561",
    triggerAuditNoFull: "84DEC5B3-0FB1-4114-B233-3FA37FBB80D5",
    triggerNurture: "F2BA90FD-0B59-4B88-BE74-EA0B3E41CAF0",
    booked: "9D957D17-E269-45D5-832B-48B8FFFC3F54",
    replied: "484E5078-56E2-4F8B-B4D8-D4AC7AD5835F",
    historyAudit: "B95326E5-E79C-4B29-A72A-BB38C235A1D6",
    historyNurture: "0025546D-8E1D-458D-864C-3A16BD078B16",
  },
};

const expectedNames = {
  lists: {
    [ids.lists.allContacts]: "LekkeWeb | All Contacts",
    [ids.lists.manual]: "LekkeWeb | Manual Leads - Holding",
    [ids.lists.auditFull]: "LekkeWeb | Stoep Audit Leads - Full Report",
    [ids.lists.auditNoFull]: "LekkeWeb | Stoep Audit Leads - No Full Report",
    [ids.lists.nurture]: "LekkeWeb | Stoep Tip Nurture",
    [ids.lists.booked]: "LekkeWeb | Call Booked",
  },
  sequences: {
    [ids.sequences.auditFull]: "LekkeWeb | Stoep Audit Sales - Full Report",
    [ids.sequences.auditNoFull]: "LekkeWeb | Stoep Audit Sales - No Full Report",
    [ids.sequences.nurture]: "LekkeWeb | Stoep Tip Nurture",
  },
  tags: {
    [ids.tags.brand]: "Brand: LekkeWeb",
    [ids.tags.sourceManual]: "Source: LekkeWeb | Manual",
    [ids.tags.sourceStoepAudit]: "Source: Stoep Audit",
    [ids.tags.triggerAuditFull]: "Trigger: LekkeWeb | Start Stoep Audit Sales - Full Report",
    [ids.tags.triggerAuditNoFull]: "Trigger: LekkeWeb | Start Stoep Audit Sales - No Full Report",
    [ids.tags.triggerNurture]: "Trigger: LekkeWeb | Start Stoep Tip Nurture",
    [ids.tags.booked]: "Pipeline: LekkeWeb | Call Booked",
    [ids.tags.replied]: "Pipeline: LekkeWeb | Replied",
    [ids.tags.historyAudit]: "History: LekkeWeb | Stoep Audit Sales Started",
    [ids.tags.historyNurture]: "History: LekkeWeb | Stoep Tip Nurture Started",
  },
};

const TAG_IS = "676AB9D4-C9EA-4186-928F-A02C23478CBB";
const TAG_IS_NOT = "6E8EE938-52BE-4103-AC51-EF5876B19567";
const LIST_IS = "2B60D6D4-7D5B-4D66-973A-5F9665F14469";

async function request(path: string, query: Record<string, string | number | boolean> = {}) {
  const url = new URL(path, baseUrl + "/");
  url.searchParams.set("apiKey", funnelrApiKey);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 180_000);
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
    const text = await response.text();
    if (!response.ok) throw new Error(`${path} HTTP ${response.status}: ${text.slice(0, 500)}`);
    return text ? JSON.parse(text) : undefined;
  } finally {
    clearTimeout(timer);
  }
}

function requireItem<T extends Record<string, unknown>>(items: T[], key: string, id: string, name: string) {
  const item = items.find((candidate) => String(candidate[key]).toLowerCase() === id.toLowerCase());
  if (!item) throw new Error(`Missing ${name}: ${id}`);
  return item;
}

function requireName(item: Record<string, unknown>, name: string) {
  if (item.name !== name) throw new Error(`Expected ${name}, got ${String(item.name)}`);
}

function requireUnarchived(item: Record<string, unknown>, name: string) {
  if (item.isArchived !== false) throw new Error(`${name} is archived.`);
}

function hasAction(actions: Array<Record<string, unknown>>, key: "listId" | "sequenceId" | "tagId", id: string, isRevoke: boolean) {
  return actions.some((action) => String(action[key] ?? "").toLowerCase() === id.toLowerCase() && action.isRevoke === isRevoke);
}

function hasFilter(filters: Array<Record<string, unknown>>, value: string, operatorId: string) {
  return filters.some((filter) => String(filter.primaryValue).toLowerCase() === value.toLowerCase() && filter.primaryFilterOperatorId === operatorId);
}

function actionSummary(action: readonly ["listId" | "sequenceId" | "tagId", string, boolean]) {
  return `${action[0]} ${action[1]} revoke=${String(action[2])}`;
}

async function verifyAutomation(id: string, name: string, checks: (filters: Array<Record<string, unknown>>, actions: Array<Record<string, unknown>>) => void) {
  const automation = (await request(`/api/v1/query/automations/${id}`)) as Record<string, unknown>;
  requireName(automation, name);
  if (automation.isEnabled !== true) throw new Error(`${name} is not enabled.`);
  const filters = (await request("/api/v1/query/filters", { automationId: id })) as Array<Record<string, unknown>>;
  const actions = (await request(`/api/v1/query/automations/${id}/actions`)) as Array<Record<string, unknown>>;
  checks(filters, actions);
}

async function verifyListNotUsedByAnySequence(sequenceIds: string[], listId: string, listName: string) {
  for (const sequenceId of sequenceIds) {
    const lists = (await request(`/api/v1/messenger/sequences/${sequenceId}/lists`)) as Array<Record<string, unknown>>;
    if (lists.some((list) => String(list.listId).toLowerCase() === listId.toLowerCase())) {
      throw new Error(`${listName} is attached to sequence ${sequenceId}.`);
    }
  }
}

async function main() {
  const lists = (await request("/api/v1/user/lists")) as Array<Record<string, unknown>>;
  const sequences = (await request("/api/v1/messenger/sequences")) as Array<Record<string, unknown>>;
  const tags = (await request("/api/v1/user/tags")) as Array<Record<string, unknown>>;

  for (const [id, name] of Object.entries(expectedNames.lists)) {
    const list = requireItem(lists, "listId", id, name);
    requireName(list, name);
    requireUnarchived(list, name);
  }
  for (const [id, name] of Object.entries(expectedNames.sequences)) requireName(requireItem(sequences, "sequenceId", id, name), name);
  for (const [id, name] of Object.entries(expectedNames.tags)) {
    const tag = requireItem(tags, "tagId", id, name);
    requireName(tag, name);
    requireUnarchived(tag, name);
  }

  await verifyListNotUsedByAnySequence(Object.values(ids.sequences), ids.lists.allContacts, "LekkeWeb | All Contacts");
  await verifyListNotUsedByAnySequence(Object.values(ids.sequences), ids.lists.manual, "LekkeWeb | Manual Leads - Holding");

  const auditFullLists = (await request(`/api/v1/messenger/sequences/${ids.sequences.auditFull}/lists`)) as Array<Record<string, unknown>>;
  const auditNoFullLists = (await request(`/api/v1/messenger/sequences/${ids.sequences.auditNoFull}/lists`)) as Array<Record<string, unknown>>;
  const nurtureLists = (await request(`/api/v1/messenger/sequences/${ids.sequences.nurture}/lists`)) as Array<Record<string, unknown>>;
  if (!auditFullLists.some((list) => list.listId === ids.lists.auditFull)) throw new Error("Full Report sales sequence recipient list mismatch.");
  if (!auditNoFullLists.some((list) => list.listId === ids.lists.auditNoFull)) throw new Error("No Full Report sales sequence recipient list mismatch.");
  if (!nurtureLists.some((list) => list.listId === ids.lists.nurture)) throw new Error("Stoep Tip nurture sequence recipient list mismatch.");

  await verifyAutomation(ids.automations.brandToAllContacts, "LekkeWeb | Brand Tag - Add to All Contacts", (filters, actions) => {
    if (!hasFilter(filters, ids.tags.brand, TAG_IS)) throw new Error("Brand-to-All trigger filter missing.");
    if (!hasAction(actions, "listId", ids.lists.allContacts, false)) throw new Error("Brand-to-All Contacts action missing.");
    if (actions.length !== 1) throw new Error("Brand-to-All automation must have exactly one action.");
  });

  await verifyAutomation(ids.automations.manualHoldingTags, "LekkeWeb | Manual Holding - Apply Contact Tags", (filters, actions) => {
    if (!hasFilter(filters, ids.lists.manual, LIST_IS)) throw new Error("Manual Holding list trigger missing.");
    for (const tagId of [ids.tags.brand, ids.tags.sourceManual, ids.tags.triggerNurture]) {
      if (!hasAction(actions, "tagId", tagId, false)) throw new Error(`Manual Holding tag action missing: ${tagId}`);
    }
    if (actions.length !== 3) throw new Error("Manual Holding automation must have exactly three actions.");
    if (hasAction(actions, "listId", ids.lists.allContacts, false)) throw new Error("Manual Holding automation must not add All Contacts directly.");
    if (hasAction(actions, "listId", ids.lists.nurture, false)) throw new Error("Manual Holding automation must not add nurture list directly.");
    if (hasAction(actions, "sequenceId", ids.sequences.nurture, false)) throw new Error("Manual Holding automation must not add nurture sequence directly.");
    for (const tagId of [ids.tags.booked, ids.tags.replied, ids.tags.historyAudit, ids.tags.historyNurture]) {
      if (hasAction(actions, "tagId", tagId, false)) throw new Error(`Manual Holding automation must not apply Pipeline/History tag: ${tagId}`);
    }
  });

  await verifyAutomation(ids.automations.nurture, "LekkeWeb | Start Stoep Tip Nurture", (filters, actions) => {
    if (!hasFilter(filters, ids.tags.triggerNurture, TAG_IS)) throw new Error("Stoep Tip nurture trigger missing.");
    for (const tagId of [ids.tags.booked, ids.tags.replied, ids.tags.historyNurture]) {
      if (!hasFilter(filters, tagId, TAG_IS_NOT)) throw new Error(`Stoep Tip nurture exclusion missing: ${tagId}`);
    }
    for (const action of [
      ["listId", ids.lists.auditFull, true],
      ["tagId", ids.tags.triggerNurture, true],
      ["sequenceId", ids.sequences.auditNoFull, true],
      ["listId", ids.lists.nurture, false],
      ["tagId", ids.tags.historyNurture, false],
      ["sequenceId", ids.sequences.nurture, false],
      ["sequenceId", ids.sequences.auditFull, true],
      ["listId", ids.lists.manual, true],
    ] as const) {
      if (!hasAction(actions, action[0], action[1], action[2])) throw new Error(`Stoep Tip nurture action missing: ${actionSummary(action)}`);
    }
    if (hasAction(actions, "listId", ids.lists.allContacts, true)) throw new Error("Stoep Tip nurture automation removes All Contacts.");
  });

  await verifyAutomation(ids.automations.auditFull, "LekkeWeb | Start Stoep Audit Sales - Full Report", (filters, actions) => {
    if (!hasFilter(filters, ids.tags.triggerAuditFull, TAG_IS)) throw new Error("Full Report sales trigger missing.");
    for (const tagId of [ids.tags.booked, ids.tags.replied, ids.tags.historyAudit]) {
      if (!hasFilter(filters, tagId, TAG_IS_NOT)) throw new Error(`Full Report sales exclusion missing: ${tagId}`);
    }
    if (hasFilter(filters, ids.tags.historyNurture, TAG_IS_NOT)) {
      throw new Error("Full Report sales must not exclude contacts with Stoep Tip nurture History.");
    }
    for (const action of [
      ["sequenceId", ids.sequences.nurture, true],
      ["listId", ids.lists.nurture, true],
      ["listId", ids.lists.manual, true],
      ["listId", ids.lists.auditFull, false],
      ["sequenceId", ids.sequences.auditFull, false],
      ["tagId", ids.tags.historyAudit, false],
      ["tagId", ids.tags.triggerAuditFull, true],
    ] as const) {
      if (!hasAction(actions, action[0], action[1], action[2])) throw new Error(`Full Report sales action missing: ${actionSummary(action)}`);
    }
    if (hasAction(actions, "listId", ids.lists.allContacts, true)) throw new Error("Full Report sales automation removes All Contacts.");
    if (hasAction(actions, "sequenceId", ids.sequences.auditNoFull, false)) throw new Error("Full Report sales automation adds No Full Report sequence.");
  });

  await verifyAutomation(ids.automations.booked, "LekkeWeb | Call Booked - Exit Campaigns", (filters, actions) => {
    if (!hasFilter(filters, ids.tags.booked, TAG_IS)) throw new Error("Call Booked trigger missing.");
    for (const action of [
      ["sequenceId", ids.sequences.auditFull, true],
      ["sequenceId", ids.sequences.auditNoFull, true],
      ["sequenceId", ids.sequences.nurture, true],
      ["listId", ids.lists.auditFull, true],
      ["listId", ids.lists.auditNoFull, true],
      ["listId", ids.lists.nurture, true],
      ["listId", ids.lists.manual, true],
      ["listId", ids.lists.booked, false],
      ["tagId", ids.tags.triggerAuditFull, true],
      ["tagId", ids.tags.triggerAuditNoFull, true],
      ["tagId", ids.tags.triggerNurture, true],
    ] as const) {
      if (!hasAction(actions, action[0], action[1], action[2])) throw new Error(`Call Booked action missing: ${actionSummary(action)}`);
    }
    if (hasAction(actions, "listId", ids.lists.allContacts, true)) throw new Error("Call Booked automation removes All Contacts.");
  });

  await verifyAutomation(ids.automations.replied, "LekkeWeb | Replied - Exit Campaigns", (filters, actions) => {
    if (!hasFilter(filters, ids.tags.replied, TAG_IS)) throw new Error("Replied trigger missing.");
    for (const action of [
      ["tagId", ids.tags.triggerNurture, true],
      ["sequenceId", ids.sequences.auditFull, true],
      ["sequenceId", ids.sequences.auditNoFull, true],
      ["sequenceId", ids.sequences.nurture, true],
      ["tagId", ids.tags.triggerAuditFull, true],
      ["tagId", ids.tags.triggerAuditNoFull, true],
      ["listId", ids.lists.auditFull, true],
      ["listId", ids.lists.auditNoFull, true],
      ["listId", ids.lists.nurture, true],
      ["listId", ids.lists.manual, true],
    ] as const) {
      if (!hasAction(actions, action[0], action[1], action[2])) throw new Error(`Replied action missing: ${actionSummary(action)}`);
    }
    if (hasAction(actions, "listId", ids.lists.allContacts, true)) throw new Error("Replied automation removes All Contacts.");
  });

  console.log("LekkeWeb Funnelr read-only verification passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
