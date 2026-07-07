import { Redis } from "@upstash/redis";
import { warnSharedInfra } from "./env";

// The Vercel Upstash integration injects KV_REST_API_URL / KV_REST_API_TOKEN
// (not the UPSTASH_REDIS_REST_* names that Redis.fromEnv() expects), so we
// construct the client explicitly. Lazy init so a missing env at build time
// cannot crash module evaluation.
//
// Credential policy: this must be a NEW Upstash database for Nexubis, never
// the LekkeWeb instance. warnSharedInfra() shouts if the known LekkeWeb host
// is configured here.
let client: Redis | null = null;

export function getKv(): Redis {
  if (client) return client;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error("KV not configured (KV_REST_API_URL / KV_REST_API_TOKEN missing).");
  }
  warnSharedInfra();
  client = new Redis({ url, token });
  return client;
}
