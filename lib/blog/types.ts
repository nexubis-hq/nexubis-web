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
