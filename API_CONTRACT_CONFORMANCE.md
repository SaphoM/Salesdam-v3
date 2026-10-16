# API Contract Conformance Notes

Source documents:

- `Salesdam API and Integration Guide v1.0`, dated 14 October 2026 (provided as PDF).
- `Salesdam V3 Platform Core BRD V2.1`, dated 10 October 2026.
- Actual application code in `backend/` at master commit `2051210`.

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

## Security-related contract notes that should remain in force
- API keys are derived from environment state and key hash storage, not plaintext.
- System and channel credentials remain external environment variables, not CRM user data.
- No production credentials were stored as branch state or example values following this remediation.
