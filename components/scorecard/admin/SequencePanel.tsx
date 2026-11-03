import {
  canStart,
  canStop,
  currentEnrolment,
  sequenceHeadline,
} from "@/lib/scorecard/admin/sequence-view";
import type { SequenceMode, SequenceStatus } from "@/lib/sequences/client";
import { SequenceControls } from "./SequenceControls";
import { formatSast } from "./date";

export function SequencePanel({
  status,
  mode,
  leadPath,
  name,
  website,
  test,
  hasReport,
}: {
  status: SequenceStatus | null;
  mode: SequenceMode;
  leadPath: string;
  name: string;
  website: string;
  test: boolean;
  hasReport: boolean;
}) {
  const current = status ? currentEnrolment(status) : undefined;
  const sent = (status?.sends || []).filter((send) => send.status !== "shadow");
  return (
    <div className="sc-admin-funnelr">
      <strong>{sequenceHeadline(status)}</strong>
      {mode === "shadow" && (
        <small className="sc-admin-subtext">
          Rehearsal: Funnelr still sends the real emails.
        </small>
      )}
      {current?.status === "active" && current.nextDueAt && (
        <small className="sc-admin-subtext">
          Next email: {formatSast(current.nextDueAt)} SAST
        </small>
      )}
      {sent.length > 0 && (
        <details className="sc-admin-about">
          <summary>emails sent</summary>
          {sent.map((send) => (
            <small className="sc-admin-subtext" key={`${send.sequence_key}-${send.step_index}`}>
              {send.subject}: {send.delivered_at ? "delivered" : send.status}
              {send.sent_at ? `, ${formatSast(send.sent_at)} SAST` : ""}
            </small>
          ))}
        </details>
      )}
      <SequenceControls
        leadPath={leadPath}
        name={name}
        website={website}
        test={test}
        canSend={mode === "app" && canStart(status)}
        canStop={mode === "app" && canStop(status)}
        hasReport={hasReport}
      />
    </div>
  );
}
