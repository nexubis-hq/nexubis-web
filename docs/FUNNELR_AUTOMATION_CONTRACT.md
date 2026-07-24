# Funnelr Automation Contract

Last updated: 2026-07-24

This document is the permanent source of truth for Nexubis Funnelr behaviour in this repository.

Any future change to Funnelr tags, lists, sequences, custom fields, automation conditions, automation actions, Scorecard capture logic or booking logic is incomplete until this document is updated in the same code change.

Before performing future Funnelr work, Codex must read this document first.

## Purpose

The Nexubis Scorecard integration captures qualified Scorecard leads, stores the permanent report URL on the Funnelr contact, and requests campaign routing through temporary trigger tags. Funnelr owns campaign membership, sequence enrolment, exit handling, and history safeguards.

The Scorecard website/server integration is tag-only. Any reintroduction of direct Scorecard campaign-list or sequence handling in website code is a regression.

## Responsibility Split

The Nexubis website/server only:

- creates or updates the Funnelr contact
- saves `Nexubis | Scorecard Report URL`
- applies `Brand: Nexubis`
- applies `Source: Nexubis | Scorecard`
- applies `Trigger: Nexubis | Start Scorecard Sales`

The website/server must not:

- add contacts directly to campaign lists
- add contacts directly to sequences
- remove contacts from campaign lists or sequences
- find, verify, add, or remove Scorecard campaign-list membership
- add, remove, or verify Scorecard sequence enrolment
- apply History tags
- recreate Funnelr automation logic in code

Funnelr automations own:

- list membership
- sequence enrolment and removal
- History tags
- temporary Trigger tag removal
- Call Booked exits
- Replied exits
- nurture transitions

## Tag Taxonomy

- `Brand:` identifies the business that owns the contact. It never triggers campaigns.
- `Source:` identifies where the lead came from. It never triggers campaigns.
- `Trigger:` requests a specific Funnelr automation. It is temporary and removed by the automation after successful processing.
- `Pipeline:` represents a durable business state such as booked or replied. It can trigger exit automations and remains on the contact.
- `History:` records that a journey already started. It is applied only by Funnelr automation and remains to prevent duplicate enrolment.

## Nexubis Tags

| Tag | ID | Purpose |
| --- | --- | --- |
| `Brand: Nexubis` | `4B527D4D-3540-401D-A0B1-A1BBDF0FADFF` | Marks the contact as owned by Nexubis. |
| `Source: Nexubis | Scorecard` | `AA47260F-59B0-4D4A-999F-4D571382658D` | Marks Scorecard as the lead source. |
| `Source: Nexubis | Manual` | `A23C221E-A548-4268-9223-B1DFC688823A` | Reserved for manually entered Nexubis leads. |
| `Trigger: Nexubis | Start Scorecard Sales` | `6B9DA797-9A52-4F4F-9854-66FFA1935C07` | Requests Scorecard sales routing. |
| `Trigger: Nexubis | Start Credibility Brief Nurture` | `E654E2FA-B55E-4904-9336-9D45AA6837AB` | Requests nurture routing. Scheduler pending. |
| `Pipeline: Nexubis | Call Booked` | `93347D55-1901-4A2D-90A2-0FCBB6B8A492` | Durable booked state from Cal.com. |
| `Pipeline: Nexubis | Replied` | `3B0905B4-D0C6-4A2D-861D-64D9579D7DE6` | Durable replied state, initially applied manually. |
| `History: Nexubis | Scorecard Sales Started` | `CD99688F-34FF-4942-9CDC-FF9A7E4A6735` | Prevents duplicate sales enrolment. |
| `History: Nexubis | Credibility Brief Nurture Started` | `A4A6A094-AA39-4288-B2A7-54087866DC4B` | Prevents duplicate nurture enrolment. |

Do not create `Pipeline: Nexubis | Call Cancelled`, needsHuman tags, Full Report tags, No Full Report tags, or new LekkeWeb tags for this integration.

## Nexubis Lists

