"use client";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { rerunAudit } from "@/app/audit/admin/actions";
import {
  confirmKeyword,
  confirmationMatches,
} from "@/lib/scorecard/admin/confirmation";
function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" disabled={disabled || pending}>
      {pending ? "Running, about 2 minutes..." : "Yes, re-run now"}
    </button>
  );
}
export function RerunAuditForm({
  slug,
  destination = "report",
  url,
  company,
  name,
  paste = false,
}: {
  slug: string;
  destination?: "manual" | "report";
  url: string;
  company: string;
  name?: string;
  paste?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const keyword = confirmKeyword(url);
  if (!open)
    return (
      <button className="btn btn-secondary" onClick={() => setOpen(true)}>
        Re-run audit...
      </button>
    );
  return (
    <div className="sc-admin-confirm">
      <h3>Re-run {company}&apos;s audit?</h3>
      <p>
        {paste
          ? "This re-scores the stored text"
          : `This crawls ${new URL(/^https?:/.test(url) ? url : `https://${url}`).hostname} again`}{" "}
        and replaces the scores on {name || company}&apos;s report, at the same
        link. It takes about 2 minutes. Nothing is emailed and nothing goes to
        Funnelr or Meta. If the site can&apos;t be read, nothing changes.
      </p>
      <form
        action={rerunAudit.bind(null, slug, destination)}
        className="sc-admin-form"
      >
        <label className="sc-field">
          <span>Type {keyword} to confirm</span>
          <input
            name="confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
          />
        </label>
        <div className="sc-admin-ops">
          <Submit disabled={!confirmationMatches(url, typed)} />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setOpen(false);
              setTyped("");
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
