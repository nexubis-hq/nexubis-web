# Funnelr API Verification

Source of truth: `https://ab513.gappstack.com/api/swagger/v1/swagger.json`

Swagger UI: `https://ab513.gappstack.com/api/swagger/index.html`

## Base URL and Authentication

- Base URL: `https://ab513.gappstack.com`
- OpenAPI `servers`: not declared.
- OpenAPI `securitySchemes`: not declared.
- API key location accepted by live read-only verification: query parameter `apiKey=<REDACTED>`.
- Authorization header: not used by the read-only client.
- Bearer prefix: not used.

## Read-Only Client

The server-only client is in `lib/funnelr/client.ts`.

Scorecard routing note: `/api/leads/scorecard` and `submitScorecardLeadToFunnelr()` must not call list or sequence endpoints. They are limited to contact create/update, `GET /api/v1/system/formFields`, custom profile update, and tag assignment. Funnelr automation triggered by `Trigger: Nexubis | Start Scorecard Sales` owns campaign-list and sequence movement.

Implemented read-only functions:

- `testAuthentication()` -> `GET /api/v1/user/users/count`
- `listContacts()` / `listUsers()` -> `GET /api/v1/user/users?Page=1&Size=1`
- `findContactByEmail(email)` -> `GET /api/v1/user/users?Email=...&Page=1&Size=1`
- `listLists()` -> `GET /api/v1/user/lists`
- `listTags()` -> `GET /api/v1/user/tags`
- `listSequences()` -> `GET /api/v1/messenger/sequences`
- `listSystemFormFields()` -> `GET /api/v1/system/formFields`

Run:

```bash
npm run funnelr:inspect
```

The command performs only GET requests and prints sanitized endpoint availability summaries.

## Relevant Documented Operations

