import { getKv } from "../kv";
import { formatSast } from "./dates";
export interface MeetingEvent {
  event: "created" | "rescheduled" | "cancelled";
  startTime: string;
  bookedAt: string;
  uid: string;
  attendeeName: string;
}
export const meetingKey = (email: string) =>
  `scorecard-meeting:${email.trim().toLowerCase()}`;
export async function recordMeeting(
  email: string,
  entry: MeetingEvent
): Promise<void> {
  const kv = getKv();
  const key = meetingKey(email);
  const previous = await kv.lrange<MeetingEvent>(key, 0, 19);
  if (
    previous.some(
      (item) =>
        item.uid === entry.uid &&
        item.event === entry.event &&
        item.startTime === entry.startTime
    )
  )
    return;
  await kv.lpush(key, entry);
  await kv.ltrim(key, 0, 19);
  await kv.expire(key, 400 * 86400);
}
export async function readMeetings(email: string): Promise<MeetingEvent[]> {
  return email.trim()
    ? getKv().lrange<MeetingEvent>(meetingKey(email), 0, 19)
    : [];
}
export function meetingSummary(events: MeetingEvent[]) {
  const latest = new Map<string, MeetingEvent>();
  for (const entry of [...events].sort((a, b) =>
    b.bookedAt.localeCompare(a.bookedAt)
  ))
    if (!latest.has(entry.uid)) latest.set(entry.uid, entry);
  const current =
    [...latest.values()].find((entry) => entry.event !== "cancelled") ||
    [...latest.values()][0];
  return { current, active: Boolean(current && current.event !== "cancelled") };
}
export function meetingText(entry?: MeetingEvent, now = Date.now()): string {
  if (!entry) return "No meeting booked yet";
  if (entry.event === "cancelled") return "Cancelled";
  return `${entry.event === "rescheduled" ? "Rescheduled to" : "Booked via cal.com for"} ${formatSast(entry.startTime, true, now)} SAST`;
}
