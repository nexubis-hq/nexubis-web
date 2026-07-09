"use client";

// The instant Credibility Check flow: a website-only landing form (the product
// one-liner and competitors are detected from the site server-side), the scan,
// then the teaser preview with the unlock gate (step 2 lives inside the
// teaser's UnlockPanel). Locked copy comes from lib/scorecard/copy.ts; nothing
// is hardcoded here.
import { useRef, useState } from "react";
import { LANDING, FORM_FIELDS } from "@/lib/scorecard/copy";
import { ScanAnimation } from "./ScanAnimation";
import { ScorecardPreviewRadar } from "./ScorecardPreviewRadar";
import { ReportView } from "@/components/scorecard/report/ReportView";
import type { ScanStage } from "@/lib/scorecard/orchestrator";
import type { ScorecardResult } from "@/lib/scorecard/result";

type FlowState =
  | { step: "form" }
  | { step: "scanning"; stage: ScanStage; company: string; detectedOneLiner?: string }
  | { step: "teaser"; runId: string; teaser: ScorecardResult }
  | { step: "error"; message: string };

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
  const [fieldError, setFieldError] = useState("");
  const teaserRef = useRef<HTMLDivElement>(null);
  const urlValid = looksLikeWebAddress(url);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError("");
    if (!looksLikeWebAddress(url)) {
      setFieldError("That website address does not look right. A plain domain like example.com works.");
      return;
    }

    const company = companyFromUrl(url);
    setFlow({ step: "scanning", stage: "reading", company });
    try {
      const res = await fetch("/api/scorecard/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanDomainInput(url) }),
      });
      if (!res.ok || !res.body) {
        setFlow({ step: "error", message: "The check could not start. Give it another try in a moment." });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
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
            | { type: "done"; runId: string; teaser: ScorecardResult }
            | { type: "error"; error: string };
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
            setFlow({ step: "teaser", runId: payload.runId, teaser: payload.teaser });
            requestAnimationFrame(() => teaserRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
          } else {
            setFlow({ step: "error", message: payload.error });
          }
        }
      }
      // Stream ended without a terminal event: treat as failure, never hang.
      setFlow((f) => (f.step === "scanning" ? { step: "error", message: "The check could not finish this time. Give it another try in a few minutes." } : f));
    } catch {
      setFlow({ step: "error", message: "The check could not finish this time. Give it another try in a few minutes." });
    }
  }

  if (flow.step === "teaser") {
    return (
      <div ref={teaserRef}>
        <ReportView result={flow.teaser} teaser runId={flow.runId} chrome={false} />
      </div>
    );
  }

  return (
    <section className="sc-landing">
      <div className="site-container sc-landing-grid">
        <div className="sc-landing-intro">
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
          <p className="sc-landing-microproof" data-reveal>
            {LANDING.microProof}
          </p>
        </div>

        <div className="sc-landing-form-card" data-reveal>
          {flow.step === "scanning" ? (
            <ScanAnimation stage={flow.stage} company={flow.company} detectedOneLiner={flow.detectedOneLiner ?? null} />
          ) : (
            <>
              <div className="sc-card-visual">
                <ScorecardPreviewRadar />
              </div>
              <form className="sc-landing-form" onSubmit={submit}>
                {flow.step === "error" ? <p className="sc-form-error">{flow.message}</p> : null}
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
                {fieldError ? <p className="sc-form-error">{fieldError}</p> : null}
                <button className="btn btn-primary sc-landing-submit" type="submit">
                  {LANDING.submitButton}
                </button>
                <p className="sc-landing-expectation">{LANDING.expectationLine}</p>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
