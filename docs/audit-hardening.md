# Audit Hardening: Combined Behaviour

The rules this pipeline follows after merging the LekkeWeb hardening dossier
(`lekkeweb-live/docs/audit-hardening-dossier.md`, 2026-09-01) with what this
codebase already did. This is the reference for the next session: what holds,
where it lives, and which side of the family each rule came from.

**The bar:** a submitted URL always ends in either a complete sensible report
or a clear friendly error. Never a hang, never a half-rendered page, never a
score skewed by a failed data source. "Could not be assessed" never counts as
a zero.

---

## 1. Point-by-point verdict vs the dossier

| Mechanism | Verdict | Detail |
|---|---|---|
| URL normalisation | **Equal (shared lineage)** | `normaliseToHttps` (run.ts) + stricter `normaliseUrl` for cache identity (determinism.ts). Same rules as the dossier §1.1. |
| URL validation + SSRF blocklist | **Equal, now wired earlier** | `validateUrl`/`isBlockedHost` (fetch-site.ts) are byte-for-byte the dossier's §1.2. NEW: the run route now calls `validateUrl` before any spend, so a bad URL gets its specific plain-English reason instead of a generic failure later. |
| Site-fetch failure handling | **Equal** | `fetchSite` never throws; same five failure reasons; a failed fetch never aborts the audit (gather continues on screenshots/vision/offsite). |
| Odd-site handling | **Ours better → flow back to LekkeWeb** | Same SPA render fallback, truncation caps, page signals, nav vocabulary — plus: **5** inner pages vs their 3, CTA-destination walking, and the deterministic `SitePageFacts` layer (languages, tech docs, video counts, form fields) that powers code-computed competitor edges. LekkeWeb has no equivalent of siteFacts. |
| Timeouts | **Ours better in two places** | Screenshot fetch 25s (theirs 40s: one hung render used to hold our gather at the ceiling). PageSpeed requests performance-only (theirs fetches 4 categories, 3 unused). NEW from dossier: a **generation hard deadline** (240s `Promise.race` in the run route) — we had none; theirs is 90s but their pipeline is smaller. |
| Retries | **Equal (shared lineage)** | Zero transport retries anywhere; one semantic repair retry on invalid AI output; **timeouts never retry** (the timed-out billed call usually completed server-side). |
| PageSpeed off the critical path | **Ours better → flow back** | PageSpeed starts with the gather but joins only at score assembly (the model sees it as context at most). LekkeWeb still holds its pipeline on PSI. |
| Failure packaging for the AI | **Equal** | Missing sources are named in the prompt ("The site could not be fetched (...). Only score checks the remaining evidence supports."), never silently omitted. |
| Schema validation + repair | **Equal (shared lineage)** | Structured outputs at the API + zod `.passthrough()` in code + loose parse → repair-with-hint → typed failure → templated fallback. |
| Null-data scoring (the core trick) | **Ours better: two levels** | Dossier: null pillars excluded from the weighted overall. Ours does the same exclusion at BOTH levels: unassessable checks are excluded from the category denominator (category scales to 20 over assessed checks), and null categories are excluded from the overall denominator (overall scales over scored categories). A failed instrument can never read as a low score anywhere. |
| Instrument failure ≠ finding | **Equal in structure** | Instrument failures produce `null`/`assessable:false` at the collect layer and render as "Could not be assessed"; genuine absences (e.g. brochures-findable) are explicitly scored 0 by prompt rule because the absence IS the finding. |
| Scoring guardrails | **Mixed; hybrid kept** | Check scores clamped 0–4 in code; verdict BAND is pure code from the overall (never the model); PageSpeed check always deterministic. Difference: our header verdict LINE is AI-written (richer), with the templated band line as fallback — LekkeWeb's verdict is fully templated. Deliberate: our line is schema-validated, clamped, safety-scanned, and falls back to the template on any failure. |
| Readiness gate | **Was missing → implemented** | NEW: after generation, a report with fewer than **3 of 5** pillars scored is not shipped; it takes the failed-scan path below. (A fully unscorable prospect already threw.) |
| Failure-state UX | **Was weaker → implemented** | We already streamed friendly SSE errors with real stage narration. NEW from dossier (adapted to the gateless flow): since the email is captured up front, **any failure after capture keeps the lead** — the team is emailed (`notifyFailedScan`) to run the audit by hand, and the visitor is told exactly that. A failed scan is a conversion path, not an error page. |
| Rate limiting | **Logic equal; wiring was missing → fixed** | Same three funnels (global 200/h, IP 1 per 7 days, target 2/day), env-tunable, counters bumped before generation, allowlist bypass. NEW wiring in the route: the per-IP marker is now actually set (only after success, so failures never burn the allowance); the **IP bounce carries the visitor's previous report link**; the global breaker now emails the team at most once per hour. |
| Duplicate handling | **Ours better** | Whole-result cache 180d keyed on business identity (contact excluded); PLUS email+site dedupe at the RUN level (theirs dedupes only at the unlock gate) — a double submission returns the same report link instantly and fires nothing twice. |
| Email gate abuse | **Was partial → completed** | We had honeypot, 2s minimum, Turnstile (fail-open on outage), syntax, disposable list. NEW from dossier: **MX lookup** (4s timeout; only definitive ENOTFOUND/ENODATA rejects; everything transient fails open). |
| Content safety | **Ours stricter** | Same em-dash strip + CI scan, same ai-tell/placeholder/provenance scan. Difference: one dirty string swaps the WHOLE deck copy to the templated fallback (theirs replaces just the string) — consistency over salvage, kept deliberately. The audit-word ban was retired with the rename. |
| Config posture | **Equal** | Every missing env degrades to a defined lesser behaviour at call time; mock mode (`SCORECARD_MOCK=1`) for zero-cost local work; prod without KV throws, dev falls back to memory. |
| Observability | **Equal** | Per-step `[scorecard-timing]` logs (ours, newer), per-call AI logs, cost roll-ups, per-run outcome log (now including `timeout`), flags stored with the result. |
| Presence mode ("no website") | **Not ported, deliberate** | Nexubis audits industrial manufacturers, who have websites; the URL is the product's entry contract. If that changes, the dossier's §1.6 is the blueprint. |
| Contradiction filter | **Not ported, n/a** | We render no package/sales bullets on the report; the offer block is fixed copy. |
| Lead-quality scoring | **Not ported; ours differs** | `routing.ts` computes seniority/vertical/timing flags for the team instead of a hot/warm score. Revisit if volume grows. |

