import { readRecentScanLog } from "../diagnostics";
import { listLeads } from "../leads";
import { listManualAudits } from "../manual/run";
import { listFailedLeads } from "./failed-leads";
import { readShared } from "../share";
import { buildLeadsView, type LeadsFilters } from "./leads-view";
export async function loadLeadsView(filters: LeadsFilters = {}) {
  const [leads, failed, manual, scanLog] = await Promise.all([
    listLeads(10000),
    listFailedLeads(),
    listManualAudits(),
    readRecentScanLog(500),
  ]);
  const slugs = [
    ...new Set([
      ...leads.map((r) => r.reportSlug),
      ...manual.map((r) => r.slug),
      ...failed.flatMap((r) => (r.linkedSlug ? [r.linkedSlug] : [])),
    ]),
  ];
  const reports = Object.fromEntries(
    await Promise.all(
      slugs.map(async (slug) => [slug, await readShared(slug)] as const)
    )
  );
  const now = Date.now();
  return {
    now,
    ...buildLeadsView(leads, failed, manual, reports, filters, now, scanLog),
    leads,
    failed,
    manual,
    reports,
  };
}
