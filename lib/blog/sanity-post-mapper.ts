import { sanityImageUrl } from "@/lib/blog/sanity-image-url";
import type { BlogPost, BlogPostSummary } from "@/lib/blog/types";
import type {
  SanityImage,
  SanityPostDocument,
  SanityPostSummaryDocument,
} from "@/lib/blog/sanity-posts";

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

function normaliseSummaryExcerpt(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function mapSanityPostSummaryToBlogPostSummary(
  document: SanityPostSummaryDocument,
): BlogPostSummary | null {
  const slug = document.slug?.trim();
  const publishedAt = document.publishedAt?.trim();
  const thumbnail = imageUrl(document.thumbnail);

  if (!slug || !publishedAt || !thumbnail) return null;

  return {
    title: document.title ?? "",
    slug,
    excerpt: normaliseSummaryExcerpt(document.excerpt),
    category: document.category?.title ?? "",
    categorySlug: document.category?.slug ?? "",
    categoryIcon: imageUrl(document.category?.icon),
    publishedAt,
    thumbnail,
    thumbnailAlt: document.thumbnailAlt ?? document.thumbnail?.alt ?? null,
    featured: Boolean(document.featured),
    source: "sanity",
  };
}
