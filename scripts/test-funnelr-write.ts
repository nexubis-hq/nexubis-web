import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const required = [
  "FUNNELR_API_KEY",
  "FUNNELR_API_BASE_URL",
  "FUNNELR_TEST_CONTACT_EMAIL",
  "FUNNELR_TEST_LIST_ID",
  "FUNNELR_TEST_TAG_ID",
];

const missing = required.filter((key) => !process.env[key]);

console.log("Funnelr controlled write diagnostic");

if (missing.length) {
  console.log(`status: blocked (missing ${missing.join(", ")})`);
  process.exit(1);
}

if (process.env.FUNNELR_ALLOW_WRITE_TEST !== "true") {
  console.log("status: blocked (FUNNELR_ALLOW_WRITE_TEST must be true)");
  process.exit(1);
}

console.log("status: blocked (write endpoints are undocumented)");
console.log("find or create test contact: unknown");
console.log("add contact to selected list: unknown");
console.log("confirm list membership: unknown");
console.log("remove contact from selected list: unknown");
console.log("confirm list removal: unknown");
console.log("add selected test tag: unknown");
console.log("confirm tag exists: unknown");
console.log("remove selected test tag: unknown");
console.log("confirm tag removal: unknown");
process.exit(1);
