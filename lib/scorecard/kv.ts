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
//
// Local fallback: when no KV is configured OUTSIDE production, a per-process
// in-memory store stands in (the subset of commands the Scorecard uses), so
// the whole flow (run record, teaser, unlock, shared report, admin) works in
// dev and mock mode with zero infrastructure. Production without KV still
// throws: silently losing leads is never acceptable there.

type Ex = { ex?: number };

export interface KvLike {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, opts?: Ex): Promise<unknown>;
  del(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
  lpush(key: string, ...values: unknown[]): Promise<number>;
  lrange<T = unknown>(key: string, start: number, stop: number): Promise<T[]>;
  ltrim(key: string, start: number, stop: number): Promise<unknown>;
}

interface MemStores {
  values: Map<string, unknown>;
  lists: Map<string, unknown[]>;
  expiries: Map<string, number>;
}

function memoryKv(): KvLike {
  // On globalThis, not module scope: in dev each route handler bundles its own
  // copy of this module, and a module-scoped map would give every route a
  // different (empty) store. One process, one store.
  const g = globalThis as typeof globalThis & { __scorecardMemKv?: MemStores };
  g.__scorecardMemKv ??= { values: new Map(), lists: new Map(), expiries: new Map() };
  const { values, lists, expiries } = g.__scorecardMemKv;
  const alive = (key: string) => {
    const exp = expiries.get(key);
    if (exp !== undefined && Date.now() > exp) {
      values.delete(key);
      lists.delete(key);
      expiries.delete(key);
      return false;
    }
    return true;
  };
  return {
    async get<T>(key: string) {
      if (!alive(key)) return null;
      return (values.has(key) ? (values.get(key) as T) : null);
    },
    async set(key, value, opts) {
      values.set(key, value);
      if (opts?.ex) expiries.set(key, Date.now() + opts.ex * 1000);
      else expiries.delete(key);
      return "OK";
    },
    async del(key) {
      const had = values.delete(key) || lists.delete(key);
      expiries.delete(key);
      return had ? 1 : 0;
    },
    async incr(key) {
      if (!alive(key)) values.delete(key);
      const next = (Number(values.get(key)) || 0) + 1;
      values.set(key, next);
      return next;
    },
    async expire(key, seconds) {
      expiries.set(key, Date.now() + seconds * 1000);
      return 1;
    },
    async lpush(key, ...vals) {
      const list = lists.get(key) ?? [];
      list.unshift(...vals.reverse());
      lists.set(key, list);
      return list.length;
    },
    async lrange<T>(key: string, start: number, stop: number) {
      if (!alive(key)) return [];
      const list = (lists.get(key) ?? []) as T[];
      const end = stop === -1 ? list.length : stop + 1;
      return list.slice(start, end);
    },
    async ltrim(key, start, stop) {
      const list = lists.get(key) ?? [];
      const end = stop === -1 ? list.length : stop + 1;
      lists.set(key, list.slice(start, end));
      return "OK";
    },
  };
}

let client: KvLike | null = null;
let warnedMemory = false;

export function getKv(): KvLike {
  if (client) return client;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("KV not configured (KV_REST_API_URL / KV_REST_API_TOKEN missing).");
    }
    if (!warnedMemory) {
      console.warn("[scorecard-kv] no KV configured; using the in-memory dev store (data resets on restart).");
      warnedMemory = true;
    }
    client = memoryKv();
    return client;
  }
  warnSharedInfra();
  client = new Redis({ url, token }) as unknown as KvLike;
  return client;
}

// Test hook: reset the lazy client (used when tests flip env vars).
export function __resetKvForTest(): void {
  client = null;
}
