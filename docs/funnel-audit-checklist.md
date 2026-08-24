# Audit Funnel Architecture Checklist

> **Reference implementation:** the LekkeWeb audit funnel (`lekkeweb.co.za/audit`).
> Living document, last updated **23 July 2026** (kept current as the LekkeWeb build
> uncovers new details, so the Nexubis build does not repeat the same saga).
> Latest additions: verified Gappstack/Funnelr API auth + write requirements
> (section 5) and the three-layer delivery-reliability model learned on live paid
> traffic (section 5c).
>
> Imported into the Nexubis repo 23 Jul 2026 from `Nexubis_Audit_Funnel_Checklist.docx`
> so the build can be checked against it in-repo.

**Purpose:** hand this to Claude Code inside another audit-tool project (first target:
the Nexubis audit tool) and have it compare the codebase against every item below.
For each item report: **HAS / PARTIAL / MISSING**, with file references. Then propose
an ordered build plan for the gaps.

## Target-specific substitutions for the Nexubis build

- **Funnelr:** same account, `nexubis.io` sending domain (already Connected in Funnelr, DNS verified).
- **KNOWN DEFECTS on nexubis.io DNS (Cloudflare-hosted) to fix before sequences send:** THREE duplicate `_dmarc` TXT records (receivers treat duplicates as NO DMARC; delete all but the gappstack one with `ruf=`), and the root SPF lacks `include:_spf.google.com` while the domain sends via Google Workspace. Funnelr shows Connected regardless; inbox placement is what suffers.
- **cal.com:** Laine's calendar. NOT SET UP YET; his setup tasks are listed in section 2.
- **Meta:** Nexubis likely needs its OWN pixel + CAPI token (decision for Hannes; do not reuse the LekkeWeb pixel `1689260719029272` unless told to).
- **Internal/test emails:** confirm the list with Hannes (LekkeWeb uses `hello@nexubis.io`, `shannah@nexubis.io`, `jess@lekkeweb.co.za`).
- **Sequence engine:** LekkeWeb has an internal Funnelr failsafe (`lib/sequences/` + dashboard at `/audit/admin/sequences`) that runs in shadow mode and cuts over via env vars. Port it (section 5b); it is the same state machine the ESP is configured with, so it doubles as executable documentation.

**The funnel state machine this all serves** (a lead is in exactly ONE state):

```
unlock email -> Sales Sequence -> (booked at any point -> exit to human)
                               OR (finished sequence -> weekly nurture)
```

Every checklist item exists to make that machine truthful: no false promises, no
double counting, no lead stuck in or leaking out of the wrong state.

---

## 1. Booking layer (cal.com)

- [ ] Single source of truth for the booking target: one module exports `CAL_LINK` and `CAL_BOOKING_URL` (LekkeWeb: `lib/booking.ts`). Every surface imports it; swapping owner = one-line change. No hardcoded cal.com URLs anywhere else (grep for `cal.com/`).
- [ ] Embed component (LekkeWeb: `components/CalBookingEmbed.tsx`): brand color config, `bookingSuccessful` callback, prefill support for name/notes AND the owner's custom booking fields, namespace derived from the event slug.
- [ ] Non-embed book CTAs (report pages) open cal.com with prefill params: person's real name in `name` (not the business), business in the custom `Business-Name` field, the unique report URL in the custom link field (this powers booking correlation, see 4).
- [ ] Booking success event: fires Meta `Schedule` with `event_id` `cal_<booking uid>` extracted from the embed callback detail (`detail.data.booking.uid`), so the server webhook's `Schedule` dedupes against it.

## 2. Owner's cal.com event config (Laine's setup tasks)

Verify via the public API:
`https://cal.com/api/trpc/public/event?input={"json":{"username":"<user>","eventSlug":"<slug>","isTeamEvent":false,"org":null}}`