| List | ID | Notes |
| --- | --- | --- |
| `Nexubis | Scorecard Leads - Sales` | `984BD709-F993-498A-B5BF-0ED86CFA7AAB` | Sales campaign list. Renamed in place from `Scorecard Leads - Sales Sequence`. |
| `Nexubis | The Credibility Brief - Nurture` | `A8A408CE-DB84-415B-9FC1-8EABC2A391A6` | Nurture campaign list. Renamed in place from `The Credibility Brief - Nurture Campaign`. |
| `Nexubis | Call Booked` | `3169E25F-3B23-4E75-8E48-5AC4673E966F` | Booked contacts. Existing list retained. |
| `Nexubis | Manual Leads - Holding` | `49992A25-D155-4674-A0DB-3B8DA00F41E9` | Holding list for manual Nexubis leads. |

## Nexubis Sequences

| Sequence | ID | Status | Recipient list |
| --- | --- | --- | --- |
| `Nexubis | Scorecard Sales` | `2840DFB3-76CC-4B0D-8905-5ADE8CE9E2F7` | Paused | `Nexubis | Scorecard Leads - Sales` |
| `Nexubis | The Credibility Brief` | `400843E0-EE89-4916-9828-FDE13E35AD61` | Paused | `Nexubis | The Credibility Brief - Nurture` |
| `Booking Confirmation` | `370EC033-523A-4F22-BB18-9D5022CAC27C` | Paused | none |

`Booking Confirmation` is not part of final campaign logic. It is not deleted because it contains history. It must not be added by any active Nexubis automation. Its former `Nexubis | Call Booked` recipient-list mapping was removed on 2026-07-23 to prevent booked contacts entering this sequence.

Sequence activation remains a separate launch decision because activating sequences could send emails to currently enrolled contacts.

## Custom Fields

| Field | ID | Key | Control | Use |
| --- | --- | --- | --- | --- |
| `Nexubis | Scorecard Report URL` | `6CDFB703-9B38-43A3-A2E4-311107F15424` | `NexubisScorecardReportURL` | Text | Website writes the permanent Scorecard report URL. |
| `Nexubis | Scorecard Sales Started At` | `289A7E5A-46A8-4E82-8C5E-4781056FBE21` | `NexubisScorecardSalesStartedAt` | Date | Existing field reserved for later sales-to-nurture scheduling. |

Custom contact-profile fields are discovered through `GET /api/v1/system/formFields`, not `GET /api/v1/user/option/contactFields`.

## Automations

### Nexubis | Start Scorecard Sales

ID: `B96BE89F-6E20-4799-92A2-6D538680B251`  
Enabled: yes

Trigger:

- contact has tag `Trigger: Nexubis | Start Scorecard Sales`

Conditions:

- contact does not have `History: Nexubis | Scorecard Sales Started`
- contact does not have `Pipeline: Nexubis | Call Booked`
- contact does not have `Pipeline: Nexubis | Replied`

Actions:

1. Add to list `Nexubis | Scorecard Leads - Sales`
2. Remove from list `Nexubis | Manual Leads - Holding`
3. Remove from list `Nexubis | The Credibility Brief - Nurture`
4. Remove from sequence `Nexubis | The Credibility Brief`
5. Add to sequence `Nexubis | Scorecard Sales`
6. Apply tag `History: Nexubis | Scorecard Sales Started`
7. Remove tag `Trigger: Nexubis | Start Scorecard Sales`

### Nexubis | Start Credibility Brief Nurture

ID: `AB866C24-8D72-42AB-8D4A-AC97281FE5F0`  
Enabled: yes

Trigger:

- contact has tag `Trigger: Nexubis | Start Credibility Brief Nurture`

Conditions:

- contact does not have `Pipeline: Nexubis | Call Booked`
- contact does not have `Pipeline: Nexubis | Replied`
- contact does not have `History: Nexubis | Credibility Brief Nurture Started`

Actions:

1. Remove from sequence `Nexubis | Scorecard Sales`
2. Remove from list `Nexubis | Scorecard Leads - Sales`
3. Add to list `Nexubis | The Credibility Brief - Nurture`
4. Add to sequence `Nexubis | The Credibility Brief`
5. Apply tag `History: Nexubis | Credibility Brief Nurture Started`
6. Remove tag `Trigger: Nexubis | Start Credibility Brief Nurture`

Sales-to-nurture handoff is pending. The server-side scheduler that applies the nurture trigger is not implemented yet.

### Nexubis | Call Booked - Exit Campaigns