| Capability | Method and path | Required identifiers/body |
| --- | --- | --- |
| List/search users/contacts | `GET /api/v1/user/users` | Required query: `Page`, `Size`. Optional query includes `Email`, `Search`, `ListId`, `TagId`, `IsDeleted`. |
| Find contact by email | `GET /api/v1/user/users` | Query: `Email`, plus required `Page`, `Size`. |
| Create contact/user | `POST /api/v1/user/users` | Body: `CreateUserRequest`; required `email`, `isAgent`, `isStaff`, `isUnsubscribed`. |
| Update contact/user | `PUT /api/v1/user/users` | Body: `UpdateUserRequest`; required `currencyCode`, `email`, `isAgent`, `userId`. |
| Read custom contact fields | `GET /api/v1/user/users/{id}/custom` | Path `id` is integer user id. |
| Update custom contact fields | `PUT /api/v1/user/users/{id}/profile` | Body: `UpdateUserProfileRequest` with `userProfiles[]` of `{ formFieldId, value }`. |
| List contact field options | `GET /api/v1/user/option/contactFields` | No required params. |
| List lists | `GET /api/v1/user/lists` | Optional query: `IsArchived`, `CultureCode`. |
| Read contacts in a list | `GET /api/v1/user/lists/{id}/users` | Path `id` list UUID. Optional query includes `ListId`, `Search`, `Page`, `Size`, `PageDate`. |
| Add contact to list | `POST /api/v1/user/users/{uid}/lists/{id}` | Path `uid` integer user id, `id` list UUID. Body: `AddUserToListRequest`, required `userListOriginKey`. |
| Remove contact from list | `DELETE /api/v1/user/users/{uid}/lists/{id}` | Path `uid` integer user id, `id` list UUID. |
| Read user's lists | `GET /api/v1/user/users/{id}/lists` | Path `id` integer user id. Optional query: `UserId`, `ListId`, `UserListOriginKey`, `UnsubscribeReasonKey`. |
| Merge user's lists | `PUT /api/v1/user/users/{id}/lists` | Body: `MergeUserLists`; required `mustDelete`; optional `listId`, `userId`, `userLists[]`, `userListOriginKey`. |
| List tags | `GET /api/v1/user/tags` | No required params. |
| Assign tag | `PUT /api/v1/user/users/{id}/tags` | Path `id` integer user id. Body: `UpdateUserTagsRequest` with `addTagIds[]`. |
| Remove tag | `DELETE /api/v1/user/users/{uid}/tags/{id}` | Path `uid` integer user id, `id` tag UUID. Also supported via `PUT /api/v1/user/users/{id}/tags` body `deleteTagIds[]`. |
| Read user's tags | `GET /api/v1/user/users/{id}/tags` | Path `id` integer user id. Optional query `tagId`. |
| List sequences | `GET /api/v1/messenger/sequences` | Optional query: `WebinarId`, `SequenceCategoryKey`, `StatusKey`. |
| Create/update standard sequence | `POST` / `PUT /api/v1/messenger/sequences/standard` | Create/update standard sequence metadata, status and recipient list IDs. |
| Read sequence | `GET /api/v1/messenger/sequences/{id}` | Path `id` sequence UUID. |
| Add/remove user in sequence | `PUT /api/v1/messenger/sequences/{id}/users` | Path `id` sequence UUID. Body: `MergeSequenceUsers` with optional `userId`, `sequenceId`, `sequenceUsers[]`, `mustDelete`. |
| Add/remove user sequences | `PUT /api/v1/user/users/{id}/sequences` | Path `id` integer user id. Body: `UpdateUserSequencesRequest` with `sequenceIds[]`, `mustDelete`. |
| Read sequence membership | `GET /api/v1/messenger/sequences/{id}/users` | Path `id` sequence UUID. Optional query: `SequenceId`, `UserId`, `Search`, `Page`, `Size`, `PageDate`. |
| Read sequence recipient lists | `GET /api/v1/messenger/sequences/{id}/lists` | Path `id` sequence UUID. |
| Update sequence recipient lists | `PUT /api/v1/messenger/sequences/{id}/lists` | Body: `UpdateSequenceListsRequest` with `sequenceId`, `listIds[]`, `mustDelete`. Note: in live migration, deleting a recipient list via this endpoint returned 200 but did not remove the mapping; `PUT /api/v1/messenger/sequences/standard` with `recipientListIds: []` worked. |
| Create/update list | `POST` / `PUT /api/v1/user/lists` | Create by `name`; update with `listId`, `name`, `isArchived`. |
| Create/update tag | `POST` / `PUT /api/v1/user/tags` | Create by `name`; update with `tagId`, `name`, `isArchived`. |
| List system form fields | `GET /api/v1/system/formFields` | Required for custom `ContactProfile` fields such as `Nexubis | Scorecard Report URL`. |
| Create/update system form field | `POST` / `PUT /api/v1/system/formFields` | Create/update custom fields. |
| List automations | `GET /api/v1/query/automations` | Optional query: `automationTypeKey`. |
| Create/update automation | `POST` / `PUT /api/v1/query/automations` | Create/update automation metadata, including `name` and `isEnabled`. |
| Read/delete automation | `GET` / `DELETE /api/v1/query/automations/{id}` | Path `id` automation UUID. |
| List automation filters | `GET /api/v1/query/filters` | Query by `automationId`. |
| Create/update/delete automation filter | `POST` / `PUT /api/v1/query/filters`, `DELETE /api/v1/query/filters/{id}` | Used for automation trigger/condition rules. |
| List automation actions | `GET /api/v1/query/automations/{aid}/actions` | Path `aid` automation UUID. |
| Create/update/delete automation action | `POST` / `PUT /api/v1/query/automations/{aid}/actions`, `DELETE /api/v1/query/automations/{aid}/actions/{id}` | Used for list, sequence and tag actions. |

## Documented Gaps

- Rate limits: not documented.
- Pagination: `Page`, `Size`, and sometimes `PageDate` are documented on user/list/tag/sequence membership endpoints; response pagination metadata is not documented.
- Update behavior: update endpoints are documented as `PUT`; the spec does not state whether they are partial updates, full replacements, merges, or upserts.
- Duplicate list, tag, or sequence assignments: idempotency is not documented.
- `GET /api/v1/query/option/automationActionTypes` currently returns HTTP 500 in this account: `Could not find stored procedure 'query.v1_OptionAutomationActionTypes'.` Do not let this block automation work.
- Funnelr commonly responds slowly. Use a timeout of at least 180 seconds for Funnelr API work. For writes, issue one write at a time and read the target resource back before continuing.
- Never blindly retry create requests after timeout or transport failure. First search by internal ID, old name and target name because a timed-out request may have succeeded server-side.
