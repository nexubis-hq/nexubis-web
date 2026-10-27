export function formatSast(value: string, time = true): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Johannesburg",
    day: "numeric",
    month: "short",
    ...(time
      ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" as const }
      : {}),
  }).format(date);
}
