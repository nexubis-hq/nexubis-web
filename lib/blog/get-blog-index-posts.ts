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

const CATEGORY_ORDER = [
  "empowering-dreams",
  "founders-diary",
  "ai-x-nexubis",
  "startup-stack",
  "company",
  "for-professionals",
];

function mapSanityCategories(sanityCategories: SanityBlogCategoryIconDocument[]): BlogCategory[] {
  // When Sanity isn't configured (e.g. local dev with no Sanity env vars, or
  // nothing published yet) the fetcher hands back an empty array. Degrade to an
  // empty blog instead of throwing, so the Dreamlab page renders a graceful
  // empty state rather than a runtime error. Once Sanity has the categories,
  // the normal (validating) path below runs and still catches partial data.
  if (sanityCategories.length === 0) return [];

  const bySlug = new Map(sanityCategories.filter((category) => category.slug).map((category) => [category.slug as string, category]));

  return CATEGORY_ORDER.map((slug) => {
    const category = bySlug.get(slug);
    if (!category) throw new Error(`Published Sanity Blog category is missing for slug: ${slug}`);
    const icon = imageUrl(category.icon);
    if (!icon) throw new Error(`Published Sanity Blog category is missing a required icon asset: ${slug}`);
    return {
      label: category.title ?? "",
      slug,
      icon,
    };
  });
}

export async function getBlogIndexPosts(
  fetchPublishedSanitySummaries: PublishedSanityPostSummariesFetcher = fetchPublishedSanityPostSummaries,
  fetchPublishedCategoryIcons: PublishedSanityCategoryIconsFetcher = fetchPublishedSanityCategoryIcons,
): Promise<BlogIndexData> {
  const [sanityPosts, sanityCategories] = await Promise.all([
    fetchPublishedSanitySummaries(),
    fetchPublishedCategoryIcons(),
  ]);
  const categories = mapSanityCategories(sanityCategories);
  const categoryIconBySlug = new Map(categories.map((category) => [category.slug, category.icon]));
  const seen = new Set<string>();
  const posts: BlogPostSummary[] = [];

  for (const sanityPost of sanityPosts) {
    const summary = mapSanityPostSummaryToBlogPostSummary(sanityPost);
    if (!summary && sanityPost.slug && sanityPost.publishedAt) {
      throw new Error(
        `Published Sanity Blog summary is missing a required thumbnail asset: ${sanityPost.slug}`,
      );
    }

    if (!summary) continue;
    if (seen.has(summary.slug)) continue;
    seen.add(summary.slug);
    posts.push({
      ...summary,
      categoryIcon: categoryIconBySlug.get(summary.categorySlug) ?? summary.categoryIcon,
    });
  }

  return {
    posts,
    categories,
    stats: {
      totalRecords: posts.length,
      excludedRecords: 0,
      draftRecords: 0,
      archivedRecords: 0,
      invalidPublishedDateRecords: 0,
    },
  };
}
