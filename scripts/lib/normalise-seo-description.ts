const MAX_SEO_DESCRIPTION_LENGTH = 170;
const ELLIPSIS = "…";

const HTML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]+);/g, (match, entity: string) => {
    if (entity[0] === "#") {
      const isHex = entity[1]?.toLowerCase() === "x";
      const codePoint = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    return HTML_ENTITY_MAP[entity] ?? match;
  });
}

function cleanDescription(value: string) {
  return decodeHtmlEntities(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normaliseSeoDescription(value: string, maxLength = MAX_SEO_DESCRIPTION_LENGTH) {
  const cleaned = cleanDescription(value);
  if (cleaned.length <= maxLength) return cleaned;

  const available = maxLength - ELLIPSIS.length;
  const candidate = cleaned.slice(0, available + 1);
  const boundary = candidate.search(/\s+\S*$/);
  const truncated = (boundary > 0 ? candidate.slice(0, boundary) : cleaned.slice(0, available)).trim();

  return `${truncated}${ELLIPSIS}`.slice(0, maxLength);
}

export function seoDescriptionLength(value: string) {
  return normaliseSeoDescription(value).length;
}