- [ ] Account on the business email; a public 15 or 30 min event.
- [ ] Default booking questions kept: Name (required), Email (required), Additional notes.
- [ ] Custom fields added: `Business-Name` (required), `Free-Audit-Link` (optional) or equivalents. **Field slugs must exactly match the site's prefill keys.**
- [ ] Location: Cal Video (or chosen equivalent); timezone correct.
- [ ] Minimum notice set (LekkeWeb: 72h, because the deck promises pre-call deliverables; set whatever the promise requires — and make no promise the setting doesn't back).
- [ ] Webhook: Settings -> Developer -> Webhooks -> `BOOKING_CREATED` -> `https://<site>/api/cal-booking` with a shared secret; secret goes into the site env as `CAL_WEBHOOK_SECRET`.

## 3. Meta tracking layer

- [ ] Pixel component: inline script does `fbq('init')` ONLY. Every event (including PageView) goes through one `trackMetaEvent(eventName, params?, opts?)` helper that fires browser pixel + a server CAPI relay with a SHARED `event_id` for dedup. Helper accepts an external `eventId` (needed for the `cal_<uid>` dedup) and forwards params as CAPI `custom_data`.
- [ ] Server relay route (LekkeWeb: `app/api/meta-event/route.ts`): enriches with client IP + UA from headers (never from body), whitelists `customData` to strings/numbers, clean no-op 200 when the token env is unset (never errors client-side).
- [ ] The four funnel events, with strict semantics:
  - **AuditStart** (custom): form submitted with website/business details. Once per visit (ref-guard against validation retries). `content_category`: entry mode.
  - **AuditComplete** (custom, DIAGNOSIS ONLY): scan finished and the teaser/gate rendered. Once per visit (ref-guard). Splits abandonment-during-wait (AuditStart − AuditComplete) from refusal-at-gate (AuditComplete − Lead). NOT a custom conversion; never optimise on it. Mirrored server-side by a per-run outcome+duration log in Upstash (`lib/scorecard/diagnostics.ts`), internal only.
  - **Lead** (standard): email gate success. Distinct `content_name` per source so audit leads never blend with contact-form leads. Server-side leg includes SHA-256 hashed email.
  - **AuditBookClick** (custom): clicked the book CTA. A click is NOT a booking.
  - **Schedule** (standard): CONFIRMED bookings only (embed success + cal.com webhook, deduped via `cal_<uid>`). Never fired on clicks — this was a real bug in LekkeWeb, since fixed.
- [ ] Lead value model: expected ZAR value = package price × close rate, one documented constant (LekkeWeb: `leadValue()` in `components/MetaPixel.tsx`). Keep any server-side copy in sync.
- [ ] Internal/test email suppression on EVERY leg (conversions, webhooks, notify, leads DB), driven by one env var (`AUDIT_INTERNAL_EMAILS`), default-safe.
- [ ] Meta-side (human task): custom conversions per `content_name`; know that `Schedule` counts drop when click-inflation is removed.
- [x] **Audience gate REMOVED (2026-08-24, PR #25).** The run route used to block sites the Haiku classifier labelled `industryFit: "outside"`, but it wrongly rejected real manufacturers (tools, tiles) — a lost paid click each, firing after AuditStart, so a third invisible drain on the AuditStart→Lead gap. No submitted link is rejected now; off-topic sites are bounded only by the abuse rails (per-IP/per-target/global). The detected fit is recorded (never enforced) in the scan-outcome log and surfaced at `/scorecard/admin/scans`. Trade-off: off-topic submissions now cost a full scan.

## 4. Lead capture / unlock flow

- [ ] Email gate bot defenses, all of: honeypot input (readOnly until focused — Chrome autofill fills honeypots otherwise and rejects real users), minimum elapsed-time check, Cloudflare Turnstile in MANAGED mode.
- [ ] Turnstile verification FAILS OPEN on network errors to Cloudflare (an outage must never cost a real lead); fails closed only on an explicit failed challenge. Widget only rendered when the site key env exists.
- [ ] Email integrity: syntax check, disposable-domain blocklist, MX lookup (fail open on transient DNS errors, reject only on definitive absence, with a timeout).
- [ ] Dedupe: same email + same audit within a window returns the existing report and fires NOTHING (no double Lead, no double webhook, no sequence re-entry).
- [ ] Own leads DB independent of any ESP (LekkeWeb: KV list in `lib/audit-tool/leads.ts`), plus a lookup by report slug (powers booking correlation).
- [ ] Internal notify email (Resend): lead tier + reason first, score, contact, top 3 issues, report + admin links. Skimmable in 5 seconds. Recipients = a fixed internal address PLUS a configurable team address (LekkeWeb: `LEKKEWEB_TEAM_EMAIL`, parsed as a comma list with blank entries filtered). **BUG WE HIT:** the var was set to an empty string and the code used `??` fallback (nullish coalescing, which does NOT catch `""`), so `to` became `[internal, ""]` — an empty recipient makes Resend reject the WHOLE send, silently dropping every team lead alert. Parse + filter empties; never trust `??` against an env that may be `""`. This is the "leads who don't book a call" notification path; booked calls surface in the cal.com calendar instead.
- [ ] Readiness gate (`needsHuman`): do not publish a thin/broken auto-report to a stranger. The fallback page's copy must not promise manual work unless someone will actually do it (at paid-traffic volume: route to the booking CTA instead). The flag must travel in the Funnelr payload so the sequence can skip the "here's your report" email.
- [ ] Consent line under the gate submit: says emails are coming (report + recurring tip) and unsubscribe anytime. POPIA hygiene; must be true in the ESP config.
- [ ] Unlock orchestration is a pure function over injected deps, unit-tested per branch (LekkeWeb: `lib/audit-tool/unlock.ts` + tests). The critical conversion (Lead CAPI) is awaited; notify + Funnelr are fire-and-forget with one retry and never block the report.

## 5. Funnelr integration

> **CRITICAL CORRECTION (22 Jul 2026, learned the hard way):** Funnelr does NOT
> provide an inbound webhook receiver for arbitrary JSON. You cannot "fire a payload
> at a Funnelr URL." Early LekkeWeb AND Nexubis code both POST to a `FUNNELR_WEBHOOK_URL`
> — that env var was never actually set and those calls were always no-ops. Do not copy
> that pattern thinking it works. The real integration is a SERVER-SIDE BRIDGE ENDPOINT
> on your own domain that calls the Funnelr REST API.

Architecture (LekkeWeb: `lib/funnelr/` + `app/api/funnelr/events/route.ts`):

- [ ] One bridge endpoint `POST /api/funnelr/events` accepting `audit_opt_in` and `audit_call_booked` by an `event` field. The site's own unlock and cal-booking routes call the handler IN-PROCESS (not over HTTP to itself); the endpoint also exists for testing/external triggers.
- [ ] The endpoint does exactly THREE things and NOTHING else: (1) create/update the Funnelr contact by email, (2) store audit custom fields, (3) apply tags. It must NOT add/remove lists or sequences directly — Funnelr's own automations do that once a tag lands. **This tag-only contract is the whole design; respect it.**
- [ ] `FunnelrClient` interface with the HTTP as ONE isolated seam (`lib/funnelr/client.ts`): `upsertContact({email, firstName, name, customFields, tags})` and `applyTagsToExisting(email, tags)` (no-create). Everything else (validation, routing, mapping, dedup, tests) is provider-agnostic and testable with a mock.
- [ ] Idempotent: email is the dedup key; upsert-by-email + set-like tags mean re-posting the same event creates no duplicate contact or tag. Booked applies to EVERY distinct valid email (audit email + cal.com attendee email, deduped) without creating contacts.
- [ ] Gated dry-run: the client sends nothing until `FUNNELR_API_BASE_URL` is set, so the whole pipeline ships and tests green while the API specifics are still unconfirmed.

### RESOLVED from the official OpenAPI (22 Jul 2026)

At `https://ab513.gappstack.com/api/swagger/v1/swagger.json` ("Gappstack API 1.0").
Funnelr IS gappstack white-labelled; the CRM base is `https://ab513.gappstack.com/api`
(per-tenant subdomain). Key facts the next build will hit too:

- [ ] Contacts are "users". Custom fields are ContactProfile "form-fields" set via a user's profile. Endpoints: `GET /v1/user/users?Email=&Page=1&Size=1` (find), `POST /v1/user/users` (create), `PUT /v1/user/users` (update standard fields), `PUT /v1/user/users/{id}/tags {addTagIds}` (merge tags), `PUT /v1/user/users/{id}/profile {userProfiles:[{formFieldId,value}]}` (merge fields), `GET /v1/user/option/tags` (tag name->id), `GET /v1/user/users/{id}/custom` (field name->id, with control type + options). `DELETE /v1/user/users/{id}` (cleanup).
- [ ] **AUTH (VERIFIED LIVE, not the OpenAPI's guess):** the key goes in an `X-ApiKey` request HEADER. NOT a query param, NOT `Authorization: Bearer`, NOT `X-Api-Key` with a dash — all of those return 403. Reads succeed with no credential at all on this tenant; only WRITES need the header.
- [ ] `isAgent` + `isStaff` are REQUIRED in the body of BOTH create AND update (`POST`/`PUT /v1/user/users`) — send `false, false` for a lead. Omitting them 400s. This bit us twice: once on create (writes 403->400 until added), once on UPDATE (an existing contact's standard PUT 400'd and ABORTED the whole upsert, so re-run leads never updated their fields/tags). **Make the standard update BEST-EFFORT so it can never block the custom fields + tag application.**
- [ ] Tags AND custom fields are applied by internal GUID, resolved by exact name at runtime (do NOT hardcode; IDs differ per account). Select/Multiselect field values must be translated to the option GUID by matching the caption (`Needs Human -> Yes/No`, `Lead Tier -> Hot/Warm/Cool`). A single option GUID string in `value` works for both Select and Multiselect (verified).
- [ ] `PUT /users/{id}/tags` and `/profile` are MERGE operations (re-applying is a no-op; profile overwrites an existing field value), so the client is naturally idempotent — re-posting an opt-in never duplicates a contact. The create/update body ALSO exposes `lists`+`sequences` arrays — never send those; the ESP automations own them.
- [ ] Email search is EXACT-match (a partial term returns nothing); guard against linking to a fuzzy result anyway. It can be briefly eventually-consistent, so a contact created milliseconds ago may not be found yet — the retry + reconciliation net (5c) covers that window.

### Exact tag + field mapping

(LekkeWeb: `lib/funnelr/mapping.ts`; Nexubis will have its own tag names.)

- [ ] Every audit contact: tags `Brand: LekkeWeb` + `Source: Stoep Audit`.
- [ ] Opt-in routing tag by readiness: `needsHuman:false -> Trigger: LekkeWeb | Start Stoep Audit Sales - Full Report`; `needsHuman:true -> ...- No Full Report` (that route skips Email 1 and starts at Email 2 on Day 2 timing).
- [ ] Custom fields: `LekkeWeb | Business`, `| Report URL`, `| Lead Tier`, `| Needs Human`, `| Overall Score`, `| Audit Mode`, `| Industry`, `| Goal`.
- [ ] Booked exit: apply `Pipeline: LekkeWeb | Call Booked` to every matching contact; a Funnelr automation then removes them from both sales routes + nurture and adds them to the Booked list.
- [ ] Reply exit: `Pipeline: LekkeWeb | Replied` (applied manually by the team at launch; full auto needs a separate inbox-watcher integration — deferred).

### ESP-side automation contract

(Configured IN Funnelr by the operator, NOT in code; confirmed by Shannah 22 Jul 2026.
The code only applies tags; these automations do everything else. Replicate this shape
for any new brand — it is what makes "one lead, one state" true.)

- [ ] Separate recipient LIST per sales route (Funnelr needs a list AND automation enrolment): `... Leads - Full Report` and `... Leads - No Full Report`. Each sequence draws only from its own list. The old shared leads list is retired as a recipient list.
- [ ] Each entry automation: gate on `Does not have History: ...Sales Started` + `Does not have Pipeline: Call Booked` + `Does not have ...Replied`; then add to its list, REMOVE from the opposite list, remove from the manual-holding list, add to its sequence, stamp the shared `History: ...Sales Started` tag, and delete its own trigger tag.
- [ ] **RE-ENTRY PROTECTION LIVES IN THE ESP, NOT THE CODE:** the shared history tag + the "does not have history" condition mean even a re-applied trigger tag cannot re-enrol. So the bridge does NOT need its own enrolment dedup — re-posting an opt-in is safe by construction. (Contact + tag idempotency in the bridge is still good hygiene, but it is belt-and-braces.)
- [ ] Exit automations (Call Booked, Replied) each remove the contact from BOTH sales sequences + the nurture sequence + all three lists + the holding list, and strip every trigger tag. Booked also adds to the Booked list. This total-cleanup shape is what guarantees no residual state.
- [ ] Overlap safeguards are layered (any one suffices): API applies one trigger; per-route lists; opposite-list removal on entry; shared history-tag gate. Design new brands the same way.
- [ ] cal.com relay endpoint (LekkeWeb: `app/api/cal-booking/route.ts`): HMAC-SHA256 signature verification (`x-cal-signature-256`, timing-safe compare), handles both cal.com response formats (`responses[slug].value` and plain string), ignores non-`BOOKING_CREATED` events with 200, internal-email skip, legs independent (one failure never blocks the others), returns 200 unless the signature fails.
- [ ] Sales-to-nurture handoff: Funnelr exposes no usable "sequence completed" trigger, so a scheduled job must tag non-booked/non-replied leads past the final sales-email window with `Trigger: LekkeWeb | Start Stoep Tip Nurture`. BEST SOURCE OF TIMING: drive it from the internal sequence engine's own KV state (`enrolledAt` + `status`), not from Funnelr, which does not reliably expose per-contact sequence timestamps. Must be idempotent, paginated, dry-run capable, LekkeWeb-scoped. (Deferred on LekkeWeb pending the handoff decision.)
- [ ] Sequence rules to hand the Funnelr operator (config, not code): one entry per contact EVER; `needsHuman=true` skips the delivery email; booked exits both emails immediately; non-bookers flow to nurture after the last sales email; bookers never auto-enter nurture; unsubscribe exits ALL sequences.
- [ ] Booking links inside the emails templated with merge fields: `https://cal.com/<owner>/<slug>?name={name}&Business-Name={business}&Free-Audit-Link={reportUrl}` — this is what keeps email-originated bookings correlated.
- [ ] Sender domain: sequences must send from the brand's own domain (LekkeWeb: `@lekkeweb.co.za`), NOT a temporary shared/other-brand sender used during setup. Switch every sequence's From before launching traffic.

### 5b. Internal sequence engine (the ESP failsafe)

LekkeWeb reference: `lib/sequences/` (engine/store/templates/process), routes under
`/api/sequences/*`, dashboard at `/audit/admin/sequences`. Built 21 Jul 2026 after a
Funnelr domain-validation bug delayed a campaign; the ESP is now replaceable behind env vars.

- [ ] Engine enrolls every lead at unlock in SHADOW mode by default: full sequence state recorded in KV, zero emails sent, so cutover starts with complete data.
- [ ] Pure scheduling core, unit tested: day offsets anchored on `enrolledAt`, `needsHuman` skips the delivery email, one step per lead per run, per-lead send locks.
- [ ] Hard double-send guard: engine refuses to send while the ESP webhook env var exists. Cutover = remove ESP env, set `LEKKE_SEQUENCES=live`, `SEQUENCE_SECRET`, `SEQUENCE_SEND_FROM=<cutover ISO date>` (pre-cutover enrollees are never emailed), `CRON_SECRET`.
- [ ] Sends via Resend (transactional infra rented, automation owned): `List-Unsubscribe` + RFC 8058 one-click headers, HMAC-signed unsubscribe links, suppression list checked before every send. CHECK THE RESEND PLAN: free tier is 100 emails/day, which paid-traffic sequence volume exceeds quickly (steady state = daily leads × emails-per-lead).
- [ ] Day 0 email sends inline at enrollment; later steps via a once-daily cron (`vercel.json`), which is all the granularity day-offset sequences need and is safe on every Vercel plan.
- [ ] Minimal team dashboard behind the admin gate: stage badges (selling / nurturing / booked / finished / unsubscribed), per-step progress dots, next email + due date, mode banner.
- [ ] Known gaps to close before a real cutover: Resend bounce/complaint webhook feeding the suppression list; nurture copy beyond the first two tips; subject A/B variants.

### 5c. Delivery reliability — THREE layers, learned the hard way on live paid traffic

> **CONTEXT (23 Jul 2026):** night one of a paid Meta campaign, 2 of 4 real leads
> silently never reached the CRM. They were captured in our own KV but the Funnelr
> push failed and vanished. Do NOT ship an audit funnel without all three layers below
> — a demo "works", but under real volume a chunk of paid leads disappear with no error
> anywhere. The engine KV (5b) is the reliable source of truth; the ESP is the flaky
> downstream, so every layer exists to reconcile KV -> ESP.

- [ ] **LAYER 1 — run post-conversion work with `after()` (`next/server`), NOT a bare `void` promise.** The notify / ESP push / sequence-enrol legs run AFTER the HTTP response. On Vercel the function can FREEZE the instant the response is sent, cutting an un-awaited promise off mid-flight. This dropped ~half of leads inconsistently. `after(() => work())` guarantees completion within the function's post-response lifetime. The one thing that stays AWAITED is the critical conversion (Meta `Lead`) — it must fire before responding.
- [ ] **LAYER 2 — RETRY every ESP write.** The ESP calls had no retry, so a single transient hiccup on any of the ~4 calls (5xx / 429 / gateway 403 / network) failed the whole upsert and dropped the lead. Retry with backoff on transient statuses; do NOT retry permanent 4xx (400/401/404/422). Gappstack + Resend sit behind Cloudflare, which throttles rapid bursts with a `403 error code 1010` — that is Cloudflare, not the API, and is exactly the transient case retry must absorb. Idempotent ops (find-then-upsert, merge tags/profile) make retry safe — never duplicates.
- [ ] **LAYER 3 — a RECONCILIATION sweep** (LekkeWeb: `lib/funnelr/reconcile.ts`, in the daily cron). For every active engine lead, check it exists in the ESP; if not, re-push the opt-in (idempotent via the ESP history-tag gate). This caught a straggler on its very first run. It is the net for the rare case where every retry still failed. The engine KV is authoritative, so this can always rebuild ESP state. Consider running it more often than daily during a live campaign.
- [ ] Verification gotcha: hammering the ESP API from one IP during debugging trips the Cloudflare 1010 throttle, making your own checks flap. The SERVER path is unaffected (different IP, plus retry). Space out manual verification calls, or verify from the ESP UI.
- [ ] Notify recipients: multi-recipient Resend sends work fine; a 403/1010 mid-burst is the same Cloudflare throttle, not a per-recipient limit. Send one request per event in production.

## 6. Email deliverability / DNS

- [ ] ONE SPF record at the sending domain root, merging ALL senders (e.g. Google Workspace + Funnelr: `v=spf1 a mx include:_spf.google.com include:_spf.gappstack.email ~all`). Two SPF records = permerror; a replaced record locks out the existing sender.
- [ ] Exactly ONE DMARC record at `_dmarc`. Duplicates = receivers treat as NO DMARC. Check for stale leftovers before adding the ESP's record (`dig +short TXT _dmarc.<domain>`).
- [ ] Funnelr limitation: cannot send from a subdomain — sequences send from the root domain. So the root records MUST accommodate every sender. Transactional (Resend) can stay on its own subdomain (e.g. `send.<domain>`) without conflict.
- [ ] Verify against the authoritative nameserver (`dig @<ns> ...`) to separate "record wrong" from "still propagating" from "ESP status cache stale" — three different problems with three different fixes. Green dots on the ESP's record page + Incomplete list status usually means their cache; the Verify button re-checks.
- [ ] Nexubis note: `nexubis.io` is already Connected in Funnelr. Still audit its SPF/DMARC for the duplicate/lockout mistakes above — Connected only means the ESP found ITS records.
- [ ] Funnelr's FULL record set is FOUR records, not three: SPF + DMARC + DKIM TXTs AND a CNAME -> `saas.gappstack.com` (their tracked-link redirect domain). **THIS CNAME WAS THE ACTUAL BLOCKER that stalled lekkeweb.co.za for a day.** KNOWN FUNNELR BUG (reported Jul 2026): the "Add domain" flow only displays the CNAME section for the FIRST domain on an account; later domains show only the three TXTs while the backend still validates the CNAME — the domain sits "Incomplete" with every visible record green and no error naming the missing piece. NOTE the CNAME NAME differs by domain/setup path: `nexubis.io`'s was `go`, `lekkeweb.co.za`'s surfaced as `mail` (via Funnelr's website-linking feature, which is how we forced the hidden CNAME section to appear at all). Do not assume the subdomain name — read it off the record Funnelr shows, or diff against a working domain. The moment the correct CNAME was added, both domains flipped to Connected. The CNAME also matters functionally: without it every tracked link in every sequence email points at the wrong server.
- [ ] After the four records are correct, expect the Funnelr UI to STILL lag: the Domains list can show "Incomplete" and the sequence editor's From-address dropdown can stay greyed ("DNS setup incomplete") for a while, and status can revert on logout until Verify is clicked again. Their domain status is cached inconsistently across surfaces and not persisted between sessions. This is cosmetic once DNS is provably correct; build sequences with a temp sender and switch later.
- [ ] Debugging trick that found it: when one domain works and another is stuck on the same account, `dig` the working domain for every record type (TXT root, `_dmarc`, DKIM selectors, MX, and CNAMEs on likely subdomains: `go`/`track`/`mail`/`bounce`/`send`) and diff against the stuck one. The ESP's UI lies; DNS does not.
- [ ] Wildcard-DNS gotcha: a `*` ALIAS/CNAME (e.g. Vercel's) makes missing subdomains resolve to YOUR infrastructure instead of NXDOMAIN, so an ESP's validator sees a "wrong" answer rather than an absent one. Explicit records override the wildcard.

## 7. Environment variables (production)

| Var | Purpose | Validate by |
| --- | --- | --- |
| `CAL_WEBHOOK_SECRET` | HMAC for the cal.com relay | signed PING returns 200/ignored, unsigned returns 401 |
| `FUNNELR_API_KEY` | auth for the Funnelr REST bridge | shared per-account key; server-only. Present = live client; absent = dry-run. **Sent as the `X-ApiKey` header, NOT a query param (section 5).** |
| `FUNNELR_API_BASE_URL` | Funnelr API root override | optional; defaults to `https://ab513.gappstack.com/api`. Deploying with the key present IS the go-live switch |
| `FUNNELR_NURTURE_AFTER_DAYS` / `FUNNELR_NURTURE_FROM` | nurture-handoff timing + cutover floor | default 12 days; set `FROM=<now>` at go-live so old shadow leads are not back-tagged |
| `META_PIXEL_ID` / `META_CAPI_TOKEN` | server-side events | POST `{"data":[]}` to graph: error code 100 = auth OK, 190 = bad token |
| `RESEND_API_KEY` | internal lead alerts + sequence sends | GET `/domains`: sending domain shows verified |
| `RESEND_WEBHOOK_SECRET` | bounce/complaint suppression (Svix) | send a test event; check it 200s and suppresses |
| `LEKKEWEB_TEAM_EMAIL` | who gets lead alerts (comma list) | run a real-email audit; confirm the alert lands |
| `TURNSTILE_SECRET` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | bot gate | siteverify with dummy token: `invalid-input-response` = secret valid; `invalid-input-secret` = wrong key |
| `AUDIT_INTERNAL_EMAILS` | test-traffic suppression (comma list) | run an audit with a listed email; confirm nothing fires |
| `LEKKE_SEQUENCES` / `SEQUENCE_SECRET` / `SEQUENCE_SEND_FROM` / `CRON_SECRET` | internal sequence engine (section 5b) | shadow by default; these four flip it live |

**Gotchas learned the hard way:**

- `echo val | vercel env add` can silently store EMPTY strings (CLI version dependent). Always verify with `vercel env pull` + byte-compare, or use the REST API (`POST /v10/projects/:id/env?upsert=true`). When piping breaks, use the Vercel REST API directly with the value in the JSON body.
- An env set to `""` is NOT the same as unset: `process.env.X ?? fallback` returns `""`, not the fallback. Parse + validate env strings; never let a blank value flow into an API call (see the empty-recipient Resend bug in section 4).
- Keys transcribed from screenshots: runs of repeated characters (`AAAA...`) are unreliable. Validate against the provider's API, never by eye.
- Env var changes only take effect on the NEXT deployment.
- `NEXT_PUBLIC_*` values bake in at build time.
- Never commit or log a secret. Set via the Vercel REST API / dashboard; redact emails in logs.

## 8. Go-live test plan (in order)

1. Deploy, then smoke test: audit page 200; cal relay rejects unsigned (401) and accepts a locally HMAC-signed PING (200); meta relay returns `{"ok":true}` not skipped.
2. Internal test with a suppressed email: full audit run, Turnstile widget renders, report loads, book + cancel a test call, logs show the internal skip on every leg.
3. ESP side ready: sequences loaded, rules configured, inbound URL(s) plugged in, redeploy.
4. Full E2E with a NON-internal address (personal Gmail): audit -> unlock -> delivery email arrives with correct first name + working unique report link -> book via the EMAIL's link -> sequence exit fires -> `Schedule` lands in Meta exactly once.
5. Pre-campaign sanity: per-audit generation cost known, per-IP rate limit in place, API balances checked, and after day one skim `AuditStart -> Lead -> BookClick -> Schedule` for anomalies.

## 9. Design principles behind all of it (the "why", for judgment calls)

- **One lead, one state.** Every integration exists to keep the sequence state truthful.
- **Clicks are not conversions.** Intent events and confirmed events are different events.
- Every tracking pair (pixel + server) shares an `event_id`; every cross-system pair (embed + webhook) shares a deterministic id. Dedup is designed, not hoped for.
- **Fail open** where a false negative costs a real lead (Turnstile outage, MX blip); **fail closed** where a false positive costs data integrity (webhook signature).
- Analytics and marketing legs are fire-and-forget with retry; they NEVER block the user's report.
- Suppress the team everywhere, in one place.
- Make no promise the system doesn't keep: gate copy, minimum-notice, "we'll email you", DMARC — all either backed by config/code or removed.
