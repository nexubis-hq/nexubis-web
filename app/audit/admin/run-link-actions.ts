"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE, isValidSession } from "@/lib/scorecard/auth";
import { loadLeadsView } from "@/lib/scorecard/admin/data";
import { readRecentScanLog } from "@/lib/scorecard/diagnostics";
import { runLinkId, saveRunLink } from "@/lib/scorecard/admin/run-links";
export async function linkActivityRun(form: FormData): Promise<void> {
  const jar = await cookies();
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value))
    throw new Error("Not signed in.");
  const [log, view] = await Promise.all([
    readRecentScanLog(500),
    loadLeadsView({ period: "all", showTests: true }),
  ]);
  const run = log.find((run) => runLinkId(run) === form.get("runId"));
  if (!run) throw new Error("Run not found.");
  const chosen = String(form.get("leadPath") || "");
  const lead = view.allRows.find(
    (row) =>
      row.leadPath === chosen &&
      Date.parse(row.firstSeen) >= view.now - 30 * 86400000
  );
  if (chosen && !lead) throw new Error("Choose a lead from the last 30 days.");
  await saveRunLink(run, lead?.leadPath || null);
  revalidatePath("/audit/admin", "layout");
}
