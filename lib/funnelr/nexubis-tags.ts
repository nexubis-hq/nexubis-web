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
  sourceScorecard: "Source: Nexubis | Scorecard",
  triggerStartScorecardSales: "Trigger: Nexubis | Start Scorecard Sales",
  triggerStartNurture: "Trigger: Nexubis | Start Credibility Brief Nurture",
  pipelineCallBooked: "Pipeline: Nexubis | Call Booked",
  pipelineReplied: "Pipeline: Nexubis | Replied",
  historyScorecardSalesStarted: "History: Nexubis | Scorecard Sales Started",
  historyNurtureStarted: "History: Nexubis | Credibility Brief Nurture Started",
} as const;

export const NEXUBIS_FIELDS = {
  reportUrl: "Nexubis | Scorecard Report URL",
  salesStartedAt: "Nexubis | Scorecard Sales Started At",
} as const;
