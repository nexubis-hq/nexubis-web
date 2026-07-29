import categoriesData from "@/lib/blog/generated/categories.json";
import generatedPosts from "@/lib/blog/generated/posts.json";
import { mapSanityPostSummaryToBlogPostSummary } from "@/lib/blog/sanity-post-mapper";
import { sanityImageUrl } from "@/lib/blog/sanity-image-url";
import type { SanityBlogCategoryIconDocument, SanityPostSummaryDocument } from "@/lib/blog/sanity-types";
import type { BlogCategory, BlogIndexData, BlogPostSummary } from "@/lib/blog/types";

export type PublishedSanityPostSummariesFetcher = () => Promise<SanityPostSummaryDocument[]>;
export type PublishedSanityCategoryIconsFetcher = () => Promise<SanityBlogCategoryIconDocument[]>;

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

async function fetchPublishedSanityCategoryIcons() {
  try {
    const { getPublishedSanityBlogCategoryIcons } = await import("@/lib/blog/sanity-posts");
    return getPublishedSanityBlogCategoryIcons();
  } catch (error) {
    if (error instanceof Error && error.message.includes("Missing required Sanity environment variable")) {
      return [];
    }

    throw error;
  }
}

function imageUrl(image: SanityBlogCategoryIconDocument["icon"]) {
  return sanityImageUrl(image as { asset?: { _ref?: string } } | null | undefined);
}

function resolveCategoryIcons(
  categories: BlogCategory[],
  sanityCategories: SanityBlogCategoryIconDocument[],
) {
  const iconBySlug = new Map<string, string>();
  const sanityCategoryBySlug = new Map(sanityCategories.filter((category) => category.slug).map((category) => [category.slug as string, category]));

  for (const category of categories) {
    const sanityCategory = sanityCategoryBySlug.get(category.slug);
    if (!sanityCategory) {
      if (sanityCategories.length > 0) {
        throw new Error(`Published Sanity Blog category is missing for slug: ${category.slug}`);
      }
      if (category.icon) iconBySlug.set(category.slug, category.icon);
      continue;
    }

    const icon = imageUrl(sanityCategory.icon);
    if (!icon) {
      throw new Error(`Published Sanity Blog category is missing a required icon asset: ${category.slug}`);
    }
    iconBySlug.set(category.slug, icon);
  }

  return iconBySlug;
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
  fetchPublishedCategoryIcons: PublishedSanityCategoryIconsFetcher = fetchPublishedSanityCategoryIcons,
): Promise<BlogIndexData> {
  const [sanityPosts, sanityCategories] = await Promise.all([
    fetchPublishedSanitySummaries(),
    fetchPublishedCategoryIcons(),
  ]);
  const sanityBySlug = new Map<string, BlogPostSummary>();
  const generatedCategories = categoriesData.categories as BlogCategory[];
  const categoryIconBySlug = resolveCategoryIcons(generatedCategories, sanityCategories);

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
    .map((post) => {
      const sanityPost = sanityBySlug.get(post.slug);
      if (sanityPost) {
        return {
          ...sanityPost,
          categoryIcon: categoryIconBySlug.get(sanityPost.categorySlug) ?? sanityPost.categoryIcon,
        };
      }
      return {
        ...post,
        categoryIcon: categoryIconBySlug.get(post.categorySlug) ?? post.categoryIcon,
      };
    })
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
    categories: generatedCategories.map((category) => ({
      ...category,
      icon: categoryIconBySlug.get(category.slug) ?? category.icon,
    })),
    stats: categoriesData.stats,
  };
}
