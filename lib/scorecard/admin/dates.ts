const formatters = new Map<string, Intl.DateTimeFormat>();
export function formatSast(
  value: string,
  time = true,
  now = Date.now(),
  alwaysYear = false
): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Not recorded";
  const sastYear = (at: number) => new Date(at + 7200000).getUTCFullYear();
  const year = alwaysYear || sastYear(date.getTime()) !== sastYear(now);
  const key = `${time}:${year}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Johannesburg",
      day: "numeric",
      month: "short",
      ...(year ? { year: "numeric" } : {}),
      ...(time ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" } : {}),
    });
    formatters.set(key, formatter);
  }
  return formatter.format(date);
}
