import { FunnelrClient, type FunnelrUser } from "@/lib/funnelr/client";
import {
  NEXUBIS_TAG_IDS,
  NEXUBIS_TAGS,
  NEXUBIS_LIST_IDS,
} from "@/lib/funnelr/nexubis-tags";
import {
  SCORECARD_REPORT_URL_FIELD_ID,
  SCORECARD_REPORT_URL_FIELD_NAME,
} from "../lead-funnelr";

// Synthetic transport shared by tests and the isolated browser fixture harness.
// Every request terminates in memory; no network fetch is used.
export function funnelrFixture(
  options: {
    missing?: boolean;
    partial?: boolean;
    reportUrl?: string;
    fallbackIds?: boolean;
  } = {}
) {
  const reportUrl =
    options.reportUrl || "https://www.nexubis.io/audit/r/abc23456";
  const ids = {
    ...NEXUBIS_TAG_IDS,
    ...(options.fallbackIds
      ? { brand: "fallback-brand", sourceScorecard: "fallback-source" }
      : {}),
  };
  let contact: FunnelrUser | null = options.missing
    ? null
    : {
        userId: 7,
        email: "alex@example.com",
        firstName: "Alex",
        lastName: options.partial ? "" : reportUrl,
        currencyCode: "USD",
        isUnsubscribed: true,
      };
  const tags = new Set(
    options.partial || options.missing ? [] : [ids.brand, ids.sourceScorecard]
  );
  let profiles =
    options.partial || options.missing
      ? []
      : [{ formFieldId: SCORECARD_REPORT_URL_FIELD_ID, value: reportUrl }];
  const requests: {
    method: string;
    path: string;
    body?: Record<string, unknown>;
  }[] = [];
  const client = new FunnelrClient({
    apiKey: "mock-key-never-sent",
    fetchImpl: async (input, init) => {
      const path = new URL(String(input)).pathname;
      const method = init?.method || "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      requests.push({ method, path, body });
      if (path === "/api/v1/user/users") {
        if (method === "GET") return Response.json(contact ? [contact] : []);
        contact = {
          ...(contact || {}),
          ...body,
          userId: 7,
          currencyCode: "USD",
        };
        return Response.json(contact);
      }
      if (path === "/api/v1/user/tags")
        return Response.json([
          { tagId: ids.brand, name: NEXUBIS_TAGS.brand },
          { tagId: ids.sourceScorecard, name: NEXUBIS_TAGS.sourceScorecard },
          {
            tagId: ids.triggerStartScorecardSales,
            name: NEXUBIS_TAGS.triggerStartScorecardSales,
          },
        ]);
      if (path.endsWith("/tags")) {
        if (method === "PUT") {
          for (const id of body.addTagIds || []) tags.add(id);
          return new Response(null, { status: 204 });
        }
        return Response.json([...tags].map((tagId) => ({ tagId })));
      }
      if (path.endsWith("/lists"))
        return Response.json(
          tags.has(ids.triggerStartScorecardSales)
            ? [{ listId: NEXUBIS_LIST_IDS.scorecardSales }]
            : []
        );
      if (path === "/api/v1/system/formFields")
        return Response.json([
          {
            formFieldId: SCORECARD_REPORT_URL_FIELD_ID,
            name: SCORECARD_REPORT_URL_FIELD_NAME,
            formFieldTypeKey: "ContactProfile",
          },
        ]);
      if (path.endsWith("/profile")) {
        profiles = body.userProfiles;
        return new Response(null, { status: 204 });
      }
      if (path.endsWith("/custom")) return Response.json(profiles);
      throw new Error(`Unexpected mock request ${method} ${path}`);
    },
  });
  return {
    client,
    requests,
    tags,
    get contact() {
      return contact;
    },
  };
}
