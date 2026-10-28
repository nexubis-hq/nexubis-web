import { getKv } from "../kv";
import {
  scorecardSlugFromReportUrl,
  type ScorecardLeadInput,
  type ScorecardLeadResult,
} from "../lead-funnelr";
import type { FunnelrCheck } from "./funnelr-check";

export const FUNNELR_STATUS_TTL = 180 * 86400;
export type FunnelrBy =
  | "browser"
  | "admin-check"
  | "admin-retry"
  | "admin-send";
export interface FunnelrAttempt {
  state: "ok" | "failed" | "partial" | "missing";
  at: string;
  by: FunnelrBy;
  error?: string;
  missing?: string[];
  triggerTag?: boolean;
  salesList?: boolean;
  pending?: boolean;
}
export interface FunnelrStatus extends FunnelrAttempt {
  attempts: number;
  history: FunnelrAttempt[];
}
export function funnelrStatusKey(email: string, reportUrl?: string): string {
  const slug = reportUrl ? scorecardSlugFromReportUrl(reportUrl) : null;
  return slug
    ? `scorecard-funnelr-status:${slug}`
    : `scorecard-funnelr-status:email:${email.trim().toLowerCase()}`;
}
// Never persist remote response bodies, URLs, email addresses or credentials.
export function safeFunnelrError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  if (/timed out|timeout/i.test(message))
    return "Funnelr request timed out. Check before retrying.";
  if (/not found|not saved|verified|mirror/i.test(message))
    return "Funnelr tags or report link could not be verified. Check before retrying.";
  if (/required|configured/i.test(message))
    return "Funnelr configuration is unavailable.";
  return "Funnelr could not complete the request. Check before retrying.";
}
export async function readFunnelrStatus(
  email: string,
  reportUrl?: string
): Promise<FunnelrStatus | null> {
  return getKv().get<FunnelrStatus>(funnelrStatusKey(email, reportUrl));
}
export async function saveFunnelrAttempt(
  key: string,
  attempt: FunnelrAttempt
): Promise<FunnelrStatus> {
  const kv = getKv();
  const previous = await kv.get<FunnelrStatus>(key);
  const status = {
    ...attempt,
    attempts: (previous?.attempts || 0) + 1,
    history: [attempt, ...(previous?.history || (previous ? [previous] : []))],
  };
  await kv.set(key, status, { ex: FUNNELR_STATUS_TTL });
  return status;
}
export async function recordBrowserFunnelrResult(
  lead: ScorecardLeadInput,
  result: ScorecardLeadResult
): Promise<void> {
  await saveFunnelrAttempt(funnelrStatusKey(lead.email, lead.reportUrl), {
    state: result.ok ? "ok" : "failed",
    at: new Date().toISOString(),
    by: "browser",
    ...(result.ok ? {} : { error: safeFunnelrError(result.error) }),
  });
}
export async function finishFunnelrAttempt(
  key: string,
  started: FunnelrAttempt,
  result: Omit<FunnelrAttempt, "at" | "by">
): Promise<FunnelrStatus> {
  const kv = getKv();
  const current = await kv.get<FunnelrStatus>(key);
  if (!current) throw new Error("Funnelr status unavailable.");
  const entry = { ...result, at: started.at, by: started.by };
  const history = current.history.map((item) =>
    item.at === started.at && item.by === started.by ? entry : item
  );
  const status = { ...entry, attempts: current.attempts, history };
  await kv.set(key, status, { ex: FUNNELR_STATUS_TTL });
  return status;
}
export {
  funnelrStatusText,
  funnelrProblem,
  funnelrTimelineText,
} from "./funnelr-view";
export type { FunnelrCheck };
