"use client";

// The instant Credibility Check flow, gateless: the landing form asks for the
// website AND the work email up front, the scan runs with a staged progress
// narration, and the moment generation finishes the browser lands on the FULL
// permanent report (no teaser, no unlock). Locked copy comes from
// lib/scorecard/copy.ts; nothing is hardcoded here.
import { useEffect, useRef, useState } from "react";
import { LANDING, FORM_FIELDS } from "@/lib/scorecard/copy";
import { PILLAR_CHIP_LABELS } from "@/lib/scorecard/report-derive";
import { RUBRIC } from "@/lib/scorecard/rubric";
import { trackMeta } from "@/lib/meta/track";
import { META_EVENTS, LEAD_CONTENT_NAME, leadValue } from "@/lib/meta/events";
import { firstNameFromEmail } from "@/lib/scorecard/lead-name";
import { ScanAnimation } from "./ScanAnimation";
import { ScorecardPreviewRadar } from "./ScorecardPreviewRadar";
import type { ScanStage } from "@/lib/scorecard/orchestrator";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void; "error-callback"?: () => void }) => string;
    };
  }
}

type FlowState =
  | { step: "form" }
  | { step: "scanning"; stage: ScanStage; company: string; detectedOneLiner?: string }
  | { step: "error"; message: string; reportUrl?: string };

// Trim and drop trailing dots/slashes so a fully-qualified "example.com." or a
// pasted "example.com/" is accepted, not rejected as malformed. The server
// applies the same cleaning, so client and server agree.
function cleanDomainInput(raw: string): string {
  return raw.trim().replace(/[./]+$/, "");
}

