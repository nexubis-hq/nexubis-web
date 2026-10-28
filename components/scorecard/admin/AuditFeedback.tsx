import Link from "next/link";
import { readShared } from "@/lib/scorecard/share";
import { readAdminRunHistory } from "@/lib/scorecard/manual/rerun";
import { auditErrorMessage } from "@/lib/scorecard/manual/feedback";
import { formatSast } from "./date";

export async function AuditFeedback({
  successSlug,
  error,
  reason,
}: {
  successSlug?: string;
  error?: string;
  reason?: string;
}) {
  if (error)
    return (
      <div className="sc-admin-banner sc-admin-banner-error" role="alert">
        {error === "loom"
          ? "That does not look like a Loom share URL."
          : error === "confirm"
            ? "The confirmation did not match. Nothing changed."
            : auditErrorMessage(error, reason)}
      </div>
    );
  if (!successSlug) return null;
  const shared = await readShared(successSlug);
  if (!shared) return null;
  const history = await readAdminRunHistory(successSlug, shared);
  return (
    <div className="sc-admin-banner sc-admin-banner-success" role="status">
      <p>
        <strong>Report updated: {shared.result.meta.company}</strong>,{" "}
        {formatSast(history.lastRunAt)} SAST, run {history.runCount}
      </p>
      <div className="sc-admin-ops">
        <Link className="btn btn-secondary" href={`/audit/r/${successSlug}`}>
          Open report
        </Link>
        <Link
          className="btn btn-secondary"
          href={`/audit/admin/${successSlug}`}
        >
          Open admin view
        </Link>
      </div>
    </div>
  );
}
