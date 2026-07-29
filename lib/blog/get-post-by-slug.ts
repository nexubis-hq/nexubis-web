import posts from "@/lib/blog/generated/post-fixtures.json";
import type { BlogPost } from "@/lib/blog/types";

const fixtures = posts as BlogPost[];

export function getPostBySlug(slug: string): BlogPost | null {
  return fixtures.find((post) => post.slug === slug) ?? null;
}

export function getBlogPostFixtureSlugs() {
  return fixtures.map((post) => post.slug);
}

