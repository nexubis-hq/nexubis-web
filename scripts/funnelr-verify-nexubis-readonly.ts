import { config } from "dotenv";

config({ path: ".env.local", override: true, quiet: true });
config({ override: false, quiet: true });

const apiKey = process.env.FUNNELR_API_KEY?.trim();
const baseUrl = (process.env.FUNNELR_API_BASE_URL || "https://ab513.gappstack.com").replace(/\/$/, "");

if (!apiKey) throw new Error("FUNNELR_API_KEY is required.");
const funnelrApiKey = apiKey;

const ids = {
  automations: {
    sales: "B96BE89F-6E20-4799-92A2-6D538680B251",
    nurture: "AB866C24-8D72-42AB-8D4A-AC97281FE5F0",
    booked: "5DC71700-3E79-42DB-92EE-04BDADC3BA83",
    replied: "5249EFD5-5193-4C73-9EF7-E8FD1E63A558",
    brandToAllContacts: "7C635FEF-2DDB-4EF0-ABB6-8A306B1322B7",
    manualHoldingTags: "601EA06F-412D-480E-A612-D033F964EB88",
  },
  lists: {
    allContacts: "C4AF8E82-8363-4AC5-9B93-D28D1385C75E",
    sales: "984BD709-F993-498A-B5BF-0ED86CFA7AAB",
    nurture: "A8A408CE-DB84-415B-9FC1-8EABC2A391A6",
    booked: "3169E25F-3B23-4E75-8E48-5AC4673E966F",
    manual: "49992A25-D155-4674-A0DB-3B8DA00F41E9",
  },
  sequences: {
    sales: "2840DFB3-76CC-4B0D-8905-5ADE8CE9E2F7",
    nurture: "400843E0-EE89-4916-9828-FDE13E35AD61",
    bookingConfirmation: "370EC033-523A-4F22-BB18-9D5022CAC27C",
  },
  tags: {
    brand: "4B527D4D-3540-401D-A0B1-A1BBDF0FADFF",
    sourceManual: "A23C221E-A548-4268-9223-B1DFC688823A",
    sourceScorecard: "AA47260F-59B0-4D4A-999F-4D571382658D",
    triggerSales: "6B9DA797-9A52-4F4F-9854-66FFA1935C07",
    triggerNurture: "E654E2FA-B55E-4904-9336-9D45AA6837AB",
    booked: "93347D55-1901-4A2D-90A2-0FCBB6B8A492",
    replied: "3B0905B4-D0C6-4A2D-861D-64D9579D7DE6",
    historySales: "CD99688F-34FF-4942-9CDC-FF9A7E4A6735",
    historyNurture: "A4A6A094-AA39-4288-B2A7-54087866DC4B",
    lekkeStoepTipNurture: "F2BA90FD-0B59-4B88-BE74-EA0B3E41CAF0",
  },
};

const expectedNames = {
  lists: {
    [ids.lists.allContacts]: "Nexubis | All Contacts",
    [ids.lists.sales]: "Nexubis | Scorecard Leads - Sales",
    [ids.lists.nurture]: "Nexubis | The Credibility Brief - Nurture",
    [ids.lists.booked]: "Nexubis | Call Booked",
    [ids.lists.manual]: "Nexubis | Manual Leads - Holding",
  },
  sequences: {
    [ids.sequences.sales]: "Nexubis | Scorecard Sales",
    [ids.sequences.nurture]: "Nexubis | The Credibility Brief",
    [ids.sequences.bookingConfirmation]: "Booking Confirmation",
  },
  tags: {
    [ids.tags.brand]: "Brand: Nexubis",
    [ids.tags.sourceManual]: "Source: Nexubis | Manual",
    [ids.tags.sourceScorecard]: "Source: Nexubis | Scorecard",
    [ids.tags.triggerSales]: "Trigger: Nexubis | Start Scorecard Sales",
    [ids.tags.triggerNurture]: "Trigger: Nexubis | Start Credibility Brief Nurture",
    [ids.tags.booked]: "Pipeline: Nexubis | Call Booked",
    [ids.tags.replied]: "Pipeline: Nexubis | Replied",
    [ids.tags.historySales]: "History: Nexubis | Scorecard Sales Started",
    [ids.tags.historyNurture]: "History: Nexubis | Credibility Brief Nurture Started",
    [ids.tags.lekkeStoepTipNurture]: "Trigger: LekkeWeb | Start Stoep Tip Nurture",
  },
};

const TAG_IS = "676AB9D4-C9EA-4186-928F-A02C23478CBB";
const TAG_IS_NOT = "6E8EE938-52BE-4103-AC51-EF5876B19567";
const LIST_IS = "2B60D6D4-7D5B-4D66-973A-5F9665F14469";

