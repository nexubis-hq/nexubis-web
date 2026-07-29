import { sanityClient } from "@/sanity/lib/client";
import {
  allBlogCategoryIconsQuery,
  allPublishedPostSummariesQuery,
  postBySlugQuery,
  publishedPostSlugsQuery,
} from "@/sanity/lib/queries";
import type {
  SanityBlogCategoryIconDocument,
  SanityPostDocument,
  SanityPostSummaryDocument,
} from "@/lib/blog/sanity-types";

export const BLOG_POST_REVALIDATE_SECONDS = 60;

const fetchOptions = {
  next: { revalidate: BLOG_POST_REVALIDATE_SECONDS },
  perspective: "published" as const,
  stega: false,
};

export async function getPublishedSanityPostBySlug(slug: string) {
  return sanityClient.fetch<SanityPostDocument | null>(postBySlugQuery, { slug }, fetchOptions);
}

export async function getPublishedSanityPostSlugs() {
  const slugs = await sanityClient.fetch<string[]>(publishedPostSlugsQuery, {}, fetchOptions);
  return slugs.filter(Boolean);
}

export async function getPublishedSanityPostSummaries() {
  return sanityClient.fetch<SanityPostSummaryDocument[]>(
    allPublishedPostSummariesQuery,
    {},
    fetchOptions,
  );
}

export async function getPublishedSanityBlogCategoryIcons() {
  return sanityClient.fetch<SanityBlogCategoryIconDocument[]>(
    allBlogCategoryIconsQuery,
    {},
    fetchOptions,
  );
}
