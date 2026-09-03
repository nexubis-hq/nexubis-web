# AI READ FIRST: Funnelr Automation Master Contract

Last updated: 2026-09-02

This document is the single permanent source of truth for Nexubis and LekkeWeb Funnelr automation behaviour in this repository. Future AI agents and human maintainers must read this file before changing Funnelr lists, sequences, tags, automations, contact-routing code, or related scripts.

Any future change to Funnelr tags, lists, sequences, custom fields, automation conditions, automation actions, Scorecard capture logic or booking logic is incomplete until this document is updated in the same code change.

Do not create competing Funnelr automation explanation files. Update this master contract in the same change as any Funnelr automation, routing, or integration update.

## Purpose

The Nexubis Scorecard integration captures qualified Scorecard leads, stores the permanent report URL on the Funnelr contact, and requests campaign routing through temporary trigger tags. The Nexubis Contact form captures general enquiries by applying only Brand and Contact Form Source tags; Funnelr then applies or recognises the durable Contacted Pipeline state and owns campaign exit cleanup. The LekkeWeb website already applies its Brand tag to website contacts, and Funnelr owns LekkeWeb master-list visibility, manual intake routing, campaign membership, sequence enrolment, exit handling, and history safeguards.

The Scorecard and Contact Form website/server integrations are tag-only. Any reintroduction of direct Scorecard or Contact campaign-list or sequence handling in website code is a regression.

## Responsibility Split

The Nexubis website/server only:

- creates or updates the Funnelr contact
- saves `Nexubis | Audit Report URL`
- temporarily mirrors the same report URL into Funnelr's built-in `Last name` field
- applies `Brand: Nexubis`
- applies `Source: Nexubis | Audit`
- applies `Trigger: Nexubis | Start Audit Sales`

Website-side tag resolution is ID-first using stable Funnelr GUIDs, with display-name lookup only as a fallback when ID lookup returns no tag. Website-side Scorecard report custom-field resolution is ID-first by `6CDFB703-9B38-43A3-A2E4-311107F15424`, then key-based by `NexubisScorecardReportURL`, then display-name fallback.

For Contact form submissions only, the Nexubis website/server:

- creates or safely updates the Funnelr contact by email
- applies `Brand: Nexubis`
- applies `Source: Nexubis | Contact Form`
- sends the Resend internal notification

The Contact form must not write `Last name`, custom Scorecard fields, lists, sequences, Trigger tags, Pipeline tags, or History tags. If an existing contact already has `Last name` populated by Scorecard report URL mirroring or any other value, Contact must preserve it byte-for-byte.

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
- Contacted exits
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
| `Source: Nexubis | Audit` | `AA47260F-59B0-4D4A-999F-4D571382658D` | Marks Scorecard as the lead source. |
| `Source: Nexubis | Manual` | `A23C221E-A548-4268-9223-B1DFC688823A` | Reserved for manually entered Nexubis leads. |
| `Source: Nexubis | Contact Form` | `B398BEA3-1E76-410D-AA8B-50F83F283684` | Identifies an enquiry submitted through the Nexubis Contact form; does not trigger a campaign. |
| `Trigger: Nexubis | Start Audit Sales` | `6B9DA797-9A52-4F4F-9854-66FFA1935C07` | Requests Scorecard sales routing. |
| `Trigger: Nexubis | Start Credibility Brief Nurture` | `E654E2FA-B55E-4904-9336-9D45AA6837AB` | Requests nurture routing. Scheduler pending. |
| `Pipeline: Nexubis | Call Booked` | `93347D55-1901-4A2D-90A2-0FCBB6B8A492` | Durable booked state from Cal.com. |
| `Pipeline: Nexubis | Replied` | `3B0905B4-D0C6-4A2D-861D-64D9579D7DE6` | Durable replied state, initially applied manually. |
| `Pipeline: Nexubis | Contacted` | `134F3411-5993-45FF-BA40-45D877513B2B` | Durable direct-enquiry state from Contact form submissions; exits automated sales and nurture while preserving normal Nexubis contact state. |
| `History: Nexubis | Audit Sales Started` | `CD99688F-34FF-4942-9CDC-FF9A7E4A6735` | Prevents duplicate sales enrolment. |
| `History: Nexubis | Credibility Brief Nurture Started` | `A4A6A094-AA39-4288-B2A7-54087866DC4B` | Prevents duplicate nurture enrolment. |

Do not create `Pipeline: Nexubis | Call Cancelled`, needsHuman tags, Full Report tags, No Full Report tags, or new LekkeWeb tags for this integration.

## Nexubis Lists

