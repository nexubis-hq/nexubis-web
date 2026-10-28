"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE, isValidSession } from "@/lib/scorecard/auth";
import { loadLeadsView } from "@/lib/scorecard/admin/data";
import {
  performFunnelrAction,
  type FunnelrActionMode,
} from "@/lib/scorecard/admin/funnelr-actions";
import {
  funnelrProblem,
  readFunnelrStatus,
} from "@/lib/scorecard/admin/funnelr-status";

export interface FunnelrActionFeedback {
  message: string;
  error?: boolean;
}
export async function funnelrLeadAction(
  _previous: FunnelrActionFeedback,
  form: FormData
): Promise<FunnelrActionFeedback> {
  const jar = await cookies();
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value))
    return { message: "Not signed in.", error: true };
  try {
    const path = String(form.get("leadPath") || "");
    const mode = String(form.get("mode") || "") as FunnelrActionMode;
    if (!["check", "retry", "send"].includes(mode))
      throw new Error("Invalid Funnelr action.");
    const view = await loadLeadsView({ period: "all", showTests: true });
    const row = view.allRows.find((row) => row.leadPath === path);
    if (!row) throw new Error("Lead not found.");
    const report = row.reportPath
      ? view.reports[row.reportPath.split("/").pop()!]
      : null;
    const reportUrl = row.reportPath
      ? new URL(
          row.reportPath,
          process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexubis.io"
        ).toString()
      : undefined;
    const status = await readFunnelrStatus(row.email, reportUrl);
    if (mode === "retry" && !funnelrProblem(status))
      throw new Error("Check Funnelr before retrying.");
    if (mode !== "check" && !report)
      throw new Error("A saved report is required before sending.");
    await performFunnelrAction(
      {
        firstName: row.firstName,
        email: row.email,
        company: report?.result.meta.company || row.company,
        website: row.host,
        reportUrl,
        manual: row.status === "hand",
      },
      mode,
      form.get("confirm"),
      form.get("startSales") === "on"
    );
    revalidatePath(path);
    revalidatePath("/audit/admin/leads");
    return { message: "Funnelr result saved. See the status and timeline." };
  } catch (error) {
    // Only local validation messages escape; CRM errors are sanitized and stored by the service.
    const message =
      error instanceof Error
        ? error.message
        : "Funnelr action could not finish.";
    const allowed =
      /^(Not signed|Lead not|Invalid Funnelr|Check Funnelr|A saved report|A contact email|A report and first|The website confirmation|Send is for|Wait 60 seconds)/;
    return {
      message: allowed.test(message)
        ? message
        : "The status store is unavailable. Check before trying again.",
      error: true,
    };
  }
}
