"use client";

// The Meta pixel bootstrap. It (1) stays inert on non-production hosts, (2) mints
// fbc / fbp / external_id up front so both legs have match keys even if
// fbevents.js is blocked, (3) adds external_id as advanced-matching data, and
// (4) fires a PageView through trackMeta on first load AND on every client-side
// route change — the App Router does not remount this, so without the pathname
// effect the server leg only ever saw hard navigations (the old ~1:26 gap).
//
// We bootstrap fbq imperatively rather than via next/script so the stub is
// guaranteed to exist before the first PageView fires, keeping the browser and
// server legs paired for dedup. Rendered once in the root layout.
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { META_PIXEL_ID } from "@/lib/meta/events";
import { trackMeta } from "@/lib/meta/track";
import { ensureMetaIdentity } from "@/lib/meta/ids";
import { clientTrackingHost, isTrackingHost } from "@/lib/meta/config";

// Standard Meta base snippet: defines window.fbq as a queue and loads
// fbevents.js. Calls made before the script loads are queued, so tracking never
// depends on the network round-trip completing.
type FbqFn = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push?: unknown;
  loaded?: boolean;
  version?: string;
};

function bootstrapFbq(): void {
  const w = window as unknown as { fbq?: FbqFn; _fbq?: FbqFn };
  if (w.fbq) return;
  const fbq = function (...args: unknown[]) {
    fbq.callMethod ? fbq.callMethod.apply(fbq, args) : fbq.queue.push(args);
  } as FbqFn;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  w.fbq = fbq;
  if (!w._fbq) w._fbq = fbq;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  const first = document.getElementsByTagName("script")[0];
  first?.parentNode?.insertBefore(script, first);
}

export function MetaPixel() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const bootstrapped = useRef(false);
  const amInitDone = useRef(false);
  const lastPath = useRef<string | null>(null);

  // Host decision is client-only (window is not available at SSR).
  useEffect(() => {
    setEnabled(isTrackingHost(clientTrackingHost()));
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // One-time: bring up fbq, mint identity, init the pixel with external_id as
    // advanced matching so the browser leg also carries it.
    if (!bootstrapped.current) {
      bootstrapped.current = true;
      bootstrapFbq();
      window.fbq?.("init", META_PIXEL_ID);
    }
    const identity = ensureMetaIdentity();
    if (!amInitDone.current && identity.externalId && typeof window.fbq === "function") {
      amInitDone.current = true;
      try {
        window.fbq("init", META_PIXEL_ID, { external_id: identity.externalId });
      } catch {
        // advanced matching is best-effort; the server leg carries external_id regardless.
      }
    }

    // One PageView per distinct path. The guard also absorbs React strict-mode's
    // double-invoke (same pathname → no second fire).
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    trackMeta("PageView");
  }, [enabled, pathname]);

  if (!enabled) return null;

  return (
    <noscript>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        alt=""
        src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
      />
    </noscript>
  );
}