| List | ID | Notes |
| --- | --- | --- |
| `Nexubis | Scorecard Leads - Sales` | `984BD709-F993-498A-B5BF-0ED86CFA7AAB` | Sales campaign list. Renamed in place from `Scorecard Leads - Sales Sequence`. |
| `Nexubis | The Credibility Brief - Nurture` | `A8A408CE-DB84-415B-9FC1-8EABC2A391A6` | Nurture campaign list. Renamed in place from `The Credibility Brief - Nurture Campaign`. |
| `Nexubis | Call Booked` | `3169E25F-3B23-4E75-8E48-5AC4673E966F` | Booked contacts. Existing list retained. |
| `Nexubis | Manual Leads - Holding` | `49992A25-D155-4674-A0DB-3B8DA00F41E9` | Holding list for manual Nexubis leads. |
| `Nexubis | All Contacts` | `C4AF8E82-8363-4AC5-9B93-D28D1385C75E` | Visibility-only master list for all Nexubis contacts. Not a campaign-recipient list and must not be attached to any sequence. |

`Nexubis | All Contacts` is populated automatically when `Brand: Nexubis` is applied. Team members should not need to add contacts to this list manually. Campaign-state automations must not remove contacts from this list; it persists when contacts enter Scorecard sales, enter nurture, book a call, reply, leave a campaign, or move between campaign states.

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
| `Nexubis | Audit Report URL` | `6CDFB703-9B38-43A3-A2E4-311107F15424` | `NexubisScorecardReportURL` | Text | Website writes the permanent Scorecard report URL. |
| `Nexubis | Scorecard Sales Started At` | `289A7E5A-46A8-4E82-8C5E-4781056FBE21` | `NexubisScorecardSalesStartedAt` | Date | Existing field reserved for later sales-to-nurture scheduling. |

Custom contact-profile fields are discovered through `GET /api/v1/system/formFields`, not `GET /api/v1/user/option/contactFields`.

The permanent Scorecard report URL source of truth is `Nexubis | Audit Report URL`. For Messenger compatibility, the website/server also writes the exact same trimmed HTTPS URL to Funnelr's built-in `Last name` field, represented in the contact create/update API as the standard `lastName` property. The old `Alternative Address` / `street` and `Telephone` / `telephone` mirrors are retired. The website must not write the report URL to `street` or `telephone`; when updating an existing Scorecard contact, it may clear `street` or `telephone` only if the value contains a previous Nexubis Scorecard report URL written by this integration.

## Automations

### Nexubis | Brand Tag - Add to All Contacts

ID: `7C635FEF-2DDB-4EF0-ABB6-8A306B1322B7`  
Enabled: yes

Trigger:

- contact has tag `Brand: Nexubis`

Actions:

1. Add to list `Nexubis | All Contacts`

This automation is visibility-only. It must not apply Source, Trigger, Pipeline, or History tags; add or remove campaign-recipient lists; add or remove sequences; or remove contacts from any list.

### Nexubis | Manual Holding - Apply Contact Tags

ID: `601EA06F-412D-480E-A612-D033F964EB88`  
Enabled: yes

Trigger:

- contact belongs to list `Nexubis | Manual Leads - Holding`

Actions:

1. Apply tag `Brand: Nexubis`
2. Apply tag `Source: Nexubis | Manual`
3. Apply tag `Trigger: Nexubis | Start Credibility Brief Nurture`

A Nexubis team member should only need to create the contact and add it to `Nexubis | Manual Leads - Holding`. This automation communicates intent through tags. It must not directly add the contact to `Nexubis | All Contacts`, the nurture list, the nurture sequence, Scorecard sales, any Pipeline tag, or any History tag.

### Nexubis | Start Scorecard Sales

ID: `B96BE89F-6E20-4799-92A2-6D538680B251`  
Enabled: yes

Trigger:

- contact has tag `Trigger: Nexubis | Start Audit Sales`

Conditions:

- contact does not have `History: Nexubis | Audit Sales Started`
- contact does not have `Pipeline: Nexubis | Call Booked`
- contact does not have `Pipeline: Nexubis | Replied`
- contact does not have `Pipeline: Nexubis | Contacted`

Actions:

1. Add to list `Nexubis | Scorecard Leads - Sales`
2. Remove from list `Nexubis | Manual Leads - Holding`
3. Remove from list `Nexubis | The Credibility Brief - Nurture`
4. Remove from sequence `Nexubis | The Credibility Brief`
5. Add to sequence `Nexubis | Scorecard Sales`
6. Apply tag `History: Nexubis | Audit Sales Started`
7. Remove tag `Trigger: Nexubis | Start Audit Sales`

### Nexubis | Start Credibility Brief Nurture

ID: `AB866C24-8D72-42AB-8D4A-AC97281FE5F0`  
Enabled: yes

Trigger:

- contact has tag `Trigger: Nexubis | Start Credibility Brief Nurture`

