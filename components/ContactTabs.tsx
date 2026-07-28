"use client";

import Link from "next/link";
import type { KeyboardEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { CAL_LINK } from "@/lib/booking";

type ContactTab = "book" | "message";
type FormState = "idle" | "submitting" | "success" | "error";
type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
    },
  ) => string;
  reset?: (widgetId?: string) => void;
};

declare global {
  interface Window {
    Cal?: CalEmbed;
  }
}

type CalEmbed = {
  (...args: unknown[]): void;
  loaded?: boolean;
  ns?: Record<string, CalEmbed>;
  q?: unknown[];
};

const CAL_NAMESPACE = "30min";
const CAL_SCRIPT_ID = "cal-inline-embed-script";

function ensureCalScript(onError: () => void) {
  if (typeof window === "undefined") return false;
  if (window.Cal && document.getElementById(CAL_SCRIPT_ID)) return true;

  const cal = function (...args: unknown[]) {
    const current = window.Cal as CalEmbed;
    current.q = current.q || [];

    if (args[0] === "init") {
      const namespace = args[1];
      if (typeof namespace === "string") {
        current.ns = current.ns || {};
        current.ns[namespace] = current.ns[namespace] || ((...nsArgs: unknown[]) => {
          const api = current.ns?.[namespace] as CalEmbed;
          api.q = api.q || [];
          api.q.push(nsArgs);
        });
        current.ns[namespace].q = current.ns[namespace].q || [];
        current.ns[namespace].q?.push(args);
        current.q.push(["initNamespace", namespace]);
        return;
      }
    }

    current.q.push(args);
  } as CalEmbed;

  window.Cal = cal;
  window.Cal.loaded = true;
  window.Cal.ns = {};

  const existingScript = document.getElementById(CAL_SCRIPT_ID);
  if (existingScript) return true;

  const script = document.createElement("script");
  script.id = CAL_SCRIPT_ID;
  script.src = "https://app.cal.com/embed/embed.js";
  script.async = true;
  script.onerror = onError;
  document.head.appendChild(script);
  return true;
}

function CalInlineEmbed({ active }: { active: boolean }) {
  const calRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!active || !calRef.current) return;

    const setIframeTitles = () => {
      calRef.current?.querySelectorAll("iframe").forEach((iframe) => {
        iframe.title = "Nexubis Cal.com booking calendar";
      });
    };

    const observer = new MutationObserver(() => {
      setIframeTitles();
    });
    observer.observe(calRef.current, { childList: true, subtree: true });
    setIframeTitles();

    if (initializedRef.current && calRef.current.querySelector("iframe")) {
      window.dispatchEvent(new Event("resize"));
      return () => observer.disconnect();
    }

    const scriptReady = ensureCalScript(() => setLoadFailed(true));
    const cal = window.Cal;
    if (!scriptReady || !cal) {
      observer.disconnect();
      return;
    }

    cal("init", CAL_NAMESPACE, { origin: "https://cal.com" });
    cal.ns?.[CAL_NAMESPACE]?.("inline", {
      elementOrSelector: calRef.current,
      config: { layout: "month_view", theme: "light" },
      calLink: CAL_LINK,
    });
    cal.ns?.[CAL_NAMESPACE]?.("ui", {
      theme: "light",
      cssVarsPerTheme: {
        light: { "cal-brand": "#FF4141" },
        dark: { "cal-brand": "#FF4141" },
      },
      hideEventTypeDetails: false,
      layout: "month_view",
    });
    initializedRef.current = true;

    const resize = window.setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 150);

    return () => {
      window.clearTimeout(resize);
      observer.disconnect();
    };
  }, [active]);

  return (
    <div className="contact-cal-card">
      <div className="contact-cal-embed" ref={calRef} />
      {loadFailed ? (
        <p className="contact-cal-error" role="status">
          The booking calendar could not load. Open the booking page at cal.com/nexubis/30min.
        </p>
      ) : null}
    </div>
  );
}

