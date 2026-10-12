# V3 Configuration Engine Audit

FACT: the backend is genuinely metadata-driven for CRM data. Tenants can change configuration via API without source changes.

## Custom objects
- Create: `POST /api/v1/objects` → `objectController.createObject` → ObjectMeta + `metadataService.seedDefaultFields` (name/owner/description). Auth: requireAuth+enforceTenant+`canManageObjects` ternant.
- Tenant isolation: ObjectMeta unique on (tenantId, apiName); queries tenant-scoped.
- Limits: validation-rule caps in ObjectMeta (50 rules).

## Custom fields
- `POST /api/v1/objects/:objectApiName/fields` → FieldMeta with type enum (21 types), structured `validations`, formula config, rollup config, auto-number config, related-list config (`updateRelatedListColumns`).
- Rollout: `formulaService.computeFormulaValues`, `autoNumberService`, `rollupService` all metadata-driven.

## Validation rules
- Per-field: `validations{}` (required/unique/min/max/regex/date/domain) + `formulaValidation` — enforced by generic `validationEngine.validateRecord`.
- Per-object: `ObjectMeta.validationRules[]` with `expression` evaluated by same formula DSL; enforced on create/update/import and previewed via `POST /records/validate`.
- NOTE: ObjectMeta validation is the only home — no standalone validation-rule collection (FACT).

## Formulas
- `formulaParser.js`: hand-written recursive-descent parser; no eval; whitelisted functions; used by formula fields, formula validation, object validation rules, rollup filters. VERIFIED generic + safe.

## Relationships
- Types present: `lookup`, `master_detail` field types in FieldMeta; validation that rollup requires cascade-delete (`fieldController.assertValidRollup`).
- Many-to-many: no explicit join-object primitive; modelled via two lookups (INFERENCE).

## Page layouts
- `Layout` model: tabs/sections/columns/buttons (navigate|api_call|automation|custom_js)/relatedLists, role assignment, type detail/edit/compact/list/related.
- CRUD via `PUT/POST/DELETE /api/v1/layouts`; role-aware resolution at `GET /:objectApiName/resolve`; UI `LayoutBuilder`.
- Caveat: `layoutService.seedSalesdamLayouts` seeds only Salesdam defaults (FACT).

## List views / views
- ListView per object: filters/columns/sort/shared. USER-scoped creator.

## Workflows / automation
- `Automation` model: type record_triggered|scheduled|screen_flow|autolaunched; trigger object+events+conditions+cron; `nodes[]` graph (CRUD actions, email, webhook, http_request, generate_pdf, loop, decision, assignment, navigate, end); variables; depth guard; stats.
- Engine: `automationService.fireAutomations` on record events; execution interprets node graph. VERIFIED generic — no object-specific code.
- Caveats: condition evaluator is separate operator map; `'changed'` operator returns true (stub) — FACT.

## Conversion / email-to-*
- `ObjectTypeConfig`: lead conversion with field mappings; enum `targetObject: ['contact','client','deal']` hardcoded — NOT tenant-extensible (FACT).
- emailToLead/emailToCase config blocks present; objectConfigController auto-generates tenant-slug emails.

## What is NOT configurable without code
- Workspace semantics (model is fixed), feature flags (frontend constants), opportunity object (conversion target only), validation-rule storage location, automation condition DSL, lead→contact/client/deal mapping targets, etenders categories, Tenant.hub enum.

## Verdict
The v3 configurability goal is substantially REAL for CRM metadata (objects/fields/validation/formulas/rollups/layouts/views/automations). GAPS: relationship types limited to lookup/master_detail, condition DSL incomplete, conversion targets hardcoded, no custom-code/extension points, seeds are Salesdam-biased.
