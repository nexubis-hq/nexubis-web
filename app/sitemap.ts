import type { MetadataRoute } from "next";
import { SHOW_SCORECARD } from "@/lib/site-config";
import { getAllCaseStudies } from "@/lib/work/data";

const SITE_URL = "https://www.nexubis.io";

function entry(path: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]) {
  return {
    url: `${SITE_URL}${path}`,
    changeFrequency,
    priority,
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: MetadataRoute.Sitemap = [
    entry("/", 1, "monthly"),
    entry("/about", 0.7, "monthly"),
    entry("/work", 0.8, "monthly"),
    ...getAllCaseStudies().map((caseStudy) => entry(`/work/${caseStudy.slug}`, 0.7, "monthly")),
    entry("/packages", 0.8, "monthly"),
    entry("/contact", 0.7, "monthly"),
  ];

  if (SHOW_SCORECARD) {
    routes.push(entry("/scorecard", 0.7, "monthly"));
  }

  return routes;
}
