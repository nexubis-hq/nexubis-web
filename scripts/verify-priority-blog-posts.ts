import { getCliClient } from "sanity/cli";

const API_VERSION = "2026-07-29";
const PRIORITY_SLUGS = [
  "circuit-securing-nexubis",
  "oxipack-empowering-nexubis",
  "altify-empowering-nexubis",
  "rethinking-the-nexubis-trial",
] as const;

function containsWebflowUrl(value: unknown): boolean {
  if (typeof value === "string") {
    return value.includes("cdn.prod.website-files.com") || value.includes("webflow.com");
  }

  if (!value || typeof value !== "object") return false;

  if (Array.isArray(value)) return value.some(containsWebflowUrl);

  return Object.values(value as Record<string, unknown>).some(containsWebflowUrl);
}

async function main() {
  const client = getCliClient({ apiVersion: API_VERSION }).withConfig({
    useCdn: false,
    perspective: "raw",
  });
  const draftIds = PRIORITY_SLUGS.map((slug) => `drafts.post-${slug}`);

  const result = await client.fetch(
    `{
      "drafts": *[_id in $draftIds] | order(slug.current asc) {
        _id,
        title,
        "slug": slug.current,
        "author": author->{_id, name},
        "category": category->{_id, title},
        publishedAt,
        updatedAt,
        "excerptLength": length(excerpt),
        "seoDescriptionLength": length(seo.description),
        "bodyBlocks": count(body),
        "headingCount": count(body[_type == "block" && style in ["h2", "h3", "h4"]]),
        "paragraphCount": count(body[_type == "block" && style == "normal" && !defined(listItem)]),
        "unorderedListItems": count(body[_type == "block" && listItem == "bullet"]),
        "orderedListItems": count(body[_type == "block" && listItem == "number"]),
        "linkCount": count(body[_type == "block"].markDefs[_type == "link"]),
        "accentSpanCount": count(body[_type == "block"].children["accent" in marks[]]),
        "thumbnailAsset": thumbnail.asset->_id,
        "ogAsset": seo.openGraphImage.asset->_id,
        "lottieThumbAsset": lottieThumbnail.asset->_id,
        "hasLottieJson": defined(lottieJson),
        showreelEnabled,
        showreelUrl,
        body,
        seo,
        thumbnail,
        lottieThumbnail
      },
      "publishedPriorityPosts": *[
        _type == "post" &&
        !(_id in path("drafts.**")) &&
        slug.current in $slugs
      ]{_id, title, "slug": slug.current},
      "authors": *[_type == "author" && name in ["Hannes Oosthuizen"]]{_id, name},
      "categories": *[_type == "category" && title in ["Empowering Dreams", "Company"]]{_id, title}
    }`,
    { draftIds, slugs: PRIORITY_SLUGS },
  );

  const drafts = result.drafts as Array<Record<string, unknown>>;
  const verification = {
    expectedDraftIds: draftIds,
    draftCount: drafts.length,
    publishedPriorityPostCount: result.publishedPriorityPosts.length,
    authorCount: result.authors.length,
    categoryCount: result.categories.length,
    drafts: drafts.map((draft) => ({
      _id: draft._id,
      title: draft.title,
      slug: draft.slug,
      author: draft.author,
      category: draft.category,
      publishedAt: draft.publishedAt,
      updatedAt: draft.updatedAt,
      excerptLength: draft.excerptLength,
      seoDescriptionLength: draft.seoDescriptionLength,
      bodyBlocks: draft.bodyBlocks,
      headingCount: draft.headingCount,
      paragraphCount: draft.paragraphCount,
      unorderedListItems: draft.unorderedListItems,
      orderedListItems: draft.orderedListItems,
      linkCount: draft.linkCount,
      accentSpanCount: draft.accentSpanCount,
      thumbnailAsset: draft.thumbnailAsset,
      ogAsset: draft.ogAsset,
      lottieThumbAsset: draft.lottieThumbAsset,
      hasLottieJson: draft.hasLottieJson,
      showreelEnabled: draft.showreelEnabled,
      showreelUrl: draft.showreelUrl,
      containsWebflowImageUrl: containsWebflowUrl({
        body: draft.body,
        seo: draft.seo,
        thumbnail: draft.thumbnail,
        lottieThumbnail: draft.lottieThumbnail,
      }),
    })),
  };

  console.log(JSON.stringify(verification, null, 2));

  if (verification.draftCount !== PRIORITY_SLUGS.length) {
    throw new Error(`Expected ${PRIORITY_SLUGS.length} priority drafts, found ${verification.draftCount}.`);
  }

  if (verification.publishedPriorityPostCount !== 0) {
    throw new Error(`Expected 0 published priority posts, found ${verification.publishedPriorityPostCount}.`);
  }

  const invalid = verification.drafts.filter(
    (draft) =>
      Number(draft.excerptLength) > 300 ||
      Number(draft.seoDescriptionLength) > 170 ||
      draft.containsWebflowImageUrl ||
      !draft.thumbnailAsset ||
      !draft.ogAsset,
  );

  if (invalid.length) {
    throw new Error(`Priority draft verification failed for: ${invalid.map((draft) => draft.slug).join(", ")}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
