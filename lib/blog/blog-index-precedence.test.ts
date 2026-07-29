import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BlogIndex } from "@/components/blog/BlogIndex";
import { getBlogIndexPosts } from "@/lib/blog/get-blog-index-posts";
import type { SanityBlogCategoryIconDocument, SanityPostSummaryDocument } from "@/lib/blog/sanity-types";

process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = "tu3u3e8c";
process.env.NEXT_PUBLIC_SANITY_DATASET = "production";

const SANITY_IMAGE_REF = "image-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-1920x1080-png";
const SANITY_CATEGORY_ICON_REF = "image-cccccccccccccccccccccccccccccccccccccccc-24x24-svg";
const WEBFLOW_HOSTS = ["cdn.prod.website-files.com", "website-files.com", "uploads-ssl.webflow.com"];

function sanitySummary(
  slug: string,
  legacyOrder: number,
  overrides: Partial<SanityPostSummaryDocument> = {},
): SanityPostSummaryDocument {
  return {
    _id: `post-${slug}`,
    title: `Sanity ${slug}`,
    slug,
    legacyOrder,
    excerpt: "  Sanity summary \n excerpt  ",
    publishedAt: "2025-11-06T10:44:45.000Z",
    featured: true,
    thumbnail: { asset: { _ref: SANITY_IMAGE_REF }, alt: "Exact Sanity thumbnail alt" },
    thumbnailAlt: "Exact Sanity thumbnail alt",
    category: {
      title: "Empowering Dreams",
      slug: "empowering-dreams",
      icon: { asset: { _ref: SANITY_CATEGORY_ICON_REF } },
    },
    ...overrides,
  };
}

function sanityCategories(
  overrides: Partial<SanityBlogCategoryIconDocument> = {},
): SanityBlogCategoryIconDocument[] {
  return [
    ["Empowering Dreams", "empowering-dreams"],
    ["Founders Diary", "founders-diary"],
    ["Artificial Intelligence", "ai-x-nexubis"],
    ["Startup Stack", "startup-stack"],
    ["Company", "company"],
    ["For Professionals", "for-professionals"],
  ].map(([title, slug]) => ({
    _id: `category-${slug}`,
    title,
    slug,
    icon: { asset: { _ref: SANITY_CATEGORY_ICON_REF } },
    iconAlt: "",
    ...overrides,
  }));
}

describe("Blog index Sanity-only data", () => {
  it("uses only published Sanity summaries", async () => {
    const { posts } = await getBlogIndexPosts(
      async () => [sanitySummary("circuit-securing-nexubis", 2)],
      async () => sanityCategories(),
    );

    expect(posts).toHaveLength(1);
    expect(posts[0].source).toBe("sanity");
    expect(posts[0].title).toBe("Sanity circuit-securing-nexubis");
    expect(posts[0].excerpt).toBe("Sanity summary excerpt");
  });

  it("does not show generated summaries when the published query returns none", async () => {
    const { posts } = await getBlogIndexPosts(async () => [], async () => sanityCategories());

    expect(posts).toHaveLength(0);
  });

  it("deduplicates exact slugs without pulling generated fallback records", async () => {
    const { posts } = await getBlogIndexPosts(
      async () => [
        sanitySummary("circuit-securing-nexubis", 2, { title: "Older duplicate" }),
        sanitySummary("circuit-securing-nexubis", 2, { title: "Newer duplicate" }),
      ],
      async () => sanityCategories(),
    );

    expect(posts).toHaveLength(1);
    expect(posts[0].slug).toBe("circuit-securing-nexubis");
    expect(posts[0].title).toBe("Older duplicate");
  });

  it("keeps the Sanity legacyOrder query as the ordering source", () => {
    const querySource = readFileSync(path.join(process.cwd(), "sanity/lib/queries.ts"), "utf8");

    expect(querySource).toContain("order(legacyOrder asc)");
    expect(querySource).not.toContain("order(publishedAt desc)");
  });

  it("uses Sanity thumbnails and never a Webflow thumbnail", async () => {
    const { posts } = await getBlogIndexPosts(
      async () => [sanitySummary("circuit-securing-nexubis", 2)],
      async () => sanityCategories(),
    );
    const post = posts[0];

    expect(post.thumbnail).toContain("cdn.sanity.io");
    expect(post.thumbnailAlt).toBe("Exact Sanity thumbnail alt");
    for (const host of WEBFLOW_HOSTS) {
      expect(post.thumbnail).not.toContain(host);
    }
  });

  it("reports a data-validation problem instead of falling back when Sanity thumbnail is missing", async () => {
    await expect(
      getBlogIndexPosts(
        async () => [sanitySummary("circuit-securing-nexubis", 2, { thumbnail: null, thumbnailAlt: null })],
        async () => sanityCategories(),
      ),
    ).rejects.toThrow(
      "Published Sanity Blog summary is missing a required thumbnail asset: circuit-securing-nexubis",
    );
  });

  it("uses Sanity category icons for filters and cards", async () => {
    const { posts, categories } = await getBlogIndexPosts(
      async () => [sanitySummary("circuit-securing-nexubis", 2)],
      async () => sanityCategories(),
    );
    const html = renderToStaticMarkup(createElement(BlogIndex, { posts, categories }));

    expect(categories.map((category) => category.slug)).toEqual([
      "empowering-dreams",
      "founders-diary",
      "ai-x-nexubis",
      "startup-stack",
      "company",
      "for-professionals",
    ]);
    expect(categories.every((category) => category.icon?.includes("cdn.sanity.io"))).toBe(true);
    for (const host of WEBFLOW_HOSTS) {
      expect(html).not.toContain(host);
    }
  });

  it("fails clearly when published Sanity category data is missing a required icon", async () => {
    await expect(
      getBlogIndexPosts(async () => [], async () => sanityCategories({ icon: null })),
    ).rejects.toThrow("Published Sanity Blog category is missing a required icon asset: empowering-dreams");
  });
});
