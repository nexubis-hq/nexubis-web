import { AsyncLocalStorage } from "node:async_hooks";

// Per-generation envelope for call-level memoization. The orchestrator runs a
// generation inside `withCallEnvelope(scorecardKey, ...)`; every AI/web-search
// call underneath reads the envelope and memoizes its result in KV (the cost
// cache), so identical model+search calls are served, not re-paid, within a
// ordinary generations. Fresh admin regeneration bypasses this cache. Absent
// (no envelope) means no memoization, also used by scripts and unit tests.
const store = new AsyncLocalStorage<{ envelope: string; fresh: boolean }>();

export function withCallEnvelope<T>(envelope: string, fn: () => Promise<T>, options: { fresh?: boolean } = {}): Promise<T> {
  return store.run({ envelope, fresh: options.fresh === true || store.getStore()?.fresh === true }, fn);
}

export function currentEnvelope(): string | null {
  const context = store.getStore();
  // A fresh admin read must not replay model or search responses from an old
  // read. Returning null uses those callers' existing uncached path.
  return context?.fresh ? null : context?.envelope ?? null;
}
