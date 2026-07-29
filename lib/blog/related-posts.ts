import type { BlogPost, BlogPostSummary } from "@/lib/blog/types";
import type { getBlogIndexPosts } from "@/lib/blog/get-blog-index-posts";

type BlogIndexFetcher = typeof getBlogIndexPosts;

export async function getRelatedPostSummaries(
  post: BlogPost,
  fetchBlogIndexPosts?: BlogIndexFetcher,
): Promise<BlogPostSummary[]> {
  const getIndex = fetchBlogIndexPosts ?? (await import("@/lib/blog/get-blog-index-posts")).getBlogIndexPosts;
  const { posts } = await getIndex();
  const bySlug = new Map(posts.map((summary) => [summary.slug, summary]));
  const explicit = (post.relatedSlugs ?? [])
    .filter((slug) => slug !== post.slug)
    .map((slug) => bySlug.get(slug))
    .filter((summary): summary is BlogPostSummary => Boolean(summary));

  const sameCategory = posts.filter(
    (summary) =>
      summary.slug !== post.slug &&
      summary.categorySlug === post.categorySlug &&
      !explicit.some((related) => related.slug === summary.slug),
  );

  return [...explicit, ...sameCategory].slice(0, 3);
}

