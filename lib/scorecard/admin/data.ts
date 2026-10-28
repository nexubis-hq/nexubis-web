import { readRunLinks } from "./run-links";
import { readFunnelrStatus } from "./funnelr-status";
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
  const runLinks = await readRunLinks(scanLog);
  const statusReads = [
    ...slugs.map((slug) => ({
      id: slug,
      email: "",
      reportUrl: `https://www.nexubis.io/audit/r/${slug}`,
    })),
    ...[
      ...new Set(
        [
          ...leads.map((lead) => lead.email),
          ...manual.map((lead) => lead.contactEmail),
          ...failed.map((lead) => lead.email),
        ].map((email) => email.trim().toLowerCase())
      ),
    ]
      .filter(Boolean)
      .map((email) => ({ id: `email:${email}`, email, reportUrl: undefined })),
  ];
  const statusPairs = [];
  // Bound extra status reads rather than bursting thousands of KV requests.
  for (let i = 0; i < statusReads.length; i += 40) {
    statusPairs.push(
      ...(await Promise.all(
        statusReads
          .slice(i, i + 40)
          .map(
            async (item) =>
              [
                item.id,
                await readFunnelrStatus(item.email, item.reportUrl).catch(
                  () => null
                ),
              ] as const
          )
      ))
    );
  }
  const statuses = Object.fromEntries(statusPairs);
  const now = Date.now();
  return {
    now,
    runLinks,
    ...buildLeadsView(leads, failed, manual, reports, filters, now, scanLog, {
      runLinks,
      statuses,
    }),
    leads,
    failed,
    manual,
    reports,
  };
}
