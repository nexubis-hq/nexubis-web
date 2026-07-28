"use client";

import Link from "next/link";
import type { KeyboardEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { CAL_LINK } from "@/lib/booking";

type ContactTab = "book" | "message";

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
  return (
    <div className="contact-form-card">
      <form className="contact-form" onSubmit={(event) => event.preventDefault()}>
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
          <select id="contact-package" name="Package-Select" required defaultValue="">
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
          />
        </div>

        <div className="contact-spam-note" id="contact-form-unavailable" role="note">
          Message submissions are not connected yet. Use Book a Call for now.
        </div>

        <button
          className="contact-submit"
          type="submit"
          disabled
          aria-describedby="contact-form-unavailable"
        >
          Empower Your Dream
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
