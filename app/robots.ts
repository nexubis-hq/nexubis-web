import type { MetadataRoute } from "next";

const SITE_URL = "https://www.nexubis.io";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/scorecard/admin", "/scorecard/r/", "/studio"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
