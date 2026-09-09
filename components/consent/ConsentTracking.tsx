"use client";

import Script from "next/script";
import { useConsent } from "@/lib/consent/ConsentProvider";
import { MetaPixel } from "@/components/MetaPixel";

export function ConsentTracking() {
  const { analytics, marketing, decided } = useConsent();
  return <>
    {decided && marketing && <MetaPixel />}
    {decided && analytics && (process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_META_TRACKING_FORCE === "1") && (
      <Script id="microsoft-clarity" strategy="afterInteractive">
        {`
          (function(c,l,a,r,i,t,y){
              if (!["nexubis.io", "www.nexubis.io"].includes(c.location.hostname) && "${process.env.NEXT_PUBLIC_META_TRACKING_FORCE}" !== "1") return;
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "yfjrpq5ojd");
        `}
      </Script>
    )}
  </>;
}
