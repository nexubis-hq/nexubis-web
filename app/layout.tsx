import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AgentationProvider } from "@/components/AgentationProvider";
import { MetaPixel } from "@/components/MetaPixel";

export const metadata: Metadata = {
  title: "Nexubis | Your in-house creative team",
  description:
    "For European industrial manufacturers whose product is better than their brand shows. Brand, website, 3D, video, and print on one flat retainer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <AgentationProvider />
        <MetaPixel />
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "yfjrpq5ojd");
          `}
        </Script>
      </body>
    </html>
  );
}
