# Salesdam V3 — Repository Audit

- **Date:** 2026-10-11
- **Scope:** `Salesdam-v3-main` (backend + frontend + docs)
- **Method:** Direct source inspection (routes, controllers, middleware, models,
  services), `npm test`, and a live two-tenant HTTP regression test.

> This audit reports what is actually in the repository. It does **not** assert
> that any insurance capability exists. Evidence is given per section.

## 1. Detected stack

| Layer | Technology | Evidence |
|-------|------------|----------|
| Runtime | Node.js (ESM, `"type": "module"`) | `backend/package.json` |
| Backend | Express + Mongoose | `backend/app.js`, `backend/server.js` |
| Database | MongoDB (local, now `rs0` single-node replica set) | `/opt/homebrew/etc/mongod.conf` |
| Frontend | React + Vite | `frontend/package.json`, `frontend/vite.config.js` |
| Tests | Jest | `backend/package.json` `"test": "jest"` |
| Password hashing | bcryptjs | `backend/models/User.js` |
| Sessions | Custom manual cookie sessions (`crm.sid`) | `backend/middleware/sessionMiddleware.js` |

Backend listens on **5002** (5000 is reserved by macOS Control Center). The
frontend dev server proxies `/api` → `http://localhost:5002`.

## 2. Platform Core (exists and reusable)

The platform is a metadata-driven CRM. Core capabilities present in the repo:

- **Object metadata engine:** `ObjectMeta`, `FieldMeta`, `Layout`, `ListView`,
  `ObjectTypeConfig`, `CustomScreen` — supports custom objects/fields without schema migration.
- **Dynamic records:** `DynamicRecord` with `tenantId` + `objectApiName` + JSON `data`.
- **AuthN:** `middleware/auth.js` (session **and** `x-api-key`), `models/Session.js`,
  `models/ApiKey.js`, `models/ApiKeyUsageLog.js`; login/register/2FA/password-reset in
  `controllers/authController.js`.
- **AuthZ:** `middleware/permissions.js` (`checkObjectPermission`, `checkAppPermission`),
  roles in `models/Role.js` (`appPermissions`, `objectPermissions`), `services/roleService.js`
  (`seedDefaultRoles`).
- **Tenancy:** `middleware/tenant.js` (`enforceTenant`, `injectTenantId`); every core
  query is scoped by `req.tenantId`, which is derived from the session (not from client input).
- **CRM objects already configured by metadata:** leads, clients, contacts, accounts,
  transactions, cases, activities/tasks (via `ObjectMeta`/seeds, not bespoke tables).
- **Files & documents:** `models/File.js`, `routes/files.js`, `PdfTemplate`,
  `controllers/documentController.js`.
- **Communications/integration scaffolding:** `EmailSender`, `EmailTemplate`,
  `ExternalObject`, `Integration`, `Webhook`, `models/Automation.js`, `services/*`.
- **Reporting:** `Dashboard`, `DashboardFolder`, `controllers/analyticsController.js`,
  `routes/analytics.js`, `routes/dashboards.js`.
- **Governance:** `models/AuditLog.js`, `utils/auditLogger.js`, `models/Incident.js`.
- **Billing/subscription:** `routes/billing.js`, `routes/subscription.js`,
  `routes/paystackWebhook.js`.

## 3. Insurance Workspace — new-business slice implemented

The 15-object metadata pack seeds per tenant and a versioned business API is
live. Servicing, billing, collections, claims, documents and frontend screens are
not built.

Implemented (with evidence):

- Domain services — `backend/services/insurance/`: `pricingService.js`
  (authoritative premium, no silent defaults), `identityMatching.js`,
  `applicationService.js` (application → acceptance → submit → issue, plus
  servicing), `claimService.js` (intake → approval → payout), `dynamicRecords.js`.
- API — `backend/routes/insurance.js`, mounted at `/api/v1/insurance` in `app.js`
  (new business, servicing, claims).
- Seeding — `services/insuranceMetadataService.js` (objects + Insurance
  Workspace), `scripts/seed-insurance-objects.js` (`npm run seed:insurance`).
- Tests — `tests/insurance-pricing.unit.test.js` (12),
  `tests/insurance-application.e2e.mjs` (33), `tests/insurance-metadata.e2e.mjs` (9),
  `tests/insurance-servicing-claims.e2e.mjs` (32).

Earlier state (for the record): no `/api/v1/insurance/*` routes existed and no
insurance domain behaviour was present.

## 4. Current verified behaviour (evidence)

- Login through the Vite proxy works end-to-end in a real browser
  (Chromium/CDP): `POST /auth/login` → 200 → session persists on reload.
- API contract checks (curl via proxy): valid login 200; wrong password 401;
  unknown user 401; missing creds 400; burst → 429 with `Retry-After`.
- Two-tenant isolation regression test: **16/16 checks pass**
  (`backend/tests/tenant-isolation.e2e.mjs`).
- Default Jest suite: **17/17** pass across 2 suites
  (`tests/enforceTenant.unit.test.js`, `tests/insurance-pricing.unit.test.js`).
- Insurance application → issue e2e: **33/33** pass
  (`backend/tests/insurance-application.e2e.mjs`).
- Insurance metadata e2e: **9/9** pass (`backend/tests/insurance-metadata.e2e.mjs`).

## 5. Known defects / risks (see SECURITY_FINDINGS.md)

| # | Item | Severity | Status |
|---|------|----------|--------|
| SF-1 | `requireAuth` fell back to client `X-Tenant-ID` header for tenant scope | High (latent) | **Fixed** |
| SF-2 | Global search re-hydration query omitted `tenantId` | Medium (defense-in-depth) | **Fixed** |
| SF-3 | Standalone MongoDB rejected transactions (broke delete/registration) | High | **Fixed** (replica set enabled) |
| SF-4 | `scripts/seed.js` is broken (CommonJS under ESM, missing `username`) | Low (dev) | Open |
| SF-5 | Test suite coverage is minimal | Medium | Open (improving) — insurance unit + e2e added |

## 6. Environment blockers resolved this session

- Local MongoDB converted to a **single-node replica set** (`rs0`) so
  transactions work. This unblocks registration and any transactional
  insurance financial flows. Existing data was preserved.
- Dev account seeding uses the real Mongoose models
  (`backend/scripts/seed-dev-users.js`) so collection names and the bcrypt
  hook are correct.

## 7. Gaps requiring external input

- No insurance business rules, rate tables, product definitions, underwriting
  documents or ERD files are present in the repository.
- No provider credentials/sandbox access for Euphoria Telecoms, Meta
  (Leads/Messenger/Instagram/WhatsApp), Pay@, EasyPay, or payment gateways.
  See `INTEGRATION_REGISTER.md`.
