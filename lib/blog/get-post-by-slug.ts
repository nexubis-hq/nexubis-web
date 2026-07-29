import type { SanityPostDocument } from "@/lib/blog/sanity-types";
import type { BlogPost } from "@/lib/blog/types";

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

  return null;
}

export async function getBlogPostStaticSlugs() {
  const { getPublishedSanityPostSlugs } = await import("@/lib/blog/sanity-posts");
  const slugs = await getPublishedSanityPostSlugs();
  return [...new Set(slugs)];
}

