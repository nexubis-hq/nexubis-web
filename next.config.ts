import type { NextConfig } from "next";
import { securityHeaderRules } from "./lib/security/headers";

const nextConfig: NextConfig = {
  // Don't advertise the framework (X-Powered-By: Next.js).
  poweredByHeader: false,
  // Security headers on every route; see lib/security/headers.ts.
  async headers() {
    return securityHeaderRules(process.env.NODE_ENV !== "production");
  },
  images: {
    qualities: [75, 95],
  },
  // The tool was renamed from the Industrial Brand Credibility Scorecard to
  // The Online Credibility Audit. Every /scorecard URL ever shared (report
  // links, QR codes, emails) must keep working forever, so this redirect is
  // permanent and must never be removed. `:path*` also matches the bare
  // /scorecard landing URL. /api/scorecard/* is a different prefix and is
  // deliberately not redirected.
  async redirects() {
    return [
      {
        source: "/scorecard/:path*",
        destination: "/audit/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
