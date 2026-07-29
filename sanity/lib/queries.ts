import { groq } from "next-sanity";

export const postBySlugQuery = groq`
  *[
    _type == "post" &&
    slug.current == $slug &&
    defined(publishedAt) &&
    !(_id in path("drafts.**")) &&
    !(_id in path("versions.**"))
  ][0] {
    _id,
    title,
    "slug": slug.current,
    excerpt,
    publishedAt,
    updatedAt,
    featured,
    author->{name, "slug": slug.current},
    category->{title, "slug": slug.current, icon},
    body,
    thumbnail,
    heroImage,
    lottieThumbnail,
    lottieJson,
    showreelEnabled,
    showreelUrl,
    seo {
      title,
      description,
      openGraphImage,
      canonicalOverride
    }
  }
`;

export const publishedPostSlugsQuery = groq`
  *[
    _type == "post" &&
    defined(publishedAt) &&
    defined(slug.current) &&
    !(_id in path("drafts.**")) &&
    !(_id in path("versions.**"))
  ].slug.current
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
