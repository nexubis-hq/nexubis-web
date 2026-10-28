import { appendRunHistory } from "../admin/run-history";
import { randomUUID } from "node:crypto";
import { validateUrl } from "../fetch-site";
import { detectProductContext, pickCompetitorsFromSearch } from "../anthropic";
import {
  applyDetection,
  fingerprintFromDetect,
  filterRescuedCompetitors,
  type DetectionResult,
} from "../detect";
import { resolveCompetitors } from "../competitors";
import {
  qualifiedAuditDecision,
  type QualifiedAuditDecision,
} from "../qualified-audit";
import { searchWeb, formatSearchBlock, hostFromUrl } from "../web-search";
import { deriveCompanyFromUrl, MIN_COMPETITORS } from "../run";
import { generateScorecardUncached } from "../generate";
import { prospectScores } from "../result";
import {
  writeShared,
  uniqueSlug,
  patchShared,
  readShared,
  SHARE_TTL_S,
  type SharedScorecard,
} from "../share";
import { getKv } from "../kv";
import { withCallEnvelope } from "../call-cache";
import type { CompetitorRef, ProspectData } from "../types";
import {
  cleanPastedText,
  parseCompetitors,
  pastedSiteTitle,
  ManualAuditError,
} from "./paste";
import { gatherManualEvidence } from "./evidence";

export interface ManualAuditInput {
  url: string;
  companyName?: string;
  pasteRaw: string;
  competitorsRaw?: string;
  contactName?: string;
  contactEmail?: string;
}
export interface ManualAuditRecord {
  source?: "paste" | "crawl";
  slug: string;
  url: string;
  companyName: string;
  pastedText: string;
  competitors: CompetitorRef[];
  contactName: string;
  contactEmail: string;
  qualifiedDecision: QualifiedAuditDecision;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  runCount: number;
}
const INDEX_KEY = "scorecard-manual-audits";
const manualKey = (slug: string) => `scorecard-manual:${slug}`;
const DEADLINE_MS = 270_000;

export async function readManualAudit(
  slug: string
): Promise<ManualAuditRecord | null> {
  return getKv().get<ManualAuditRecord>(manualKey(slug));
}
export async function listManualAudits(): Promise<ManualAuditRecord[]> {
  const slugs = await getKv().lrange<string>(INDEX_KEY, 0, 199);
  const records = await Promise.all([...new Set(slugs)].map(readManualAudit));
  return records.filter(
    (record): record is ManualAuditRecord => record !== null
  );
}

async function detectFromPaste(
  prospect: ProspectData,
  pastedText: string,
  typed: string[]
): Promise<DetectionResult> {
  const detect = await detectProductContext({
    company: prospect.company,
    url: prospect.url,
    siteText: pastedText,
    siteTitle: pastedSiteTitle(pastedText),
  });
  if (!detect.ok)
    return {
      companyName: "",
      productOneLiner: "",
      competitors: typed,
      industryFit: "unclear",
      fingerprint: null,
      flags: [
        `Auto-detect of product and competitors failed (${detect.reason})`,
      ],
    };
  const companyName = (detect.data.companyName ?? "").trim().slice(0, 60);
  const productOneLiner = detect.data.productOneLiner.trim();
  let competitors = typed.length
    ? typed
    : detect.data.competitors
        .map((c) => c.trim())
        .filter(Boolean)
        .slice(0, 3);
  if (
    !typed.length &&
    competitors.length < MIN_COMPETITORS &&
    productOneLiner
  ) {
    const rescued = await (async () => {
      const company = companyName || prospect.company;
      const dutch = (hostFromUrl(prospect.url) ?? "").endsWith(".nl");
      const results = await Promise.all([
        searchWeb(
          dutch
            ? `${productOneLiner} manufacturers Netherlands`
            : `${productOneLiner} manufacturers`
        ),
        searchWeb(`"${company}" competitors OR alternatives`),
      ]);
      const pick = await pickCompetitorsFromSearch({
        company,
        productOneLiner,
        searchBlock: formatSearchBlock(results),
      });
      return pick.ok
        ? filterRescuedCompetitors(pick.data.competitors, company, prospect.url)
        : [];
    })().catch(() => []);
    competitors = filterRescuedCompetitors(
      [...competitors, ...rescued],
      companyName || prospect.company,
      prospect.url
    ).slice(0, 3);
  }
  return {
    companyName,
    productOneLiner,
    competitors,
    industryFit: detect.data.industryFit ?? "unclear",
    fingerprint: fingerprintFromDetect(detect.data),
    flags: competitors.length
      ? []
      : ["Auto-detect found no competitors to benchmark against"],
  };
}

