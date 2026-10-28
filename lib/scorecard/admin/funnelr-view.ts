import type { FunnelrAttempt } from "./funnelr-status";
export function funnelrStatusText(status?: FunnelrAttempt | null): string {
  if (!status) return "Not checked yet";
  if (status.state === "ok") return "In Funnelr";
  if (status.state === "other-report") return "In Funnelr with another report";
  if (status.state === "missing") return "Not in Funnelr";
  if (status.state === "partial")
    return `Partly in Funnelr: ${(status.missing || []).join(", ")}`;
  return `Send failed: ${status.error || "request failed"}`;
}
export function funnelrTimelineText(attempt: FunnelrAttempt): string {
  const label = {
    browser: "Sent to Funnelr by the visitor's browser",
    "admin-check": "Check",
    "admin-retry": "Retry by admin",
    "admin-send": "Send by admin",
  }[attempt.by];
  const result =
    attempt.state === "other-report"
      ? "in Funnelr with another report"
      : attempt.state === "ok"
        ? "ok"
        : attempt.state === "partial"
          ? `partly in Funnelr, ${(attempt.missing || []).join(", ")} missing`
          : attempt.state === "missing"
            ? "not in Funnelr"
            : `failed, ${attempt.error || "request failed"}`;
  return `${label}: ${result}`;
}
export function funnelrProblem(status?: FunnelrAttempt | null): boolean {
  return Boolean(
    status && ["failed", "partial", "missing"].includes(status.state)
  );
}
