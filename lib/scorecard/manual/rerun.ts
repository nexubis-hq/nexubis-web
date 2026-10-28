import { appendRunHistory } from "../admin/run-history";
import { getKv } from "../kv";
import {
  readShared,
  patchShared,
  SHARE_TTL_S,
  type SharedScorecard,
} from "../share";
import { readManualAudit, rerunManualAudit } from "./run";
import { prepareNormalAuditWithDeadline } from "./normal";
import { ManualAuditError } from "./paste";

export interface AdminRunHistory {
  lastRunAt: string;
  runCount: number;
}
const historyKey = (slug: string) => `scorecard-admin-run:${slug}`;

export async function readAdminRunHistory(
  slug: string,
  shared?: SharedScorecard | null
): Promise<AdminRunHistory> {
  const manual = await readManualAudit(slug);
  if (manual)
    return {
      lastRunAt: manual.lastRunAt ?? manual.updatedAt,
      runCount: manual.runCount,
    };
  const history = await getKv().get<AdminRunHistory>(historyKey(slug));
  if (history) return history;
  const report = shared ?? (await readShared(slug));
  return {
    lastRunAt: report?.result.generatedAt ?? report?.createdAt ?? "",
    runCount: 1,
  };
}

// Single dispatch for every admin entry point. No lead/contact plumbing runs here.
export async function rerunStoredAudit(slug: string) {
  const manual = await readManualAudit(slug);
  if (manual) return rerunManualAudit(slug);
  const shared = await readShared(slug);
  if (!shared) throw new ManualAuditError("failed");
  const previous = await readAdminRunHistory(slug, shared);
  const { prospect, result, qualifiedDecision } =
    await prepareNormalAuditWithDeadline(
      { url: shared.prospectData.url },
      shared.prospectData
    );
  const merged = {
    ...result,
    meta: {
      ...result.meta,
      contactName: shared.result.meta.contactName,
      role: shared.result.meta.role,
    },
    routing: {
      ...result.routing,
      roleSeniority: shared.result.routing.roleSeniority,
    },
  };
  // Omit loomUrl and shared roleSeniority: patchShared preserves both exactly.
  const updated = await patchShared(slug, {
    prospectData: {
      ...prospect,
      name: shared.prospectData.name,
      role: shared.prospectData.role,
    },
    result: merged,
    qualifiedDecision,
  });
  if (!updated) throw new ManualAuditError("failed");
  await getKv().set(
    historyKey(slug),
    { lastRunAt: new Date().toISOString(), runCount: previous.runCount + 1 },
    { ex: SHARE_TTL_S }
  );
  await appendRunHistory(slug, updated, "admin", "re-run", shared);
  return { slug, reportUrl: `/audit/r/${slug}` };
}
