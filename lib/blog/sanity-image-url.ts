type SanityImageRef = {
  asset?: {
    _ref?: string;
  } | null;
};

function parseImageAssetRef(ref: string) {
  const match = ref.match(/^image-([a-f0-9]+)-(\d+x\d+)-([a-z0-9]+)$/i);
  if (!match) return null;

  return {
    assetId: match[1],
    dimensions: match[2],
    extension: match[3],
  };
}

export function sanityImageUrl(source: SanityImageRef | null | undefined) {
  const ref = source?.asset?._ref;
  if (!ref) return null;

  const parsed = parseImageAssetRef(ref);
  if (!parsed) return null;

  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;

  if (!projectId || !dataset) {
    throw new Error(
      "Missing required Sanity environment variables for image URL generation: NEXT_PUBLIC_SANITY_PROJECT_ID and NEXT_PUBLIC_SANITY_DATASET.",
    );
  }

  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${parsed.assetId}-${parsed.dimensions}.${parsed.extension}?auto=format&q=90`;
}
