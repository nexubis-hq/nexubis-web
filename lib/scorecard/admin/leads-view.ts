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
  qualifiedDecision?: QualifiedAuditDecision;
  score: number | null;
  band: string | null;
  adLabel: string | null;
  source: FunnelSource;
  isTest: boolean;
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
export function normalHost(url: string): string {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname
      .toLowerCase()
      .replace(/^www\./, "");
  } catch {
    return "";
  }
}
const emailKey = (email: string) => email.trim().toLowerCase();
export function buildLeadsView(
  leads: LeadRecord[],
  failed: FailedLead[],
  manual: ManualAuditRecord[],
  reports: Record<string, SharedScorecard | null>,
  filters: LeadsFilters = {},
  now = Date.now()
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
      auditNumber: 1,
      reportPath: slug ? `/audit/r/${slug}` : null,
      leadPath: `/audit/admin/failed/${f.id}`,
    });
  }
  const groups = new Map<string, number>();
  for (const r of [...rows].sort(
    (a, b) => a.firstSeen.localeCompare(b.firstSeen) || a.id.localeCompare(b.id)
  )) {
    r.auditNumber = (groups.get(r.host) ?? 0) + 1;
    groups.set(r.host, r.auditNumber);
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
