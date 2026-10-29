"use client";
import { useActionState } from "react";
import { saveAdminContact } from "@/app/audit/admin/contact-actions";

export function EditContact({
  leadPath,
  firstName,
  lastName,
  role,
}: {
  leadPath: string;
  firstName: string;
  lastName: string;
  role: string;
}) {
  const [state, action, pending] = useActionState(saveAdminContact, {
    message: "",
  });
  return (
    <details className="sc-admin-edit-contact">
      <summary>Edit contact</summary>
      <form action={action} className="sc-admin-form">
        <input type="hidden" name="leadPath" value={leadPath} />
        <label className="sc-field">
          <span>First name</span>
          <input
            name="firstName"
            required
            maxLength={60}
            defaultValue={firstName}
          />
        </label>
        <label className="sc-field">
          <span>Last name</span>
          <input name="lastName" maxLength={60} defaultValue={lastName} />
        </label>
        <label className="sc-field">
          <span>Role</span>
          <input name="role" maxLength={60} defaultValue={role} />
        </label>
        <button className="btn btn-secondary" disabled={pending}>
          {pending ? "Saving..." : "Save contact"}
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
