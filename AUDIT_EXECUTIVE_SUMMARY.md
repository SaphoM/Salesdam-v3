# SalesDem V3 — Audit Executive Summary

> Forensic audit of `Salesdam-v3-main` (snapshot, no git history). Tags: FACT (verified in code), INFERENCE, UNKNOWN, RECOMMENDATION.

## What this repository actually is

FACT: A multi-tenant, metadata-driven CRM platform ("salesforce-mini" heritage) with:
- `backend/` — Express 4 + Mongoose 8 API (`app.js` mounts 37 routers under `/api/v1` + `/api/paystack-webhook`), session-cookie auth, API-key auth, tenant middleware, generic config engine (objects, fields, layouts, validation, formulas, rollups, automations), Paystack billing, incidents, tenders integration, AI onboarding (OpenAI), recurring tasks, document generation, email templates/PDF templates.
- `frontend/` — React 18 + Vite SPA: full record CRUD UI, object/layout builders, automation FlowBuilder, dashboards, list views, workspaces, tenders, incidents, admin settings, auth/registration flow.
- `admin/` — separate React 18 + Vite 5 super-admin console (older dep track).
- `landing/`, `docs/` — Astro 4 marketing + docs sites.
- `etenders_service/` — Express + node-cron scraper service for eTenders SA → Mongo.
- Deploy: Docker (mongo replica set + backend + frontend nginx), `deploy.sh`, `deploy-platform.sh`, GitHub Actions deploy-test/deploy-platform to an Azure VM.

## Completion estimate (evidence-based, not percentages)

- **Verified implemented end-to-end:** auth (session + bcrypt + lockout), registration with Paystack, multi-tenant record CRUD on dynamic objects, custom objects/fields/validation/formulas/rollups/layouts/list views, automation engine (record-triggered + node graph), dashboards+widget engine, lead approval workflow, workspaces (scoping/members/object groups), tenders integration, incidents (with cross-tenant leak bug), email/PDF templates, API keys, superadmin tenant management, billing subscription lifecycle.
- **Partially implemented:** RFQ (exists only as fields on lead/deal + tender linkage), "insurance vs sales" hub (enum + docs only, no feature), workspace/object groups (exists but coarse), AI onboarding (OpenAI passthrough), marketing/service CRM scope.
- **Missing:** Procurement workspace (NOT IMPLEMENTED), Insurance workspace (NOT IMPLEMENTED), marketing campaigns, service/cases assignment logic beyond object config, any automated tests, monitoring/observability, CSRF protection, any CI test stage.
- **Unverified:** production behaviour on the Azure VM (config only in repo), scrape freshness of etenders_service, Paystack production mode.

## Critical blockers
1. Committed live-looking Paystack secret + session/encryption defaults in `.env.example` files (C1) — must rotate + purge.
2. Root `.gitignore` does not ignore `.env`; backend file named `.gitIgnore` (wrong case) (C2) — secrets protection unreliable.
3. Cross-tenant incident leak: `GET /api/v1/incidents/admin/all` returns all tenants' incidents to any tenant admin (C3).
4. Zero automated tests (no test files found; jest/supertest installed but unused).
5. `routes/incidents.js` and `routes/leadApproval.js` lack `enforceTenant` (mitigated by controller filters, not fail-closed).

## Architectural risks
- Generic config engine is real and strong (FACT), but seeds are Salesdam-specific (deals/orders/invoices hardcoded defaults) — v3 workspaces aspiration needs metadata-driven seeds.
- Automation conditions use a separate simpler operator map than the formula DSL; `'changed'` operator stubbed (FACT).
- Workspace is a UI/navigation scope + `allowedObjects` filter (FACT), not a data-isolation boundary — records are tenant-scoped, not workspace-scoped (INFERENCE from models: DynamicRecord has tenantId+objectApiName, no workspaceId on records; Session carries workspaceId).
- Two admin frontends and divergent dependency/version tracks (Vite 8 vs 5, RR 7 vs 6, recharts 3 vs 2).
- Inline route handlers (automations ~1200 lines, dashboards, leadApproval) duplicate logic that belongs in services.
- Session cookie `SameSite=None` + no CSRF tokens (M3).

## Security risks
See `SECURITY_AUDIT.md` — C1–C3 critical, H1–H5 high (xlsx CVEs, stored XSS via dangerouslySetInnerHTML, unfiltered uploads, systemRole inconsistency, API-key timing/comment mismatch), M1–M5 medium (webhook HMAC over re-serialized JSON, regex injection, CSP disabled, tenant middleware gaps, sessions), L1–L6 low.

## Technical debt
- `xlsx@0.18.5` unpatched CVEs; dual DnD libraries; base64 avatars in user docs; 10k/15min global rate limit; no CSP; deploy.sh embeds GH_TOKEN in remote URL; no tests; dev-server.js in-memory mode untested against prod path.

## What can be reused (do not rebuild)
- Config engine core: `metadataService`, `validationEngine`, `formulaParser`, `formulaService`, `rollupService`, `automationService`, `listViewService`, `autoNumberService`.
- Session/tenant middleware model (with fixes), DynamicRecord generic store, lead-approval service pattern, tenders integration, docs site, Docker compose shape, deploy workflow.
- Frontend: record list/detail/form, object builder, layout builder, FlowBuilder, dashboards builder, list-view components.

## What should be refactored
- Inline route handlers → controllers/services (automations, dashboards, widgets, layouts, webhooks, apiKeys, leadApproval).
- Tenant enforcement → fail-closed: add `enforceTenant` to incidents/leadApproval; make workspace-scoping explicit in record queries if intended.
- Security posture: CSP + sanitization, CSRF, webhook raw-body HMAC, timing-safe key compare, fileFilter on uploads, regex escaping, xlsx replacement (e.g. exceljs) or sandboxing.
- Consolidate admin/frontend dependency tracks; remove `react-beautiful-dnd`.
- Incident model: derive admin-ness from role, not `systemRole` request state.

## What must be built (genuinely missing)
- Procurement workspace (NOT IMPLEMENTED).
- Insurance workspace (NOT IMPLEMENTED — only enum/documented aspiration).
- RFQ as a first-class object/workflow (if required) — currently fields only.
- Test suite (unit + tenant-isolation + API), CI test stage.
- Monitoring/alerting, structured logging review, backup/restore procedure.
- CSRF protection, CSP, secret rotation, .gitignore fix.

## Recommended development order
See `V3_IMPLEMENTATION_PLAN.md`. Short version: (0) security hardening + tests harness, (1) tenant/workspace isolation hardening, (2) config-engine gaps (changed-operator, workspace = isolation decision), (3) RFQ first-class object, (4) Procurement workspace, (5) Insurance workspace, (6) observability/ops.
