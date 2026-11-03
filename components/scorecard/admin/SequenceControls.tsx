"use client";
import { useActionState, useState } from "react";
import { sequenceLeadAction } from "@/app/audit/admin/sequence-actions";
import {
  confirmKeyword,
  confirmationMatches,
} from "@/lib/scorecard/admin/confirmation";

export function SequenceControls({
  leadPath,
  name,
  website,
  test,
  canSend,
  canStop,
  hasReport,
}: {
  leadPath: string;
  name: string;
  website: string;
  test: boolean;
  canSend: boolean;
  canStop: boolean;
  hasReport: boolean;
}) {
  const [mode, setMode] = useState<"send" | "stop" | null>(null);
  const [typed, setTyped] = useState("");
  const [feedback, action, pending] = useActionState(
    async (previous: { message: string; error?: boolean }, form: FormData) => {
      const result = await sequenceLeadAction(previous, form);
      if (!result.error) {
        setMode(null);
        setTyped("");
      }
      return result;
    },
    { message: "" }
  );
  return (
    <div className="sc-admin-funnelr-controls">
      <form action={action}>
        <input type="hidden" name="leadPath" value={leadPath} />
        <input type="hidden" name="mode" value="check" />
        <button className="btn btn-secondary" disabled={pending}>
          {pending ? "Working..." : "Check sequence"}
        </button>
      </form>
      {!mode && canSend && (
        <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => setMode("send")}>
          Start sequence
        </button>
      )}
      {!mode && canStop && (
        <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => setMode("stop")}>
          Stop emails
        </button>
      )}
      {mode && (
        <form action={action} className="sc-admin-confirm">
          <input type="hidden" name="leadPath" value={leadPath} />
          <input type="hidden" name="mode" value={mode} />
          <p>
            {mode === "send"
              ? `This starts the Audit Sales emails for ${name}. Email 1 sends their report link.`
              : `This stops all automated emails to ${name} for good.`}
          </p>
          {test && <p>This is a test contact.</p>}
          <label className="sc-field">
            <span>Type {confirmKeyword(website)} to confirm</span>
            <input
              name="confirm"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              disabled={pending}
            />
          </label>
          <div className="sc-admin-ops">
            <button
              className="btn btn-primary"
              disabled={
                pending ||
                (mode === "send" && !hasReport) ||
                !confirmationMatches(website, typed)
              }
            >
              {pending ? "Working..." : mode === "send" ? "Confirm start" : "Confirm stop"}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              disabled={pending}
              onClick={() => {
                setMode(null);
                setTyped("");
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {feedback.message && (
        <p role="status" className={feedback.error ? "sc-admin-funnelr-problem" : "sc-admin-dim"}>
          {feedback.message}
        </p>
      )}
    </div>
  );
}
