"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE, isValidSession } from "@/lib/scorecard/auth";
import { loadLeadsView } from "@/lib/scorecard/admin/data";
import { saveLeadProfile } from "@/lib/scorecard/admin/profiles";
import { storedCompanyLinkedin } from "@/lib/scorecard/admin/linkedin";
export async function saveLinkedinProfile(
  _previous: { message: string; error?: boolean },
  form: FormData
) {
  const jar = await cookies();
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value))
    return { message: "Not signed in.", error: true };
  const path = String(form.get("leadPath") || "");
  const view = await loadLeadsView({ period: "all", showTests: true });
  const row = view.allRows.find((row) => row.leadPath === path);
  if (!row) return { message: "Lead not found.", error: true };
  const report = row.reportPath
    ? view.reports[row.reportPath.split("/").pop()!]
    : null;
  try {
    await saveLeadProfile(
      path,
      String(form.get("linkedinProfile") || ""),
      storedCompanyLinkedin(report, row.company, true)
        ? ""
        : String(form.get("companyLinkedin") || "")
    );
  } catch {
    return {
      message:
        "Use a linkedin.com/in/ profile URL and a linkedin.com/company/ company URL. If these are valid, the save could not finish; try again.",
      error: true,
    };
  }
  revalidatePath(path);
  return { message: "LinkedIn links saved." };
}
