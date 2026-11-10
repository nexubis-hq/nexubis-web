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

function shortDay(at: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Johannesburg",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(at));
}

/** One plain sentence for Laine: what the automated emails are doing and what he should do. */
export function sequenceNextStep(status: SequenceStatus | null): string {
  if (!status) return "The email system can't be reached right now. Press Check sequence in a few minutes.";
  if (status.suppressed) return "This address is blocked (unsubscribed, bounced or marked as spam). Don't email them.";
  switch (status.stopReason) {
    case "replied":
      return "They replied. Answer them from your inbox. Automated emails have stopped.";
    case "booked":
      return "They booked a call. Automated emails have stopped.";
    case "contact_form":
      return "They sent a message through the contact form. Answer it. Automated emails have stopped.";
    case "admin":
      return "Automated emails were stopped by hand. Follow up yourself if it makes sense.";
    case "unsubscribed":
    case "bounced":
    case "complained":
    case "suppressed":
      return "Don't email them. They unsubscribed, bounced or marked an email as spam.";
  }
  if (status.stopReason) return "Automated emails have stopped.";
  const current = status.found ? currentEnrolment(status) : undefined;
  if (!current) return "Not getting automated emails. Start the sequence below, or follow up by hand.";
  if (current.status === "running_in_funnelr")
    return "Funnelr is sending their last emails. Waiting for a reply or a booking.";
  if (current.status === "active")
    return current.nextDueAt
      ? `Automated emails running, next one on ${shortDay(current.nextDueAt)}. Waiting for a reply or a booking.`
      : "Automated emails running. Waiting for a reply or a booking.";
  if (current.status === "failed") return "An email failed to send. Press Check sequence. If it stays failed, tell Shannah.";
  return "All automated emails sent, no reply yet. A personal follow-up could help.";
}
