import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