ID: `5DC71700-3E79-42DB-92EE-04BDADC3BA83`  
Enabled: yes

Trigger:

- contact has tag `Pipeline: Nexubis | Call Booked`

Actions:

1. Remove from sequence `Nexubis | Scorecard Sales`
2. Remove from sequence `Nexubis | The Credibility Brief`
3. Remove from list `Nexubis | Scorecard Leads - Sales`
4. Remove from list `Nexubis | The Credibility Brief - Nurture`
5. Remove from list `Nexubis | Manual Leads - Holding`
6. Add to list `Nexubis | Call Booked`
7. Remove tag `Trigger: Nexubis | Start Scorecard Sales`
8. Remove tag `Trigger: Nexubis | Start Credibility Brief Nurture`

This automation must not remove `Pipeline: Nexubis | Call Booked` or History tags.

### Nexubis | Replied - Exit Campaigns

ID: `5249EFD5-5193-4C73-9EF7-E8FD1E63A558`  
Enabled: yes

Trigger:

- contact has tag `Pipeline: Nexubis | Replied`

Actions:

1. Remove from sequence `Nexubis | Scorecard Sales`
2. Remove from sequence `Nexubis | The Credibility Brief`
3. Remove from list `Nexubis | Scorecard Leads - Sales`
4. Remove from list `Nexubis | The Credibility Brief - Nurture`
5. Remove from list `Nexubis | Manual Leads - Holding`
6. Remove tag `Trigger: Nexubis | Start Scorecard Sales`
7. Remove tag `Trigger: Nexubis | Start Credibility Brief Nurture`

This automation must not remove `Pipeline: Nexubis | Replied` or History tags. Inbox monitoring is not implemented.

## Scorecard Capture Point

Funnelr actions happen only when a visitor:

1. runs the Scorecard
2. sees the report preview
3. enters personal contact details
4. submits the unlock form

Current flow:

1. `components/scorecard/report/UnlockPanel.tsx`
2. `/api/scorecard/unlock`
3. `/api/leads/scorecard`
4. `submitScorecardLeadToFunnelr()`

Do not send leads to Funnelr when the Scorecard page loads, the scan begins, the preview is generated, the contact form opens, or an existing report is viewed.

The Scorecard capture flow must only create/update the contact, write `Nexubis | Scorecard Report URL`, and apply the three required tags. It must never directly add or remove the Scorecard sales list, nurture list, holding list, Scorecard sales sequence, or nurture sequence.

## Cal.com Booking Flow

`lib/cal-webhook/handler.ts` verifies the Cal.com webhook signature and event slug.

- `BOOKING_CREATED` and `BOOKING_RESCHEDULED`: find or create the Funnelr contact, then apply `Pipeline: Nexubis | Call Booked`.
- `BOOKING_CANCELLED`: remove `Pipeline: Nexubis | Call Booked` when present.

The Cal.com integration must not apply any Call Cancelled tag and must not start `Booking Confirmation`.

## Funnelr API Notes

Funnelr API requests commonly take 20-100 seconds. Use at least 180 seconds for Funnelr operations. For writes, perform one write at a time, wait for the complete response, read the resource back, and verify ID/name/configuration before continuing.

Do not assume a timeout means the write failed. Before retrying, search by internal ID, old name, and target name. Never blindly repeat create requests.

The endpoint `GET /api/v1/query/option/automationActionTypes` currently returns HTTP 500 in this account and must not block automation work.

## LekkeWeb Boundary

Do not edit, rename, recreate, disable, delete, or repurpose any LekkeWeb resource for Nexubis.

Known protected LekkeWeb resources:

- `Brand: LekkeWeb`
- `Source: Stoep Audit`
- `Source: Manual - LW`
- `Trigger: LekkeWeb | Start Stoep Audit Sales - Full Report`
- `Trigger: LekkeWeb | Start Stoep Audit Sales - No Full Report`
- `Trigger: LekkeWeb | Start Stoep Tip Nurture`
- `Pipeline: LekkeWeb | Call Booked`
- `Pipeline: LekkeWeb | Replied`
- `History: LekkeWeb | Stoep Audit Sales Started`
- `History: LekkeWeb | Stoep Tip Nurture Started`

Deferred LekkeWeb cleanup:

