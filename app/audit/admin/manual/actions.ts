"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE, isValidSession } from "@/lib/scorecard/auth";
import {
  runManualAudit,
  rerunManualAudit as rerun,
} from "@/lib/scorecard/manual/run";
import { ManualAuditError } from "@/lib/scorecard/manual/paste";

async function requireSession(): Promise<void> {
  const jar = await cookies();
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value))
    throw new Error("Not signed in.");
}
const field = (data: FormData, name: string) => String(data.get(name) ?? "");

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
    destination = `/audit/admin/manual?created=${encodeURIComponent(outcome.slug)}`;
  } catch (err) {
    destination = `/audit/admin/manual?error=${err instanceof ManualAuditError ? err.code : "failed"}`;
  }
  revalidatePath("/audit/admin/manual");
  redirect(destination);
}

export async function rerunManualAudit(data: FormData): Promise<void> {
  await requireSession();
  let destination: string;
  try {
    const slug = field(data, "slug");
    const newPasteRaw = data.has("newPasteRaw")
      ? field(data, "newPasteRaw")
      : undefined;
    const outcome = await rerun(slug, { newPasteRaw });
    revalidatePath(`/audit/admin/${outcome.slug}`);
    revalidatePath(`/audit/r/${outcome.slug}`);
    destination = `/audit/admin/manual?created=${encodeURIComponent(outcome.slug)}`;
  } catch (err) {
    destination = `/audit/admin/manual?error=${err instanceof ManualAuditError ? err.code : "failed"}`;
  }
  revalidatePath("/audit/admin/manual");
  redirect(destination);
}
