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
    legacyOrder,
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
  *[
    _type == "post" &&
    defined(slug.current) &&
    defined(publishedAt) &&
    !(_id in path("drafts.**")) &&
    !(_id in path("versions.**")) &&
    !(_id in path("releases.**")) &&
    !(_id in path("_.releases.**")) &&
    _type != "system.release"
  ] | order(legacyOrder asc) {
    _id,
    title,
    "slug": slug.current,
    legacyOrder,
    excerpt,
    publishedAt,
    featured,
    thumbnail,
    "thumbnailAlt": thumbnail.alt,
    "category": category->{title, "slug": slug.current, icon}
  }
`;

export const authorsQuery = groq`
  *[_type == "author"] | order(name asc)
`;

export const categoriesQuery = groq`
  *[_type == "category"] | order(title asc)
`;

export const allBlogCategoryIconsQuery = groq`
  *[
    _type == "category" &&
    defined(slug.current) &&
    !(_id in path("drafts.**")) &&
    !(_id in path("versions.**"))
  ] {
    title,
    "slug": slug.current,
    icon
  }
`;