function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [websiteLink, setWebsiteLink] = useState("");
  const [packageValue, setPackageValue] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [spamToken, setSpamToken] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");
  const startedAt = useRef(0);
  const resultRef = useRef<HTMLParagraphElement>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const formReady = Boolean(siteKey);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (!siteKey || !turnstileRef.current || widgetIdRef.current) return;

    const getTurnstile = () =>
      (window as typeof window & { turnstile?: TurnstileApi }).turnstile;
    const render = () => {
      const turnstile = getTurnstile();
      if (!turnstile || !turnstileRef.current || widgetIdRef.current) return;
      widgetIdRef.current = turnstile.render(turnstileRef.current, {
        sitekey: siteKey,
        callback: (token) => setSpamToken(token),
        "error-callback": () => setSpamToken(""),
        "expired-callback": () => setSpamToken(""),
      });
    };

    if (getTurnstile()) {
      render();
      return;
    }

    const existing = document.getElementById("turnstile-api-script") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", render, { once: true });
      return () => existing.removeEventListener("load", render);
    }

    const script = document.createElement("script");
    script.id = "turnstile-api-script";
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", render, { once: true });
    document.head.appendChild(script);
    return () => script.removeEventListener("load", render);
  }, [siteKey]);

  useEffect(() => {
    if (state === "success" || state === "error") {
      resultRef.current?.focus();
    }
  }, [state]);

  function resetTurnstile() {
    const turnstile = (window as typeof window & { turnstile?: TurnstileApi }).turnstile;
    turnstile?.reset?.(widgetIdRef.current ?? undefined);
    setSpamToken("");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "submitting" || !formReady) return;

    setState("submitting");
    setMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          companyName,
          websiteLink,
          package: packageValue,
          additionalNotes,
          spamToken,
          honeypot,
          elapsedMs: Date.now() - startedAt.current,
        }),
      });
      const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !body?.ok) {
        setState("error");
        setMessage(body?.error ?? "Message delivery is temporarily unavailable. Try again later.");
        resetTurnstile();
        return;
      }

      setState("success");
      setMessage("Thank you for your submission!");
      setName("");
      setEmail("");
      setCompanyName("");
      setWebsiteLink("");
      setPackageValue("");
      setAdditionalNotes("");
      setHoneypot("");
      resetTurnstile();
      startedAt.current = Date.now();
    } catch {
      setState("error");
      setMessage("Message delivery is temporarily unavailable. Try again later.");
      resetTurnstile();
    }
  }

  return (
    <div className="contact-form-card">
      <form className="contact-form" onSubmit={submit}>
        <div className="contact-field">
          <label htmlFor="contact-name">
            Name<span>*</span>
          </label>
          <input
            id="contact-name"
            name="Name"
            type="text"
            placeholder="e.g. John Doe"
            autoComplete="name"
            maxLength={256}
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="contact-field">
          <label htmlFor="contact-email">
            Email<span>*</span>
          </label>
          <input
            id="contact-email"
            name="Email"
            type="email"
            placeholder="e.g. jdoe@email.com"
            autoComplete="email"
            maxLength={256}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="contact-field-row">
          <div className="contact-field">
            <label htmlFor="contact-company">
              Company Name<span>*</span>
            </label>
            <input
              id="contact-company"
              name="Company-Name"
              type="text"
              placeholder="e.g. Nexubis"
              autoComplete="organization"
              maxLength={256}
              required
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
            />
          </div>

          <div className="contact-field">
            <label htmlFor="contact-website">Website Link</label>
            <input
              id="contact-website"
              name="Website-Link"
              type="url"
              placeholder="e.g. Nexubis.io"
              autoComplete="url"
              maxLength={256}
              value={websiteLink}
              onChange={(event) => setWebsiteLink(event.target.value)}
            />
          </div>
        </div>

        <div className="contact-field contact-package-field">
          <Link href="/packages" target="_blank" className="contact-learn-more">
            Learn More
          </Link>
          <label htmlFor="contact-package">
            Package<span>*</span>
          </label>
          <select
            id="contact-package"
            name="Package-Select"
            required
            value={packageValue}
            onChange={(event) => setPackageValue(event.target.value)}
          >
            <option value="" disabled>
              Select one...
            </option>
            <option value="Momentum">Momentum</option>
            <option value="Scale">Scale</option>
            <option value="Flex">Flex</option>
            <option value="I'm not sure">I&apos;m not sure</option>
          </select>
        </div>

        <div className="contact-field contact-textarea-field">
          <label htmlFor="contact-notes">Additional Notes</label>
          <textarea
            id="contact-notes"
            name="Comment"
            placeholder="Tell us more about what you're looking to achieve"
            maxLength={5000}
            value={additionalNotes}
            onChange={(event) => setAdditionalNotes(event.target.value)}
          />
        </div>

        <label className="contact-honeypot" aria-hidden="true">
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
            onChange={(event) => setHoneypot(event.target.value)}
          />
        </label>

        {siteKey ? (
          <div ref={turnstileRef} className="contact-turnstile" />
        ) : (
          <div className="contact-spam-note" id="contact-form-unavailable" role="note">
            Message submissions are not connected yet. Turnstile keys are required before this form can go live.
          </div>
        )}

        <div className="contact-form-result" aria-live="polite" aria-atomic="true">
          {message ? (
            <p
              ref={resultRef}
              className={state === "success" ? "contact-form-status contact-form-success" : "contact-form-status"}
              tabIndex={-1}
              role={state === "success" ? "status" : "alert"}
            >
              {message}
            </p>
          ) : null}
        </div>

        <button
          className="contact-submit"
          type="submit"
          disabled={state === "submitting" || !formReady || !spamToken}
          aria-describedby={!formReady ? "contact-form-unavailable" : undefined}
        >
          {state === "submitting" ? "Sending..." : "Empower Your Dream"}
        </button>
      </form>
    </div>
  );
}

