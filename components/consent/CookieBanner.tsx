"use client";

import { useEffect, useRef, useState } from "react";
import { useConsent } from "@/lib/consent/ConsentProvider";
import styles from "./consent.module.css";

function Preferences() {
  const consent = useConsent();
  const [analytics, setAnalytics] = useState(consent.analytics);
  const [marketing, setMarketing] = useState(consent.marketing);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    title.current?.focus();
    return () => { if (previous instanceof HTMLElement) previous.focus(); };
  }, []);
  return (
    <section className={styles.panel} aria-labelledby="cookie-preferences-title" onKeyDown={(event) => {
      if (event.key === "Escape") consent.closePreferences();
    }}>
      <h2 id="cookie-preferences-title" ref={title} tabIndex={-1}>Cookie preferences</h2>
      <p>Cookies required for security and login always stay on.</p>
      <label className={styles.toggle}>
        <span>Analytics <small>Microsoft Clarity records anonymized clicks and scrolling so we can see how the site is used. Stored up to 12 months.</small></span>
        <input type="checkbox" role="switch" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} />
      </label>
      <label className={styles.toggle}>
        <span>Marketing <small>Meta (Facebook) Pixel tracks page visits and form submissions to measure and improve our ad campaigns. Stored up to 12 months.</small></span>
        <input type="checkbox" role="switch" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} />
      </label>
      <div className={styles.actions}>
        <button className={styles.button} onClick={() => consent.setConsent({ analytics, marketing, decided: true })}>Save Preferences</button>
        <button className={styles.button} onClick={consent.closePreferences}>Cancel</button>
      </div>
    </section>
  );
}

export function CookieSettingsLink() {
  const { openPreferences } = useConsent();
  return <button type="button" className={styles.settingsLink} onClick={openPreferences}>Cookie Settings</button>;
}

export function CookieBanner() {
  const { ready, decided, preferencesOpen, openPreferences, setConsent } = useConsent();
  if (!ready || (decided && !preferencesOpen)) return null;
  return (
    <aside className={styles.banner} aria-label="Cookie consent">
      {preferencesOpen ? <Preferences /> : (
        <div className={styles.bar}>
          <p>We use cookies to understand site traffic and measure how our ads perform. Accept, reject non-essential cookies, or choose what&apos;s on.</p>
          <div className={styles.actions}>
            <button className={styles.button} onClick={() => setConsent({ analytics: true, marketing: true, decided: true })}>Accept All</button>
            <button className={styles.button} onClick={() => setConsent({ analytics: false, marketing: false, decided: true })}>Reject Non-Essential</button>
            <button className={styles.button} onClick={openPreferences}>Manage Preferences</button>
          </div>
        </div>
      )}
    </aside>
  );
}