**Flow-back candidates for LekkeWeb** (where ours is stronger): two-level null
exclusion; PageSpeed deferred past model scoring + performance-category-only;
25s screenshot timeout + JPEG + rivals-desktop-only; the deterministic
`SitePageFacts` layer and code-computed competitor edges; run-level duplicate
dedupe; whole-deck fallback on any dirty string; per-step timing logs.

---

## 2. The combined pipeline contract (what the next session must not break)

### Input
1. Client normalises loosely for inline validation; the server re-normalises
   (`normaliseToHttps`) and validates hard (`validateUrl`: parseability, http/s
   only, SSRF blocklist) BEFORE any spend, with specific friendly reasons.
2. Email path, in order, cheapest first: honeypot → sub-2s timing → syntax →
   disposable list → URL validation → Turnstile (fail-open on outage, closed on
   explicit failure) → MX lookup (fail-open except ENOTFOUND/ENODATA).
3. Bot rejections answer like validation errors; the trap is never revealed.

### Generation
4. Every external call: hard `AbortController` timeout, zero transport
   retries, null/flagged fallback. Site 8s, inner pages 5s, render 22s,
   screenshots 25s, PageSpeed 55s (performance only, deferred join), Serper
   10s, AI 50s (deck copy 110s).
5. One semantic repair retry on invalid AI output; never on timeout. Every AI
   call site has a templated fallback; the deck-copy fallback builds every
   layout section from the measured check scores.
6. The whole generation races a **240s deadline**; per-call budgets nest
   inside it; Vercel `maxDuration` 300s backstops the route. SSE heartbeat
   every 10s so proxies never drop the stream. **A hang is impossible by
   construction.**

### Scoring
7. Check scores clamp to 0–4. Unassessable checks are excluded from the
   category denominator; null categories are excluded from the overall
   denominator. **"Could not be assessed" can never drag a score down.**
8. The PageSpeed check is always computed from measured numbers, never by the
   model. The verdict band is pure code from the overall. Genuine absence
   (brochures unfindable) scores 0 because it is a true finding; instrument
   failure scores null because it is our failure, not theirs.

### Shipping
9. Readiness: fewer than 3 of 5 scored pillars → do not ship the report.
10. Any failure after a valid email capture (throw, deadline, readiness):
    the team is emailed the lead (`notifyFailedScan`, reply-to the visitor)
    for a manual run, and the visitor is told exactly that. **No lead is ever
    lost to a pipeline failure.**
11. On success: the per-IP allowance is burned (never on failure) and the
    report slug is remembered per IP for the rate-limit bounce.

### Limits and duplicates
12. Three funnels, checked cheap→expensive, counters bumped before
    generation: global 200/h (breaker emails the team ≤1×/h), IP 1 per 7 days
    (bounce shows their previous report link), target 2/day. Allowlist:
    `SCORECARD_UNLIMITED_IPS` (dev has localhost + "unknown" listed).
13. Same email + same site within 7 days: same report link, nothing re-fires.
    Same site, anyone, within 180 days: cached result, instant and free.

### Rendering
14. Reports render fully from any stored result: generated copy fields are
    preferred, rubric-derived fallbacks cover older records. No rendered
    string is ever "undefined"/"null"/"NaN"; dropped-unsafe copy always has a
    templated replacement.

---

## 3. Verified hostile-input behaviour (tested 2026-09-01)

| Input | Result |
|---|---|
| `unifortes.nl` (no protocol) | normalised to `https://unifortes.nl`, runs |
| `not a url at all` | "That does not look like a valid web address." before any spend |
| `ftp://example.com` | "Only http and https addresses are supported." |
| `localhost:3000`, `192.168.1.1` | "That address is not reachable from here." (SSRF blocklist) |
| Dead domain | fetch fails in ~200ms, "Could not reach that site."; audit continues on other sources; readiness gate decides |
| Password-walled (401) | "Site responded with status 401."; same continue-then-gate path |
| 10s-slow site | aborted at 8s, "The site took too long to respond." |
| Redirecting domain | followed silently; `finalUrl` recorded and used downstream |
| Tiny JS-shell page | render fallback attempted; adopted only if longer; honest failure otherwise |
| Email on dead-MX domain | "That email domain cannot receive mail. Check the spelling." |
| Honeypot filled | generic validation-style refusal, no tell |
| Double submission (same email + site) | identical report link returned instantly, nothing fires twice |
| Same IP, different site after success | rate-limit bounce with the previous report's link (verified via unit tests; localhost is allowlisted in dev) |

Rerun the fetch-layer battery any time: the test cases live in this doc; the
route-level cases are plain `curl` POSTs to `/api/scorecard/run` with mock
mode on (validation, limits and dedupe all run for real before the mock).
