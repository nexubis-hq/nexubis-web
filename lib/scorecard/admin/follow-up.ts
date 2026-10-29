import type { MeetingEvent } from "./meetings";
export function shortSast(at: string, time = false): string {
  const date = new Date(at);
  const day = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Johannesburg",
    day: "numeric",
    month: "short",
  }).format(date);
  return time
    ? `${day} ${new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date)}`
    : day;
}
export function firstSeenLine(
  company: string,
  at: string,
  now = Date.now()
): string {
  const day = (value: number) => Math.floor((value + 2 * 3600000) / 86400000);
  const days = Math.max(0, day(now) - day(Date.parse(at)));
  return `${company}  first seen ${shortSast(at)} (${days === 0 ? "today" : `${days} ${days === 1 ? "day" : "days"} ago`})`;
}
export function nextStep(
  name: string,
  inFunnelr: boolean,
  meeting?: MeetingEvent,
  now = Date.now()
): string {
  if (meeting && meeting.event !== "cancelled")
    return Date.parse(meeting.startTime) >= now
      ? `Meeting on ${shortSast(meeting.startTime, true)}. Look at LinkedIn and the report before the call.`
      : `Meeting was on ${shortSast(meeting.startTime)}. Add a note on how it went.`;
  return inFunnelr
    ? "Funnelr sequence running. Waiting for a reply or a booking."
    : `Send ${name || "contact"} to Funnelr (Email 1 re-sends the report link).`;
}
