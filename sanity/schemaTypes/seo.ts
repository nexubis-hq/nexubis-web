import { defineField, defineType } from "sanity";

export const seo = defineType({
  name: "seo",
  title: "SEO",
  type: "object",
  fields: [
    defineField({
      name: "title",
      title: "SEO title",
      type: "string",
      validation: (rule) =>
        rule.max(70).warning("SEO titles are usually strongest under 70 characters."),
    }),
    defineField({
      name: "description",
      title: "Meta description",
      type: "text",
      rows: 3,
      validation: (rule) =>
        rule
          .max(170)
          .warning("Meta descriptions are usually strongest under 170 characters."),
    }),
    defineField({
      name: "openGraphImage",
      title: "Open Graph image",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Alt text",
          type: "string",
        }),
      ],
    }),
    defineField({
      name: "canonicalOverride",
      title: "Canonical override",
      description: "Optional. Leave empty to use /post/[slug].",
      type: "url",
    }),
  ],
});

