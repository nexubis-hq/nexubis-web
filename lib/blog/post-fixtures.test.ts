import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getBlogIndexPosts } from "@/lib/blog/get-blog-index-posts";
import { getPostBySlug } from "@/lib/blog/get-post-by-slug";
import { buildBlogPostMetadata } from "@/lib/blog/post-metadata";
import { getRelatedPostSummaries } from "@/lib/blog/related-posts";
import { sanitizeBlogPostHtml } from "@/lib/blog/sanitize-post-html";
import type {
  SanityBlogCategoryIconDocument,
  SanityPostDocument,
  SanityPostSummaryDocument,
} from "@/lib/blog/sanity-types";

process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = "tu3u3e8c";
process.env.NEXT_PUBLIC_SANITY_DATASET = "production";

const SANITY_IMAGE_REF = "image-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-1920x1080-png";
const SANITY_ICON_REF = "image-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb-24x24-svg";

function summary(slug: string, legacyOrder: number, categorySlug = "empowering-dreams"): SanityPostSummaryDocument {
  return {
    _id: `post-${slug}`,
    title: `Post ${legacyOrder}`,
    slug,
    legacyOrder,
    excerpt: "Sanity excerpt",
    publishedAt: "2025-06-11T11:27:07.000Z",
    featured: false,
    thumbnail: { asset: { _ref: SANITY_IMAGE_REF }, alt: "Thumbnail" },
    thumbnailAlt: "Thumbnail",
    category: {
      title: categorySlug === "founders-diary" ? "Founders Diary" : "Empowering Dreams",
      slug: categorySlug,
      icon: { asset: { _ref: SANITY_ICON_REF }, alt: "Icon" },
    },
  };
}

function categories(): SanityBlogCategoryIconDocument[] {
  return [
    ["Empowering Dreams", "empowering-dreams"],
    ["Founders Diary", "founders-diary"],
    ["Artificial Intelligence", "ai-x-nexubis"],
    ["Startup Stack", "startup-stack"],
    ["Company", "company"],
    ["For Professionals", "for-professionals"],
  ].map(([title, slug]) => ({
    title,
    slug,
    icon: { asset: { _ref: SANITY_ICON_REF }, alt: title },
  }));
}

function sanityPost(slug = "how-it-all-started-and-almost-didnt"): SanityPostDocument {
  return {
    _id: `post-${slug}`,
    title: "How It All Started (and Almost Didn’t)",
    slug,
    legacyOrder: 86,
    excerpt: "Published Sanity excerpt",
    publishedAt: "2025-06-11T11:27:07.000Z",
    updatedAt: "2025-04-30T13:30:48.000Z",
    featured: false,
    author: { name: "Hannes Oosthuizen", slug: "hannes-oosthuizen" },
    category: { title: "Founders Diary", slug: "founders-diary", icon: { asset: { _ref: SANITY_ICON_REF } } },
    body: [
      {
        _type: "block",
        _key: "h1",
        style: "h3",
        children: [{ _type: "span", _key: "s1", text: "The Early Days: Hustle, Hide, Repeat" }],
        markDefs: [],
      },
    ],
    thumbnail: { asset: { _ref: SANITY_IMAGE_REF }, alt: "Thumbnail" },
    heroImage: null,
    lottieThumbnail: null,
    lottieJson: null,
    showreelEnabled: false,
    showreelUrl: null,
    seo: {
      title: "The Nexubis Origin Story: From White-Label Hustle to Agency Growth",
      description: "The Nexubis Origin Story: From White-Label Hustle to Agency Growth",
      openGraphImage: { asset: { _ref: SANITY_IMAGE_REF }, alt: "OG" },
      canonicalOverride: null,
    },
  };
}

