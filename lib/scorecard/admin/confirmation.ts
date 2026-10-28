export function confirmKeyword(url: string): string {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname
      .toLowerCase()
      .replace(/^www\./, "")
      .split(".")[0];
  } catch {
    return "";
  }
}
export function confirmationMatches(url: string, typed: unknown): boolean {
  const keyword = confirmKeyword(url);
  return Boolean(
    keyword &&
    typeof typed === "string" &&
    typed.trim().toLowerCase() === keyword
  );
}
