# API Contract Conformance Notes

Source documents:

- `Salesdam API and Integration Guide v1.0`, dated 14 October 2026 (provided as PDF).
- `Salesdam V3 Platform Core BRD V2.1`, dated 10 October 2026.
- Actual application code in `backend/` at master commit `c131dae`.

## Conformance summary

The platform implementation matches the guide for the main core routes and integration method, with the following intentional and security-related points to resolve.

## Confirmed direct conflicts

### 1. Cross-tenant incidents admin endpoint — RESOLVED (2026-10-16)

Guide text:

- `GET /api/v1/incidents/admin/all` lists all incidents across tenants and is restricted to administrators.

Original implementation status:

- documented and available to both superusers and normal administrators.

Security concern:

- A normal tenant administrator could enumerate incidents from all tenants.

Implemented resolution:

- The route stays admin-gated (tenant admins use it in the admin console), but
  `getAllIncidents` now scopes the query to the caller's tenant unless the caller
  is a platform operator (superuser). Cross-tenant listing is therefore
  superuser-only.
- Regression coverage: `backend/tests/tenant-isolation.e2e.mjs` asserts a tenant
  admin's `/incidents/admin/all` response never contains another tenant's
  incidents.

Category: `G - security / operational risk` — remediated.

Decision required: product owner or platform admin governance.

### 2. API Guide route index omits the insurance namespace

Code:

- `/api/v1/insurance` is explicitly mounted last in `backend/app.js`.

Document behaviour:

- API Guide section 9 omits `/insurance`.
- Insurance should be documented as a domain-specific extension that reuses the core platform APIs rather than a core contract omission.

Category: `F - documentation / contract gap`

Recommendation: update the guide route index and mark extension clearly.

## Verified implementation additions
- `/records/{objectApiName}` serves custom and standard records consistently.
- API key behavior uses `X-API-Key` and object scope controls.
- Upload handling now restricts import file types to spreadsheet/CSV payloads.
- Email, PDF and Flow fields with user-generated HTML are sanitized before render.
- `.gitignore` ignore rules use the correct lowercase path so protections are active.
- Incident moderation ("reporter or admin" edit/close/delete) now uses the
  authoritative `User.isAdmin()` check; the previous `systemRole` check never
  matched because that field is not persisted on the user document.
- Dashboard visibility/edit sharing and layout resolution now read the single
  populated `role` field. Previously they read a non-existent `roles` array,
  which silently hid role-shared dashboards and returned 500 from
  `GET /layouts/:objectApiName/resolve`.
- Password reset tokens are stored as SHA-256 hashes; only the raw token is
  emailed, and reset links are single-use and expire in 2 hours. Reset email
  failures no longer change the response shape (no username enumeration).

## Core BRD feature API surfaces added (2026-10-16)

These are new, versioned, tenant-scoped routes under `/api/v1`. Each has an
end-to-end suite wired into `.github/workflows/quality.yml`.

| BRD | Feature | Routes | Tests |
| --- | --- | --- | --- |
| §14 | Tenant configuration resolution | `/configuration` | `tests/configuration.e2e.mjs` (18) |
| §8 | Approval-process builder | `/approval-processes` | `tests/approval-process.e2e.mjs` (32) |
| §3.4 | Duplicate detection | `/duplicate-rules` | `tests/duplicate-detection.e2e.mjs` (20) |
| §23 | Communication consent | `/consents` | `tests/consent.e2e.mjs` (19) |
| §24 | Activity & interaction timeline | `/activities` | `tests/activity.e2e.mjs` (17) |
| §13 | Metadata deployment / change sets | `/change-sets` | `tests/change-set.e2e.mjs` (47) |
| §16 | Omnichannel inbox, channels, templates | `/channels`, `/conversations`, `/message-templates` | `tests/omnichannel.e2e.mjs` (42) |
| §18 | Call centre / telephony | `/telephony` | `tests/telephony.e2e.mjs` (16) |

Environment & provider-readiness surfaces added on top of the change-set and
omnichannel routes (all superuser- or admin-scoped; no live vendor calls):

| BRD | Capability | Routes | Tests |
| --- | --- | --- | --- |
| §13 | Sandbox tenant cloning (config only, no data) | `POST /change-sets/sandbox` | `change-set.e2e.mjs` |
| §13 | Deployment rollback (restore pre-deployment state) | `POST /change-sets/deployment-log/:logId/rollback` | `change-set.e2e.mjs` |
| §16.1 | Provider catalog (required credentials, normalizer support) | `GET /channels/providers` | `omnichannel.e2e.mjs` |
| §16.1 | Provider config validation | `POST /channels/:id/validate` | `omnichannel.e2e.mjs` |
| §18.5 | Telephony provider catalog + call-control seam | `GET /telephony/providers`, `POST /telephony/calls` | `omnichannel.e2e.mjs` |

Security posture of the new surfaces:

- Cross-tenant metadata promotion (`/change-sets/:id/validate|deploy`),
  deployment rollback, the deployment log and sandbox cloning are
  superuser-only; packaging stays admin-scoped to the caller's own tenant.
- Channel webhooks (`POST /channels/webhook/:channel/:accountId`) authenticate
  by timing-safe HMAC-SHA256 over the raw request bytes and reject unsigned or
  wrongly signed payloads; an account without a signing secret accepts nothing.
- Recognized provider webhook payloads (Meta WhatsApp Cloud API, Messenger /
  Instagram Messaging) are normalized server-side into canonical events before
  ingestion; unrecognized bodies fall through to the canonical shape used by
  tests and development.
- Channel provider credentials and webhook secrets are `select:false` and
  stripped from JSON responses; provider config validation reads them
  server-side only.
- Outbound provider delivery and telephony call control remain stubs that
  return an explicit not-implemented status — nothing is reported as delivered
  or dialled when it was not.
- These routes fall under the existing `/api` global rate limiter; the webhook
  is intentionally public (no session) because the signature is the credential.


## Security-related contract notes that should remain in force
- API keys are derived from environment state and key hash storage, not plaintext.
- Paystack webhook signatures are verified with timing-safe HMAC-SHA512 over the
  raw request bytes, not a re-serialized JSON body.
- System and channel credentials remain external environment variables, not CRM user data.
- No production credentials were stored as branch state or example values following this remediation.
