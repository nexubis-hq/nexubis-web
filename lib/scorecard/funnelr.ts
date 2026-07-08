// The Funnelr webhook: on unlock, one signed POST creates the contact, applies
// the list and tag, and starts Email 1 of the Part 2C sequence. Funnelr owns
// the email sequence; this tool only delivers the lead. Retries 3 times with
// backoff; on final failure the lead record is flagged webhook:failed and the
// team notification carries the flag. The user's unlock NEVER waits on this.
import { createHmac } from "node:crypto";
import type { LeadRecord } from "./leads";

export interface FunnelrPayload {
  source: "scorecard";
  contact: { firstName: string; email: string; role: string };
  company: string;
  website: string;
  reportUrl: string;
  credibilityScore: number;
  verdict: string;
  firstFixCategory: string | null;
  competitors: string[];
  submittedAt: string;
}

export function buildFunnelrPayload(lead: LeadRecord, absoluteReportUrl: string): FunnelrPayload {
  return {
    source: "scorecard",
    contact: { firstName: lead.name, email: lead.email, role: lead.role },
    company: lead.company,
    website: lead.url,
    reportUrl: absoluteReportUrl,
    credibilityScore: lead.credibilityScore,
    verdict: lead.verdict,
    firstFixCategory: lead.firstFixCategory,
    competitors: lead.competitors.map((c) => c.name),
    submittedAt: lead.createdAt,
  };
}

// HMAC-SHA256 over the exact request body, hex-encoded. Funnelr verifies with
// the shared FUNNELR_WEBHOOK_SECRET.
export function signPayload(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export type WebhookResult = { ok: true; attempts: number } | { ok: false; attempts: number; lastError: string };

const BACKOFF_MS = [0, 1500, 4000];
const ATTEMPT_TIMEOUT_MS = 8000;

export async function fireFunnelrWebhook(
  payload: FunnelrPayload,
  opts: { fetchImpl?: typeof fetch; sleep?: (ms: number) => Promise<void> } = {},
): Promise<WebhookResult> {
  const url = process.env.FUNNELR_WEBHOOK_URL;
  const secret = process.env.FUNNELR_WEBHOOK_SECRET;
  if (!url) return { ok: false, attempts: 0, lastError: "FUNNELR_WEBHOOK_URL not configured" };
  const doFetch = opts.fetchImpl ?? fetch;
  const sleep = opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const body = JSON.stringify(payload);
  const signature = secret ? signPayload(body, secret) : "";

  let lastError = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (BACKOFF_MS[attempt - 1]) await sleep(BACKOFF_MS[attempt - 1]);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
      const res = await doFetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(signature ? { "X-Nexubis-Signature": signature } : {}),
        },
        body,
      });
      clearTimeout(timer);
      if (res.ok) return { ok: true, attempts: attempt };
      lastError = `HTTP ${res.status}`;
      console.error(`[scorecard-funnelr] attempt ${attempt} failed: ${lastError}`);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`[scorecard-funnelr] attempt ${attempt} error: ${lastError}`);
    }
  }
  return { ok: false, attempts: 3, lastError };
}