Conditions:

- contact does not have `Pipeline: Nexubis | Call Booked`
- contact does not have `Pipeline: Nexubis | Replied`
- contact does not have `History: Nexubis | Credibility Brief Nurture Started`
- contact does not have `Pipeline: Nexubis | Contacted`

Actions:

1. Remove from sequence `Nexubis | Scorecard Sales`
2. Remove from list `Nexubis | Scorecard Leads - Sales`
3. Add to list `Nexubis | The Credibility Brief - Nurture`
4. Add to sequence `Nexubis | The Credibility Brief`
5. Apply tag `History: Nexubis | Credibility Brief Nurture Started`
6. Remove tag `Trigger: Nexubis | Start Credibility Brief Nurture`
7. Remove from list `Nexubis | Manual Leads - Holding`

Sales-to-nurture handoff is pending. The server-side scheduler that applies the nurture trigger is not implemented yet.

Manual Holding is removed when nurture entry succeeds. `Nexubis | All Contacts` must not be removed by this automation.

## Contact Journeys

### Manual-First Lead

1. Team member creates the contact and adds it to `Nexubis | Manual Leads - Holding`.
2. `Nexubis | Manual Holding - Apply Contact Tags` applies Brand, Manual Source, and nurture Trigger tags.
3. `Nexubis | Brand Tag - Add to All Contacts` adds the contact to `Nexubis | All Contacts`.
4. `Nexubis | Start Credibility Brief Nurture` enters the contact into nurture, applies nurture History, removes the temporary nurture Trigger, and removes Manual Holding.
5. If the contact later runs the Scorecard, Scorecard sales may start, but the existing nurture History must remain.
6. A manual-first contact who already received nurture must not be returned to nurture after later completing Scorecard sales.

### Scorecard-First Lead

1. Visitor completes and unlocks the Scorecard.
2. Website creates or updates the contact, writes the report URL to `Nexubis | Audit Report URL`, mirrors the same URL to `Last name`, and applies Brand, Scorecard Source, and sales Trigger tags.
3. Funnelr enters the contact into Scorecard sales and applies Scorecard sales History.
4. A future timed handoff may later apply the nurture Trigger only for Scorecard-first contacts who have never received nurture.

Do not reset or remove `History: Nexubis | Credibility Brief Nurture Started`. The nurture History tag distinguishes manual-first contacts from Scorecard-first contacts for future handoff logic.

### Contact-Form Lead

1. Visitor submits the Contact form.
2. Website finds or creates the Funnelr contact by email.
3. Website applies `Brand: Nexubis`.
4. Website applies `Source: Nexubis | Contact Form`.
5. `Nexubis | Brand Tag - Add to All Contacts` adds the contact to `Nexubis | All Contacts`.
6. No Trigger tag is applied by the website.
7. `Nexubis | Contacted - Exit Campaigns` recognises `Source: Nexubis | Contact Form`, applies `Pipeline: Nexubis | Contacted`, removes the person from Scorecard sales, removes the person from Credibility Brief nurture, removes Manual Holding, and removes temporary sales/nurture Trigger tags.
8. No campaign list or sequence is started by the website.
9. Resend sends the internal notification.
10. `Nexubis | All Contacts`, History tags, Source tags, `Last name`, and Scorecard report data remain untouched by the Contacted exit automation.

If an existing Scorecard, nurture, booked, replied, unsubscribed, or manually entered contact submits the Contact form, the website only adds the Contact Form Source tag if absent and preserves all existing contact data. Funnelr owns the campaign exit cleanup. The Contact form must not remove an existing contact from any sequence or list.

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
7. Remove tag `Trigger: Nexubis | Start Audit Sales`
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
6. Remove tag `Trigger: Nexubis | Start Audit Sales`
7. Remove tag `Trigger: Nexubis | Start Credibility Brief Nurture`

This automation must not remove `Pipeline: Nexubis | Replied` or History tags. Inbox monitoring is not implemented.

### Nexubis | Contacted - Exit Campaigns

ID: `099C14E1-EFE1-401F-ABE6-0C1AAD1361FA`  
Enabled: yes

Trigger:

- contact has tag `Source: Nexubis | Contact Form`

Actions:

1. Apply tag `Pipeline: Nexubis | Contacted`
2. Remove from sequence `Nexubis | Scorecard Sales`
3. Remove from sequence `Nexubis | The Credibility Brief`
4. Remove from list `Nexubis | Scorecard Leads - Sales`
5. Remove from list `Nexubis | The Credibility Brief - Nurture`
6. Remove from list `Nexubis | Manual Leads - Holding`
7. Remove tag `Trigger: Nexubis | Start Audit Sales`
8. Remove tag `Trigger: Nexubis | Start Credibility Brief Nurture`