async function prepare(input: ManualAuditInput, stored?: ManualAuditRecord) {
  const valid = validateUrl(input.url);
  if (!valid.ok) throw new ManualAuditError("url");
  const pastedText = cleanPastedText(input.pasteRaw);
  const url = valid.url.href;
  const initial: ProspectData = {
    url,
    company:
      input.companyName?.trim().slice(0, 60) || deriveCompanyFromUrl(url),
    name: "",
    role: "",
    productOneLiner: "",
    competitors: [],
  };
  const detection = await detectFromPaste(
    initial,
    pastedText,
    parseCompetitors(input.competitorsRaw)
  );
  const prospect = applyDetection(initial, detection);
  if (input.companyName?.trim()) prospect.company = initial.company;
  prospect.competitors = stored
    ? stored.competitors
    : (await resolveCompetitors(prospect)).slice(0, 3);
  const qualifiedDecision = qualifiedAuditDecision(detection);
  const bundle = await gatherManualEvidence(prospect, pastedText);
  const result = await generateScorecardUncached(prospect, {
    evidenceOverride: bundle,
  });
  result.flags = [...new Set([...result.flags, ...detection.flags])];
  // Same readiness rule as the public run route, before any report/record writes.
  const scoredPillars =
    prospectScores(result)?.categories.filter((c) => c.total !== null).length ??
    0;
  if (scoredPillars < 3) throw new ManualAuditError("notready");
  return { prospect, result, qualifiedDecision, pastedText };
}

async function execute(
  input: ManualAuditInput,
  stored?: ManualAuditRecord
): Promise<{ slug: string; reportUrl: string }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const startedAt = Date.now();
  try {
    // Manual calls never enter the public detect/generate caches. A separate
    // per-attempt namespace is reserved, with raw-call memoization bypassed so
    // pasted inputs are not retained in call caches. Competitors retain the
    // normal independent PageSpeed cache; the prospect never enters that path.
    const prepared = await Promise.race([
      withCallEnvelope(
        `scorecard-manual:attempt:${randomUUID()}`,
        () => prepare(input, stored),
        { fresh: true }
      ),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new ManualAuditError("timeout")),
          DEADLINE_MS
        );
      }),
    ]);
    // A timed-out prepare may finish in the background, but cannot persist:
    // all writes of reports and manual records live AFTER this race.
    if (Date.now() - startedAt >= DEADLINE_MS)
      throw new ManualAuditError("timeout");
    const { prospect, result, qualifiedDecision, pastedText } = prepared;
    const now = new Date().toISOString();
    const slug = stored?.slug ?? (await uniqueSlug());
    const previousReport = stored ? await readShared(slug) : null;
    if (stored) {
      if (!(await readShared(slug))) throw new ManualAuditError("failed");
      const updated = await patchShared(slug, {
        prospectData: prospect,
        result,
        qualifiedDecision,
        roleSeniority: result.routing.roleSeniority,
      });
      if (!updated) throw new ManualAuditError("failed");
    } else {
      // Same shape as promoteResult, without importing unlock/contact plumbing.
      const shared: SharedScorecard = {
        prospectData: prospect,
        result,
        qualifiedDecision,
        loomUrl: null,
        createdAt: now,
        lastEditedAt: now,
        expiresAt: new Date(Date.now() + 180 * 86_400_000).toISOString(),
        roleSeniority: result.routing.roleSeniority,
      };
      await writeShared(slug, shared);
    }
    const record: ManualAuditRecord = {
      slug,
      url: prospect.url,
      companyName: prospect.company,
      pastedText,
      competitors: prospect.competitors,
      contactName: input.contactName?.trim() ?? "",
      contactEmail: input.contactEmail?.trim() ?? "",
      qualifiedDecision,
      createdAt: stored?.createdAt ?? now,
      updatedAt: now,
      lastRunAt: now,
      runCount: (stored?.runCount ?? 0) + 1,
    };
    await getKv().set(manualKey(slug), record, { ex: SHARE_TTL_S });
    if (!stored) {
      await getKv().lpush(INDEX_KEY, slug);
      await getKv().ltrim(INDEX_KEY, 0, 199);
    }
    const historyReport = await readShared(slug);
    if (historyReport)
      await appendRunHistory(
        slug,
        historyReport,
        "manual",
        stored ? "re-run" : "first run",
        previousReport ?? undefined
      );
    return { slug, reportUrl: `/audit/r/${slug}` };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function runManualAudit(input: ManualAuditInput) {
  return execute(input);
}
export async function rerunManualAudit(
  slug: string,
  options: { newPasteRaw?: string } = {}
) {
  const stored = await readManualAudit(slug);
  if (!stored) throw new ManualAuditError("failed");
  if (stored.source === "crawl") {
    const { rerunNormalManualAudit } = await import("./normal");
    return rerunNormalManualAudit(stored);
  }
  return execute(
    {
      url: stored.url,
      companyName: stored.companyName,
      pasteRaw: options.newPasteRaw ?? stored.pastedText,
      competitorsRaw: stored.competitors.map((c) => c.raw).join("\n"),
      contactName: stored.contactName,
      contactEmail: stored.contactEmail,
    },
    stored
  );
}
