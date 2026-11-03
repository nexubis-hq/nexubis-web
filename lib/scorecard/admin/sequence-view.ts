import type { SequenceEnrolment, SequenceStatus } from "@/lib/sequences/client";

const STOPS: Record<string, string> = {
  booked: "Stopped: booked a call",
  replied: "Stopped: replied",
  contact_form: "Stopped: sent a contact form",
  admin: "Stopped by hand",
  unsubscribed: "Stopped: unsubscribed",
  bounced: "Stopped: email bounced",
  complained: "Stopped: marked as spam",
  suppressed: "Stopped: address is blocked",
};

export function currentEnrolment(status: SequenceStatus): SequenceEnrolment | undefined {
  const list = status.enrolments;
  return (
    list.find((e) => e.status === "active" || e.status === "running_in_funnelr") ??
    list[list.length - 1]
  );
}

export function sequenceHeadline(status: SequenceStatus | null): string {
  if (!status) return "Sequence app not reachable";
  if (status.suppressed) return "Blocked: never emailed";
  if (status.stopReason) return STOPS[status.stopReason] ?? "Stopped";
  if (!status.found) return "Not in a sequence";
  if (status.nurturePending) return "Finished. Waiting for the nurture release";
  const current = currentEnrolment(status);
  if (!current) return "Not in a sequence";
  const progress = `${current.sequence}, ${current.step} of ${current.totalSteps} sent`;
  if (current.status === "running_in_funnelr") return `Finishing in Funnelr: ${current.sequence}`;
  if (current.status === "active") return `Running: ${progress}`;
  if (current.status === "failed") return `Send failed: ${progress}`;
  return `Finished: ${progress}`;
}

export function canStop(status: SequenceStatus | null): boolean {
  return Boolean(status?.found && !status.stopReason && !status.suppressed);
}

export function canStart(status: SequenceStatus | null): boolean {
  return Boolean(
    status &&
      !status.suppressed &&
      !status.stopReason &&
      !status.enrolments.some((e) => e.group === "sales"),
  );
}