This automation must not remove `Nexubis | All Contacts`, add `Nexubis | Call Booked`, remove `Pipeline: Nexubis | Contacted`, remove `Pipeline: Nexubis | Call Booked`, remove `Pipeline: Nexubis | Replied`, remove History tags, remove Source tags, change unsubscribe status, change First Name or Last Name, change `Nexubis | Audit Report URL`, send email, add any sequence, or change sequence status.

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

The Scorecard capture flow must only create/update the contact, write `Nexubis | Audit Report URL`, mirror that same URL to `Last name`, and apply the three required tags. It must never directly add or remove the Scorecard sales list, nurture list, holding list, Scorecard sales sequence, or nurture sequence.

## Cal.com Booking Flow

`lib/cal-webhook/handler.ts` verifies the Cal.com webhook signature and event slug.

- `BOOKING_CREATED` and `BOOKING_RESCHEDULED`: find or create the Funnelr contact, then apply `Pipeline: Nexubis | Call Booked`.
- `BOOKING_CANCELLED`: remove `Pipeline: Nexubis | Call Booked` when present.

The Cal.com integration must not apply any Call Cancelled tag and must not start `Booking Confirmation`.

## Funnelr API Notes

Funnelr API requests commonly take 20-100 seconds. Use at least 180 seconds for Funnelr operations. For writes, perform one write at a time, wait for the complete response, read the resource back, and verify ID/name/configuration before continuing.

Do not assume a timeout means the write failed. Before retrying, search by internal ID, old name, and target name. Never blindly repeat create requests.

The endpoint `GET /api/v1/query/option/automationActionTypes` currently returns HTTP 500 in this account and must not block automation work.

## LekkeWeb Contract

Do not edit, rename, recreate, disable, delete, or repurpose any LekkeWeb resource for Nexubis. LekkeWeb resources may be changed only by an explicit LekkeWeb task.

The LekkeWeb website already applies `Brand: LekkeWeb` to LekkeWeb website contacts. No website code change is required for master-list population.

### LekkeWeb Tags

| Tag | ID | Purpose |
| --- | --- | --- |
| `Brand: LekkeWeb` | `D7F84530-6722-4BEB-B0DD-D99A749DC731` | Marks the contact as owned by LekkeWeb. |
| `Source: LekkeWeb | Manual` | `E09C8B71-D6EF-434F-B928-625761821C7C` | Marks manually created LekkeWeb contacts. |
| `Source: Stoep Audit` | `9C2FB5A0-0879-4D49-BC13-E88A6E580853` | Existing Stoep Audit source tag. |
| `Source: Manual - LW` | `DD21EE5F-CC61-4116-9EE3-344128CC2098` | Legacy manual source tag retained unchanged. |
| `Trigger: LekkeWeb | Start Stoep Audit Sales - Full Report` | `51EE549A-F2C3-4944-928E-96AF31FCA561` | Requests full-report sales routing. |
| `Trigger: LekkeWeb | Start Stoep Audit Sales - No Full Report` | `84DEC5B3-0FB1-4114-B233-3FA37FBB80D5` | Requests no-full-report sales routing. |
| `Trigger: LekkeWeb | Start Stoep Tip Nurture` | `F2BA90FD-0B59-4B88-BE74-EA0B3E41CAF0` | Existing trigger reused for Stoep Tip nurture entry. |
| `Pipeline: LekkeWeb | Call Booked` | `9D957D17-E269-45D5-832B-48B8FFFC3F54` | Durable booked state. |
| `Pipeline: LekkeWeb | Replied` | `484E5078-56E2-4F8B-B4D8-D4AC7AD5835F` | Durable replied state. |
| `History: LekkeWeb | Stoep Audit Sales Started` | `B95326E5-E79C-4B29-A72A-BB38C235A1D6` | Existing sales history tag. |
| `History: LekkeWeb | Stoep Tip Nurture Started` | `0025546D-8E1D-458D-864C-3A16BD078B16` | Prevents duplicate Stoep Tip nurture entry. |

### LekkeWeb Lists

| List | ID | Notes |
| --- | --- | --- |
| `LekkeWeb | All Contacts` | `0A17B990-A8DF-49AC-B2FA-F2C2BEE459CB` | Visibility-only master list for all LekkeWeb contacts. Not a campaign-recipient list and must not be attached to any sequence. |
| `LekkeWeb | Manual Leads - Holding` | `8549B002-C386-4809-864D-B38723B48663` | Temporary one-time intake point for manually created LekkeWeb contacts. Not attached to any sequence. |
| `LekkeWeb | Stoep Audit Leads - Full Report` | `82EA6A5C-0E17-4D18-BA32-D7D4D71C7534` | Existing full-report sales campaign list. |
| `LekkeWeb | Stoep Audit Leads - No Full Report` | `D1262321-6D89-4C75-B7E3-8B88845DDBD2` | Existing no-full-report sales campaign list. |
| `LekkeWeb | Stoep Tip Nurture` | `199E6A23-EC82-47E2-AD3D-A64A99BBA35E` | Existing Stoep Tip nurture campaign list. |
| `LekkeWeb | Call Booked` | `DF97E786-2F16-435A-8C2E-D4A2421A00B7` | Existing booked contacts list. |

