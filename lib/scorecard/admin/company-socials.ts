export const SOCIAL_NETWORKS = [
  ["facebook", "Facebook"],
  ["instagram", "Instagram"],
  ["youtube", "YouTube"],
  ["tiktok", "TikTok"],
  ["pinterest", "Pinterest"],
  ["x", "X"],
] as const;
export interface CompanySocial {
  network: (typeof SOCIAL_NETWORKS)[number][0];
  url: string;
}
const BUILDERS = new Set(
  "wix wixcom webflow squarespace squarespaceinc wordpress wordpresscom weebly shopify framer elementor joomla drupal duda site123 webnode jimdo strikingly zyro hostinger tilda readymag odoo hubspot".split(
    " "
  )
);
export function companySocial(value: string): CompanySocial | null {
  try {
    const url = new URL(value);
    if (
      !/^https?:$/.test(url.protocol) ||
      url.username ||
      url.password ||
      url.port
    )
      return null;
    const host = url.hostname.toLowerCase().replace(/^(?:www|m)\./, "");
    const network =
      host === "facebook.com"
        ? "facebook"
        : host === "instagram.com"
          ? "instagram"
          : host === "youtube.com"
            ? "youtube"
            : host === "tiktok.com"
              ? "tiktok"
              : /^pinterest\.(?:[a-z]{2,}|(?:co|com)\.[a-z]{2})$/.test(host)
                ? "pinterest"
                : ["x.com", "twitter.com"].includes(host)
                  ? "x"
                  : null;
    const path = decodeURIComponent(url.pathname).toLowerCase();
    const segments = path.split("/").filter(Boolean);
    if (
      !network ||
      !segments.length ||
      /(?:^|\/)(?:sharer(?:\.php)?|share(?:\.php)?|intent|tweet|pin\/create)(?:\/|$)/.test(
        path
      ) ||
      [...url.searchParams.keys()].some((key) =>
        /^(?:share|sharer)$/i.test(key)
      ) ||
      segments.some((segment) => BUILDERS.has(segment.replace(/^@/, "")))
    )
      return null;
    url.hash = "";
    return { network, url: url.href };
  } catch {
    return null;
  }
}
export function selectCompanySocials(
  links: CompanySocial[],
  brand: string
): CompanySocial[] {
  const compact = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const name = compact(brand);
  return SOCIAL_NETWORKS.flatMap(([network]) => {
    const matches = links.filter((link) => link.network === network);
    const chosen =
      matches.find(
        (link) =>
          name &&
          compact(decodeURIComponent(new URL(link.url).pathname)).includes(name)
      ) || matches[0];
    return chosen ? [chosen] : [];
  });
}
export function strongestSocial(
  links: CompanySocial[]
): CompanySocial | undefined {
  return (
    links.find((link) => link.network === "facebook") ||
    links.find((link) => link.network === "instagram") ||
    links[0]
  );
}
