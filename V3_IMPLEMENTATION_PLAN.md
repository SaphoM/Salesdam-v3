# V3 Implementation Plan (recommendation, dependency-aware)

Not started — audit only.

## Phase 0 — Security & correctness blockers (P0)
- Objective: close critical/high security holes, fix isolation leaks.
- Dependencies: none.
- Files: `.gitignore`, `backend/.gitIgnore`→`.gitignore`, `.env.example` (purge defaults; rotate Paystack key), `backend/controllers/incidentController.js` (C3), `routes/incidents.js`, `routes/leadApproval.js` (add enforceTenant), `paystackService.js` (raw-body HMAC + timing-safe), `ApiKey.js` (timing-safe compare), upload `fileFilter`, regex escaping helper, replace xlsx, sanitize dangerouslySetInnerHTML (DOMPurify), add CSP, CSRF token, deploy.sh token handling.
- Complexity: Medium. Risks: webhook clients, breaking existing uploads.
- Acceptance: C1–C3, H1–H5, M1–M5 closed; no secrets in repo; `npm audit` clean-ish.
- Tests: add jest+supertest+mongodb-memory-server; tenant-isolation suite; webhook signature test.

## Phase 1 — Tenant/workspace isolation hardening (P0/P1)
- Decide: records workspace-scoped or tenant-scoped? (Recommendation: tenant-scoped + workspace = nav/object-group filter is acceptable short-term; document it.)
- Add `enforceTenant` to incidents/leads; audit every unscoped query; add tenant-isolation tests.
- Add CI `npm test` + build gate in both deploy workflows.

## Phase 2 — Config-engine completeness (P1)
- Implement automation condition `'changed'` operator; unify condition DSL with formula DSL where feasible; make ObjectTypeConfig conversion targets configurable; add many-to-many relationship primitive if needed.
- Tests: unit for formulaParser/validationEngine/rollupService/automationService.

## Phase 3 — RFQ as first-class (P1)
- Define RFQ object/fields/layout/workflow in `backend/config/objects` + migrate `rfq_number` references; build RFQ workspace preset; approval + quote generation integration (documents).

## Phase 4 — Procurement workspace (P2)
- Reuse generic engine: seed procurement objects (PO, supplier, requisition), workspace preset, automations, dashboards. No new platform code required if engine gaps from Phase 2 are closed.

## Phase 5 — Insurance workspace (P2)
- Seed policy/claim/broker/renewal objects, workflows (renewal reminders via recurring tasks), workspace preset. Verify `Tenant.hub='insurance'` onboarding path works.

## Phase 6 — Ops & quality (P1)
- Monitoring/health dashboards, log aggregation, Mongo backup/restore runbook, dependency consolidation (admin↔frontend), dead-code removal, inline-route refactors (automations/dashboards logic → services).

Each phase ends with: tests green, security checklist pass, tenant-isolation suite pass, staging deploy.
