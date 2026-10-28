"use server";

// Server actions behind the admin area. Every action re-checks the session
// cookie itself: actions are reachable endpoints regardless of what page
// rendered them.
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  expectedSessionToken,
  isValidSession,
  passwordMatches,
  adminConfigured,
} from "@/lib/scorecard/auth";
import { updateLead, type LoomStatus } from "@/lib/scorecard/leads";
import { patchShared } from "@/lib/scorecard/share";
import { rerunStoredAudit } from "@/lib/scorecard/manual/rerun";
import { auditErrorQuery } from "@/lib/scorecard/manual/feedback";

const SESSION_TTL_S = 12 * 60 * 60;

async function requireSession(): Promise<void> {
  const jar = await cookies();
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value)) {
    throw new Error("Not signed in.");
  }
}

export async function adminLogin(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "");
  if (!adminConfigured() || !passwordMatches(password)) {
    redirect("/audit/admin?error=1");
  }
  const jar = await cookies();
  jar.set(SESSION_COOKIE, expectedSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_S,
    path: "/audit/admin",
  });
  redirect("/audit/admin/leads");
}

export async function adminLogout(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/audit/admin");
}

export async function saveLeadNote(formData: FormData): Promise<void> {
  await requireSession();
  const slug = String(formData.get("slug") ?? "");
  const note = String(formData.get("note") ?? "").slice(0, 2000);
  if (!slug) return;
  await updateLead(slug, { note });
  revalidatePath("/audit/admin/leads");
  revalidatePath(`/audit/admin/${slug}`);
}

const LOOM_STATUSES: LoomStatus[] = ["none", "selected", "recorded", "sent"];

export async function setLoomStatus(formData: FormData): Promise<void> {
  await requireSession();
  const slug = String(formData.get("slug") ?? "");
  const status = String(formData.get("loomStatus") ?? "") as LoomStatus;
  if (!slug || !LOOM_STATUSES.includes(status)) return;
  await updateLead(slug, { loomStatus: status });
  revalidatePath("/audit/admin/leads");
  revalidatePath(`/audit/admin/${slug}`);
}

// Attach or replace the Loom on a shared report. Attaching flips the report's
// walkthrough video slot live immediately (the public page is force-dynamic).
// An empty URL removes the Loom.
export async function attachLoom(formData: FormData): Promise<void> {
  await requireSession();
  const slug = String(formData.get("slug") ?? "");
  const raw = String(formData.get("loomUrl") ?? "").trim();
  if (!slug) return;
  const loomUrl = raw.length === 0 ? null : raw;
  if (
    loomUrl &&
    !/^https:\/\/(www\.)?loom\.com\/(share|embed)\/[a-zA-Z0-9]+/.test(loomUrl)
  ) {
    redirect(`/audit/admin/${slug}?error=loom`);
  }
  await patchShared(slug, { loomUrl });
  if (loomUrl) await updateLead(slug, { loomStatus: "recorded" });
  revalidatePath(`/audit/admin/${slug}`);
  revalidatePath(`/audit/r/${slug}`);
}

// Both admin pages call this action. Return destinations are a fixed enum,
// never a caller-controlled URL.
export async function rerunAudit(
  slug: string,
  destination: "manual" | "report" = "report"
): Promise<void> {
  await requireSession();
  const base =
    destination === "manual"
      ? "/audit/admin/manual"
      : `/audit/admin/${encodeURIComponent(slug)}`;
  let location: string;
  try {
    await rerunStoredAudit(slug);
    location = `${base}?updated=${encodeURIComponent(slug)}`;
  } catch (err) {
    location = `${base}?${auditErrorQuery(err)}`;
  }
  revalidatePath("/audit/admin/manual");
  revalidatePath(`/audit/admin/${slug}`);
  revalidatePath(`/audit/r/${slug}`);
  redirect(location);
}

// Compatibility for already-rendered forms: no second implementation.
export async function regenerateReport(formData: FormData): Promise<void> {
  return rerunAudit(String(formData.get("slug") ?? ""));
}
