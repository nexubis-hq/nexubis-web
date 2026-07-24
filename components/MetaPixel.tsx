"use client";

// The Meta pixel bootstrap. The inline snippet does fbq('init') ONLY — PageView
// (and every other event) is fired through trackMeta() so both the browser pixel
// and the server CAPI relay see it with a shared event_id (§3). Rendered once in
// the root layout.
import Script from "next/script";
import { useEffect, useRef } from "react";
import { META_PIXEL_ID } from "@/lib/meta/events";
import { trackMeta } from "@/lib/meta/track";

export function MetaPixel() {
  const fired = useRef(false);

  useEffect(() => {
    // One PageView per mount (guarded against React strict-mode double-invoke).
    if (fired.current) return;
    fired.current = true;
    trackMeta("PageView");
  }, []);

  return (
    <>
      <Script id="meta-pixel-init" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');`}
      </Script>
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
    </>
  );
}
