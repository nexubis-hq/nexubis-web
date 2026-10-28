import { cache } from "react";
import { getKv } from "../kv";
import { readRunLinks } from "./run-links";
import { readFunnelrStatus } from "./funnelr-status";
import { readMeetings } from "./meetings";
import type { RunHistoryEntry } from "./run-history";
import { readRecentScanLog } from "../diagnostics";
import { listLeads } from "../leads";
import { listManualAudits } from "../manual/run";
import { listFailedLeads } from "./failed-leads";
import { readShared } from "../share";
import { buildLeadsView, type LeadsFilters } from "./leads-view";

async function batches<T, R>(
  items: T[],
  read: (item: T) => Promise<R>
): Promise<R[]> {
  const result: R[] = [];
  for (let i = 0; i < items.length; i += 40)
    result.push(...(await Promise.all(items.slice(i, i + 40).map(read))));
  return result;
}
// Request-scoped only: navigation and actions always receive fresh stored data.
const loadAdminData = cache(async () => {
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
  const emails = [
    ...new Set(
      [
        ...leads.map((r) => r.email),
        ...manual.map((r) => r.contactEmail),
        ...failed.map((r) => r.email),
      ].map((email) => email.trim().toLowerCase())
    ),
  ].filter(Boolean);
  const statusReads = [
    ...slugs.map((slug) => ({
      id: slug,
      email: "",
      reportUrl: `https://www.nexubis.io/audit/r/${slug}`,
    })),
    ...emails.map((email) => ({
      id: `email:${email}`,
      email,
      reportUrl: undefined,
    })),
  ];
  const kv = getKv();
  const [reportPairs, runLinks, statusPairs, meetingPairs, runPairs] =
    await Promise.all([
      batches(slugs, async (slug) => [slug, await readShared(slug)] as const),
      readRunLinks(scanLog),
      batches(
        statusReads,
        async (item) =>
          [
            item.id,
            await readFunnelrStatus(item.email, item.reportUrl).catch(
              () => null
            ),
          ] as const
      ),
      batches(
        emails,
        async (email) =>
          [email, await readMeetings(email).catch(() => [])] as const
      ),
      batches(slugs, async (slug) => {
        const [history, summary] = await Promise.all([
          kv.lrange<RunHistoryEntry>(`scorecard-run-history:${slug}`, 0, 49),
          kv.get<{ runCount: number; lastRunAt: string }>(
            `scorecard-admin-run:${slug}`
          ),
        ]);
        return [slug, history, summary] as const;
      }),
    ]);
  return {
    now: Date.now(),
    leads,
    failed,
    manual,
    scanLog,
    runLinks,
    reports: Object.fromEntries(reportPairs),
    statuses: Object.fromEntries(statusPairs),
    meetings: Object.fromEntries(meetingPairs),
    histories: Object.fromEntries(
      runPairs.map(([slug, history]) => [slug, history])
    ),
    adminRuns: Object.fromEntries(
      runPairs.map(([slug, , summary]) => [slug, summary])
    ),
  };
});
export async function loadLeadsView(filters: LeadsFilters = {}) {
  const data = await loadAdminData();
  return {
    ...data,
    ...buildLeadsView(
      data.leads,
      data.failed,
      data.manual,
      data.reports,
      filters,
      data.now,
      data.scanLog,
      data
    ),
  };
}
