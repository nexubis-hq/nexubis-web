"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE, isValidSession } from "@/lib/scorecard/auth";
import { loadLeadsView } from "@/lib/scorecard/admin/data";
import { withProfileLock } from "@/lib/scorecard/admin/profiles";
import {
  contactField,
  readAdminContact,
  writeAdminContact,
} from "@/lib/scorecard/admin/contact";

export async function saveAdminContact(
  _previous: { message: string; error?: boolean },
  form: FormData
) {
  const jar = await cookies();
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value))
    return { message: "Not signed in.", error: true };
  const path = String(form.get("leadPath") || "");
  try {
    const firstName = contactField(form.get("firstName"));
    const lastName = contactField(form.get("lastName"));
    const role = contactField(form.get("role"));
    if (!firstName) throw new Error("First name is required.");
    await withProfileLock(path, async () => {
      const view = await loadLeadsView({ period: "all", showTests: true });
      const row = view.allRows.find((row) => row.leadPath === path);
      if (!row) throw new Error("Lead not found.");
      const previous = await readAdminContact(path);
      await writeAdminContact(path, {
        firstName,
        lastName,
        role,
        editedFields: ["firstName", "lastName", "role"],
        edits: [
          {
            at: new Date().toISOString(),
            text: `Contact edited by admin: ${previous?.firstName ?? row.firstName} to ${firstName}`,
          },
          ...(previous?.edits || []),
        ],
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return {
      message:
        /^(First name|Contact fields|Lead not found|LinkedIn update in progress)/.test(
          message
        )
          ? message
          : "Contact could not be saved. Try again shortly.",
      error: true,
    };
  }
  revalidatePath(path);
  revalidatePath("/audit/admin/leads");
  revalidatePath("/audit/admin/scans");
  return { message: "Contact saved." };
}
