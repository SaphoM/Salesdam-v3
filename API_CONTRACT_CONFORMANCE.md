# API Contract Conformance Notes

Source documents:

- `Salesdam API and Integration Guide v1.0`, dated 14 October 2026 (provided as PDF).
- `Salesdam V3 Platform Core BRD V2.1`, dated 10 October 2026.
- Actual application code in `backend/` at master commit `2051210`.

## Conformance summary

The platform implementation matches the guide for the main core routes and integration method, with the following intentional and security-related points to resolve.

## Confirmed direct conflicts

### 1. Cross-tenant incidents admin endpoint

Guide text:

- `GET /api/v1/incidents/admin/all` lists all incidents across tenants and is restricted to administrators.

Implementation status:

- documented and available to both superusers and normal administrators.

Security concern:

- A normal tenant administrator can enumerate incidents from all tenants.
- This directly conflicts with ordinary tenant isolation expectations and should be resolved as either a `superuser`-only platform capability or a documented and strictly controlled administrator workflow.

Category: `G - security / operational risk`

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

## Security-related contract notes that should remain in force
- API keys are derived from environment state and key hash storage, not plaintext.
- System and channel credentials remain external environment variables, not CRM user data.
- No production credentials were stored as branch state or example values following this remediation.