export function ContactTabs() {
  const [activeTab, setActiveTab] = useState<ContactTab>("book");
  const tabBaseId = useId();
  const bookTabRef = useRef<HTMLButtonElement>(null);
  const messageTabRef = useRef<HTMLButtonElement>(null);

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "ArrowRight" || event.key === "End"
        ? "message"
        : "book";
    setActiveTab(next);
    window.requestAnimationFrame(() => {
      (next === "book" ? bookTabRef : messageTabRef).current?.focus();
    });
  };

  return (
    <div className="contact-tabs-shell">
      <div className="contact-tabs" role="tablist" aria-label="Contact options">
        <button
          id={`${tabBaseId}-book-tab`}
          className={activeTab === "book" ? "contact-tab contact-tab-active" : "contact-tab"}
          type="button"
          role="tab"
          ref={bookTabRef}
          aria-selected={activeTab === "book"}
          aria-controls={`${tabBaseId}-book-panel`}
          tabIndex={activeTab === "book" ? 0 : -1}
          onClick={() => setActiveTab("book")}
          onKeyDown={onTabKeyDown}
        >
          Book a Call
        </button>
        <button
          id={`${tabBaseId}-message-tab`}
          className={activeTab === "message" ? "contact-tab contact-tab-active" : "contact-tab"}
          type="button"
          role="tab"
          ref={messageTabRef}
          aria-selected={activeTab === "message"}
          aria-controls={`${tabBaseId}-message-panel`}
          tabIndex={activeTab === "message" ? 0 : -1}
          onClick={() => setActiveTab("message")}
          onKeyDown={onTabKeyDown}
        >
          Send a Message
        </button>
      </div>

      <div
        id={`${tabBaseId}-book-panel`}
        role="tabpanel"
        aria-labelledby={`${tabBaseId}-book-tab`}
        hidden={activeTab !== "book"}
      >
        <CalInlineEmbed active={activeTab === "book"} />
      </div>

      <div
        id={`${tabBaseId}-message-panel`}
        role="tabpanel"
        aria-labelledby={`${tabBaseId}-message-tab`}
        hidden={activeTab !== "message"}
      >
        <ContactForm />
      </div>
    </div>
  );
}
