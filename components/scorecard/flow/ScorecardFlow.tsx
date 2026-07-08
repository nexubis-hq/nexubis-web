"use client";

// The instant Credibility Check flow: landing form (step 1: website, one-line
// product description, 2 or 3 competitors), the scan, then the teaser preview
// with the unlock gate (step 2 lives inside the teaser's UnlockPanel).
// Locked copy comes from lib/scorecard/copy.ts; nothing is hardcoded here.
import { useRef, useState } from "react";
import { LANDING, FORM_FIELDS } from "@/lib/scorecard/copy";
import { ScanAnimation } from "./ScanAnimation";
import { ReportView } from "@/components/scorecard/report/ReportView";
import type { ScanStage } from "@/lib/scorecard/orchestrator";
import type { ScorecardResult } from "@/lib/scorecard/result";

type FlowState =
  | { step: "form" }
  | { step: "scanning"; stage: ScanStage; company: string }
  | { step: "teaser"; runId: string; teaser: ScorecardResult }
  | { step: "error"; message: string };

// Client-side mirror of the server's normalisation, for inline validation only
// (the server revalidates everything).
function looksLikeWebAddress(raw: string): boolean {
  const s = raw.trim();
  if (!s || /\s/.test(s)) return false;
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    return u.hostname.includes(".") && !u.hostname.endsWith(".");
  } catch {
    return false;
  }
}

function companyFromUrl(raw: string): string {
  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withScheme).hostname.replace(/^www\./, "");
  } catch {
    return raw;
  }
}

export function ScorecardFlow() {
  const [flow, setFlow] = useState<FlowState>({ step: "form" });
  const [url, setUrl] = useState("");
  const [oneLiner, setOneLiner] = useState("");
  const [competitors, setCompetitors] = useState(["", "", ""]);
  const [fieldError, setFieldError] = useState("");
  const teaserRef = useRef<HTMLDivElement>(null);

  function setCompetitor(i: number, value: string) {
    setCompetitors((prev) => prev.map((c, j) => (j === i ? value : c)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError("");
    const entries = competitors.map((c) => c.trim()).filter(Boolean);
    if (!looksLikeWebAddress(url)) {
      setFieldError("That website address does not look right. A plain domain like example.com works.");
      return;
    }
    if (!oneLiner.trim()) {
      setFieldError("Add the one-line description of what you make.");
      return;
    }
    if (entries.length < 2) {
      setFieldError("Name at least two competitors. Names or websites both work.");
      return;
    }
    const badUrl = entries.find((c) => c.includes("/") && !looksLikeWebAddress(c));
    if (badUrl) {
      setFieldError(`"${badUrl}" does not look like a valid website. A name or a plain domain works.`);
      return;
    }

    const company = companyFromUrl(url);
    setFlow({ step: "scanning", stage: "reading", company });
    try {
      const res = await fetch("/api/scorecard/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), productOneLiner: oneLiner.trim(), competitors: entries }),
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
            | { type: "done"; runId: string; teaser: ScorecardResult }
            | { type: "error"; error: string };
          if (payload.type === "stage") {
            setFlow({ step: "scanning", stage: payload.stage, company });
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
            <ScanAnimation stage={flow.stage} company={flow.company} />
          ) : (
            <>
              <h2>{LANDING.formHeadline}</h2>
              <p className="sc-landing-form-intro">{LANDING.formIntro}</p>
              {flow.step === "error" ? <p className="sc-form-error">{flow.message}</p> : null}
              <form className="sc-landing-form" onSubmit={submit}>
                <label className="sc-field">
                  <span className="sc-field-label">{FORM_FIELDS.website.label}</span>
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
                  <span className="sc-field-helper">{FORM_FIELDS.website.helper}</span>
                </label>
                <label className="sc-field">
                  <span className="sc-field-label">{FORM_FIELDS.oneLiner.label}</span>
                  <input type="text" name="productOneLiner" required maxLength={160} value={oneLiner} onChange={(e) => setOneLiner(e.target.value)} />
                  <span className="sc-field-helper">{FORM_FIELDS.oneLiner.helper}</span>
                </label>
                <fieldset className="sc-field sc-competitors">
                  <legend className="sc-field-label">{FORM_FIELDS.competitors.label}</legend>
                  <input type="text" aria-label="Competitor 1" required value={competitors[0]} onChange={(e) => setCompetitor(0, e.target.value)} />
                  <input type="text" aria-label="Competitor 2" required value={competitors[1]} onChange={(e) => setCompetitor(1, e.target.value)} />
                  <input type="text" aria-label="Competitor 3 (optional)" placeholder="Optional third" value={competitors[2]} onChange={(e) => setCompetitor(2, e.target.value)} />
                  <span className="sc-field-helper">{FORM_FIELDS.competitors.helper}</span>
                </fieldset>
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
