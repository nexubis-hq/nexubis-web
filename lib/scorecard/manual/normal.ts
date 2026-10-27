import { detectProspectContext, applyDetection } from "../detect";
import { validateUrl } from "../fetch-site";
import { prospectFromRunInput } from "../run";
import { gatherEvidenceUncached } from "../orchestrator";
import { generateScorecardUncached } from "../generate";
import { qualifiedAuditDecision } from "../qualified-audit";
import { prospectScores } from "../result";
import { getKv } from "../kv";
import {
  writeShared,
  uniqueSlug,
  patchShared,
  SHARE_TTL_S,
  type SharedScorecard,
} from "../share";
import { ManualAuditError } from "./paste";
import type { ManualAuditRecord } from "./run";
import type { ProspectData } from "../types";

export interface NormalManualAuditInput {
  url: string;
  contactName?: string;
  contactEmail?: string;
}

export class NormalSiteReadError extends ManualAuditError {
  constructor(public readonly reason: string) {
    super("failed");
    this.name = "NormalSiteReadError";
    this.message = reason;
  }
}

async function prepare(input: NormalManualAuditInput, previous?: ProspectData) {
  const valid = validateUrl(input.url);
  if (!valid.ok) throw new ManualAuditError("url");
  const initial = previous ?? prospectFromRunInput({ url: valid.url.href });
  const detection = await detectProspectContext(initial, { fresh: true });
  const failedRead = detection.flags.find((flag) =>
    /^Auto-detect could not read the site \(/i.test(flag)
  );
  if (failedRead) {
    throw new NormalSiteReadError(
      failedRead
        .replace(/^Auto-detect could not read the site \(/i, "")
        .replace(/\)$/, "")
    );
  }
  const prospect = {
    ...applyDetection(initial, detection),
    fingerprint: detection.fingerprint ?? undefined,
  };
  const qualifiedDecision = qualifiedAuditDecision(detection);
  // Use the normal gatherer (including its competitor resolution) once. Inspect
  // its prospect read BEFORE scoring: generate's result omits company fetch
  // reasons, and scoring on search alone would hide a blocked crawl from admin.
  const evidence = await gatherEvidenceUncached(prospect, { fresh: true });
  const own = evidence.companies.find((company) => company.isProspect);
  if (!own?.fetched) {
    const flag = own?.flags.find((value) => /^Site fetch failed:/i.test(value));
    throw new NormalSiteReadError(
      own?.fetchReason ||
        flag?.replace(/^Site fetch failed:\s*/i, "") ||
        "The prospect site could not be read."
    );
  }
  // Same normal scoring engine, with the already-gathered normal evidence.
  // Uncached generation avoids publishing a degraded/late result into a shared
  // generation cache before the admin readiness/deadline gates have passed.
  const result = await generateScorecardUncached(prospect, {
    fresh: true,
    evidenceOverride: evidence,
  });
  result.flags = [...new Set([...result.flags, ...detection.flags])];
  const scoredPillars =
    prospectScores(result)?.categories.filter(
      (category) => category.total !== null
    ).length ?? 0;
  if (scoredPillars < 3) throw new ManualAuditError("notready");
  return { prospect, result, qualifiedDecision };
}

export async function prepareNormalAuditWithDeadline(
  input: NormalManualAuditInput,
  previous?: ProspectData
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const startedAt = Date.now();
  try {
    const prepared = await Promise.race([
      prepare(input, previous),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new ManualAuditError("timeout")),
          270_000
        );
      }),
    ]);
    if (Date.now() - startedAt >= 270_000)
      throw new ManualAuditError("timeout");
    return prepared;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function execute(
  input: NormalManualAuditInput,
  stored?: ManualAuditRecord
) {
  // All writes remain outside the raced preparation, including on re-runs.
  const prepared = await prepareNormalAuditWithDeadline(input);
  const { prospect, result, qualifiedDecision } = prepared;
  const slug = stored?.slug ?? (await uniqueSlug());
  const now = new Date().toISOString();
  if (stored) {
    const updated = await patchShared(slug, {
      prospectData: prospect,
      result,
      qualifiedDecision,
      roleSeniority: result.routing.roleSeniority,
    });
    if (!updated) throw new ManualAuditError("failed");
  } else {
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
    source: "crawl",
    url: prospect.url,
    companyName: prospect.company,
    pastedText: "",
    competitors: prospect.competitors,
    contactName: input.contactName?.trim() ?? "",
    contactEmail: input.contactEmail?.trim() ?? "",
    qualifiedDecision,
    createdAt: stored?.createdAt ?? now,
    updatedAt: now,
    lastRunAt: now,
    runCount: (stored?.runCount ?? 0) + 1,
  };
  await getKv().set(`scorecard-manual:${slug}`, record, { ex: SHARE_TTL_S });
  if (!stored) {
    await getKv().lpush("scorecard-manual-audits", slug);
    await getKv().ltrim("scorecard-manual-audits", 0, 199);
  }
  return { slug, reportUrl: `/audit/r/${slug}` };
}

export async function runNormalManualAudit(input: NormalManualAuditInput) {
  return execute(input);
}
export async function rerunNormalManualAudit(stored: ManualAuditRecord) {
  return execute(
    {
      url: stored.url,
      contactName: stored.contactName,
      contactEmail: stored.contactEmail,
    },
    stored
  );
}
