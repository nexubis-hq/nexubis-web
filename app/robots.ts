import type { MetadataRoute } from "next";

const SITE_URL = "https://www.nexubis.io";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/audit/admin", "/audit/r/", "/studio"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
