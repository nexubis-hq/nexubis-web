export type BlogCategory = {
  label: string;
  slug: string;
  icon: string | null;
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
  featured: boolean;
};

export type BlogPost = {
  title: string;
  slug: string;
  excerpt: string;
  author: string;
  category: string;
  categorySlug: string;
  publishedAt: string;
  updatedAt?: string;
  bodyHtml: string;
  thumbnail?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImage?: string | null;
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
