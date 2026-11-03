"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE, isValidSession } from "@/lib/scorecard/auth";
import { readAdminContact } from "@/lib/scorecard/admin/contact";
import { confirmationMatches } from "@/lib/scorecard/admin/confirmation";
import { loadLeadsView } from "@/lib/scorecard/admin/data";
import { canStart, canStop } from "@/lib/scorecard/admin/sequence-view";
import { readSequenceStatus, sendSequenceEvent } from "@/lib/sequences/client";

export interface SequenceActionFeedback {
  message: string;
  error?: boolean;
}

// Talks to the sequence app from the server, so Laine never needs its login.
export async function sequenceLeadAction(
  _previous: SequenceActionFeedback,
  form: FormData
): Promise<SequenceActionFeedback> {
  const jar = await cookies();
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value))
    return { message: "Not signed in.", error: true };
  const fail = (message: string) => ({ message, error: true });
  const path = String(form.get("leadPath") || "");
  const mode = String(form.get("mode") || "");
  const view = await loadLeadsView({ period: "all", showTests: true });
  const row = view.allRows.find((item) => item.leadPath === path);
  if (!row) return fail("Lead not found.");
  const done = (message: string) => {
    revalidatePath(path);
    return { message };
  };
  if (mode === "check") return done("Status refreshed.");

  const status = await readSequenceStatus(row.email);
  if (!status) return fail("The sequence app did not answer. Nothing changed.");
  if (!confirmationMatches(row.host, form.get("confirm")))
    return fail("The website confirmation did not match. Nothing changed.");

  const key = `admin-${mode}-${row.email}-${Date.now()}`;
  if (mode === "stop") {
    if (!canStop(status)) return fail("This lead is not in a sequence.");
    const result = await sendSequenceEvent(
      "admin_stop",
      { email: row.email, source: "admin" },
      key
    );
    return result.ok
      ? done("Stopped. No more automated emails for this lead.")
      : fail("The stop did not go through yet. It will retry, check back soon.");
  }
  if (mode === "send") {
    if (!canStart(status))
      return fail("This lead cannot start: already sent, stopped or blocked.");
    if (!row.reportPath) return fail("A saved report is required before sending.");
    const contact = await readAdminContact(path);
    const firstName = contact?.firstName ?? row.firstName;
    if (!firstName?.trim()) return fail("A first name is required before sending.");
    const reportUrl = new URL(
      row.reportPath,
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.nexubis.io"
    ).toString();
    const result = await sendSequenceEvent(
      "admin_start",
      { email: row.email, firstName, company: row.company, website: row.host, reportUrl, source: "admin" },
      key
    );
    return result.ok
      ? done(result.outcome === "enrolled" ? "Sent. Email 1 is on its way." : `Not started: ${result.outcome}.`)
      : fail("The send did not go through yet. It will retry, check back soon.");
  }
  return fail("Invalid action.");
}
