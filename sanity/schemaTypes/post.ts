import { defineField, defineType } from "sanity";

function isValidJson(value: string | undefined) {
  if (!value) return true;

  try {
    JSON.parse(value);
    return true;
  } catch {
    return "Lottie JSON must be valid JSON.";
  }
}

export const post = defineType({
  name: "post",
  title: "Post",
  type: "document",
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "media", title: "Media" },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      group: "content",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      group: "content",
      options: {
        source: "title",
        maxLength: 120,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "excerpt",
      title: "Excerpt",
      type: "text",
      rows: 4,
      group: "content",
      validation: (rule) => rule.required().max(300),
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "blockContent",
      group: "content",
    }),
    defineField({
      name: "publishedAt",
      title: "Published at",
      type: "datetime",
      group: "content",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "updatedAt",
      title: "Updated at",
      type: "datetime",
      group: "content",
    }),
    defineField({
      name: "featured",
      title: "Featured",
      type: "boolean",
      group: "content",
      initialValue: false,
    }),
    defineField({
      name: "author",
      title: "Author",
      type: "reference",
      to: [{ type: "author" }],
      group: "content",
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "reference",
      to: [{ type: "category" }],
      group: "content",
    }),
    defineField({
      name: "thumbnail",
      title: "Thumbnail",
      type: "image",
      options: { hotspot: true },
      group: "media",
      fields: [
        defineField({
          name: "alt",
          title: "Alt text",
          type: "string",
        }),
      ],
    }),
    defineField({
      name: "heroImage",
      title: "Hero image",
      description: "Optional. Use only when the hero differs from the thumbnail.",
      type: "image",
      options: { hotspot: true },
      group: "media",
      fields: [
        defineField({
          name: "alt",
          title: "Alt text",
          type: "string",
        }),
      ],
    }),
    defineField({
      name: "lottieThumbnail",
      title: "Lottie thumbnail",
      type: "image",
      options: { hotspot: true },
      group: "media",
      fields: [
        defineField({
          name: "alt",
          title: "Alt text",
          type: "string",
        }),
      ],
    }),
    defineField({
      name: "lottieJson",
      title: "Lottie JSON",
      type: "text",
      rows: 8,
      group: "media",
      validation: (rule) => rule.custom(isValidJson),
    }),
    defineField({
      name: "showreelEnabled",
      title: "Showreel enabled",
      type: "boolean",
      group: "media",
      initialValue: false,
    }),
    defineField({
      name: "showreelUrl",
      title: "Showreel URL",
      type: "url",
      group: "media",
      hidden: ({ parent }) => !parent?.showreelEnabled,
      validation: (rule) =>
        rule.custom((value, context) => {
          if ((context.parent as { showreelEnabled?: boolean })?.showreelEnabled && !value) {
            return "Showreel URL is required when the showreel is enabled.";
          }
          return true;
        }),
    }),
    defineField({
      name: "seo",
      title: "SEO",
      type: "seo",
      group: "seo",
    }),
  ],
  preview: {
    select: {
      title: "title",
      category: "category.title",
      publishedAt: "publishedAt",
      media: "thumbnail",
    },
    prepare({ title, category, publishedAt, media }) {
      const date = publishedAt ? new Date(publishedAt).toLocaleDateString("en-GB") : "Unpublished";
      return {
        title,
        subtitle: [category, date].filter(Boolean).join(" · "),
        media,
      };
    },
  },
});

