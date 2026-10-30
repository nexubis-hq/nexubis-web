import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
const git = (...args: string[]) =>
  execFileSync("git", args, { encoding: "utf8" }).trim();
it("keeps both typed confirmation implementations byte-identical", () => {
  for (const path of [
    "components/scorecard/admin/RerunAuditForm.tsx",
    "components/scorecard/admin/FunnelrControls.tsx",
    "lib/scorecard/admin/confirmation.ts",
  ])
    expect(git("diff", "origin/main", "--", path), path).toBe("");
});
it("new admin UI contains no em dash characters", () => {
  for (const path of [
    "components/scorecard/admin/LeadDetail.tsx",
    "components/scorecard/admin/LinkedinForm.tsx",
    "components/scorecard/admin/ActivityFilters.tsx",
    "app/audit/admin/scans/page.tsx",
    "lib/scorecard/admin/follow-up.ts",
  ])
    expect(readFileSync(path, "utf8"), path).not.toContain(
      String.fromCharCode(0x2014)
    );
});
