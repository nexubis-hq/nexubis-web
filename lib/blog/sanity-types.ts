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

export type SanityPostSummaryDocument = {
  _id: string;
  title?: string | null;
  slug?: string | null;
  excerpt?: string | null;
  publishedAt?: string | null;
  featured?: boolean | null;
  thumbnail?: SanityImage | null;
  thumbnailAlt?: string | null;
  category?: {
    title?: string | null;
    slug?: string | null;
    icon?: SanityImage | null;
  } | null;
};

export type SanityBlogCategoryIconDocument = {
  title?: string | null;
  slug?: string | null;
  icon?: SanityImage | null;
};
