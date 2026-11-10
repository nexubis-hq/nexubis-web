import {
  canStart,
  canStop,
  currentEnrolment,
  sequenceHeadline,
} from "@/lib/scorecard/admin/sequence-view";
import type { SequenceMode, SequenceStatus } from "@/lib/sequences/client";
import { SequenceControls } from "./SequenceControls";
import { formatSast } from "./date";

function sendState(send: { status: string; delivered_at: string | null }): string {
  if (send.delivered_at) return "Delivered";
  return send.status.charAt(0).toUpperCase() + send.status.slice(1);
}

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
  const next =
    current?.status === "active" && current.nextDueAt
      ? { step: current.step + 1, at: current.nextDueAt }
      : null;
  return (
    <div className="sc-admin-funnelr">
      <p>
        <strong>{sequenceHeadline(status)}</strong>
      </p>
      {mode === "shadow" && (
        <small className="sc-admin-subtext">
          Rehearsal: Funnelr still sends the real emails.
        </small>
      )}
      {current?.status === "running_in_funnelr" && (
        <small className="sc-admin-subtext">
          Funnelr sends the rest of this sequence, so those emails don&apos;t show here.
        </small>
      )}
      {(sent.length > 0 || next) && (
        <div className="sc-admin-tablewrap">
          <table className="sc-admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Subject</th>
                <th>Status</th>
                <th>When (SAST)</th>
              </tr>
            </thead>
            <tbody>
              {sent.map((send) => (
                <tr key={`${send.sequence_key}-${send.step_index}`}>
                  <td>{send.step_index + 1}</td>
                  <td>{send.subject}</td>
                  <td>{sendState(send)}</td>
                  <td>{formatSast(send.sent_at || send.claimed_at)}</td>
                </tr>
              ))}
              {next && (
                <tr className="sc-admin-dim">
                  <td>{next.step}</td>
                  <td>Next email</td>
                  <td>Scheduled</td>
                  <td>{formatSast(next.at)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
