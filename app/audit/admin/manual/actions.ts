"use server";

import { updateFailedLead } from "@/lib/scorecard/admin/failed-leads";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE, isValidSession } from "@/lib/scorecard/auth";
import { runManualAudit } from "@/lib/scorecard/manual/run";
import { auditErrorQuery } from "@/lib/scorecard/manual/feedback";
import { rerunAudit } from "../actions";
import { runNormalManualAudit } from "@/lib/scorecard/manual/normal";

async function requireSession(): Promise<void> {
  const jar = await cookies();
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value))
    throw new Error("Not signed in.");
}
const field = (data: FormData, name: string) => String(data.get(name) ?? "");

function errorDestination(err: unknown): string {
  return `/audit/admin/manual?${auditErrorQuery(err)}`;
}

export async function createNormalManualAudit(data: FormData): Promise<void> {
  await requireSession();
  let destination: string;
  try {
    const outcome = await runNormalManualAudit({
      url: field(data, "url"),
      contactName: field(data, "contactName"),
      contactEmail: field(data, "contactEmail"),
    });
    if (field(data, "failedLead"))
      await updateFailedLead(field(data, "failedLead"), {
        linkedSlug: outcome.slug,
      });
    revalidatePath("/audit/admin/leads");
    destination = `/audit/admin/manual?created=${encodeURIComponent(outcome.slug)}`;
  } catch (err) {
    destination = errorDestination(err);
  }
  revalidatePath("/audit/admin/manual");
  redirect(destination);
}

export async function createManualAudit(data: FormData): Promise<void> {
  await requireSession();
  let destination: string;
  try {
    const outcome = await runManualAudit({
      url: field(data, "url"),
      companyName: field(data, "companyName"),
      pasteRaw: field(data, "pasteRaw"),
      competitorsRaw: field(data, "competitorsRaw"),
      contactName: field(data, "contactName"),
      contactEmail: field(data, "contactEmail"),
    });
    if (field(data, "failedLead"))
      await updateFailedLead(field(data, "failedLead"), {
        linkedSlug: outcome.slug,
      });
    revalidatePath("/audit/admin/leads");
    destination = `/audit/admin/manual?created=${encodeURIComponent(outcome.slug)}`;
  } catch (err) {
    destination = errorDestination(err);
  }
  revalidatePath("/audit/admin/manual");
  redirect(destination);
}

// Compatibility for old forms; visible UI uses the shared action directly.
export async function rerunManualAudit(data: FormData): Promise<void> {
  return rerunAudit(field(data, "slug"), "manual", data);
}
