import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type Manifest = {
  posts: Array<{
    exactSlug: string;
    originalIndex: number;
    status: string;
  }>;
};

function manifest() {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), "docs/BLOG_SANITY_BATCH_MANIFEST.json"), "utf8"),
  ) as Manifest;
}

describe("Blog final Sanity cutover invariants", () => {
  it("has 88 complete unique manifest slugs", () => {
    const posts = manifest().posts;
    const slugs = posts.map((post) => post.exactSlug);

    expect(posts).toHaveLength(88);
    expect(posts.every((post) => post.status === "complete")).toBe(true);
    expect(new Set(slugs).size).toBe(88);
  });

  it("has 88 unique order values covering 1 through 88", () => {
    const orders = manifest().posts.map((post) => post.originalIndex).sort((a, b) => a - b);

    expect(new Set(orders).size).toBe(88);
    expect(orders).toEqual(Array.from({ length: 88 }, (_, index) => index + 1));
  });

  it("uses published Sanity slugs for static params and sitemap", () => {
    const staticParamsSource = readFileSync(
      path.join(process.cwd(), "lib/blog/get-post-by-slug.ts"),
      "utf8",
    );
    const sitemapSource = readFileSync(path.join(process.cwd(), "app/sitemap.ts"), "utf8");

    expect(staticParamsSource).toContain("getPublishedSanityPostSlugs");
    expect(staticParamsSource).not.toContain("getBlogPostFixtureSlugs");
    expect(sitemapSource).toContain("getPublishedSanityPostSlugs");
    expect(sitemapSource).not.toContain("/blog/[slug]");
  });

  it("does not import generated Webflow fallback data in public Blog runtime modules", () => {
    const files = [
      "app/blog/page.tsx",
      "app/post/[slug]/page.tsx",
      "app/sitemap.ts",
      "components/blog/BlogPostTemplate.tsx",
      "lib/blog/get-blog-index-posts.ts",
      "lib/blog/get-post-by-slug.ts",
      "lib/blog/related-posts.ts",
      "lib/blog/post-metadata.ts",
      "lib/blog/sanity-posts.ts",
    ];

    for (const file of files) {
      const source = readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).not.toContain("generated/posts.json");
      expect(source).not.toContain("generated/post-fixtures.json");
      expect(source).not.toContain("generated/categories.json");
      expect(source).not.toContain("webflow-export");
    }
  });
});
