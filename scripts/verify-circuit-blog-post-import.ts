import { getCliClient } from "sanity/cli";

const API_VERSION = "2026-07-29";
const SLUG = "circuit-securing-nexubis";
const DRAFT_ID = `drafts.post-${SLUG}`;
const PUBLISHED_ID = `post-${SLUG}`;
const AUTHOR_ID = "author-hannes-oosthuizen";
const CATEGORY_ID = "category-empowering-dreams";
const WEBFLOW_IMAGE_ORIGIN = "https://cdn.prod.website-files.com";

type UnknownRecord = Record<string, unknown>;

function countWebflowImageUrls(value: unknown): number {
  if (typeof value === "string") return value.includes(WEBFLOW_IMAGE_ORIGIN) ? 1 : 0;
  if (!value || typeof value !== "object") return 0;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + countWebflowImageUrls(item), 0);
  return Object.values(value as UnknownRecord).reduce<number>(
    (sum, item) => sum + countWebflowImageUrls(item),
    0,
  );
}

function parseLottie(value: unknown) {
  if (typeof value !== "string") return false;
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const client = getCliClient({ apiVersion: API_VERSION }).withConfig({
    useCdn: false,
    perspective: "raw",
  });

  const result = await client.fetch(
    `{
      "draft": *[_id == $draftId][0]{
        _id,
        _rev,
        title,
        slug,
        excerpt,
        "excerptLength": length(excerpt),
        publishedAt,
        updatedAt,
        author->{_id, name},
        category->{_id, title},
        body,
        "bodyBlocks": count(body),
        "headings": count(body[_type == "block" && style in ["h2", "h3", "h4"]]),
        "paragraphs": count(body[_type == "block" && style == "normal" && !defined(listItem)]),
        "unorderedItems": count(body[_type == "block" && listItem == "bullet"]),
        "orderedItems": count(body[_type == "block" && listItem == "number"]),
        "accentSpans": count(body[_type == "block"].children[defined(marks) && "accent" in marks[]]),
        "strongSpans": count(body[_type == "block"].children[defined(marks) && "strong" in marks[]]),
        "thumbnailAsset": thumbnail.asset._ref,
        "ogAsset": seo.openGraphImage.asset._ref,
        "lottieThumbAsset": lottieThumbnail.asset._ref,
        "seoTitle": seo.title,
        "seoDescription": seo.description,
        lottieJson,
        showreelEnabled,
        showreelUrl
      },
      "published": *[_id == $publishedId],
      "sameSlug": *[_type == "post" && slug.current == $slug]._id,
      "authorCount": count(*[_id == $authorId]),
      "categoryCount": count(*[_id == $categoryId])
    }`,
    {
      draftId: DRAFT_ID,
      publishedId: PUBLISHED_ID,
      slug: SLUG,
      authorId: AUTHOR_ID,
      categoryId: CATEGORY_ID,
    },
  );

  const draft = result.draft;
  const assetIds = [draft?.thumbnailAsset, draft?.ogAsset, draft?.lottieThumbAsset].filter(Boolean);
  const assets = await client.fetch(
    `*[_id in $assetIds]{_id, mimeType, "width": metadata.dimensions.width, "height": metadata.dimensions.height}`,
    { assetIds },
  );

  const summary = {
    draftExists: Boolean(draft),
    draftId: draft?._id ?? null,
    publishedCount: result.published.length,
    sameSlugIds: result.sameSlug,
    authorCount: result.authorCount,
    categoryCount: result.categoryCount,
    title: draft?.title ?? null,
    slug: draft?.slug?.current ?? null,
    excerpt: draft?.excerpt ?? null,
    excerptLength: draft?.excerptLength ?? null,
    author: draft?.author ?? null,
    category: draft?.category ?? null,
    publishedAt: draft?.publishedAt ?? null,
    updatedAt: draft?.updatedAt ?? null,
    bodyBlocks: draft?.bodyBlocks ?? 0,
    headings: draft?.headings ?? 0,
    paragraphs: draft?.paragraphs ?? 0,
    unorderedItems: draft?.unorderedItems ?? 0,
    orderedItems: draft?.orderedItems ?? 0,
    accentSpans: draft?.accentSpans ?? 0,
    strongSpans: draft?.strongSpans ?? 0,
    thumbnailAsset: draft?.thumbnailAsset ?? null,
    ogAsset: draft?.ogAsset ?? null,
    lottieThumbAsset: draft?.lottieThumbAsset ?? null,
    lottieJsonValid: parseLottie(draft?.lottieJson),
    showreelEnabled: draft?.showreelEnabled ?? false,
    showreelUrl: draft?.showreelUrl ?? null,
    seoTitle: draft?.seoTitle ?? null,
    seoDescriptionPresent: Boolean(draft?.seoDescription),
    webflowImageUrlOccurrencesInDraft: countWebflowImageUrls(draft),
    assets,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
