import categoriesData from "@/lib/blog/generated/categories.json";
import generatedPosts from "@/lib/blog/generated/posts.json";
import { mapSanityPostSummaryToBlogPostSummary } from "@/lib/blog/sanity-post-mapper";
import type { SanityPostSummaryDocument } from "@/lib/blog/sanity-posts";
import type { BlogCategory, BlogIndexData, BlogPostSummary } from "@/lib/blog/types";

export type PublishedSanityPostSummariesFetcher = () => Promise<SanityPostSummaryDocument[]>;

async function fetchPublishedSanityPostSummaries() {
  try {
    const { getPublishedSanityPostSummaries } = await import("@/lib/blog/sanity-posts");
    return getPublishedSanityPostSummaries();
  } catch (error) {
    if (error instanceof Error && error.message.includes("Missing required Sanity environment variable")) {
      return [];
    }

    throw error;
  }
}

function withGeneratedSource(post: BlogPostSummary): BlogPostSummary {
  return {
    ...post,
    source: post.source ?? "generated",
  };
}

export function getGeneratedBlogIndexPosts(): BlogIndexData {
  return {
    posts: (generatedPosts as BlogPostSummary[]).map(withGeneratedSource),
    categories: categoriesData.categories as BlogCategory[],
    stats: categoriesData.stats,
  };
}

function timestamp(post: BlogPostSummary) {
  const value = new Date(post.publishedAt).getTime();
  return Number.isFinite(value) ? value : 0;
}

export async function getBlogIndexPosts(
  fetchPublishedSanitySummaries: PublishedSanityPostSummariesFetcher = fetchPublishedSanityPostSummaries,
): Promise<BlogIndexData> {
  const sanityPosts = await fetchPublishedSanitySummaries();
  const sanityBySlug = new Map<string, BlogPostSummary>();

  for (const sanityPost of sanityPosts) {
    const summary = mapSanityPostSummaryToBlogPostSummary(sanityPost);
    if (!summary && sanityPost.slug && sanityPost.publishedAt) {
      throw new Error(
        `Published Sanity Blog summary is missing a required thumbnail asset: ${sanityPost.slug}`,
      );
    }

    if (!summary) continue;
    sanityBySlug.set(summary.slug, summary);
  }

  const seen = new Set<string>();
  const generatedSummaries = getGeneratedBlogIndexPosts().posts;
  const mergedPosts = generatedSummaries
    .map((post) => sanityBySlug.get(post.slug) ?? post)
    .filter((post) => {
      if (!post.slug || seen.has(post.slug)) return false;
      seen.add(post.slug);
      return true;
    });

  const futureSanityPosts = Array.from(sanityBySlug.values())
    .filter((post) => !seen.has(post.slug))
    .sort((a, b) => timestamp(b) - timestamp(a));

  return {
    posts: [...mergedPosts, ...futureSanityPosts],
    categories: categoriesData.categories as BlogCategory[],
    stats: categoriesData.stats,
  };
}
