"use client";

import { funnelSourceFromSearch, type ClientFunnelStep } from "./steps";

export function sendFunnelStep(step: ClientFunnelStep): void {
  try {
    const body = JSON.stringify({ step, source: funnelSourceFromSearch(window.location.search) });
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon?.("/api/funnel", blob)) return;
    void fetch("/api/funnel", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true, credentials: "omit" }).catch(() => {});
  } catch {
    // Funnel counts are intentionally invisible to visitors.
  }
}
