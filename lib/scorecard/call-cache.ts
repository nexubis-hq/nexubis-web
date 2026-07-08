import { AsyncLocalStorage } from "node:async_hooks";

// Per-generation envelope for call-level memoization. The orchestrator runs a
// generation inside `withCallEnvelope(scorecardKey, ...)`; every AI/web-search
// call underneath reads the envelope and memoizes its result in KV (the cost
// cache), so identical model+search calls are served, not re-paid, within a
// generation and across identical regenerations. Absent (no envelope) means no
// memoization, which keeps scripts and unit tests on their existing path.
const store = new AsyncLocalStorage<{ envelope: string }>();

export function withCallEnvelope<T>(envelope: string, fn: () => Promise<T>): Promise<T> {
  return store.run({ envelope }, fn);
}

export function currentEnvelope(): string | null {
  return store.getStore()?.envelope ?? null;
}
