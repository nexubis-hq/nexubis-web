import type { MetadataRoute } from "next";
import { SHOW_SCORECARD } from "@/lib/site-config";
import { getAllCaseStudies } from "@/lib/work/data";
import { getPublishedSanityPostSlugs } from "@/lib/blog/sanity-posts";

const SITE_URL = "https://www.nexubis.io";

function entry(path: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]) {
  return {
    url: `${SITE_URL}${path}`,
    changeFrequency,
    priority,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogSlugs = await getPublishedSanityPostSlugs();
  const routes: MetadataRoute.Sitemap = [
    entry("/", 1, "monthly"),
    entry("/about", 0.7, "monthly"),
    entry("/work", 0.8, "monthly"),
    ...getAllCaseStudies().map((caseStudy) => entry(`/work/${caseStudy.slug}`, 0.7, "monthly")),
    entry("/packages", 0.8, "monthly"),
    entry("/blog", 0.8, "weekly"),
    ...blogSlugs.map((slug) => entry(`/post/${slug}`, 0.7, "weekly")),
    entry("/contact", 0.7, "monthly"),
  ];

  if (SHOW_SCORECARD) {
    routes.push(entry("/scorecard", 0.7, "monthly"));
  }

  return routes;
}
