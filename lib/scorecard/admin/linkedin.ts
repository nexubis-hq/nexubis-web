import type { SharedScorecard } from "../share";
export function linkedinUrl(
  value: string,
  kind: "in" | "company"
): string | null {
  if (!value.trim()) return null;
  try {
    const url = new URL(
      /^https?:\/\//i.test(value.trim())
        ? value.trim()
        : `https://${value.trim()}`
    );
    if (
      !/^([a-z]{2,3}\.)?linkedin\.com$/i.test(url.hostname) ||
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.port
    )
      return null;
    const match = url.pathname.match(new RegExp(`^/${kind}/([^/]+)(?:/|$)`));
    return match ? `https://www.linkedin.com/${kind}/${match[1]}/` : null;
  } catch {
    return null;
  }
}
export const linkedinPeopleSearch = (name: string, company: string) =>
  `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${name} ${company}`.trim())}`;
export function storedCompanyLinkedin(
  shared: SharedScorecard | null | undefined,
  company: string,
  prospect = false
): string | null {
  if (!shared) return null;
  const result = shared.result;
  const scopes: unknown[] = [
    result.scores.filter((score) =>
      prospect ? score.isProspect : score.company === company
    ),
    result.exhibits?.filter((exhibit) => exhibit.company === company),
  ];
  if (prospect) {
    scopes.push(
      Object.fromEntries(
        Object.entries(result.meta).filter(([key]) => key !== "competitors")
      )
    );
  } else
    scopes.push(
      result.meta.competitors.filter((other) => other.name === company)
    );
  for (const scope of scopes) {
    const urls =
      JSON.stringify(scope)?.match(
        /https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/company\/[^\s"<>\\)]+/gi
      ) || [];
    for (const url of urls) {
      const normalized = linkedinUrl(url.replace(/[.,;]+$/, ""), "company");
      if (normalized) return normalized;
    }
  }
  return null;
}
export function websiteUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`
    );
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
