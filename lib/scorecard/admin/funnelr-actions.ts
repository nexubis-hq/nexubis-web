import { createFunnelrClient } from "@/lib/funnelr/client";
import { submitScorecardLeadToFunnelr } from "../lead-funnelr";
import { getKv } from "../kv";
import { confirmationMatches } from "./confirmation";
import { checkFunnelrLead } from "./funnelr-check";
import {
  finishFunnelrAttempt,
  funnelrStatusKey,
  safeFunnelrError,
  saveFunnelrAttempt,
  type FunnelrAttempt,
  type FunnelrStatus,
} from "./funnelr-status";

export interface FunnelrTarget {
  firstName: string;
  email: string;
  company: string;
  website: string;
  reportUrl?: string;
  manual: boolean;
}
export type FunnelrActionMode = "check" | "retry" | "send";
export async function performFunnelrAction(
  target: FunnelrTarget,
  mode: FunnelrActionMode,
  confirm: unknown,
  startSales: boolean,
  options: {
    client?: ReturnType<typeof createFunnelrClient>;
    wait?: () => Promise<void>;
  } = {}
): Promise<FunnelrStatus> {
  if (!target.email.trim()) throw new Error("A contact email is required.");
  if (mode !== "check" && (!target.reportUrl || !target.firstName.trim()))
    throw new Error("A report and first name are required before sending.");
  if (mode !== "check" && !confirmationMatches(target.website, confirm))
    throw new Error(
      "The website confirmation did not match. Nothing was sent."
    );
  if (mode === "send" && !target.manual)
    throw new Error("Send is for manual leads only.");
  const key = funnelrStatusKey(target.email, target.reportUrl);
  const kv = getKv();
  // INCR is atomic across instances. A rejected click never extends the cooldown.
  const gate = `${key}:admin-cooldown`;
  const attempt = await kv.incr(gate);
  if (attempt === 1) await kv.expire(gate, 60);
  else
    throw new Error("Wait 60 seconds between Funnelr attempts for this lead.");
  const started: FunnelrAttempt = {
    state: "failed",
    at: new Date().toISOString(),
    by: `admin-${mode}`,
    pending: true,
    error: "Funnelr check in progress.",
  };
  // Fail closed: do not touch the CRM unless the attempt can be recorded first.
  await saveFunnelrAttempt(key, started);
  let result: Omit<FunnelrAttempt, "at" | "by">;
  try {
    const client = options.client ?? createFunnelrClient();
    const before = await checkFunnelrLead(
      target.email,
      target.reportUrl || "",
      client
    );
    if (mode === "check" || (before.state === "ok" && !startSales))
      result = before;
    else {
      const sent = await submitScorecardLeadToFunnelr(
        {
          firstName: target.firstName,
          email: target.email,
          marketingConsent: true,
          reportUrl: target.reportUrl,
          company: target.company,
        },
        { client, skipSalesTrigger: before.state !== "missing" && !startSales }
      );
      await (options.wait
        ? options.wait()
        : new Promise<void>((resolve) => setTimeout(resolve, 5000)));
      const after = await checkFunnelrLead(
        target.email,
        target.reportUrl || "",
        client
      );
      // A write can fail after taking effect; show the verified result when complete.
      result =
        after.state === "ok" || sent.ok
          ? after
          : { ...after, state: "failed", error: safeFunnelrError(sent.error) };
    }
  } catch (error) {
    result = { state: "failed", error: safeFunnelrError(error) };
  }
  return finishFunnelrAttempt(key, started, result);
}