async function request(path: string, query: Record<string, string | number | boolean> = {}) {
  const url = new URL(path, baseUrl);
  url.searchParams.set("apiKey", funnelrApiKey);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 180_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const text = await response.text();
    const body = JSON.parse(text);
    if (!response.ok) throw new Error(`${path} HTTP ${response.status}`);
    return body;
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

function hasAction(actions: Array<Record<string, unknown>>, key: "listId" | "sequenceId" | "tagId", id: string, isRevoke: boolean) {
  return actions.some((action) => String(action[key] ?? "").toLowerCase() === id.toLowerCase() && action.isRevoke === isRevoke);
}

function hasFilter(filters: Array<Record<string, unknown>>, tagId: string, operatorId: string) {
  return filters.some((filter) => String(filter.primaryValue).toLowerCase() === tagId.toLowerCase() && filter.primaryFilterOperatorId === operatorId);
}

function hasExactFilter(filters: Array<Record<string, unknown>>, value: string, operatorId: string) {
  return filters.some((filter) => String(filter.primaryValue).toLowerCase() === value.toLowerCase() && filter.primaryFilterOperatorId === operatorId);
}

async function verifyAutomation(id: string, name: string, checks: (filters: Array<Record<string, unknown>>, actions: Array<Record<string, unknown>>) => void) {
  const automation = (await request(`/api/v1/query/automations/${id}`)) as Record<string, unknown>;
  requireName(automation, name);
  if (automation.isEnabled !== true) throw new Error(`${name} is not enabled.`);
  const filters = (await request("/api/v1/query/filters", { automationId: id })) as Array<Record<string, unknown>>;
  const actions = (await request(`/api/v1/query/automations/${id}/actions`)) as Array<Record<string, unknown>>;
  checks(filters, actions);
}

async function main() {
  const lists = (await request("/api/v1/user/lists")) as Array<Record<string, unknown>>;
  const sequences = (await request("/api/v1/messenger/sequences")) as Array<Record<string, unknown>>;
  const tags = (await request("/api/v1/user/tags")) as Array<Record<string, unknown>>;

  for (const [id, name] of Object.entries(expectedNames.lists)) requireName(requireItem(lists, "listId", id, name), name);
  for (const [id, name] of Object.entries(expectedNames.sequences)) requireName(requireItem(sequences, "sequenceId", id, name), name);
  for (const [id, name] of Object.entries(expectedNames.tags)) requireName(requireItem(tags, "tagId", id, name), name);

  const salesLists = (await request(`/api/v1/messenger/sequences/${ids.sequences.sales}/lists`)) as Array<Record<string, unknown>>;
  const nurtureLists = (await request(`/api/v1/messenger/sequences/${ids.sequences.nurture}/lists`)) as Array<Record<string, unknown>>;
  const bookingLists = (await request(`/api/v1/messenger/sequences/${ids.sequences.bookingConfirmation}/lists`)) as Array<Record<string, unknown>>;
  if (!salesLists.some((list) => list.listId === ids.lists.sales)) throw new Error("Sales sequence recipient list mismatch.");
  if (!nurtureLists.some((list) => list.listId === ids.lists.nurture)) throw new Error("Nurture sequence recipient list mismatch.");
  if (bookingLists.length !== 0) throw new Error("Booking Confirmation still has recipient lists.");
  for (const sequence of sequences) {
    const sequenceLists = (await request(`/api/v1/messenger/sequences/${String(sequence.sequenceId)}/lists`)) as Array<Record<string, unknown>>;
    if (sequenceLists.some((list) => String(list.listId).toLowerCase() === ids.lists.allContacts.toLowerCase())) {
      throw new Error(`Nexubis | All Contacts is attached to sequence: ${String(sequence.name)}`);
    }
  }

  await verifyAutomation(ids.automations.brandToAllContacts, "Nexubis | Brand Tag - Add to All Contacts", (filters, actions) => {
    if (!hasExactFilter(filters, ids.tags.brand, TAG_IS)) throw new Error("Brand-to-All trigger filter missing.");
    if (!hasAction(actions, "listId", ids.lists.allContacts, false)) throw new Error("Brand-to-All list action missing.");
    if (actions.length !== 1) throw new Error("Brand-to-All automation must have exactly one action.");
  });

  await verifyAutomation(ids.automations.manualHoldingTags, "Nexubis | Manual Holding - Apply Contact Tags", (filters, actions) => {
    if (!hasExactFilter(filters, ids.lists.manual, LIST_IS)) throw new Error("Manual Holding list trigger filter missing.");
    for (const tagId of [ids.tags.brand, ids.tags.sourceManual, ids.tags.triggerNurture]) {
      if (!hasAction(actions, "tagId", tagId, false)) throw new Error(`Manual Holding tag action missing: ${tagId}`);
    }
    if (actions.length !== 3) throw new Error("Manual Holding automation must have exactly three actions.");
    if (hasAction(actions, "listId", ids.lists.allContacts, false)) throw new Error("Manual Holding automation must not add All Contacts directly.");
    if (hasAction(actions, "listId", ids.lists.nurture, false)) throw new Error("Manual Holding automation must not add the nurture list directly.");
    if (hasAction(actions, "sequenceId", ids.sequences.nurture, false)) throw new Error("Manual Holding automation must not add the nurture sequence directly.");
  });

  await verifyAutomation(ids.automations.sales, "Nexubis | Start Scorecard Sales", (filters, actions) => {
    if (!hasFilter(filters, ids.tags.triggerSales, TAG_IS)) throw new Error("Sales trigger filter missing.");
    for (const tagId of [ids.tags.historySales, ids.tags.booked, ids.tags.replied]) if (!hasFilter(filters, tagId, TAG_IS_NOT)) throw new Error(`Sales exclusion missing: ${tagId}`);
    for (const action of [
      ["listId", ids.lists.sales, false],
      ["listId", ids.lists.manual, true],
      ["listId", ids.lists.nurture, true],
      ["sequenceId", ids.sequences.nurture, true],
      ["sequenceId", ids.sequences.sales, false],
      ["tagId", ids.tags.historySales, false],
      ["tagId", ids.tags.triggerSales, true],
    ] as const) if (!hasAction(actions, action[0], action[1], action[2])) throw new Error(`Sales action missing: ${action.join(" ")}`);
  });

  await verifyAutomation(ids.automations.nurture, "Nexubis | Start Credibility Brief Nurture", (filters, actions) => {
    if (!hasFilter(filters, ids.tags.triggerNurture, TAG_IS)) throw new Error("Nurture trigger filter missing.");
    for (const tagId of [ids.tags.booked, ids.tags.replied, ids.tags.historyNurture]) if (!hasFilter(filters, tagId, TAG_IS_NOT)) throw new Error(`Nurture exclusion missing: ${tagId}`);
    for (const action of [
      ["sequenceId", ids.sequences.sales, true],
      ["listId", ids.lists.sales, true],
      ["listId", ids.lists.nurture, false],
      ["sequenceId", ids.sequences.nurture, false],
      ["tagId", ids.tags.historyNurture, false],
      ["tagId", ids.tags.triggerNurture, true],
      ["listId", ids.lists.manual, true],
    ] as const) if (!hasAction(actions, action[0], action[1], action[2])) throw new Error(`Nurture action missing: ${action.join(" ")}`);
    if (hasAction(actions, "listId", ids.lists.allContacts, true)) throw new Error("Nurture automation removes All Contacts.");
  });

  await verifyAutomation(ids.automations.booked, "Nexubis | Call Booked - Exit Campaigns", (filters, actions) => {
    if (!hasFilter(filters, ids.tags.booked, TAG_IS)) throw new Error("Booked trigger filter missing.");
    if (hasAction(actions, "sequenceId", ids.sequences.bookingConfirmation, false)) throw new Error("Booking Confirmation add action still exists.");
    for (const action of [
      ["sequenceId", ids.sequences.sales, true],
      ["sequenceId", ids.sequences.nurture, true],
      ["listId", ids.lists.sales, true],
      ["listId", ids.lists.nurture, true],
      ["listId", ids.lists.manual, true],
      ["listId", ids.lists.booked, false],
      ["tagId", ids.tags.triggerSales, true],
      ["tagId", ids.tags.triggerNurture, true],
    ] as const) if (!hasAction(actions, action[0], action[1], action[2])) throw new Error(`Booked action missing: ${action.join(" ")}`);
  });

  await verifyAutomation(ids.automations.replied, "Nexubis | Replied - Exit Campaigns", (filters, actions) => {
    if (!hasFilter(filters, ids.tags.replied, TAG_IS)) throw new Error("Replied trigger filter missing.");
    for (const action of [
      ["sequenceId", ids.sequences.sales, true],
      ["sequenceId", ids.sequences.nurture, true],
      ["listId", ids.lists.sales, true],
      ["listId", ids.lists.nurture, true],
      ["listId", ids.lists.manual, true],
      ["tagId", ids.tags.triggerSales, true],
      ["tagId", ids.tags.triggerNurture, true],
    ] as const) if (!hasAction(actions, action[0], action[1], action[2])) throw new Error(`Replied action missing: ${action.join(" ")}`);
  });

  console.log("Nexubis Funnelr read-only verification passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