`LekkeWeb | All Contacts` is populated automatically when `Brand: LekkeWeb` is applied. It is a durable visibility list and must persist when contacts enter a sales campaign, enter Stoep Tip nurture, book a call, reply, exit campaigns, or move between campaign states. Campaign-state automations must not remove contacts from this list.

### LekkeWeb Sequences

| Sequence | ID | Recipient list |
| --- | --- | --- |
| `LekkeWeb | Stoep Audit Sales - Full Report` | `A586ACA7-7A67-45F9-9972-CC6A95B256FE` | `LekkeWeb | Stoep Audit Leads - Full Report` |
| `LekkeWeb | Stoep Audit Sales - No Full Report` | `5BB36DBF-3F1F-4390-A54C-09818BFB2840` | `LekkeWeb | Stoep Audit Leads - No Full Report` |
| `LekkeWeb | Stoep Tip Nurture` | `B2FC5E91-FAD0-433C-A735-7A2D27B46CFD` | `LekkeWeb | Stoep Tip Nurture` |

`LekkeWeb | All Contacts` and `LekkeWeb | Manual Leads - Holding` must not be attached to these or any other sequences.

### LekkeWeb | Brand Tag - Add to All Contacts

ID: `301AD7BD-F256-4F81-90FB-966BF345AFB4`
Enabled: yes

Trigger:

- contact has tag `Brand: LekkeWeb`

Actions:

1. Add to list `LekkeWeb | All Contacts`

This automation must do nothing else. It must not apply Source, Trigger, Pipeline, or History tags; add campaign-recipient lists; add sequences; or remove contacts from any list or sequence.

### LekkeWeb | Manual Holding - Apply Contact Tags

ID: `8977A9AF-0E3E-4FB1-9417-5B946C6476ED`
Enabled: yes

Trigger:

- contact belongs to list `LekkeWeb | Manual Leads - Holding`

Actions:

1. Apply tag `Brand: LekkeWeb`
2. Apply tag `Source: LekkeWeb | Manual`
3. Apply tag `Trigger: LekkeWeb | Start Stoep Tip Nurture`

A LekkeWeb team member should only need to create the contact and add it to `LekkeWeb | Manual Leads - Holding`. This automation communicates intent through tags. It must not directly add the contact to `LekkeWeb | All Contacts`, the Stoep Tip nurture list, the Stoep Tip nurture sequence, either sales list, either sales sequence, any Pipeline tag, or any History tag.

### LekkeWeb | Start Stoep Tip Nurture

ID: `96441BD0-AD7F-4A5F-AD8C-7DF5E38697A3`
Enabled: yes

Trigger:

- contact has tag `Trigger: LekkeWeb | Start Stoep Tip Nurture`

Conditions:

- contact does not have `History: LekkeWeb | Stoep Tip Nurture Started`
- contact does not have `Pipeline: LekkeWeb | Call Booked`
- contact does not have `Pipeline: LekkeWeb | Replied`

Actions:

1. Remove from list `LekkeWeb | Stoep Audit Leads - Full Report`
2. Remove tag `Trigger: LekkeWeb | Start Stoep Tip Nurture`
3. Remove from sequence `LekkeWeb | Stoep Audit Sales - No Full Report`
4. Add to list `LekkeWeb | Stoep Tip Nurture`
5. Apply tag `History: LekkeWeb | Stoep Tip Nurture Started`
6. Add to sequence `LekkeWeb | Stoep Tip Nurture`
7. Remove from sequence `LekkeWeb | Stoep Audit Sales - Full Report`
8. Remove from list `LekkeWeb | Manual Leads - Holding`

Manual Holding is removed when nurture entry succeeds. `LekkeWeb | All Contacts` must not be removed by this automation.

### LekkeWeb | Start Stoep Audit Sales - Full Report

ID: `48B6CCE0-BAB2-4871-B392-68B7CADE1B4F`
Enabled: yes

Trigger:

- contact has tag `Trigger: LekkeWeb | Start Stoep Audit Sales - Full Report`

Conditions:

- contact does not have `History: LekkeWeb | Stoep Audit Sales Started`
- contact does not have `Pipeline: LekkeWeb | Call Booked`
- contact does not have `Pipeline: LekkeWeb | Replied`

