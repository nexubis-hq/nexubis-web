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
  overrides: Partial<SanityPostSummaryDocument> = {},
): SanityPostSummaryDocument {
  return {
    _id: `post-${slug}`,
    title: `Sanity ${slug}`,
    slug,
    excerpt: "  Sanity summary \n excerpt  ",
    publishedAt: "2025-11-06T10:44:45.000Z",
    featured: true,
    thumbnail: { asset: { _ref: SANITY_IMAGE_REF }, alt: "Exact Sanity thumbnail alt" },
    thumbnailAlt: "Exact Sanity thumbnail alt",
    category: {
      title: "Empowering Dreams",
      slug: "empowering-dreams",
      icon: { asset: { _ref: "image-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb-24x24-svg" } },
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

describe("Blog index Sanity precedence", () => {
  it("uses published Sanity summaries before generated summaries with the same slug", async () => {
    const { posts } = await getBlogIndexPosts(async () => [
      sanitySummary("circuit-securing-nexubis", { title: "Published Sanity Circuit" }),
    ]);
    const post = posts.find((summary) => summary.slug === "circuit-securing-nexubis");

    expect(post?.source).toBe("sanity");
    expect(post?.title).toBe("Published Sanity Circuit");
    expect(post?.excerpt).toBe("Sanity summary excerpt");
  });

  it("does not show draft-only Sanity summaries when the published query returns none", async () => {
    const { posts } = await getBlogIndexPosts(async () => []);
    const post = posts.find((summary) => summary.slug === "circuit-securing-nexubis");

    expect(post?.source).toBe("generated");
    expect(post?.title).toBe("Circuit: Securing Nexubis");
  });

  it("keeps generated summaries when no published Sanity record exists", async () => {
    const { posts } = await getBlogIndexPosts(async () => [
      sanitySummary("circuit-securing-nexubis"),
    ]);
    const post = posts.find((summary) => summary.slug === "the-nexubis-effect");

    expect(post?.source).toBe("generated");
    expect(post?.title).toBe("The Nexubis Effect");
  });

  it("deduplicates exact slugs and keeps the generated-list order stable", async () => {
    const { posts } = await getBlogIndexPosts(async () => [
      sanitySummary("circuit-securing-nexubis", { title: "Older duplicate" }),
      sanitySummary("circuit-securing-nexubis", { title: "Newer duplicate" }),
    ]);

    expect(posts).toHaveLength(88);
    expect(posts.map((post) => post.slug).filter((slug) => slug === "circuit-securing-nexubis")).toHaveLength(1);
    expect(posts.slice(0, 4).map((post) => post.slug)).toEqual([
      "the-nexubis-effect",
      "circuit-securing-nexubis",
      "oxipack-empowering-nexubis",
      "altify-empowering-nexubis",
    ]);
    expect(posts.find((post) => post.slug === "circuit-securing-nexubis")?.title).toBe(
      "Newer duplicate",
    );
  });

  it("uses Sanity thumbnails for Sanity summaries and never the generated Webflow thumbnail", async () => {
    const { posts } = await getBlogIndexPosts(async () => [
      sanitySummary("circuit-securing-nexubis"),
    ]);
    const post = posts.find((summary) => summary.slug === "circuit-securing-nexubis");

    expect(post?.thumbnail).toContain("cdn.sanity.io");
    expect(post?.thumbnailAlt).toBe("Exact Sanity thumbnail alt");
    for (const host of WEBFLOW_HOSTS) {
      expect(post?.thumbnail).not.toContain(host);
    }
  });

  it("reports a data-validation problem instead of falling back when Sanity thumbnail is missing", async () => {
    await expect(
      getBlogIndexPosts(async () => [
        sanitySummary("circuit-securing-nexubis", { thumbnail: null, thumbnailAlt: null }),
      ]),
    ).rejects.toThrow(
      "Published Sanity Blog summary is missing a required thumbnail asset: circuit-securing-nexubis",
    );
  });

  it("filters across Sanity and generated summaries using the shared category slug", async () => {
    const { posts, categories } = await getBlogIndexPosts(async () => [
      sanitySummary("circuit-securing-nexubis"),
    ], async () => sanityCategories());
    const empoweringDreams = posts.filter((post) => post.categorySlug === "empowering-dreams");

    expect(categories.map((category) => category.label)).toEqual([
      "Empowering Dreams",
      "Founders Diary",
      "Artificial Intelligence",
      "Startup Stack",
      "Company",
      "For Professionals",
    ]);
    expect(empoweringDreams.some((post) => post.source === "sanity")).toBe(true);
    expect(empoweringDreams.some((post) => post.source === "generated")).toBe(true);
  });

  it("uses Sanity category icons for filter buttons", async () => {
    const { posts, categories } = await getBlogIndexPosts(async () => [
      sanitySummary("circuit-securing-nexubis"),
    ], async () => sanityCategories());
    const html = renderToStaticMarkup(createElement(BlogIndex, { posts, categories }));
    const filtersMarkup = html.slice(html.indexOf("<fieldset"), html.indexOf("</fieldset>") + "</fieldset>".length);

    expect(html).toContain("cdn.sanity.io");
    expect(categories.every((category) => category.icon?.includes("cdn.sanity.io"))).toBe(true);
    for (const host of WEBFLOW_HOSTS) {
      expect(filtersMarkup).not.toContain(host);
    }
  });

  it("uses the shared Sanity category icon for generated fallback cards", async () => {
    const { posts } = await getBlogIndexPosts(async () => [
      sanitySummary("circuit-securing-nexubis"),
    ], async () => sanityCategories());
    const generatedPost = posts.find((post) => post.slug === "the-nexubis-effect");

    expect(generatedPost?.source).toBe("generated");
    expect(generatedPost?.categoryIcon).toContain("cdn.sanity.io");
    for (const host of WEBFLOW_HOSTS) {
      expect(generatedPost?.categoryIcon).not.toContain(host);
    }
  });

  it("fails clearly when published Sanity category data is missing a required icon", async () => {
    await expect(
      getBlogIndexPosts(async () => [], async () => sanityCategories({ icon: null })),
    ).rejects.toThrow("Published Sanity Blog category is missing a required icon asset: empowering-dreams");
  });

  it("keeps source metadata internal to data and out of BlogIndex markup", async () => {
    const { posts, categories } = await getBlogIndexPosts(async () => [
      sanitySummary("circuit-securing-nexubis"),
    ], async () => sanityCategories());
    const html = renderToStaticMarkup(createElement(BlogIndex, { posts, categories }));

    expect(html).not.toContain("source");
  });
});
