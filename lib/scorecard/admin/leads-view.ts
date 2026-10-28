import { normalHost, inLeadWindow } from "./hosts";
import { linkRunToLead, isReplay } from "./run-matching";
import { formatSast } from "./dates";
import { meetingSummary, type MeetingEvent } from "./meetings";
import {
  derivedRunHistory,
  reportRunCount,
  type RunHistoryEntry,
} from "./run-history";
import { runLinkId, type RunLinks } from "./run-links";
import { funnelrProblem } from "./funnelr-view";
import type { FunnelrStatus } from "./funnelr-status";
import type { ScanRunLog } from "../diagnostics";
import type { LeadRecord } from "../leads";
import type { FailedLead } from "./failed-leads";
import type { ManualAuditRecord } from "../manual/run";
import type { SharedScorecard } from "../share";
import type { QualifiedAuditDecision } from "../qualified-audit";
import { prospectScores } from "../result";
import { adLabel, type FunnelSource } from "@/lib/funnel/steps";
import { isTestContact } from "./test-contacts";
export interface LeadRow {
  id: string;
  kind: "report" | "failed" | "manual";
  firstSeen: string;
  company: string;
  host: string;
  firstName: string;
  email: string;
  status: "ready" | "failed" | "hand";
  statusReason: string;
  statusContext?: string;
  meetingBooked?: boolean;
  funnelrStatus?: FunnelrStatus | null;
  qualifiedDecision?: QualifiedAuditDecision;
  score: number | null;
  band: string | null;
  adLabel: string | null;
  source: FunnelSource;
  isTest: boolean;
  sameContacts: { company: string; leadPath: string }[];
  auditNumber: number;
  reportPath: string | null;
  leadPath: string;
}
export interface LeadsFilters {
  status?: string;
  qualified?: string;
  source?: string;
  period?: string;
  showTests?: boolean;
}
export { normalHost, inLeadWindow } from "./hosts";
const emailKey = (email: string) => email.trim().toLowerCase();
export function buildLeadsView(
  leads: LeadRecord[],
  failed: FailedLead[],
  manual: ManualAuditRecord[],
  reports: Record<string, SharedScorecard | null>,
  filters: LeadsFilters = {},
  now = Date.now(),
  scanLog: ScanRunLog[] = [],
  admin: {
    runLinks?: RunLinks;
    statuses?: Record<string, FunnelrStatus | null>;
    meetings?: Record<string, MeetingEvent[]>;
    histories?: Record<string, RunHistoryEntry[]>;
    adminRuns?: Record<string, { runCount: number; lastRunAt: string } | null>;
  } = {}
) {
  const rows: LeadRow[] = [];
  const reportRow = (
    slug: string,
    company: string,
    url: string,
    firstName: string,
    email: string,
    at: string,
    kind: "report" | "manual",
    decision?: QualifiedAuditDecision,
    ad?: LeadRecord["ad"],
    source?: FunnelSource
  ): LeadRow => {
    const shared = reports[slug];
    return {
      id: slug,
      kind,
      firstSeen: at,
      company: shared?.result.meta.company || company,
      host: normalHost(url),
      firstName,
      email,
      status: kind === "manual" ? "hand" : "ready",
      statusReason: "",
      qualifiedDecision: shared?.qualifiedDecision ?? decision,
      score: shared ? (prospectScores(shared.result)?.overall ?? null) : null,
      band: shared?.result.verdict.band ?? null,
      adLabel: adLabel(ad),
      source: source ?? (adLabel(ad) ? "ad" : "other"),
      isTest: isTestContact(email),
      sameContacts: [],
      auditNumber: 1,
      reportPath: shared ? `/audit/r/${slug}` : null,
      leadPath: `/audit/admin/${slug}`,
    };
  };
  for (const l of leads)
    rows.push(
      reportRow(
        l.reportSlug,
        l.company,
        l.url,
        l.name,
        l.email,
        l.createdAt,
        "report",
        l.qualifiedDecision,
        l.ad,
        l.source
      )
    );
  for (const m of manual)
    if (m.contactEmail.trim() && !rows.some((r) => r.id === m.slug))
      rows.push(
        reportRow(
          m.slug,
          m.companyName,
          m.url,
          m.contactName,
          m.contactEmail,
          m.createdAt,
          "manual",
          m.qualifiedDecision
        )
      );
  for (const f of failed) {
    const later = rows
      .filter(
        (r) =>
          r.kind !== "failed" &&
          emailKey(r.email) === emailKey(f.email) &&
          (r.kind === "manual" || r.firstSeen >= f.at) &&
          r.reportPath
      )
      .sort((a, b) => b.firstSeen.localeCompare(a.firstSeen))[0];
    const slug = f.linkedSlug || later?.id;
    const shared = slug ? reports[slug] : null;
    rows.push({
      id: f.id,
      kind: "failed",
      firstSeen: f.at,
      company: shared?.result.meta.company || f.host || normalHost(f.url),
      host: normalHost(f.url),
      firstName: f.firstName,
      email: f.email,
      status: slug ? "hand" : "failed",
      statusReason: f.reason || f.siteRead,
      qualifiedDecision: shared?.qualifiedDecision ?? f.qualifiedDecision,
      score: shared ? (prospectScores(shared.result)?.overall ?? null) : null,
      band: shared?.result.verdict.band ?? null,
      adLabel: adLabel(f.ad),
      source: f.source,
      isTest: isTestContact(f.email),
      sameContacts: [],
      auditNumber: 1,
      reportPath: slug ? `/audit/r/${slug}` : null,
      leadPath: `/audit/admin/failed/${f.id}`,
    });
  }
  for (const row of rows) {
    const slug = row.reportPath?.split("/").pop();
    row.funnelrStatus =
      admin.statuses?.[slug || ""] ||
      admin.statuses?.[`email:${emailKey(row.email)}`] ||
      null;
    if (!row.adLabel) {
      const linked = scanLog.find(
        (run) =>
          admin.runLinks?.[runLinkId(run)] === row.leadPath && adLabel(run.ad)
      );
      if (linked) {
        row.adLabel = adLabel(linked.ad);
        row.source = "ad";
      }
    }
  }
  const contactGroups = new Map<string, LeadRow[]>();
  for (const row of rows) {
    const key = emailKey(row.email);
    if (row.isTest || !key) continue;
    const group = contactGroups.get(key) || [];
    group.push(row);
    contactGroups.set(key, group);
  }
  for (const row of rows) {
    if (!row.adLabel && row.kind !== "manual") {
      const run = scanLog
        .filter(
          (run) =>
            (row.kind === "failed"
              ? run.outcome === "failed" || run.outcome === "timeout"
              : run.outcome === "success") &&
            normalHost(run.host || "") === row.host &&
            Boolean(row.host) &&
            inLeadWindow(run.at, row.firstSeen) &&
            adLabel(run.ad)
        )
        .sort(
          (a, b) =>
            Math.abs(Date.parse(a.at) - Date.parse(row.firstSeen)) -
            Math.abs(Date.parse(b.at) - Date.parse(row.firstSeen))
        )[0];
      if (run) {
        row.adLabel = adLabel(run.ad);
        row.source = "ad";
      }
    }
    if (!row.isTest && emailKey(row.email)) {
      const contacts = (contactGroups.get(emailKey(row.email)) || [])
        .filter(
          (other) =>
            !other.isTest &&
            emailKey(other.email) === emailKey(row.email) &&
            other.host &&
            other.host !== row.host
        )
        .sort((a, b) => a.firstSeen.localeCompare(b.firstSeen));
      row.sameContacts = [
        ...new Map(
          contacts.map((other) => [
            other.host,
            { company: other.company, leadPath: other.leadPath },
          ])
        ).values(),
      ];
    }
  }
  const groups = new Map<string, number>();
  for (const r of [...rows].sort(
    (a, b) => a.firstSeen.localeCompare(b.firstSeen) || a.id.localeCompare(b.id)
  )) {
    r.auditNumber = (groups.get(r.host) ?? 0) + 1;
    groups.set(r.host, r.auditNumber);
  }
  const runsByLead = new Map<string, ScanRunLog[]>();
  for (const run of scanLog) {
    const row = linkRunToLead(run, rows, admin.runLinks);
    if (row) {
      const group = runsByLead.get(row.leadPath) || [];
      group.push(run);
      runsByLead.set(row.leadPath, group);
    }
  }
  for (const row of rows) {
    row.meetingBooked = meetingSummary(
      admin.meetings?.[emailKey(row.email)] || []
    ).active;
    const slug = row.reportPath?.split("/").pop() || row.id;
    const report = reports[slug];
    const history =
      admin.histories?.[slug] ||
      (report
        ? derivedRunHistory(
            report,
            row.kind === "manual" ? "manual" : "visitor"
          )
        : []);
    const stored = admin.adminRuns?.[slug];
    const manualRow = manual.find((entry) => entry.slug === slug);
    const count = report
      ? reportRunCount(
          history,
          stored?.runCount || manualRow?.runCount || 1,
          report
        )
      : 1;
    const runs = (runsByLead.get(row.leadPath) || []).sort((a, b) =>
      b.at.localeCompare(a.at)
    );
    const context: string[] = [];
    if (row.status === "ready" && count > 1) {
      const last = [
        history[0]?.at,
        stored?.lastRunAt,
        report?.result.generatedAt,
      ]
        .filter((at): at is string => Boolean(at))
        .sort()
        .pop()!;
      context.push(`Re-run ${formatSast(last, true, now)} (run ${count})`);
    }
    if (row.status === "hand") {
      const savedFailure = failed.find(
        (entry) =>
          entry.linkedSlug === slug ||
          (row.kind === "failed" && entry.id === row.id)
      );
      const failedRun =
        runs.find(
          (run) => run.outcome === "failed" || run.outcome === "timeout"
        ) ||
        (savedFailure
          ? {
              at: savedFailure.at,
              reason: savedFailure.reason,
              siteRead: savedFailure.siteRead,
            }
          : undefined);
      if (failedRun)
        context.push(
          `Scan failed ${formatSast(failedRun.at, true, now)}: ${failedRun.reason || failedRun.siteRead || "site could not be read"}. Made by hand ${formatSast(report?.createdAt || row.firstSeen, true, now)}.`
        );
    }
    const replay = runs.find(isReplay);
    if (replay) context.push(`Came back ${formatSast(replay.at, true, now)}`);
    row.statusContext = context.join(" ");
  }
  rows.sort((a, b) => b.firstSeen.localeCompare(a.firstSeen));
  const period =
    filters.period === "all" ? "all" : filters.period === "7" ? "7" : "30";
  const periodRows = rows.filter(
    (r) =>
      period === "all" ||
      Date.parse(r.firstSeen) >= now - Number(period) * 86400000
  );
  const real = periodRows.filter((r) => !r.isTest);
  const summary = {
    newCompanies: new Set(real.map((r) => r.host).filter(Boolean)).size,
    qualified: real.filter((r) => r.qualifiedDecision?.qualified).length,
    needsAction: real.filter((r) => r.status === "failed" && !r.reportPath)
      .length,
    fromAd: real.filter((r) => r.source === "ad").length,
    total: real.length,
  };
  return {
    allRows: rows,
    period,
    summary,
    testCount: periodRows.filter((r) => r.isTest).length,
    rows: periodRows.filter(
      (r) =>
        (filters.showTests || !r.isTest) &&
        (!filters.status ||
          filters.status === "all" ||
          (filters.status === "action"
            ? r.status === "failed" && !r.reportPath
            : filters.status === "funnelr"
              ? funnelrProblem(r.funnelrStatus)
              : filters.status === "meeting"
                ? Boolean(r.meetingBooked)
                : r.status === filters.status)) &&
        (!filters.qualified ||
          filters.qualified === "any" ||
          (filters.qualified === "yes"
            ? r.qualifiedDecision?.qualified === true
            : r.qualifiedDecision?.qualified === false)) &&
        (!filters.source ||
          filters.source === "any" ||
          r.source === filters.source)
    ),
  };
}
export function ordinal(n: number): string {
  return `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th"}`;
}
