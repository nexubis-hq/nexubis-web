"use client";
import {
  createContext,
  useContext,
  useActionState,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
import {
  SOCIAL_NETWORKS,
  strongestSocial,
} from "@/lib/scorecard/admin/company-socials";
const LookupContext = createContext<{
  profile: NormalizedProfile;
  busy: boolean;
  message: string;
  again: () => Promise<void>;
} | null>(null);
export function LinkedinLookupProvider({
  leadPath,
  profile: initial,
  children,
}: {
  leadPath: string;
  profile: NormalizedProfile;
  children: ReactNode;
}) {
  const [profile, setProfile] = useState(initial);
  const router = useRouter();
  const started = useRef(false);
  const [busy, setBusy] = useState(
    (initial.lookupVersion ?? 0) < 3 && Boolean(leadPath)
  );
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!leadPath || (profile.lookupVersion ?? 0) >= 3 || started.current)
      return;
    started.current = true;
    void lookupLinkedin(leadPath)
      .then((result) => {
        setMessage(result.message);
        if (!result.error) {
          if ("profile" in result) setProfile(result.profile);
          router.refresh();
        }
      })
      .catch(() => {
        setMessage("LinkedIn lookup could not finish.");
      })
      .finally(() => setBusy(false));
  }, [leadPath, profile, router]);
  useEffect(() => {
    setProfile(initial);
  }, [initial]);
  const again = async () => {
    setBusy(true);
    try {
      const result = await lookupLinkedin(leadPath, true);
      setMessage(result.message);
      if (!result.error) {
        if ("profile" in result) setProfile(result.profile);
        router.refresh();
      }
    } catch {
      setMessage("LinkedIn lookup could not finish.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <LookupContext.Provider value={{ profile, busy, message, again }}>
      {children}
    </LookupContext.Provider>
  );
}
export function LinkedinPending() {
  return (
    <span role="status" className="sc-admin-linkedin-pending">
      <span className="sc-admin-linkedin-spinner" aria-hidden="true" />
      Finding LinkedIn{String.fromCharCode(0x2026)}
    </span>
  );
}
export function LinkedinHeaderLinks({
  company,
  name,
}: {
  company: string;
  name: string;
}) {
  const state = useContext(LookupContext)!;
  const notFound =
    !state.busy &&
    (state.profile.lookupVersion ?? 0) >= 3 &&
    !state.profile.companyLinkedin;
  const social = notFound
    ? strongestSocial(state.profile.companySocials || [])
    : undefined;
  return (
    <>
      <a
        href={
          state.profile.companyLinkedin?.url || linkedinCompanySearch(company)
        }
        target="_blank"
        rel="noreferrer"
      >
        <span className="sc-admin-in">in</span> {company}
      </a>
      {state.profile.companyLinkedin?.status === "likely" && (
        <span className="sc-admin-likely">likely</span>
      )}
      {notFound && <span className="sc-admin-not-found">not found</span>}
      {state.busy ? (
        <LinkedinPending />
      ) : (
        <>
          {social && (
            <>
              <span className="sc-admin-link-separator">&middot;</span>
              <a href={social.url} target="_blank" rel="noreferrer">
                {
                  SOCIAL_NETWORKS.find(
                    ([network]) => network === social.network
                  )![1]
                }{" "}
                &#8599;
              </a>
            </>
          )}
          <span className="sc-admin-link-separator">&middot;</span>
          <a
            href={
              state.profile.linkedinProfile?.url ||
              linkedinPeopleSearch(name, company)
            }
            target="_blank"
            rel="noreferrer"
          >
            <span className="sc-admin-in">in</span> {name || "Person"}
          </a>
          {!state.profile.linkedinProfile &&
            !state.busy &&
            (state.profile.lookupVersion ?? 0) >= 3 && (
              <span className="sc-admin-not-found">not found</span>
            )}
          {state.profile.linkedinProfile?.status === "likely" && (
            <span className="sc-admin-likely">likely</span>
          )}
        </>
      )}
    </>
  );
}
export function CompanySocialsRow() {
  const state = useContext(LookupContext)!;
  const socials = state.profile.companySocials || [];
  return (
    <div>
      <dt>Socials</dt>
      <dd className="sc-admin-socials">
        {socials.length ? (
          SOCIAL_NETWORKS.map(([network, label]) => {
            const link = socials.find((social) => social.network === network);
            return link ? (
              <small key={network}>
                <a href={link.url} target="_blank" rel="noreferrer">
                  {label} &#8599;
                </a>
              </small>
            ) : null;
          })
        ) : (
          <span className="sc-admin-dim">None found</span>
        )}
      </dd>
    </div>
  );
}
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
  const shared = useContext(LookupContext);
  if (!shared)
    return (
      <LinkedinLookupProvider leadPath={leadPath} profile={profile}>
        <LinkedinForm
          leadPath={leadPath}
          profile={profile}
          company={company}
          name={name}
        />
      </LinkedinLookupProvider>
    );
  return (
    <LinkedinFormContent leadPath={leadPath} company={company} name={name} />
  );
}
function LinkedinFormContent({
  leadPath,
  company,
  name,
}: {
  leadPath: string;
  company: string;
  name: string;
}) {
  const { profile, busy, message, again } = useContext(LookupContext)!;
  return (
    <div className="sc-admin-linkedin">
      {busy ? (
        <LinkedinPending />
      ) : (
        <>
          <LinkedinLine
            kind="company"
            notFound={(profile.lookupVersion ?? 0) >= 3}
            label={company}
            link={profile.companyLinkedin}
            fallback={linkedinCompanySearch(company)}
            leadPath={leadPath}
            again={again}
            busy={busy}
          />
          <LinkedinLine
            kind="person"
            notFound={(profile.lookupVersion ?? 0) >= 3}
            label={name || "Person"}
            link={profile.linkedinProfile}
            fallback={linkedinPeopleSearch(name, company)}
            leadPath={leadPath}
            again={again}
            busy={busy}
          />
        </>
      )}
      {!busy &&
        (profile.lookupVersion ?? 0) >= 3 &&
        !profile.companyLinkedin && (
          <p className="sc-admin-dim">
            No LinkedIn page found. See Socials under Contact and source.
          </p>
        )}
      {message && (
        <p role="status" className="sc-admin-dim">
          {message}
        </p>
      )}
      <details className="sc-admin-about">
        <summary>about this</summary>
        <p>
          Links can come from their website or a name + company search, so check
          the person once. A confirmed or hand-pasted link is never overwritten.
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
  notFound,
}: {
  kind: "company" | "person";
  label: string;
  link: LinkedinLink | null;
  fallback: string;
  leadPath: string;
  again: () => void;
  busy: boolean;
  notFound: boolean;
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
        {!link && notFound && (
          <span className="sc-admin-not-found">not found</span>
        )}
        {link?.status === "likely" && (
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
        {link && (
          <small className="sc-admin-link-source">
            {link.source === "website"
              ? "from their website"
              : link.source === "audit"
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
