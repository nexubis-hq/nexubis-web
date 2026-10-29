import type { SharedScorecard } from "../share";
export function linkedinUrl(
  value: string,
  kind: "in" | "company"
): string | null {
  if (!value.trim()) return null;
  try {
    const input = /^https?:\/\//i.test(value.trim())
      ? value.trim()
      : `https://${value.trim()}`;
    const url = new URL(input);
    const authority = input.match(/^https?:\/\/([^/?#]*)/i)?.[1] || "";
    if (
      !/^(?:(?:www|[a-z]{2})\.)?linkedin\.com$/i.test(url.hostname) ||
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.port ||
      authority.includes(":")
    )
      return null;
    const match = url.pathname.match(new RegExp(`^/${kind}/([^/]+)(?:/|$)`));
    return match ? `https://www.linkedin.com/${kind}/${match[1]}/` : null;
  } catch {
    return null;
  }
}
export const linkedinPeopleSearch = (name: string, company: string) =>
  `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(personSearchWords(name, company))}`;
export function personSearchWords(name: string, company: string): string {
  return [
    ...new Map(
      `${name} ${company}`
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => [word.toLowerCase(), word])
    ).values(),
  ].join(" ");
}
export const linkedinCompanySearch = (company: string) =>
  `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(company)}`;
export function leadBrand(
  company: string,
  firstName: string,
  website: string
): string {
  if (
    company.trim() &&
    company.trim().toLowerCase() !==
      firstName.trim().split(/\s+/)[0].toLowerCase()
  )
    return company.trim();
  const host = websiteUrl(website);
  const brand = host
    ? new URL(host).hostname.replace(/^www\./i, "").split(".")[0]
    : "";
  return brand ? brand[0].toUpperCase() + brand.slice(1) : "";
}
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