This automation must not exclude contacts with `History: LekkeWeb | Stoep Tip Nurture Started`. A contact who previously entered Stoep Tip nurture remains eligible for first-time full-report sales. The Stoep Tip nurture History tag is permanent and must not be removed or reset.

Actions:

1. Remove from sequence `LekkeWeb | Stoep Tip Nurture`
2. Remove from list `LekkeWeb | Stoep Audit Leads - No Full Report`
3. Remove from list `LekkeWeb | Stoep Tip Nurture`
4. Add to sequence `LekkeWeb | Stoep Audit Sales - Full Report`
5. Add to list `LekkeWeb | Stoep Audit Leads - Full Report`
6. Remove from list `LekkeWeb | Manual Leads - Holding`
7. Apply tag `History: LekkeWeb | Stoep Audit Sales Started`
8. Remove tag `Trigger: LekkeWeb | Start Stoep Audit Sales - Full Report`

`LekkeWeb | All Contacts` must not be removed by this automation. The automation must not add the contact to `LekkeWeb | Stoep Audit Sales - No Full Report`.

### LekkeWeb | Call Booked - Exit Campaigns

ID: `25457BA6-554C-488A-9E17-0B516D06E215`
Enabled: yes

Trigger:

- contact has tag `Pipeline: LekkeWeb | Call Booked`

This automation removes active LekkeWeb sales and Stoep Tip nurture campaign lists/sequences, removes temporary LekkeWeb Trigger tags, adds the contact to `LekkeWeb | Call Booked`, and removes `LekkeWeb | Manual Leads - Holding`. It must not remove `LekkeWeb | All Contacts` or the `Pipeline: LekkeWeb | Call Booked` tag.

### LekkeWeb | Replied - Exit Campaigns

ID: `D8424132-9ECB-4FF1-AFD7-CF3462DBD9BD`
Enabled: yes

Trigger:

- contact has tag `Pipeline: LekkeWeb | Replied`

This automation removes active LekkeWeb sales and Stoep Tip nurture campaign lists/sequences, removes temporary LekkeWeb Trigger tags, and removes `LekkeWeb | Manual Leads - Holding`. It must not remove `LekkeWeb | All Contacts` or the `Pipeline: LekkeWeb | Replied` tag.

### LekkeWeb Manual Contact Journey

1. Team member creates the contact in Funnelr.
2. Team member adds the contact only to `LekkeWeb | Manual Leads - Holding`.
3. `LekkeWeb | Manual Holding - Apply Contact Tags` applies Brand, Manual Source, and the existing Stoep Tip nurture Trigger.
4. `LekkeWeb | Brand Tag - Add to All Contacts` adds the contact to `LekkeWeb | All Contacts`.
5. `LekkeWeb | Start Stoep Tip Nurture` adds the contact to the existing Stoep Tip nurture list and sequence, applies nurture History, removes the temporary nurture Trigger, and removes Manual Holding.

### LekkeWeb Nurture-to-Full-Report Sales Journey

1. Existing contact has Brand, belongs to `LekkeWeb | All Contacts`, belongs to the Stoep Tip nurture list and sequence, and has `History: LekkeWeb | Stoep Tip Nurture Started`.
2. Contact completes the LekkeWeb audit unlock for the first time and receives `Trigger: LekkeWeb | Start Stoep Audit Sales - Full Report`.
3. `LekkeWeb | Start Stoep Audit Sales - Full Report` removes the contact from the Stoep Tip nurture list and sequence.
4. The same automation adds the contact to `LekkeWeb | Stoep Audit Leads - Full Report` and `LekkeWeb | Stoep Audit Sales - Full Report`.
5. The automation applies `History: LekkeWeb | Stoep Audit Sales Started` and removes the temporary full-report sales Trigger.
6. The contact remains in `LekkeWeb | All Contacts`, keeps the permanent Stoep Tip nurture History tag, and is not added to the no-full-report sales sequence.

Website-side Last Name report-URL mirroring remains a separate LekkeWeb developer task. This Funnelr correction did not change website code, report-generation code, contact creation, report URL custom-field writing, `LekkeWeb | Report URL`, Last Name mirroring, or any `street` / Alternative Address behaviour.

Use stable tag, list, and sequence IDs for contact-level read-back because Funnelr contact membership endpoints may return valid IDs with `name: null`.

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

