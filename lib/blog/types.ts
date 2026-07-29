export type BlogCategory = {
  label: string;
  slug: string;
  icon: string | null;
};

export type TableOfContentsItem = {
  id: string;
  text: string;
  level: 2 | 3 | 4 | 5 | 6;
};

export type BlogPostSummary = {
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  categorySlug: string;
  categoryIcon: string | null;
  publishedAt: string;
  thumbnail: string | null;
  thumbnailAlt?: string | null;
  featured: boolean;
  source: "generated" | "sanity" | "legacy";
};

export type BlogPost = {
  title: string;
  slug: string;
  excerpt: string;
  author: string;
  category: string;
  categorySlug: string;
  categoryIcon?: string | null;
  publishedAt: string;
  updatedAt?: string;
  bodyHtml?: string;
  bodyPortableText?: unknown[];
  thumbnail?: string | null;
  thumbnailAlt?: string | null;
  heroImage?: string | null;
  heroImageAlt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImage?: string | null;
  canonicalOverride?: string | null;
  showreelEnabled: boolean;
  showreelUrl?: string | null;
  lottieThumbnail?: string | null;
  lottieJson?: unknown | null;
  relatedSlugs?: string[];
  source: "fixture" | "sanity" | "legacy";
};

export type BlogIndexData = {
  posts: BlogPostSummary[];
  categories: BlogCategory[];
  stats: {
    totalRecords: number;
    excludedRecords: number;
    draftRecords: number;
    archivedRecords: number;
    invalidPublishedDateRecords: number;
  };
};
