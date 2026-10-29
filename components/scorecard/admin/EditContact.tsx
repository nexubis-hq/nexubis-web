"use client";
import {
  useActionState,
  useState,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { saveAdminContact } from "@/app/audit/admin/contact-actions";

export function EditContact({
  leadPath,
  firstName,
  lastName,
  role,
  onSaved,
}: {
  leadPath: string;
  firstName: string;
  lastName: string;
  role: string;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    async (previous: { message: string; error?: boolean }, form: FormData) => {
      const result = await saveAdminContact(previous, form);
      if (!result.error) {
        setOpen(false);
        onSaved?.();
      }
      return result;
    },
    { message: "" }
  );
  return (
    <div className="sc-admin-edit-contact">
      <button
        type="button"
        className="btn btn-secondary"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        Edit contact
      </button>
      {open && (
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
      )}
    </div>
  );
}

export function ContactMenu({
  children,
  editable = true,
  ...contact
}: {
  children: ReactNode;
  editable?: boolean;
  leadPath: string;
  firstName: string;
  lastName: string;
  role: string;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [saved, setSaved] = useState(false);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div className="sc-admin-contact-menu">
      <details ref={menu} className="sc-admin-more">
        <summary className="btn btn-secondary">More &#9662;</summary>
        <div className="sc-admin-more-items">
          {editable && (
            <EditContact
              {...contact}
              onSaved={() => {
                if (menu.current) menu.current.open = false;
                setSaved(true);
                clearTimeout(timer.current);
                timer.current = setTimeout(() => setSaved(false), 3000);
              }}
            />
          )}
          {children}
        </div>
      </details>
      {saved && (
        <p role="status" className="sc-admin-dim">
          Contact saved
        </p>
      )}
    </div>
  );
}
