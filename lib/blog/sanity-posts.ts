import { sanityClient } from "@/sanity/lib/client";
import { postBySlugQuery, publishedPostSlugsQuery } from "@/sanity/lib/queries";

export const BLOG_POST_REVALIDATE_SECONDS = 60;

export type SanityImage = {
  asset?: unknown;
  alt?: string | null;
  caption?: string | null;
};

export type SanityPostDocument = {
  _id: string;
  title?: string | null;
  slug?: string | null;
  excerpt?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  featured?: boolean | null;
  author?: {
    name?: string | null;
    slug?: string | null;
  } | null;
  category?: {
    title?: string | null;
    slug?: string | null;
    icon?: SanityImage | null;
  } | null;
  body?: unknown[] | null;
  thumbnail?: SanityImage | null;
  heroImage?: SanityImage | null;
  lottieThumbnail?: SanityImage | null;
  lottieJson?: string | null;
  showreelEnabled?: boolean | null;
  showreelUrl?: string | null;
  seo?: {
    title?: string | null;
    description?: string | null;
    openGraphImage?: SanityImage | null;
    canonicalOverride?: string | null;
  } | null;
};

const fetchOptions = {
  next: { revalidate: BLOG_POST_REVALIDATE_SECONDS },
};

export async function getPublishedSanityPostBySlug(slug: string) {
  return sanityClient.fetch<SanityPostDocument | null>(postBySlugQuery, { slug }, fetchOptions);
}

export async function getPublishedSanityPostSlugs() {
  const slugs = await sanityClient.fetch<string[]>(publishedPostSlugsQuery, {}, fetchOptions);
  return slugs.filter(Boolean);
}
