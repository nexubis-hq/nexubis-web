import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getBlogIndexPosts } from "@/lib/blog/get-blog-index-posts";
import { getBlogPostFixtureSlugs, getPostBySlug } from "@/lib/blog/get-post-by-slug";
import { buildBlogPostMetadata } from "@/lib/blog/post-metadata";
import { toYouTubeEmbedUrl } from "@/lib/blog/post-url";
import { getRelatedPostSummaries } from "@/lib/blog/related-posts";
import { sanitizeBlogPostHtml } from "@/lib/blog/sanitize-post-html";

const STANDARD_SLUG = "how-it-all-started-and-almost-didnt";
const LOTTIE_SLUG = "circuit-securing-nexubis";
const getFixturePost = (slug: string) => getPostBySlug(slug, async () => null);

describe("Blog post fixtures", () => {
  it("resolves only the two Task 2A fixture slugs", async () => {
    expect(getBlogPostFixtureSlugs()).toEqual([STANDARD_SLUG, LOTTIE_SLUG]);
    expect((await getFixturePost(STANDARD_SLUG))?.title).toBe("How It All Started (and Almost Didn’t)");
    expect((await getFixturePost(LOTTIE_SLUG))?.title).toBe("Circuit: Securing Nexubis");
    expect(await getFixturePost("not-a-real-post")).toBeNull();
  });

  it("keeps exact /post/[slug] routing and does not create /blog/[slug]", () => {
    for (const slug of getBlogPostFixtureSlugs()) {
      expect(`/post/${slug}`).toMatch(/^\/post\/[^/]+$/);
    }

    expect(existsSync(path.join(process.cwd(), "app", "post", "[slug]", "page.tsx"))).toBe(true);
    expect(existsSync(path.join(process.cwd(), "app", "blog", "[slug]", "page.tsx"))).toBe(false);
  });

  it("preserves standard and Lottie media variants", async () => {
    const standard = await getFixturePost(STANDARD_SLUG);
    const lottie = await getFixturePost(LOTTIE_SLUG);

    expect(standard?.thumbnail).toContain("How%20It%20All%20Started");
    expect(standard?.lottieJson).toBeNull();
    expect(standard?.showreelEnabled).toBe(false);

    expect(lottie?.thumbnail).toContain("Circuit");
    expect(lottie?.lottieJson).toBeTruthy();
    expect(lottie?.lottieThumbnail).toBe(lottie?.thumbnail);
    expect(lottie?.showreelEnabled).toBe(true);
  });

  it("renders showreel data only for the enabled fixture", async () => {
    const standard = await getFixturePost(STANDARD_SLUG);
    const lottie = await getFixturePost(LOTTIE_SLUG);

    expect(standard?.showreelUrl).toBeNull();
    expect(lottie?.showreelUrl).toBe("https://youtu.be/WKUUu8J0xYg");
    expect(toYouTubeEmbedUrl(lottie?.showreelUrl ?? "")).toBe(
      "https://www.youtube.com/embed/WKUUu8J0xYg",
    );
    expect(lottie?.bodyHtml?.indexOf("Showreel")).toBeGreaterThan(0);
  });

  it("sanitizes rich text and creates stable table-of-contents heading IDs", async () => {
    const post = await getFixturePost(STANDARD_SLUG);
    expect(post).toBeTruthy();

    const sanitized = sanitizeBlogPostHtml(
      `${post?.bodyHtml}<script>bad()</script><h3 onclick="bad()">Extra Heading</h3><a href="javascript:bad()">bad</a><a href="https://www.nexubis.io/blog">blog</a>`,
    );

    expect(sanitized.html).not.toContain("<script");
    expect(sanitized.html).not.toContain("onclick");
    expect(sanitized.html).not.toContain("javascript:");
    expect(sanitized.html).toContain('href="/blog"');
    expect(sanitized.toc.map((item) => item.id)).toContain(
      "the-early-days-hustle-hide-repeat",
    );
    expect(sanitized.toc.map((item) => item.id)).toContain("extra-heading");
  });

  it("preserves semantic list markup in sanitized rich text", async () => {
    const standard = await getFixturePost(STANDARD_SLUG);
    const lottie = await getFixturePost(LOTTIE_SLUG);

    expect(standard).toBeTruthy();
    expect(lottie).toBeTruthy();

    const standardHtml = sanitizeBlogPostHtml(standard!.bodyHtml ?? "").html;
    const lottieHtml = sanitizeBlogPostHtml(lottie!.bodyHtml ?? "").html;

    expect(standardHtml).toContain("<ul");
    expect(standardHtml).toContain("<li");
    expect(lottieHtml.match(/<ul/g)).toHaveLength(2);
    expect(lottieHtml.match(/<li/g)).toHaveLength(8);
    expect(lottieHtml).toContain("A principle-driven brand system");
  });

  it("maps metadata to the exact /post/[slug] canonical path", async () => {
    const post = await getFixturePost(STANDARD_SLUG);
    expect(post).toBeTruthy();

    const metadata = buildBlogPostMetadata(post!);
    expect(metadata.title).toBe("The Nexubis Origin Story: From White-Label Hustle to Agency Growth");
    expect(metadata.alternates?.canonical).toBe(`/post/${STANDARD_SLUG}`);
    expect(metadata.openGraph?.url).toBe(`/post/${STANDARD_SLUG}`);
  });

  it("uses the recovered related-post fixture order from Blog summaries", async () => {
    const post = await getFixturePost(LOTTIE_SLUG);
    expect(post).toBeTruthy();

    expect(getRelatedPostSummaries(post!).map((related) => related.slug)).toEqual([
      "ai-is-not-a-phase-its-an-era",
      "metamorphosis",
      "beyond-the-eu30-000",
    ]);
  });

  it("keeps the approved Blog index summary data unchanged", async () => {
    const { posts, categories, stats } = await getBlogIndexPosts(async () => []);

    expect(posts).toHaveLength(88);
    expect(posts.every((post) => post.source === "generated")).toBe(true);
    expect(stats.excludedRecords).toBe(3);
    expect(categories.map((category) => category.slug)).toEqual([
      "empowering-dreams",
      "founders-diary",
      "ai-x-nexubis",
      "startup-stack",
      "company",
      "for-professionals",
    ]);
  });

  it("keeps production Blog post loaders independent from raw Webflow exports", () => {
    const files = [
      "lib/blog/get-post-by-slug.ts",
      "app/post/[slug]/page.tsx",
      "components/blog/BlogPostTemplate.tsx",
    ];

    for (const file of files) {
      const source = readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).not.toContain("webflow-export");
      expect(source).not.toContain("readFile");
      expect(source).not.toContain("process.cwd()");
    }
  });
});
