import { getGeneratedBlogIndexPosts } from "@/lib/blog/get-blog-index-posts";
import type { BlogPost, BlogPostSummary } from "@/lib/blog/types";

export function getRelatedPostSummaries(post: BlogPost): BlogPostSummary[] {
  const { posts } = getGeneratedBlogIndexPosts();
  const bySlug = new Map(posts.map((summary) => [summary.slug, summary]));

  return (post.relatedSlugs ?? [])
    .filter((slug) => slug !== post.slug)
    .map((slug) => bySlug.get(slug))
    .filter((summary): summary is BlogPostSummary => Boolean(summary));
}

