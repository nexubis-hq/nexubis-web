"use client";
import { useActionState } from "react";
import { saveLinkedinProfile } from "@/app/audit/admin/profile-actions";
export function LinkedinForm({
  leadPath,
  person,
  company,
  showCompany,
}: {
  leadPath: string;
  person?: string | null;
  company?: string | null;
  showCompany: boolean;
}) {
  const [state, action, pending] = useActionState(saveLinkedinProfile, {
    message: "",
  });
  return (
    <details className="sc-admin-profile-form">
      <summary>Edit LinkedIn links</summary>
      <form action={action} className="sc-admin-form">
        <input type="hidden" name="leadPath" value={leadPath} />
        <label className="sc-field">
          <span>LinkedIn profile (optional)</span>
          <input
            name="linkedinProfile"
            type="url"
            defaultValue={person || ""}
            placeholder="https://www.linkedin.com/in/name/"
          />
        </label>
        {showCompany && (
          <label className="sc-field">
            <span>Company LinkedIn (optional)</span>
            <input
              name="companyLinkedin"
              type="url"
              defaultValue={company || ""}
              placeholder="https://www.linkedin.com/company/name/"
            />
          </label>
        )}
        <button className="btn btn-secondary" disabled={pending}>
          {pending ? "Saving..." : "Save LinkedIn links"}
        </button>
        {state.message && (
          <p
            role="status"
            className={state.error ? "sc-admin-warn" : "sc-admin-dim"}
          >
            {state.message}
          </p>
        )}
      </form>
    </details>
  );
}
