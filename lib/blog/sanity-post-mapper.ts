import { sanityImageUrl } from "@/lib/blog/sanity-image-url";
import type { BlogPost } from "@/lib/blog/types";
import type { SanityImage, SanityPostDocument } from "@/lib/blog/sanity-posts";

function imageUrl(image: SanityImage | null | undefined) {
  return sanityImageUrl(image as { asset?: { _ref?: string } } | null | undefined);
}

function parseLottieJson(value: string | null | undefined) {
  if (!value) return null;

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function mapSanityPostToBlogPost(document: SanityPostDocument): BlogPost {
  const heroImageUrl = imageUrl(document.heroImage);
  const thumbnailUrl = imageUrl(document.thumbnail);
  const lottieThumbnailUrl = imageUrl(document.lottieThumbnail);
  const ogImageUrl = imageUrl(document.seo?.openGraphImage);
  const categoryIconUrl = imageUrl(document.category?.icon);

  return {
    title: document.title ?? "",
    slug: document.slug ?? "",
    excerpt: document.excerpt ?? "",
    author: document.author?.name ?? "",
    category: document.category?.title ?? "",
    categorySlug: document.category?.slug ?? "",
    categoryIcon: categoryIconUrl,
    publishedAt: document.publishedAt ?? "",
    updatedAt: document.updatedAt ?? undefined,
    bodyPortableText: document.body ?? [],
    thumbnail: heroImageUrl ?? thumbnailUrl,
    thumbnailAlt: document.heroImage?.alt ?? document.thumbnail?.alt ?? null,
    heroImage: heroImageUrl,
    heroImageAlt: document.heroImage?.alt ?? null,
    seoTitle: document.seo?.title ?? null,
    seoDescription: document.seo?.description ?? null,
    ogImage: ogImageUrl,
    canonicalOverride: document.seo?.canonicalOverride ?? null,
    showreelEnabled: Boolean(document.showreelEnabled),
    showreelUrl: document.showreelUrl ?? null,
    lottieThumbnail: lottieThumbnailUrl,
    lottieJson: parseLottieJson(document.lottieJson),
    source: "sanity",
  };
}
