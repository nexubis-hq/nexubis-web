import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { BlogRichText } from "@/components/blog/BlogRichText";
import { getPostBySlug } from "@/lib/blog/get-post-by-slug";
import { collectPortableTextHeadings } from "@/lib/blog/heading-ids";
import { mapSanityPostToBlogPost } from "@/lib/blog/sanity-post-mapper";
import type { SanityPostDocument } from "@/lib/blog/sanity-types";

process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = "tu3u3e8c";
process.env.NEXT_PUBLIC_SANITY_DATASET = "production";

const portableTextBody = [
  {
    _type: "block",
    _key: "h1",
    style: "h3",
    children: [{ _type: "span", _key: "s1", text: "What Circuit Actually Does" }],
    markDefs: [],
  },
  {
    _type: "block",
    _key: "p1",
    style: "normal",
    children: [
      { _type: "span", _key: "s2", text: "Recovery ", marks: ["accent"] },
      { _type: "span", _key: "s3", text: "works." },
    ],
    markDefs: [],
  },
  {
    _type: "block",
    _key: "li1",
    style: "normal",
    listItem: "bullet",
    level: 1,
    children: [{ _type: "span", _key: "s4", text: "Semantic bullet" }],
    markDefs: [],
  },
];

function sanityPost(overrides: Partial<SanityPostDocument> = {}): SanityPostDocument {
  return {
    _id: "post-circuit-securing-nexubis",
    title: "Published Sanity Circuit",
    slug: "circuit-securing-nexubis",
    excerpt: "Published Sanity excerpt",
    publishedAt: "2025-11-06T10:44:45.000Z",
    updatedAt: "2025-11-06T10:44:09.000Z",
    featured: true,
    author: { name: "Hannes Oosthuizen", slug: "hannes-oosthuizen" },
    category: {
      title: "Empowering Dreams",
      slug: "empowering-dreams",
      icon: { asset: { _ref: "image-abcdefabcdefabcdefabcdefabcdefabcdefabcd-24x24-svg" } },
    },
    body: portableTextBody,
    thumbnail: { asset: { _ref: "image-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-1920x1080-png" }, alt: "Thumbnail alt" },
    heroImage: null,
    lottieThumbnail: { asset: { _ref: "image-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb-1920x1080-png" }, alt: "Lottie alt" },
    lottieJson: JSON.stringify({ v: "5.9.0", layers: [] }),
    showreelEnabled: true,
    showreelUrl: "https://youtu.be/WKUUu8J0xYg",
    seo: {
      title: "Sanity SEO title",
      description: "Sanity SEO description",
      openGraphImage: { asset: { _ref: "image-cccccccccccccccccccccccccccccccccccccccc-1920x1080-png" }, alt: "OG alt" },
      canonicalOverride: null,
    },
    ...overrides,
  };
}

describe("Sanity Blog post lookup", () => {
  it("uses a published Sanity record for the slug", async () => {
    const post = await getPostBySlug("circuit-securing-nexubis", async () => sanityPost());

    expect(post?.source).toBe("sanity");
    expect(post?.title).toBe("Published Sanity Circuit");
  });

  it("returns null when no published Sanity post exists", async () => {
    const post = await getPostBySlug("circuit-securing-nexubis", async () => null);

    expect(post).toBeNull();
  });

  it("does not expose draft-only query misses through a fixture fallback", async () => {
    const post = await getPostBySlug("circuit-securing-nexubis", async () => null);

    expect(post).toBeNull();
  });

  it("returns null for an unknown slug", async () => {
    await expect(getPostBySlug("unknown-slug", async () => null)).resolves.toBeNull();
  });

  it("maps Sanity media, Lottie, and showreel fields into BlogPost", () => {
    const post = mapSanityPostToBlogPost(sanityPost());

    expect(post.thumbnail).toContain("cdn.sanity.io");
    expect(post.ogImage).toContain("cdn.sanity.io");
    expect(post.lottieThumbnail).toContain("cdn.sanity.io");
    expect(post.lottieJson).toEqual({ v: "5.9.0", layers: [] });
    expect(post.showreelEnabled).toBe(true);
    expect(post.showreelUrl).toBe("https://youtu.be/WKUUu8J0xYg");
    expect(post.thumbnail).not.toContain("webflow");
  });

  it("generates Portable Text heading IDs for TOC integration", () => {
    expect(collectPortableTextHeadings(portableTextBody)).toEqual([
      {
        id: "what-circuit-actually-does",
        text: "What Circuit Actually Does",
        level: 3,
      },
    ]);
  });

  it("renders semantic lists and accent marks from Portable Text", () => {
    const html = renderToStaticMarkup(createElement(BlogRichText, { portableText: portableTextBody }));

    expect(html).toContain("<ul>");
    expect(html).toContain("<li>Semantic bullet</li>");
    expect(html).toContain("accentText");
    expect(html).toContain('id="what-circuit-actually-does"');
  });
});