// Client-side mirror of the server's normalisation, for inline validation only
// (the server revalidates everything).
function looksLikeWebAddress(raw: string): boolean {
  const s = cleanDomainInput(raw);
  if (!s || /\s/.test(s)) return false;
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    const host = u.hostname.replace(/\.$/, "");
    return host.includes(".") && !host.endsWith(".");
  } catch {
    return false;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function companyFromUrl(raw: string): string {
  const s = cleanDomainInput(raw);
  try {
    const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
    return new URL(withScheme).hostname.replace(/^www\./, "").replace(/\.$/, "");
  } catch {
    return s;
  }
}

export function ScorecardFlow() {
  const [flow, setFlow] = useState<FlowState>({ step: "form" });
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [fieldError, setFieldError] = useState("");
  // AuditStart fires once per visit, even if validation bounces the user back
  // and they resubmit (§3: once per visit, ref-guarded against retries).
  const auditStartFired = useRef(false);
  // AuditComplete (diagnosis only) marks the scan finishing. Lead fires with
  // it: the email was captured up front and the full report is now theirs.
  const auditCompleteFired = useRef(false);
  // The "human took time" clock, stamped on mount (long before a person can
  // type a URL and an email).
  const startedAt = useRef(0);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const urlValid = looksLikeWebAddress(url);
  const emailValid = EMAIL_RE.test(email.trim());

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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    void runScan(url);
  }

  // The scan itself, callable from both the form submit and the failure-state
  // "Try again" button (which replays the same address).
  async function runScan(rawUrl: string) {
    setFieldError("");
    if (!looksLikeWebAddress(rawUrl)) {
      setFieldError("That website address does not look right. A plain domain like example.com works.");
      setFlow({ step: "form" });
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setFieldError("That email address does not look right.");
      setFlow({ step: "form" });
      return;
    }

    const company = companyFromUrl(rawUrl);
    if (!auditStartFired.current) {
      auditStartFired.current = true;
      trackMeta(META_EVENTS.auditStart, { content_category: "scorecard", content_name: company });
    }
    setFlow({ step: "scanning", stage: "reading", company });
    try {
      const res = await fetch("/api/scorecard/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: cleanDomainInput(rawUrl),
          email: email.trim(),
          honeypot,
          turnstileToken,
          elapsedMs: Date.now() - startedAt.current,
        }),
      });
      if (!res.ok || !res.body) {
        setFlow({ step: "error", message: "The check could not start. Give it another try in a moment." });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let navigated = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const raw of events) {
          const line = raw.trim();
          if (!line.startsWith("data:")) continue;
          const payload = JSON.parse(line.slice(5).trim()) as
            | { type: "stage"; stage: ScanStage }
            | { type: "detected"; oneLiner: string }
            | { type: "done"; reportUrl: string; slug: string }
            | { type: "error"; error: string; reportUrl?: string };
          if (payload.type === "stage") {
            setFlow((f) => ({
              step: "scanning",
              stage: payload.stage,
              company,
              detectedOneLiner: f.step === "scanning" ? f.detectedOneLiner : undefined,
            }));
          } else if (payload.type === "detected") {
            setFlow((f) => (f.step === "scanning" ? { ...f, detectedOneLiner: payload.oneLiner } : f));
          } else if (payload.type === "done") {
            navigated = true;
            if (!auditCompleteFired.current) {
              auditCompleteFired.current = true;
              trackMeta(META_EVENTS.auditComplete, { content_category: "scorecard", content_name: company });
              // Lead: the email was captured up front and the report is now
              // theirs. Distinct content_name so audit leads never blend with
              // contact-form leads; email flows to the server leg (hashed
              // there, never sent to the browser pixel in the clear).
              const value = leadValue();
              trackMeta(
                META_EVENTS.lead,
                { content_name: LEAD_CONTENT_NAME, ...(value ? { value: value.value, currency: value.currency } : {}) },
                { email: email.trim() },
              );
              // Route the lead to Funnelr's tag-only bridge (create/update
              // contact, store report URL, apply Brand/Source/Start-Sales
              // tags). Fire-and-forget; keepalive survives the navigation.
              const leadReportUrl = new URL(payload.reportUrl, window.location.origin).toString();
              void fetch("/api/leads/scorecard", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                keepalive: true,
                body: JSON.stringify({
                  firstName: firstNameFromEmail(email.trim()) ?? company,
                  email: email.trim(),
                  marketingConsent: true,
                  reportUrl: leadReportUrl,
                }),
              }).catch(() => {});
            }
            // Straight to the full permanent report; no gate, no teaser.
            window.location.assign(payload.reportUrl);
          } else {
            setFlow({ step: "error", message: payload.error, reportUrl: payload.reportUrl });
          }
        }
      }
      // Stream ended without a terminal event: treat as failure, never hang.
      if (!navigated) {
        setFlow((f) => (f.step === "scanning" ? { step: "error", message: "The check could not finish this time. Give it another try in a few minutes." } : f));
      }
    } catch {
      setFlow({ step: "error", message: "The check could not finish this time. Give it another try in a few minutes." });
    }
  }

  return (
    <section className="sc-landing">
      <div className="site-container sc-landing-grid">
        <div className="sc-landing-intro">
          <span className="sc-landing-kicker" data-reveal>
            {LANDING.kicker}
          </span>
          <h1 data-reveal>{LANDING.headline}</h1>
          <p className="sc-landing-sub" data-reveal>
            {LANDING.subheadline}
          </p>
          <ul className="sc-landing-bullets">
            {LANDING.bullets.map((b, i) => (
              <li key={b} data-reveal data-reveal-delay={i * 0.06}>
                {b}
              </li>
            ))}
          </ul>
          <ul className="sc-landing-chips" aria-label="The five pillars">
            {RUBRIC.map((cat) => (
              <li key={cat.key}>{PILLAR_CHIP_LABELS[cat.key]}</li>
            ))}
          </ul>
        </div>

        <div className="sc-landing-form-card" data-reveal>
          {flow.step === "scanning" ? (
            <ScanAnimation stage={flow.stage} company={flow.company} detectedOneLiner={flow.detectedOneLiner ?? null} />
          ) : flow.step === "error" ? (
            <div className="sc-scan-error" role="alert">
              <p className="sc-scan-error-msg">{flow.message}</p>
              <div className="sc-scan-error-actions">
                {flow.reportUrl ? (
                  <a className="btn btn-primary" href={flow.reportUrl}>
                    See your previous report
                  </a>
                ) : (
                  <button className="btn btn-primary" type="button" onClick={() => void runScan(url)}>
                    Try again
                  </button>
                )}
                <button type="button" className="sc-scan-error-alt" onClick={() => setFlow({ step: "form" })}>
                  Check a different address
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="sc-card-visual">
                <ScorecardPreviewRadar />
              </div>
              <form className="sc-landing-form" onSubmit={submit}>
                <label className={`sc-field${urlValid ? " sc-field-valid" : ""}`}>
                  <span className="sc-field-label">{FORM_FIELDS.website.label}</span>
                  <span className="sc-input-wrap">
                    <input
                      type="text"
                      name="url"
                      inputMode="url"
                      autoComplete="url"
                      placeholder="yourcompany.com"
                      required
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                    {urlValid ? (
                      <span className="sc-input-check" aria-hidden="true">
                        <svg viewBox="0 0 12 12" width="12" height="12">
                          <path d="M2 6.2 5 9l5-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    ) : null}
                  </span>
                  {urlValid ? <span className="sc-field-valid-note">Looks good. We can read this one.</span> : null}
                </label>
                <label className={`sc-field${emailValid ? " sc-field-valid" : ""}`}>
                  <span className="sc-field-label">{FORM_FIELDS.workEmail.label}</span>
                  <span className="sc-input-wrap">
                    <input
                      type="email"
                      name="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@yourcompany.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    {emailValid ? (
                      <span className="sc-input-check" aria-hidden="true">
                        <svg viewBox="0 0 12 12" width="12" height="12">
                          <path d="M2 6.2 5 9l5-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    ) : null}
                  </span>
                  <span className="sc-field-helper">{FORM_FIELDS.workEmail.helper}</span>
                </label>
                {/* Honeypot: invisible to people, tempting to bots. The field
                    name is deliberately non-semantic (semantic names get filled
                    by browser autofill, which would block real users); the
                    data-* hints tell password managers to skip it. */}
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
                {fieldError ? <p className="sc-form-error">{fieldError}</p> : null}
                <button className="btn btn-primary sc-landing-submit" type="submit">
                  {LANDING.submitButton}
                </button>
                <p className="sc-landing-reassurance">
                  <span className="sc-landing-reassurance-strong">{LANDING.reassurance.highlight}</span>
                  <span className="sc-landing-reassurance-sep"> · </span>
                  <span className="sc-landing-reassurance-note">{LANDING.reassurance.note}</span>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
