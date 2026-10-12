# Salesdam V3 — Security Findings

- **Date:** 2026-10-11
- **Focus:** cross-tenant data leakage, IDOR, auth scope, transactional integrity.

## Findings

### SF-1 — Tenant scope could be taken from a client header — **FIXED**
- **Severity:** High (latent). **Location:** `backend/middleware/auth.js`.
- **Issue:** tenant scope was `req.sessionData.tenantId || req.headers['x-tenant-id']`.
  The header fallback trusts client input to establish authority. In the current
  login flow the session always carries `tenantId`, so it was not exploitable
  through a normal session, but it is an unsafe default and a latent IDOR.
- **Fix:** tenant scope is now derived **only** from the server-side session
  (`req.sessionData.tenantId`); a missing tenant is rejected with 400.
- **Verification:** `X-Tenant-ID` spoof test in `tests/tenant-isolation.e2e.mjs`
  (A cannot read B's file while sending `X-Tenant-ID: <B tenant>` → 404).

### SF-2 — Global search re-hydration omitted tenant scope — **FIXED**
- **Severity:** Medium (defense-in-depth). **Location:** `backend/controllers/searchController.js:67`.
- **Issue:** a re-hydration query ran `DynamicRecord.find({ _id: { $in: recordIds } })`
  without `tenantId`. The ids came from an already tenant-scoped query, so it was
  not directly exploitable, but the unscoped query weakens the isolation guarantee.
- **Fix:** added `tenantId: req.tenantId` to the query.
- **Verification:** search cross-tenant check in the e2e suite.

### SF-3 — Standalone MongoDB rejected all transactions — **FIXED**
- **Severity:** High (functional + integrity). **Location:** MongoDB config.
- **Issue:** `executeWithTransaction` threw `Transaction numbers are only allowed
  on a replica set member or mongos`, returning HTTP 500 on record delete and
  blocking registration and any future transactional financial flow.
- **Fix:** enabled a single-node replica set (`rs0`) in `/opt/homebrew/etc/mongod.conf`,
  restarted `mongodb-community`, `rs.initiate()`. Existing data preserved.
- **Verification:** delete of a foreign record now returns 404 (not 500); B's
  record verified intact afterwards.

### SF-4 — `scripts/seed.js` broken — **OPEN (Low, dev-only)**
- **Issue:** uses CommonJS `require` under `"type": "module"` and does not set `username`.
- **Impact:** dev seeding only; replaced for login by `scripts/seed-dev-users.js`.
- **Remediation:** convert to ESM and set `username` (small, safe).

### SF-5 — Thin test coverage — **OPEN (Medium, improving)**
- **Issue:** only `tests/enforceTenant.unit.test.js` (5 tests) existed; no
  automated cross-tenant coverage for most objects.
- **Progress:** added `tests/tenant-isolation.e2e.mjs` (16 checks) covering
  records, files, roles, users, search and header spoofing; added
  `tests/insurance-pricing.unit.test.js` (12),
  `tests/insurance-application.e2e.mjs` (33 — two tenants, IDOR, idempotency,
  config errors) and `tests/insurance-servicing-claims.e2e.mjs` (32 — servicing
  state machine, claims workflow, cross-tenant claim IDOR).
- **Remediation:** extend isolation/permission tests to each remaining insurance
  object (billing, endorsements, comms) as built.

### SF-6 — API-key object restriction did not cover `/api/v1/insurance` — **FIXED**
- **Severity:** Medium. **Location:** `backend/middleware/auth.js` +
  `backend/routes/insurance.js`.
- **Issue:** an API key's `allowedObjects` was enforced only for URLs matching
  `/records|objects/...`. A key restricted to, say, `client` could still call the
  insurance API (gated only by the key owner's role permissions).
- **Fix:** `routes/insurance.js` enforces a per-path object scope for API-key
  callers (`/claims*` → `claim`; `/policies|applications|products|product-versions*`
  → `policy`); a disallowed scope returns 403.
- **Verification:** covered by the insurance e2e suites (API-key path is not
  exercised end-to-end here; the logic is a single request-path guard).

## Confirmed safe (evidence)
- The `/api/v1/insurance` API takes tenant scope only from `requireAuth`
  (session/API key), never from the body; cross-tenant application reads/pricing
  and cross-tenant claim reads return 404 (verified in
  `tests/insurance-application.e2e.mjs` and `tests/insurance-servicing-claims.e2e.mjs`).
- No controller or route reads `tenantId` from `req.body`/`req.query`/`req.params`.
  The only writer is `injectTenantId`, which writes the **server-derived** tenant.
- `recordController`, `files` routes, `getUser`, `getRole` all scope by
  `{ _id, tenantId }`.
- Passwords hashed with bcryptjs; `enforceTenant` timing/superuser logic intact.

## Untested areas (must be covered before go-live)
- Field-level permission leakage in list/export paths.
- Document/PDF retrieval permissions.
- Webhook signature verification and retry idempotency.
- Background job and external-integration tenant scoping (when implemented).
- Secret storage/encryption/rotation for integration credentials.