describe("Blog public Sanity boundary", () => {
  it("keeps exact /post/[slug] routing and does not create /blog/[slug]", () => {
    expect("/post/how-it-all-started-and-almost-didnt").toMatch(/^\/post\/[^/]+$/);
    expect(existsSync(path.join(process.cwd(), "app", "post", "[slug]", "page.tsx"))).toBe(true);
    expect(existsSync(path.join(process.cwd(), "app", "blog", "[slug]", "page.tsx"))).toBe(false);
  });

  it("returns null for unknown or unpublished slugs instead of using fixtures", async () => {
    await expect(getPostBySlug("how-it-all-started-and-almost-didnt", async () => null)).resolves.toBeNull();
    await expect(getPostBySlug("not-a-real-post", async () => null)).resolves.toBeNull();
  });

  it("maps metadata to the exact /post/[slug] canonical path", async () => {
    const post = await getPostBySlug("how-it-all-started-and-almost-didnt", async () => sanityPost());
    expect(post).toBeTruthy();

    const metadata = buildBlogPostMetadata(post!);
    expect(metadata.title).toBe("The Nexubis Origin Story: From White-Label Hustle to Agency Growth");
    expect(metadata.alternates?.canonical).toBe("/post/how-it-all-started-and-almost-didnt");
    expect(metadata.openGraph?.url).toBe("/post/how-it-all-started-and-almost-didnt");
  });

  it("keeps rich text sanitization for legacy HTML utilities", () => {
    const sanitized = sanitizeBlogPostHtml(
      '<h3 onclick="bad()">Extra Heading</h3><a href="javascript:bad()">bad</a><a href="https://www.nexubis.io/blog">blog</a>',
    );

    expect(sanitized.html).not.toContain("onclick");
    expect(sanitized.html).not.toContain("javascript:");
    expect(sanitized.html).toContain('href="/blog"');
    expect(sanitized.toc.map((item) => item.id)).toContain("extra-heading");
  });

  it("keeps the Blog index Sanity-only and ordered by legacyOrder", async () => {
    const sanitySummaries = [summary("second", 2), summary("first", 1, "founders-diary")];
    const { posts, categories: resultCategories, stats } = await getBlogIndexPosts(
      async () => sanitySummaries,
      async () => categories(),
    );

    expect(posts.map((post) => post.slug)).toEqual(["second", "first"]);
    expect(posts.every((post) => post.source === "sanity")).toBe(true);
    expect(posts.every((post) => post.thumbnail?.includes("cdn.sanity.io"))).toBe(true);
    expect(stats.totalRecords).toBe(2);
    expect(resultCategories.map((category) => category.slug)).toEqual([
      "empowering-dreams",
      "founders-diary",
      "ai-x-nexubis",
      "startup-stack",
      "company",
      "for-professionals",
    ]);
  });

  it("uses Sanity-only summaries for related posts", async () => {
    const post = await getPostBySlug("current", async () =>
      sanityPost("current"),
    );
    const related = await getRelatedPostSummaries(post!, async () => ({
      posts: [
        {
          title: "Current",
          slug: "current",
          excerpt: "",
          category: "Founders Diary",
          categorySlug: "founders-diary",
          categoryIcon: "https://cdn.sanity.io/icon.svg",
          publishedAt: "2025-06-11T11:27:07.000Z",
          thumbnail: "https://cdn.sanity.io/thumb.webp",
          featured: false,
          source: "sanity",
        },
        {
          title: "Related",
          slug: "related",
          excerpt: "",
          category: "Founders Diary",
          categorySlug: "founders-diary",
          categoryIcon: "https://cdn.sanity.io/icon.svg",
          publishedAt: "2025-06-11T11:27:07.000Z",
          thumbnail: "https://cdn.sanity.io/thumb.webp",
          featured: false,
          source: "sanity",
        },
      ],
      categories: [],
      stats: {
        totalRecords: 2,
        excludedRecords: 0,
        draftRecords: 0,
        archivedRecords: 0,
        invalidPublishedDateRecords: 0,
      },
    }));

    expect(related).not.toContainEqual(expect.objectContaining({ slug: "current" }));
    expect(related.every((item) => item.source === "sanity")).toBe(true);
    expect(related.every((item) => item.thumbnail?.includes("cdn.sanity.io"))).toBe(true);
  });

  it("keeps production Blog modules independent from generated Webflow fallback data", () => {
    const files = [
      "lib/blog/get-post-by-slug.ts",
      "lib/blog/get-blog-index-posts.ts",
      "lib/blog/related-posts.ts",
      "app/post/[slug]/page.tsx",
      "app/blog/page.tsx",
      "app/sitemap.ts",
      "components/blog/BlogPostTemplate.tsx",
    ];

    for (const file of files) {
      const source = readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).not.toContain("webflow-export");
      expect(source).not.toContain("generated/posts.json");
      expect(source).not.toContain("generated/post-fixtures.json");
      expect(source).not.toContain("generated/categories.json");
    }
  });

  it("builds sitemap Blog routes from published Sanity slugs", async () => {
    const source = readFileSync(path.join(process.cwd(), "app", "sitemap.ts"), "utf8");
    expect(source).toContain("getPublishedSanityPostSlugs");
    expect(source).toContain("https://www.nexubis.io");
    expect(source).not.toContain("/blog/[slug]");
  });
});
