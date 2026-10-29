import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
const git = (...args: string[]) =>
  execFileSync("git", args, { encoding: "utf8" }).trim();
it("ZERO PUBLIC CHANGES: diff --stat and all changed/untracked files stay in admin or tests", () => {
  const stat = git("diff", "origin/main", "--stat");
  expect(stat).toBeDefined();
  const paths = [
    ...git("diff", "origin/main", "--name-only").split("\n"),
    ...git("ls-files", "--others", "--exclude-standard").split("\n"),
  ].filter(Boolean);
  for (const path of paths)
    expect(path, path).toMatch(
      /^(?:app\/audit\/admin\/|components\/scorecard\/admin\/|lib\/scorecard\/admin\/)|\.test\.tsx?$/
    );
  // These exact public bytes cover the lookup, generation, orchestration,
  // stream timing, report JSON, email, Funnelr and Meta implementation.
  for (const path of [
    "lib/scorecard/offsite.ts",
    "lib/scorecard/web-search.ts",
    "lib/scorecard/generate.ts",
    "lib/scorecard/orchestrator.ts",
    "lib/scorecard/result.ts",
    "lib/scorecard/share.ts",
    "lib/scorecard/unlock.ts",
    "lib/scorecard/notify.ts",
    "lib/scorecard/lead-funnelr.ts",
    "lib/meta/capi.ts",
    "app/api/scorecard/run/route.ts",
  ]) {
    expect(git("diff", "origin/main", "--", path), path).toBe("");
  }
});
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
