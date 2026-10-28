import { createFunnelrClient, type FunnelrClient } from "@/lib/funnelr/client";
import {
  NEXUBIS_TAG_IDS,
  NEXUBIS_TAGS,
  NEXUBIS_LIST_IDS,
} from "@/lib/funnelr/nexubis-tags";
import {
  scorecardSlugFromReportUrl,
  SCORECARD_REPORT_URL_FIELD_ID,
  SCORECARD_REPORT_URL_FIELD_KEY,
  SCORECARD_REPORT_URL_FIELD_NAME,
} from "../lead-funnelr";

export interface FunnelrCheck {
  state: "ok" | "partial" | "missing" | "other-report";
  missing: string[];
  triggerTag?: boolean;
  salesList?: boolean;
}
export type FunnelrReadClient = Pick<
  FunnelrClient,
  | "findContactByEmail"
  | "findTagById"
  | "findTagByName"
  | "contactHasTag"
  | "getContactCustomFields"
  | "contactBelongsToList"
>;

// This function deliberately accepts only the read surface of the existing client.
export async function checkFunnelrLead(
  email: string,
  reportUrl: string,
  client: FunnelrReadClient = createFunnelrClient()
): Promise<FunnelrCheck> {
  const contact = await client.findContactByEmail(email.trim().toLowerCase());
  if (!contact)
    return {
      state: "missing",
      missing: ["contact"],
      triggerTag: false,
      salesList: false,
    };
  if (typeof contact.userId !== "number")
    throw new Error("Funnelr contact ID missing.");
  const userId = contact.userId;
  const has = async (
    key: "brand" | "sourceScorecard" | "triggerStartScorecardSales"
  ) => {
    const tag =
      (await client.findTagById(NEXUBIS_TAG_IDS[key])) ??
      (await client.findTagByName(NEXUBIS_TAGS[key]));
    return Boolean(
      tag?.tagId && (await client.contactHasTag(userId, tag.tagId))
    );
  };
  const [brand, source, triggerTag, salesList, profiles] = await Promise.all([
    has("brand"),
    has("sourceScorecard"),
    has("triggerStartScorecardSales").catch(() => undefined),
    client
      .contactBelongsToList(userId, NEXUBIS_LIST_IDS.scorecardSales)
      .catch(() => undefined),
    client.getContactCustomFields(userId),
  ]);
  const profile = profiles.find(
    (field) =>
      field.formFieldId?.toLowerCase() ===
        SCORECARD_REPORT_URL_FIELD_ID.toLowerCase() ||
      field.formFieldKey?.toLowerCase() ===
        SCORECARD_REPORT_URL_FIELD_KEY.toLowerCase() ||
      field.formFieldName === SCORECARD_REPORT_URL_FIELD_NAME ||
      field.formFieldLabel === SCORECARD_REPORT_URL_FIELD_NAME
  );
  const slugOf = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    try {
      const url = new URL(value);
      if (
        !["http:", "https:"].includes(url.protocol) ||
        url.hostname.replace(/^www\./, "") !== "nexubis.io"
      )
        return null;
      return scorecardSlugFromReportUrl(value);
    } catch {
      return null;
    }
  };
  const expectedSlug = slugOf(reportUrl);
  const mirrorSlug = slugOf(contact.lastName);
  const fieldSlug = slugOf(profile?.value ?? profile?.plainTextValue);
  const otherReport = Boolean(
    expectedSlug &&
    [mirrorSlug, fieldSlug].some((slug) => slug && slug !== expectedSlug)
  );
  const missing = [
    !brand && "Brand tag",
    !source && "Source tag",
    (!expectedSlug || mirrorSlug !== expectedSlug) &&
      "report link in Last name",
    (!expectedSlug || fieldSlug !== expectedSlug) &&
      "report link in Audit Report URL field",
  ].filter((item): item is string => Boolean(item));
  return {
    state: otherReport ? "other-report" : missing.length ? "partial" : "ok",
    missing,
    triggerTag,
    salesList,
  };
}
