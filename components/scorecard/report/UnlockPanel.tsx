"use client";

// The unlock gate on the teaser report: first name, work email, role, bot
// check. A successful unlock promotes the run to its permanent shared report
// and navigates there. The API route lands with the flow prompt; this panel is
// complete and self-contained.
import { useEffect, useRef, useState } from "react";
import { FORM_FIELDS, UNLOCK } from "@/lib/scorecard/copy";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void; "error-callback"?: () => void }) => string;
    };
  }
}

export function UnlockPanel({ runId }: { runId: string }) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [reportUrl, setReportUrl] = useState("");
  // The "human took time to read" clock. Stamped in an effect (not during
  // render, so render stays pure); the effect runs on mount, long before a
  // person can read the form and click submit, so elapsedMs stays honest.
  const startedAt = useRef(0);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (!siteKey || !turnstileRef.current) return;
    const render = () => {
      if (window.turnstile && turnstileRef.current) {
        window.turnstile.render(turnstileRef.current, {
          sitekey: siteKey,
          callback: (token) => setTurnstileToken(token),
          "error-callback": () => setTurnstileToken(""),
        });
      }
    };
    if (window.turnstile) {
      render();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = render;
    document.head.appendChild(script);
  }, [siteKey]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "submitting") return;
    setError("");
    setState("submitting");
    try {
      const res = await fetch("/api/scorecard/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId,
          firstName,
          email,
          role,
          honeypot,
          turnstileToken,
          elapsedMs: Date.now() - startedAt.current,
        }),
      });
      const body = (await res.json().catch(() => null)) as { reportUrl?: string; error?: string } | null;
      if (!res.ok || !body?.reportUrl) {
        setError(body?.error ?? "Something went wrong on our side. Give it another try in a moment.");
        setState("error");
        return;
      }
      const leadReportUrl = new URL(body.reportUrl, window.location.origin).toString();
      void fetch("/api/leads/scorecard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          firstName,
          email,
          marketingConsent: true,
          reportUrl: leadReportUrl,
        }),
      }).catch(() => {});
      setReportUrl(body.reportUrl);
      setState("done");
      window.setTimeout(() => {
        window.location.assign(body.reportUrl!);
      }, 2200);
    } catch {
      setError("Something went wrong on our side. Give it another try in a moment.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="sc-unlock" data-reveal>
        <p className="sc-unlock-after">{UNLOCK.afterSubmit}</p>
        <a className="btn btn-primary" href={reportUrl}>
          Open your full report
        </a>
      </div>
    );
  }

  return (
    <div className="sc-unlock" data-reveal>
      <h3 className="sc-unlock-headline">{UNLOCK.headline}</h3>
      <p className="sc-unlock-intro">{UNLOCK.intro}</p>
      <form className="sc-unlock-form" onSubmit={submit}>
        <label className="sc-field">
          <span className="sc-field-label">{FORM_FIELDS.firstName.label}</span>
          <input type="text" name="firstName" required autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </label>
        <label className="sc-field">
          <span className="sc-field-label">{FORM_FIELDS.workEmail.label}</span>
          <input type="email" name="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <span className="sc-field-helper">{FORM_FIELDS.workEmail.helper}</span>
        </label>
        <label className="sc-field">
          <span className="sc-field-label">{FORM_FIELDS.role.label}</span>
          <select name="role" required value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="" disabled>
              Choose your role
            </option>
            {FORM_FIELDS.role.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        {/* Honeypot: invisible to people, tempting to bots. The field name is
            deliberately non-semantic ("company"/"email"/etc. get filled by
            browser autofill and password managers, which would block real
            users); the data-* hints tell 1Password and LastPass to skip it. */}
        <label className="sc-hp" aria-hidden="true">
          Leave this field empty
          <input
            type="text"
            name="nx_extra_field"
            tabIndex={-1}
            autoComplete="off"
            data-lpignore="true"
            data-1p-ignore
            data-form-type="other"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </label>
        {siteKey ? <div ref={turnstileRef} className="sc-turnstile" /> : null}
        <p className="sc-privacy">
          {UNLOCK.privacyNotice}{" "}
          <a href={UNLOCK.privacyUrl} target="_blank" rel="noreferrer">
            Privacy policy
          </a>
        </p>
        {error ? <p className="sc-form-error">{error}</p> : null}
        <button className="btn btn-primary sc-unlock-submit" type="submit" disabled={state === "submitting"}>
          {state === "submitting" ? "Unlocking…" : UNLOCK.submitButton}
        </button>
      </form>
    </div>
  );
}