- `Source: Stoep Audit` should later become `Source: LekkeWeb | Stoep Audit`, but that is outside the Nexubis migration.

## Legacy Resources Requiring Later Review

Do not delete or rename these without separate approval:

- `Scorecard Sent`
- `Source: Direct Nurture`
- `winner - loom`
- `Pipeline: New`
- `Pipeline: Reviewing`
- `Pipeline: Won`
- `Pipeline: Lost`
- `NL`
- `BE`
- `DE`

## Testing Checklist

- New Scorecard contact creates one contact, saves report URL, applies brand/source/sales trigger, then Funnelr applies sales history, sales list, sales sequence, and removes trigger.
- Existing contact submission updates the same contact and report URL without duplicating contact or sequence enrolment.
- Repeated trigger does not reset sequence progress or resend Email 1.
- Call Booked removes active campaign lists/sequences, adds `Nexubis | Call Booked`, keeps the booked Pipeline tag, and does not start `Booking Confirmation`.
- Replied removes active campaign lists/sequences, keeps the replied Pipeline tag, and keeps History tags.
- Nurture transition removes sales, adds nurture list/sequence, applies nurture History, and removes nurture Trigger.
- Booked and replied contacts do not enter nurture when the nurture Trigger is applied.
- Existing list membership, sequence progress, unsubscribe status, and email history are preserved by resource renames.
- LekkeWeb resource names, IDs, statuses, and automation configuration remain unchanged.

## Rollback Information

Original resource names:

- List `984BD709-F993-498A-B5BF-0ED86CFA7AAB`: `Scorecard Leads - Sales Sequence`
- List `A8A408CE-DB84-415B-9FC1-8EABC2A391A6`: `The Credibility Brief - Nurture Campaign`
- Sequence `2840DFB3-76CC-4B0D-8905-5ADE8CE9E2F7`: `Scorecard Leads`
- Sequence `400843E0-EE89-4916-9828-FDE13E35AD61`: `The Credibility Brief`
- Tag `6B9DA797-9A52-4F4F-9854-66FFA1935C07`: `Scorecard Request`
- Tag `93347D55-1901-4A2D-90A2-0FCBB6B8A492`: `Pipeline: Call Booked`
- Tag `AA47260F-59B0-4D4A-999F-4D571382658D`: `Source: Scorecard`
- Automation `B96BE89F-6E20-4799-92A2-6D538680B251`: `Scorecard List -> Start Sales Sequence`
- Automation `AB866C24-8D72-42AB-8D4A-AC97281FE5F0`: `Nurture List -> Start Credibility Brief`
- Automation `5DC71700-3E79-42DB-92EE-04BDADC3BA83`: `Call-booked automation`

Rollback steps:

1. Disable `Nexubis | Replied - Exit Campaigns`.
2. Revert edited automation filters/actions using the pre-migration snapshot.
3. Rename resources back using the same IDs above.
4. Restore the `Booking Confirmation` recipient mapping only if explicitly returning to the old booking sequence behaviour.
5. Revert code to direct list assignment only if explicitly rolling back the tag-driven contract.
6. Do not delete contacts, contact profile values, sequence users, email history, automation history, unsubscribe records, or test evidence.

## Change Log

2026-07-24:

- Removed direct Scorecard list-routing behaviour that was reintroduced during branch merge resolution.
- Reconfirmed the website/server Scorecard integration as tag-only: contact create/update, report URL custom field, Brand tag, Source tag, and sales Trigger tag.
- Added explicit regression warning that the Scorecard website must never directly add/remove campaign lists or sequences.

2026-07-23:

- Renamed Nexubis lists, sequences, and tags into final `Nexubis |` / prefixed tag structure.
- Created missing `Brand`, `Source`, `Trigger`, `Pipeline`, and `History` tags.
- Created `Nexubis | Manual Leads - Holding`.
- Updated three existing Nexubis automations in place.
- Created and enabled `Nexubis | Replied - Exit Campaigns`.
- Removed active Booking Confirmation routing from final Nexubis campaign logic.
- Updated website integration to tag-only routing and fixed custom-field discovery.
- Updated Cal.com booking logic to use `Pipeline: Nexubis | Call Booked` and remove Call Cancelled behaviour.
