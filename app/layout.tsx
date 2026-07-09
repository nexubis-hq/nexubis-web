import type { Metadata } from "next";
import "./globals.css";
import { AgentationProvider } from "@/components/AgentationProvider";

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
      </body>
    </html>
  );
}
