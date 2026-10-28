"use client";
import { useState } from "react";
import { linkActivityRun } from "@/app/audit/admin/run-link-actions";
import { runLinkId } from "@/lib/scorecard/admin/run-identity";
import type { ScanRunLog } from "@/lib/scorecard/diagnostics";
import type { LeadRow } from "@/lib/scorecard/admin/leads-view";
export function RunLeadLink({
  run,
  leads,
  selected = "",
}: {
  run: ScanRunLog;
  leads: Pick<LeadRow, "leadPath" | "company" | "firstName">[];
  selected?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="sc-admin-run-link"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>{selected ? "change" : "Link to lead"}</summary>
      {open && (
        <form action={linkActivityRun} className="sc-admin-form">
          <input type="hidden" name="runId" value={runLinkId(run)} />
          <label className="sc-field">
            <span>Lead from the last 30 days</span>
            <select
              name="leadPath"
              defaultValue={selected}
              required={!selected}
            >
              <option value="">{selected ? "Unlink" : "Choose a lead"}</option>
              {leads.map((lead) => (
                <option key={lead.leadPath} value={lead.leadPath}>
                  {lead.company} &middot;{" "}
                  {lead.firstName || "name not recorded"}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-secondary">Save link</button>
        </form>
      )}
    </details>
  );
}
