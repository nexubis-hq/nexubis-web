// Exact Nexubis Funnelr tag + custom-field names, transcribed from Shannah's
// "NEXUBIS FUNNELR TAGGING AND AUTOMATION HANDOVER" doc. These are the contract
// the website/server communicates through — Funnelr automations do everything else.
//
// RECONCILE: Shannah's migration will add a Funnelr mapping module + push to main.
// When it lands, source these names from there and delete this file (kept separate
// now so the nurture scheduler can ship without waiting on her push).
//
// The website/server applies ONLY: Brand, Source, the sales Trigger, and (on a
// confirmed booking) the Call Booked Pipeline tag. It must NEVER apply History
// tags, the nurture History, or add lists/sequences — automations own those.

export const NEXUBIS_TAGS = {
  brand: "Brand: Nexubis",
  sourceScorecard: "Source: Nexubis | Audit",
  sourceContactForm: "Source: Nexubis | Contact Form",
  triggerStartScorecardSales: "Trigger: Nexubis | Start Audit Sales",
  triggerStartNurture: "Trigger: Nexubis | Start Credibility Brief Nurture",
  pipelineCallBooked: "Pipeline: Nexubis | Call Booked",
  pipelineReplied: "Pipeline: Nexubis | Replied",
  pipelineContacted: "Pipeline: Nexubis | Contacted",
  historyScorecardSalesStarted: "History: Nexubis | Audit Sales Started",
  historyNurtureStarted: "History: Nexubis | Credibility Brief Nurture Started",
} as const;

export const NEXUBIS_TAG_IDS = {
  brand: "4B527D4D-3540-401D-A0B1-A1BBDF0FADFF",
  sourceScorecard: "AA47260F-59B0-4D4A-999F-4D571382658D",
  sourceManual: "A23C221E-A548-4268-9223-B1DFC688823A",
  sourceContactForm: "B398BEA3-1E76-410D-AA8B-50F83F283684",
  triggerStartScorecardSales: "6B9DA797-9A52-4F4F-9854-66FFA1935C07",
  triggerStartNurture: "E654E2FA-B55E-4904-9336-9D45AA6837AB",
  pipelineCallBooked: "93347D55-1901-4A2D-90A2-0FCBB6B8A492",
  pipelineReplied: "3B0905B4-D0C6-4A2D-861D-64D9579D7DE6",
  pipelineContacted: "134F3411-5993-45FF-BA40-45D877513B2B",
  historyScorecardSalesStarted: "CD99688F-34FF-4942-9CDC-FF9A7E4A6735",
  historyNurtureStarted: "A4A6A094-AA39-4288-B2A7-54087866DC4B",
} as const;

export const NEXUBIS_LIST_IDS = {
  allContacts: "C4AF8E82-8363-4AC5-9B93-D28D1385C75E",
  scorecardSales: "984BD709-F993-498A-B5BF-0ED86CFA7AAB",
  credibilityBriefNurture: "A8A408CE-DB84-415B-9FC1-8EABC2A391A6",
  callBooked: "3169E25F-3B23-4E75-8E48-5AC4673E966F",
  manualHolding: "49992A25-D155-4674-A0DB-3B8DA00F41E9",
} as const;

export const NEXUBIS_FIELDS = {
  reportUrl: "Nexubis | Audit Report URL",
  salesStartedAt: "Nexubis | Scorecard Sales Started At",
} as const;
