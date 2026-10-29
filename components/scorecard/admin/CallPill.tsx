import type { meetingSummary } from "@/lib/scorecard/admin/meetings";

export function CallPill({
  meeting,
  now,
}: {
  meeting: ReturnType<typeof meetingSummary>;
  now: number;
}) {
  const callUpcoming =
    meeting.active && Date.parse(meeting.current!.startTime) > now;
  const callDate = meeting.active
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Johannesburg",
        day: "numeric",
        month: "short",
        ...(callUpcoming
          ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" as const }
          : {}),
      })
        .format(new Date(meeting.current!.startTime))
        .replace(",", "")
    : "";
  const callLabel = meeting.active
    ? `${callUpcoming ? "Call booked" : "Call was"} ${callDate}`
    : "Call not booked";
  return (
    <span
      className={`sc-admin-chip${callUpcoming ? " sc-admin-chip-yes" : meeting.active ? " sc-admin-status-hand" : ""}`}
    >
      {callLabel}
    </span>
  );
}
