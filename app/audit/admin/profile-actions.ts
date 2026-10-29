"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE, isValidSession } from "@/lib/scorecard/auth";
import { loadLeadsView } from "@/lib/scorecard/admin/data";
import { linkedinUrl } from "@/lib/scorecard/admin/linkedin";
import {
  boundedLookup,
  lookupCompanyLinkedin,
  lookupPersonLinkedin,
} from "@/lib/scorecard/admin/linkedin-lookup";
import {
  mergeLookup,
  normalizeProfile,
  readLeadProfile,
  withProfileLock,
  writeLeadProfile,
} from "@/lib/scorecard/admin/profiles";
async function signedIn() {
  const jar = await cookies();
  return isValidSession(jar.get(SESSION_COOKIE)?.value);
}
export async function lookupLinkedin(leadPath: string, again = false) {
  if (!(await signedIn())) return { message: "Not signed in.", error: true };
  try {
    return await withProfileLock(leadPath, async () => {
      const profile = normalizeProfile(await readLeadProfile(leadPath));
      if (profile.lookedUpAt && !again) return { message: "", profile };
      const view = await loadLeadsView({ period: "all", showTests: true });
      const row = view.allRows.find((row) => row.leadPath === leadPath);
      if (!row) return { message: "Lead not found.", error: true };
      const report = row.reportPath
        ? view.reports[row.reportPath.split("/").pop()!]
        : null;
      const lead = {
        company: row.company,
        firstName: row.firstName,
        email: row.email,
        url: row.host || "",
        report,
      };
      const [company, person] = await Promise.all([
        boundedLookup(() => lookupCompanyLinkedin(lead)),
        boundedLookup(() => lookupPersonLinkedin(lead)),
      ]);
      const updated = mergeLookup(
        profile,
        company,
        person,
        new Date().toISOString()
      );
      await writeLeadProfile(leadPath, updated);
      revalidatePath(leadPath);
      return {
        message:
          company || person ? "LinkedIn lookup complete." : "Nothing found",
        profile: updated,
      };
    });
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "LinkedIn lookup could not finish.",
      error: true,
    };
  }
}
export async function saveLinkedinProfile(
  _previous: { message: string; error?: boolean },
  form: FormData
) {
  if (!(await signedIn())) return { message: "Not signed in.", error: true };
  const path = String(form.get("leadPath") || "");
  const view = await loadLeadsView({ period: "all", showTests: true });
  if (!view.allRows.some((row) => row.leadPath === path))
    return { message: "Lead not found.", error: true };
  const kind =
    form.get("kind") === "company" ? "companyLinkedin" : "linkedinProfile";
  try {
    await withProfileLock(path, async () => {
      const profile = normalizeProfile(await readLeadProfile(path));
      if (form.get("operation") === "confirm") {
        if (kind !== "linkedinProfile" || !profile.linkedinProfile)
          throw new Error("Save a person link first.");
        profile.linkedinProfile = {
          ...profile.linkedinProfile,
          status: "confirmed",
        };
      } else {
        const url = linkedinUrl(
          String(form.get("url") || ""),
          kind === "companyLinkedin" ? "company" : "in"
        );
        if (!url)
          throw new Error(
            `Use https://(www.)linkedin.com/${kind === "companyLinkedin" ? "company" : "in"}/...`
          );
        profile[kind] = {
          url,
          status: "manual",
          source: "manual",
          savedAt: new Date().toISOString(),
        };
      }
      await writeLeadProfile(path, profile);
    });
  } catch (error) {
    return {
      message:
        error instanceof Error ? error.message : "Save could not finish.",
      error: true,
    };
  }
  revalidatePath(path);
  return { message: "LinkedIn link saved." };
}
