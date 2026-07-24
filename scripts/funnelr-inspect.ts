import { config } from "dotenv";
import { FunnelrApiError, createFunnelrClient } from "../lib/funnelr/client";

config({ path: ".env.local", override: true, quiet: true });
config({ override: false, quiet: true });

type EndpointName = "Contacts endpoint" | "Lists endpoint" | "Tags endpoint" | "Sequences endpoint";

function summarizeAvailability(name: EndpointName, value: unknown): void {
  const count = Array.isArray(value) ? value.length : undefined;
  console.log(`${name}: available${count === undefined ? "" : ` (${count} sampled)`}`);
}

function summarizeUnavailable(name: EndpointName, err: unknown): void {
  if (err instanceof FunnelrApiError) {
    console.log(`${name}: unavailable (HTTP ${err.status})`);
    return;
  }

  console.log(`${name}: unavailable`);
}

async function inspectEndpoint(name: EndpointName, action: () => Promise<unknown>): Promise<boolean> {
  try {
    summarizeAvailability(name, await action());
    return true;
  } catch (err) {
    summarizeUnavailable(name, err);
    return false;
  }
}

async function main(): Promise<void> {
  if (!process.env.FUNNELR_API_KEY?.trim()) {
    console.log("Authentication: failed (missing FUNNELR_API_KEY)");
    process.exitCode = 1;
    return;
  }

  const client = createFunnelrClient();
  let ok = true;

  try {
    await client.testAuthentication();
    console.log("Authentication: successful");
  } catch (err) {
    if (err instanceof FunnelrApiError) {
      console.log(`Authentication: failed (HTTP ${err.status})`);
    } else {
      console.log("Authentication: failed");
    }
    process.exitCode = 1;
    return;
  }

  ok = (await inspectEndpoint("Contacts endpoint", () => client.listContacts({ page: 1, size: 1 }))) && ok;
  ok = (await inspectEndpoint("Lists endpoint", () => client.listLists())) && ok;
  ok = (await inspectEndpoint("Tags endpoint", () => client.listTags())) && ok;
  ok = (await inspectEndpoint("Sequences endpoint", () => client.listSequences())) && ok;

  if (!ok) process.exitCode = 1;
}

main().catch(() => {
  console.log("Funnelr inspect: failed");
  process.exit(1);
});
