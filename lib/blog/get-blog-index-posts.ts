import categoriesData from "@/lib/blog/generated/categories.json";
import posts from "@/lib/blog/generated/posts.json";
import type { BlogCategory, BlogIndexData, BlogPostSummary } from "@/lib/blog/types";

export function getBlogIndexPosts(): BlogIndexData {
  return {
    posts: posts as BlogPostSummary[],
    categories: categoriesData.categories as BlogCategory[],
    stats: categoriesData.stats,
  };
}
