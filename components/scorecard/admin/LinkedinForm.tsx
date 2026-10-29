"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  lookupLinkedin,
  saveLinkedinProfile,
} from "@/app/audit/admin/profile-actions";
import type {
  LinkedinLink,
  NormalizedProfile,
} from "@/lib/scorecard/admin/profiles";
import {
  linkedinCompanySearch,
  linkedinPeopleSearch,
} from "@/lib/scorecard/admin/linkedin";
export function LinkedinForm({
  leadPath,
  profile,
  company,
  name,
}: {
  leadPath: string;
  profile: NormalizedProfile;
  company: string;
  name: string;
}) {
  const router = useRouter();
  const started = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (profile.lookedUpAt || started.current) return;
    started.current = true;
    void lookupLinkedin(leadPath)
      .then((result) => {
        setMessage(result.message);
        if (!result.error) router.refresh();
      })
      .catch(() => {
        setMessage("LinkedIn lookup could not finish.");
      });
  }, [leadPath, profile, router]);
  const again = async () => {
    setBusy(true);
    try {
      const result = await lookupLinkedin(leadPath, true);
      setMessage(result.message);
      if (!result.error) router.refresh();
    } catch {
      setMessage("LinkedIn lookup could not finish.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="sc-admin-linkedin">
      <LinkedinLine
        kind="company"
        label={company}
        link={profile.companyLinkedin}
        fallback={linkedinCompanySearch(company)}
        leadPath={leadPath}
        again={again}
        busy={busy}
      />
      <LinkedinLine
        kind="person"
        label={name || "Person"}
        link={profile.linkedinProfile}
        fallback={linkedinPeopleSearch(name, company)}
        leadPath={leadPath}
        again={again}
        busy={busy}
      />
      <p role="status" className="sc-admin-dim">
        {busy || (!profile.lookedUpAt && !message)
          ? "Looking up LinkedIn\u2026"
          : message}
      </p>
      <details className="sc-admin-about">
        <summary>about this</summary>
        <p>
          The person was found by a search on first name + company, so check it
          once. A confirmed or hand-pasted link is never overwritten.
        </p>
      </details>
    </div>
  );
}
function LinkedinLine({
  kind,
  label,
  link,
  fallback,
  leadPath,
  again,
  busy,
}: {
  kind: "company" | "person";
  label: string;
  link: LinkedinLink | null;
  fallback: string;
  leadPath: string;
  again: () => void;
  busy: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const menu = useRef<HTMLDetailsElement>(null);
  const [state, action, pending] = useActionState(saveLinkedinProfile, {
    message: "",
  });
  const hidden = (
    <>
      <input type="hidden" name="leadPath" value={leadPath} />
      <input type="hidden" name="kind" value={kind} />
    </>
  );
  return (
    <div className="sc-admin-linkedin-line">
      <div className="sc-admin-linkedin-title">
        <small>{kind === "company" ? "Company" : "Person"}</small>
        <a
          href={link?.url || fallback}
          target="_blank"
          rel="noreferrer"
          title={link?.label}
        >
          {label} &#8599;
        </a>
        {kind === "person" && link?.status === "likely" && (
          <span className="sc-admin-likely">likely</span>
        )}
        <details ref={menu} className="sc-admin-link-menu">
          <summary aria-label={`${kind} LinkedIn options`}>&#9662;</summary>
          <div>
            {kind === "person" && link && (
              <form action={action}>
                {hidden}
                <input type="hidden" name="operation" value="confirm" />
                <button className="sc-admin-confirm-person" disabled={pending}>
                  &#10003; Right person
                </button>
              </form>
            )}
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                if (menu.current) menu.current.open = false;
              }}
            >
              {kind === "company" ? "Edit link" : "Wrong person, change link"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (menu.current) menu.current.open = false;
                again();
              }}
            >
              Search again
            </button>
          </div>
        </details>
        {kind === "company" && link && (
          <small className="sc-admin-link-source">
            {link.source === "audit"
              ? "found by the audit"
              : link.source === "lookup"
                ? "found automatically"
                : "added by hand"}
          </small>
        )}
      </div>
      {editing && (
        <form action={action} className="sc-admin-inline-edit">
          {hidden}
          <label className="sc-field">
            <span>
              {kind === "company"
                ? "Company LinkedIn URL"
                : "Person LinkedIn URL"}
            </span>
            <input
              name="url"
              type="url"
              required
              defaultValue={link?.url || ""}
              placeholder={`https://www.linkedin.com/${kind === "company" ? "company" : "in"}/name/`}
            />
          </label>
          <button className="btn btn-secondary" disabled={pending}>
            {pending ? "Saving..." : "Save link"}
          </button>
          <button
            type="button"
            className="sc-admin-linkbtn"
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
        </form>
      )}
      {state.message && (
        <p
          role="status"
          className={state.error ? "sc-admin-warn" : "sc-admin-dim"}
        >
          {state.message}
        </p>
      )}
    </div>
  );
}
