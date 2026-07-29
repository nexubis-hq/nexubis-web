import posts from "@/lib/blog/generated/post-fixtures.json";
import generatedSummaries from "@/lib/blog/generated/posts.json";
import type { SanityPostDocument } from "@/lib/blog/sanity-types";
import type { BlogPost, BlogPostSummary } from "@/lib/blog/types";

const fixtures = posts as BlogPost[];
const summaries = generatedSummaries as BlogPostSummary[];
const caseStudyStorySlugs = new Set([
  "altify-empowering-nexubis",
  "oxipack-empowering-nexubis",
]);

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export type PublishedSanityPostFetcher = (slug: string) => Promise<SanityPostDocument | null>;

async function fetchPublishedSanityPostBySlug(slug: string) {
  try {
    const { getPublishedSanityPostBySlug } = await import("@/lib/blog/sanity-posts");
    return getPublishedSanityPostBySlug(slug);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Missing required Sanity environment variable")) {
      return null;
    }

    throw error;
  }
}

export async function getPostBySlug(
  slug: string,
  fetchPublishedSanityPost: PublishedSanityPostFetcher = fetchPublishedSanityPostBySlug,
): Promise<BlogPost | null> {
  const sanityPost = await fetchPublishedSanityPost(slug);
  if (sanityPost) {
    const { mapSanityPostToBlogPost } = await import("@/lib/blog/sanity-post-mapper");
    return mapSanityPostToBlogPost(sanityPost);
  }

  return getPostFixtureBySlug(slug) ?? getCaseStudyStorySummaryBySlug(slug);
}

export function getPostFixtureBySlug(slug: string): BlogPost | null {
  return fixtures.find((post) => post.slug === slug) ?? null;
}

export function getBlogPostFixtureSlugs() {
  return fixtures.map((post) => post.slug);
}

function getCaseStudyStorySummaryBySlug(slug: string): BlogPost | null {
  if (!caseStudyStorySlugs.has(slug)) return null;

  const summary = summaries.find((post) => post.slug === slug);
  if (!summary) return null;

  return {
    title: summary.title,
    slug: summary.slug,
    excerpt: summary.excerpt,
    author: "Hannes Oosthuizen",
    category: summary.category,
    categorySlug: summary.categorySlug,
    categoryIcon: summary.categoryIcon,
    publishedAt: summary.publishedAt,
    updatedAt: summary.publishedAt,
    bodyHtml: `<p>${escapeHtml(summary.excerpt)}</p>`,
    thumbnail: summary.thumbnail,
    thumbnailAlt: summary.thumbnailAlt,
    heroImage: summary.thumbnail,
    heroImageAlt: summary.thumbnailAlt,
    seoTitle: summary.title,
    seoDescription: summary.excerpt,
    ogImage: summary.thumbnail,
    showreelEnabled: false,
    showreelUrl: null,
    lottieThumbnail: null,
    lottieJson: null,
    relatedSlugs: ["circuit-securing-nexubis"],
    source: "legacy",
  };
}

export async function getBlogPostStaticSlugs() {
  let sanitySlugs: string[] = [];

  try {
    const { getPublishedSanityPostSlugs } = await import("@/lib/blog/sanity-posts");
    sanitySlugs = await getPublishedSanityPostSlugs();
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("Missing required Sanity environment variable")) {
      throw error;
    }
  }

  const slugs = new Set([...getBlogPostFixtureSlugs(), ...sanitySlugs]);
  return [...slugs];
}

