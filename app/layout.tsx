import type { Metadata } from "next";
import "./globals.css";
import { AgentationProvider } from "@/components/AgentationProvider";

export const metadata: Metadata = {
  title: "Nexubis | Design, Development and Growth Powerhouse",
  description:
    "Building confident brands through design and development with intent.",
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
