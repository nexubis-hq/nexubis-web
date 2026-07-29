import posts from "@/lib/blog/generated/post-fixtures.json";
import type { SanityPostDocument } from "@/lib/blog/sanity-posts";
import type { BlogPost } from "@/lib/blog/types";

const fixtures = posts as BlogPost[];

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

  return getPostFixtureBySlug(slug);
}

export function getPostFixtureBySlug(slug: string): BlogPost | null {
  return fixtures.find((post) => post.slug === slug) ?? null;
}

export function getBlogPostFixtureSlugs() {
  return fixtures.map((post) => post.slug);
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

