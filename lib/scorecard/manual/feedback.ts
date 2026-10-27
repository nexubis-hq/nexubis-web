import { ManualAuditError } from "./paste";
import { NormalSiteReadError } from "./normal";

export function auditErrorQuery(err: unknown): string {
  const code = err instanceof ManualAuditError ? err.code : "failed";
  const reason =
    err instanceof NormalSiteReadError
      ? `&reason=${encodeURIComponent(err.reason.slice(0, 200))}`
      : "";
  return `error=${code}${reason}`;
}
export function auditErrorMessage(error?: string, reason?: string): string {
  if (reason) return `Site could not be read: ${reason.slice(0, 200)}`;
  const messages: Record<string, string> = {
    url: "Enter a valid public website link.",
    short: "Paste at least 400 characters of site text.",
    challenge:
      "This looks like a robot-check page. Copy the actual site content from a normal browser and try again.",
    nopaste: "Paste the site's text before running the audit.",
    notready: "Fewer than 3 of 5 sections could be scored. Nothing was saved.",
    timeout: "The audit timed out. Nothing was saved. Please try again.",
    failed: "The audit could not finish. Nothing was saved. Please try again.",
  };
  return messages[error ?? "failed"] ?? messages.failed;
}
