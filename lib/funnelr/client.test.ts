import { expect, it, vi } from "vitest";
import { createFunnelrClient } from "./client";

it("creates a Contact while preserving the first name and report URL", async () => {
  const fetchImpl = vi.fn<typeof fetch>(async () => Response.json({ userId: 123 }));
  const client = createFunnelrClient({ apiKey: "mock-key", fetchImpl });
  const reportUrl = "https://www.nexubis.io/audit/r/abcdefgh";

  await client.createContact({
    email: "shannah+funneltest1@nexubis.io",
    firstName: "Shannah",
    lastName: reportUrl,
    hasAcceptedMarketing: true,
  });

  expect(fetchImpl).toHaveBeenCalledTimes(1);
  const [url, init] = fetchImpl.mock.calls[0];
  expect(new URL(String(url)).pathname).toBe("/api/v1/user/users");
  expect(init?.method).toBe("POST");
  expect(JSON.parse(String(init?.body))).toEqual({
    email: "shannah+funneltest1@nexubis.io",
    firstName: "Shannah",
    lastName: reportUrl,
    company: null,
    telephone: null,
    isAgent: false,
    userTypeKey: "Contact",
    isUnsubscribed: false,
    hasAcceptedMarketing: true,
    originKey: "Optin",
  });
});