- New Scorecard contact creates one contact, saves report URL to `Nexubis | Audit Report URL`, mirrors the same URL to `Last name`, applies brand/source/sales trigger, then Funnelr applies sales history, sales list, sales sequence, and removes trigger.
- Brand-tagged Nexubis contact is automatically added to `Nexubis | All Contacts` with no campaign Source, Trigger, Pipeline, History, list, or sequence changes.
- Contact-form website code creates or updates one Funnelr contact by email, applies only `Brand: Nexubis` and `Source: Nexubis | Contact Form`, and relies on Funnelr automations for `Nexubis | All Contacts`, Contacted state, and campaign cleanup.
- Contact-form website code never applies Scorecard sales Trigger, nurture Trigger, Pipeline, History, Manual Source, Manual Holding membership, any list operation, any sequence operation, or any Scorecard custom-field update.
- `Nexubis | Contacted - Exit Campaigns` applies `Pipeline: Nexubis | Contacted`, removes Scorecard sales and Credibility Brief sequences/lists, removes Manual Holding, removes temporary sales/nurture Trigger tags, preserves `Nexubis | All Contacts`, preserves Source and History tags, preserves `Last name`, and preserves `Nexubis | Audit Report URL`.
- Contacts with `Pipeline: Nexubis | Contacted` do not enter `Nexubis | Start Scorecard Sales` or `Nexubis | Start Credibility Brief Nurture`.
- Contact-form lead preserves existing `Last name` byte-for-byte, including Scorecard report URL mirrors and ordinary surname values.
- Manual contact added to `Nexubis | Manual Leads - Holding` receives Brand, Manual Source, and nurture Trigger tags, then enters nurture through the existing nurture automation.
- Existing contact submission updates the same contact and report URL without duplicating contact or sequence enrolment.
- Existing contact submission writes the latest permanent report URL to `Last name` and removes stale `street` or `telephone` values only when they contain a previous Nexubis Scorecard report URL.
- Repeated trigger does not reset sequence progress or resend Email 1.
- Call Booked removes active campaign lists/sequences, adds `Nexubis | Call Booked`, keeps the booked Pipeline tag, and does not start `Booking Confirmation`.
- Replied removes active campaign lists/sequences, keeps the replied Pipeline tag, and keeps History tags.
- Nurture transition removes sales, adds nurture list/sequence, applies nurture History, and removes nurture Trigger.
- Booked and replied contacts do not enter nurture when the nurture Trigger is applied.
- Existing list membership, sequence progress, unsubscribe status, and email history are preserved by resource renames.
- LekkeWeb website contacts that receive `Brand: LekkeWeb` are automatically added to `LekkeWeb | All Contacts` with no campaign Source, Trigger, Pipeline, History, campaign-list, or sequence changes.
- LekkeWeb manual contacts added only to `LekkeWeb | Manual Leads - Holding` receive Brand, Manual Source, and the existing Stoep Tip nurture Trigger, then enter the existing Stoep Tip nurture journey.
- LekkeWeb Stoep Tip nurture entry removes `LekkeWeb | Manual Leads - Holding` and never removes `LekkeWeb | All Contacts`.
- LekkeWeb nurture-to-full-report sales removes the Stoep Tip nurture list and sequence, adds the full-report sales list and sequence, applies full-report sales History, removes the temporary full-report Trigger, keeps Stoep Tip nurture History, keeps `LekkeWeb | All Contacts`, and does not add the no-full-report sequence.
- LekkeWeb Call Booked and Replied exits remove `LekkeWeb | Manual Leads - Holding`, preserve their durable Pipeline tags, clean up campaign lists/sequences, and never remove `LekkeWeb | All Contacts`.
- LekkeWeb `All Contacts` and `Manual Leads - Holding` are not sequence recipient lists.

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

2026-09-02:

- Renamed Nexubis display names in code and documentation while preserving stable IDs: `Source: Nexubis | Audit`, `Trigger: Nexubis | Start Audit Sales`, and `History: Nexubis | Audit Sales Started`.
- Updated the Scorecard report custom-field display name to `Nexubis | Audit Report URL` while preserving field ID `6CDFB703-9B38-43A3-A2E4-311107F15424` and key `NexubisScorecardReportURL`.
- Documented that website-side tag resolution is ID-first with display-name fallback, and the report URL field resolution is ID-first, then key-based, then display-name fallback.

2026-07-30:

- Created and verified `Pipeline: Nexubis | Contacted` with stable ID `134F3411-5993-45FF-BA40-45D877513B2B`.
- Created and enabled `Nexubis | Contacted - Exit Campaigns` with stable ID `099C14E1-EFE1-401F-ABE6-0C1AAD1361FA`.
- Configured `Nexubis | Contacted - Exit Campaigns` to trigger from `Source: Nexubis | Contact Form`, apply `Pipeline: Nexubis | Contacted`, remove Scorecard sales and Credibility Brief campaign lists/sequences, remove `Nexubis | Manual Leads - Holding`, and remove temporary sales/nurture Trigger tags.
- Verified the Contacted exit automation preserves `Nexubis | All Contacts`, booked/replied/contacted Pipeline tags, History tags, Source tags, `Last name`, unsubscribe status, and Scorecard report data.
- Updated `Nexubis | Start Scorecard Sales` to exclude contacts with `Pipeline: Nexubis | Contacted` while preserving existing trigger, conditions, and actions.
- Updated `Nexubis | Start Credibility Brief Nurture` to exclude contacts with `Pipeline: Nexubis | Contacted` while preserving existing trigger, conditions, and actions.
- Confirmed Contact-form website code remains unchanged: it applies only `Brand: Nexubis` and `Source: Nexubis | Contact Form`, sends the Resend notification, and does not directly manage lists, sequences, Pipeline tags, History tags, Last Name, or Scorecard custom fields.

