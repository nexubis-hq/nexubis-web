import type { Metadata } from "next";
import type { BlogPost } from "@/lib/blog/types";

const SITE_URL = "https://www.nexubis.io";

export function buildBlogPostMetadata(post: BlogPost): Metadata {
  const canonicalPath = `/post/${post.slug}`;
  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;
  const ogImage = post.ogImage ? new URL(post.ogImage, SITE_URL).toString() : undefined;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
  };
}

