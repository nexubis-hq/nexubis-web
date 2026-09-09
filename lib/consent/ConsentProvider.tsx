"use client";

import { createContext, useCallback, useContext, useState, useSyncExternalStore } from "react";
import { parseConsent, readConsentCookie, serializeConsent, type Consent } from "./state";

const CHANGE_EVENT = "nx-consent-change";
function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("focus", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("focus", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}
const serverSnapshot = () => null;
type ConsentContextValue = Consent & {
  ready: boolean;
  setConsent: (partial: Partial<Pick<Consent, "analytics" | "marketing" | "decided">>) => void;
  preferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
};
const ConsentContext = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  // The server snapshot keeps tracking off until the browser cookie is read after hydration.
  const raw = useSyncExternalStore(subscribe, readConsentCookie, serverSnapshot);
  const consent = parseConsent(raw);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const setConsent = useCallback((partial: Partial<Pick<Consent, "analytics" | "marketing" | "decided">>) => {
    const next = { ...parseConsent(readConsentCookie()), ...partial, ts: Date.now() };
    document.cookie = serializeConsent(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
    setPreferencesOpen(false);
  }, []);

  return (
    <ConsentContext.Provider value={{ ...consent, ready: raw !== null, setConsent, preferencesOpen,
      openPreferences: () => setPreferencesOpen(true), closePreferences: () => setPreferencesOpen(false) }}>
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  const value = useContext(ConsentContext);
  if (!value) throw new Error("useConsent must be used inside ConsentProvider");
  return value;
}
