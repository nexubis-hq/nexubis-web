import type { ScanRunLog } from "../diagnostics";
export const runLinkId = (run: Pick<ScanRunLog, "at" | "host">) =>
  `${run.at}|${run.host || ""}`;
