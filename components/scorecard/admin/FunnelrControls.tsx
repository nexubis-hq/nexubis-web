"use client";
import { useActionState, useState } from "react";
import { funnelrLeadAction } from "@/app/audit/admin/funnelr-actions";
import {
  confirmKeyword,
  confirmationMatches,
} from "@/lib/scorecard/admin/confirmation";
export function FunnelrControls({
  leadPath,
  name,
  website,
  test,
  canRetry,
  canSend,
  hasReport,
}: {
  leadPath: string;
  name: string;
  website: string;
  test: boolean;
  canRetry: boolean;
  canSend: boolean;
  hasReport: boolean;
}) {
  const [mode, setMode] = useState<"retry" | "send" | null>(null);
  const [typed, setTyped] = useState("");
  const [feedback, action, pending] = useActionState(
    async (previous: { message: string; error?: boolean }, form: FormData) => {
      const result = await funnelrLeadAction(previous, form);
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
          {pending ? "Working..." : "Check Funnelr"}
        </button>
      </form>
      {!mode && (canRetry || canSend) && (
        <button
          type="button"
          className="btn btn-secondary"
          disabled={pending}
          onClick={() => setMode(canSend ? "send" : "retry")}
        >
          {canSend ? "Send to Funnelr" : "Retry sending to Funnelr"}
        </button>
      )}
      {mode && (
        <form action={action} className="sc-admin-confirm">
          <input type="hidden" name="leadPath" value={leadPath} />
          <input type="hidden" name="mode" value={mode} />
          <p>
            This sends {name} to Funnelr. If they are not in Funnelr yet, the
            Audit Sales emails start and Email 1 sends their report link.
          </p>
          {test && <p>This is a test contact.</p>}
          <p>
            Existing contacts are repaired without starting emails unless you
            select the option below.
          </p>
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
          <label>
            <input type="checkbox" name="startSales" disabled={pending} /> Also
            start the Audit Sales emails (adds the trigger tag)
          </label>
          <div className="sc-admin-ops">
            <button
              className="btn btn-primary"
              disabled={
                pending || !hasReport || !confirmationMatches(website, typed)
              }
            >
              {pending ? "Sending and checking..." : "Confirm send"}
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
        <p
          role="status"
          className={
            feedback.error ? "sc-admin-funnelr-problem" : "sc-admin-dim"
          }
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}
