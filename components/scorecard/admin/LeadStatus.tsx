import type { QualifiedAuditDecision } from "@/lib/scorecard/qualified-audit";
export function LeadStatus({
  status,
}: {
  status: "ready" | "failed" | "hand";
}) {
  return (
    <span className={`sc-admin-chip sc-admin-status-${status}`}>
      {status === "ready"
        ? "Report ready"
        : status === "hand"
          ? "Made by hand"
          : "Scan failed"}
    </span>
  );
}
export function Qualified({ decision }: { decision?: QualifiedAuditDecision }) {
  return (
    <>
      <span
        className={`sc-admin-chip ${decision?.qualified ? "sc-admin-chip-yes" : ""}`}
      >
        {decision ? (decision.qualified ? "Yes" : "No") : "Not read"}
      </span>
      {decision && (
        <small className="sc-admin-subtext">{decision.reason}</small>
      )}
    </>
  );
}