2026-07-28:

- Created and verified `Source: Nexubis | Contact Form` with stable ID `B398BEA3-1E76-410D-AA8B-50F83F283684`.
- Documented the Contact-Form Lead journey as a neutral tag-only Funnelr path.
- Confirmed Contact form routing applies only `Brand: Nexubis` and `Source: Nexubis | Contact Form`.
- Confirmed Contact form routing does not apply Trigger, Pipeline, or History tags; does not add lists or sequences; does not touch Manual Holding; and does not update Scorecard custom fields or `Last name`.
- Documented Resend as the secondary internal-notification layer for Contact form submissions after Funnelr capture succeeds.

2026-07-27:

- Corrected `LekkeWeb | Start Stoep Audit Sales - Full Report` (`48B6CCE0-BAB2-4871-B392-68B7CADE1B4F`) by adding the missing removal actions for `LekkeWeb | Stoep Tip Nurture` list (`199E6A23-EC82-47E2-AD3D-A64A99BBA35E`) and sequence (`B2FC5E91-FAD0-433C-A735-7A2D27B46CFD`).
- Verified the full-report sales conditions exclude only existing full-report sales History (`B95326E5-E79C-4B29-A72A-BB38C235A1D6`), Call Booked (`9D957D17-E269-45D5-832B-48B8FFFC3F54`), and Replied (`484E5078-56E2-4F8B-B4D8-D4AC7AD5835F`), while allowing permanent Stoep Tip nurture History (`0025546D-8E1D-458D-864C-3A16BD078B16`).
- Controlled Funnelr test passed with contact `lekkeweb.funnelr.final.202607271257@lekkeweb.co.za`, user ID `67`: direct full-report Trigger application removed Stoep Tip nurture list/sequence, added full-report sales list/sequence, applied full-report sales History, removed the temporary Trigger, preserved Stoep Tip nurture History, preserved `LekkeWeb | All Contacts`, left Manual Holding absent, and did not add the no-full-report sequence.
- Website-side Last Name report-URL mirroring remains a separate LekkeWeb developer task and is not completed by this Funnelr-side correction.

2026-07-24:

- Created `LekkeWeb | All Contacts` as the visibility-only master list for LekkeWeb contacts.
- Reused `LekkeWeb | Manual Leads - Holding` as the temporary manual intake list.
- Created `Source: LekkeWeb | Manual` and left the legacy `Source: Manual - LW` tag unchanged.
- Created and enabled `LekkeWeb | Brand Tag - Add to All Contacts`.
- Created and enabled `LekkeWeb | Manual Holding - Apply Contact Tags`.
- Updated `LekkeWeb | Start Stoep Tip Nurture` to remove `LekkeWeb | Manual Leads - Holding` when nurture entry succeeds.
- Verified existing `LekkeWeb | Call Booked - Exit Campaigns` and `LekkeWeb | Replied - Exit Campaigns` remove Manual Holding and do not remove All Contacts.
- Documented stable-ID contact read-back for LekkeWeb tests because contact-level tag/list endpoints can return `name: null`.
- Replaced the failed `Telephone` / `telephone` Messenger workaround with the built-in `Last name` field, represented by the contact `lastName` API property.
- Confirmed the custom `Nexubis | Audit Report URL` field remains the permanent source of truth and both the custom field and `Last name` must be updated on new and existing unlocks with a valid HTTPS report URL.
- Created `Nexubis | All Contacts` as the visibility-only master list for Nexubis contacts.
- Created and enabled `Nexubis | Brand Tag - Add to All Contacts`.
- Created and enabled `Nexubis | Manual Holding - Apply Contact Tags`.
- Updated `Nexubis | Start Credibility Brief Nurture` to remove `Nexubis | Manual Leads - Holding` when nurture entry succeeds.
- Documented manual-first and Scorecard-first journeys and confirmed nurture History must not be reset.
- Renamed this file to `AI_READ_FIRST_FUNNELR_AUTOMATION_MASTER_CONTRACT.md` and removed obsolete `.txt` migration handoff artifacts so this remains the single master automation logic document.
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
