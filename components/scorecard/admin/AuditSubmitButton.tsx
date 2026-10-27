"use client";

import { useFormStatus } from "react-dom";

export function AuditSubmitButton({
  children,
  secondary = false,
}: {
  children: React.ReactNode;
  secondary?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <div className="sc-admin-submit" aria-live="polite">
      <button
        type="submit"
        className={`btn ${secondary ? "btn-secondary" : "btn-primary"}`}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? "Running, about 2 minutes..." : children}
      </button>
      {pending ? (
        <p className="sc-admin-dim" role="status">
          Keep this tab open. The page updates by itself.
        </p>
      ) : null}
    </div>
  );
}
