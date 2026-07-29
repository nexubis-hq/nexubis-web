import { groq } from "next-sanity";

export const postBySlugQuery = groq`
  *[_type == "post" && slug.current == $slug][0]
`;

export const allPublishedPostSummariesQuery = groq`
  *[_type == "post" && defined(publishedAt)] | order(featured desc, publishedAt desc) {
    title,
    "slug": slug.current,
    excerpt,
    publishedAt,
    featured,
    "category": category->title,
    "categorySlug": category->slug.current,
    thumbnail
  }
`;

export const authorsQuery = groq`
  *[_type == "author"] | order(name asc)
`;

export const categoriesQuery = groq`
  *[_type == "category"] | order(title asc)
`;
