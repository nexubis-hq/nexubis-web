import { linkActivityRun } from "@/app/audit/admin/run-link-actions";
import { runLinkId } from "@/lib/scorecard/admin/run-links";
import type { ScanRunLog } from "@/lib/scorecard/diagnostics";
import type { LeadRow } from "@/lib/scorecard/admin/leads-view";
export function RunLeadLink({
  run,
  leads,
  selected = "",
}: {
  run: ScanRunLog;
  leads: LeadRow[];
  selected?: string;
}) {
  return (
    <details className="sc-admin-run-link">
      <summary>{selected ? "Change lead link" : "Link to lead"}</summary>
      <form action={linkActivityRun} className="sc-admin-form">
        <input type="hidden" name="runId" value={runLinkId(run)} />
        <label className="sc-field">
          <span>Lead from the last 30 days</span>
          <select name="leadPath" defaultValue={selected} required={!selected}>
            <option value="">{selected ? "Unlink" : "Choose a lead"}</option>
            {leads.map((lead) => (
              <option key={lead.leadPath} value={lead.leadPath}>
                {lead.company} &middot; {lead.firstName || "name not recorded"}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-secondary">Save link</button>
      </form>
    </details>
  );
}
