import { describe, expect, it } from "vitest";
import { lockBatchSelection } from "../../scripts/migrate-blog-sanity-batch";

type Manifest = Parameters<typeof lockBatchSelection>[0];

function manifest(slugs: string[], complete: string[] = []) {
  return {
    generatedAt: "2026-07-29T00:00:00.000Z",
    inventoryCount: slugs.length,
    posts: slugs.map((slug, index) => ({
      title: `Post ${index + 1}`,
      exactSlug: slug,
      originalLiveUrl: `https://www.nexubis.io/post/${slug}`,
      originalIndex: index + 1,
      status: complete.includes(slug) ? "complete" : "pending",
      batchId: complete.includes(slug) ? "previous" : null,
      sanityDraftId: null,
      sanityPublishedId: complete.includes(slug) ? `post-${slug}` : null,
      authorId: null,
      categoryId: null,
      importedAt: null,
      publishedAtInSanity: null,
      routeVerified: complete.includes(slug),
      blogCardVerified: complete.includes(slug),
      metadataVerified: complete.includes(slug),
      mediaVerified: complete.includes(slug),
      zeroWebflowVerified: complete.includes(slug),
      warningDetails: [],
      failureDetails: [],
    })),
  } satisfies Manifest;
}

function source(slugs: string[]) {
  return slugs.map((slug) => ({
    Slug: slug,
    Draft: "false",
    Archived: "false",
    Content: "<p>Body</p>",
  }));
}

describe("Blog Sanity batch retry selection", () => {
  it("returns the same selected slugs for the same batch ID", () => {
    const slugs = Array.from({ length: 12 }, (_, index) => `post-${index + 1}`);
    const data = manifest(slugs);
    const first = lockBatchSelection(data, source(slugs), new Set(), "batch-a", 10);
    data.posts.slice(0, 5).forEach((post) => {
      post.status = "complete";
      post.sanityPublishedId = `post-${post.exactSlug}`;
    });
    const retry = lockBatchSelection(data, source(slugs), new Set(slugs.slice(0, 5)), "batch-a", 10);

    expect(retry.map((post) => post.exactSlug)).toEqual(first.map((post) => post.exactSlug));
  });

  it("does not select later pending posts after partial completion", () => {
    const slugs = Array.from({ length: 14 }, (_, index) => `post-${index + 1}`);
    const data = manifest(slugs);
    lockBatchSelection(data, source(slugs), new Set(), "batch-a", 10);
    data.posts.slice(0, 3).forEach((post) => {
      post.status = "complete";
      post.sanityPublishedId = `post-${post.exactSlug}`;
    });

    const retry = lockBatchSelection(data, source(slugs), new Set(slugs.slice(0, 3)), "batch-a", 10);

    expect(retry.map((post) => post.exactSlug)).toEqual(slugs.slice(0, 10));
    expect(retry.map((post) => post.exactSlug)).not.toContain("post-11");
  });

  it("keeps a ten-post batch from spilling into the next batch", () => {
    const slugs = Array.from({ length: 20 }, (_, index) => `post-${index + 1}`);
    const data = manifest(slugs);

    const selected = lockBatchSelection(data, source(slugs), new Set(), "batch-a", 10);

    expect(selected.map((post) => post.exactSlug)).toEqual(slugs.slice(0, 10));
  });

  it("keeps the final four-post batch exactly four", () => {
    const slugs = Array.from({ length: 88 }, (_, index) => `post-${index + 1}`);
    const data = manifest(slugs, slugs.slice(0, 84));

    const selected = lockBatchSelection(data, source(slugs), new Set(slugs.slice(0, 84)), "batch-final", 10);

    expect(selected.map((post) => post.exactSlug)).toEqual(slugs.slice(84, 88));
    expect(selected).toHaveLength(4);
  });

  it("requires a new batch ID to select a different group", () => {
    const slugs = Array.from({ length: 20 }, (_, index) => `post-${index + 1}`);
    const data = manifest(slugs);
    const first = lockBatchSelection(data, source(slugs), new Set(), "batch-a", 10);
    first.forEach((post) => {
      post.status = "complete";
      post.sanityPublishedId = `post-${post.exactSlug}`;
    });

    const retry = lockBatchSelection(data, source(slugs), new Set(slugs.slice(0, 10)), "batch-a", 10);
    const next = lockBatchSelection(data, source(slugs), new Set(slugs.slice(0, 10)), "batch-b", 10);

    expect(retry.map((post) => post.exactSlug)).toEqual(slugs.slice(0, 10));
    expect(next.map((post) => post.exactSlug)).toEqual(slugs.slice(10, 20));
  });
});
