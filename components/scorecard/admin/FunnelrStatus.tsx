import {
  funnelrProblem,
  funnelrStatusText,
  type FunnelrStatus as Status,
} from "@/lib/scorecard/admin/funnelr-status";
import { FunnelrControls } from "./FunnelrControls";
import { formatSast } from "./date";
export function FunnelrStatus({
  status,
  leadPath,
  name,
  website,
  test,
  manual,
  hasReport,
  email,
}: {
  status?: Status | null;
  leadPath: string;
  name: string;
  website: string;
  test: boolean;
  manual: boolean;
  hasReport: boolean;
  email: string;
}) {
  return (
    <div className="sc-admin-funnelr">
      <strong className={`sc-admin-funnelr-${status?.state || "unknown"}`}>
        {status?.pending ? "Check in progress" : funnelrStatusText(status)}
      </strong>
      {status && (
        <small className="sc-admin-subtext">
          Last attempt: {formatSast(status.at)} SAST ({status.by})
        </small>
      )}
      {status && (
        <small className="sc-admin-subtext">
          Sales trigger tag:{" "}
          {status.triggerTag === undefined
            ? "not checked"
            : status.triggerTag
              ? "present"
              : "absent (may already have fired)"}
        </small>
      )}
      {status && (
        <small className="sc-admin-subtext">
          Audit Leads - Sales list:{" "}
          {status.salesList === undefined
            ? "not checked"
            : status.salesList
              ? "member"
              : "not currently a member"}
        </small>
      )}
      {email && (
        <FunnelrControls
          leadPath={leadPath}
          name={name}
          website={website}
          test={test}
          hasReport={hasReport}
          canSend={manual && hasReport && status?.state !== "other-report"}
          canRetry={hasReport && funnelrProblem(status)}
        />
      )}
    </div>
  );
}
