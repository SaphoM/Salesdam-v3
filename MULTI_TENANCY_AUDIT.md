# Multi-Tenancy Audit

## Model
- Tenant = `Tenant` doc (`tenantId` == `_id`), holds status (active/suspended/deleted), hub, subscription, settings.
- Workspace = subdivision of Tenant (Workspace model: tenantId, memberIds, allowedObjects, isDefault). Session carries active workspaceId.
- Every business collection (DynamicRecord, ObjectMeta, FieldMeta, Layout, Automation, ListView, Dashboard, User, Role, File, ...) has `tenantId`.

## Request flow (FACT)
1. `sessionMiddleware`: cookie `crm.sid` → Session doc → `req.sessionData{userId, tenantId, workspaceId}`.
2. `requireAuth`: sets `req.tenantId = sessionData.tenantId || x-tenant-id`; sets `req.user`.
3. `enforceTenant`: loads Tenant, rejects deleted/suspended (except superuser), rejects `req.user.tenantId !== req.tenantId` unless superuser.
4. Handlers query by `tenantId` (DynamicRecord queries include `tenantId` + `objectApiName`).

## API keys
- `req.tenantId = ApiKey.tenantId`; optional `ipWhitelist`; `allowedObjects` scoping by URL segment.

## Workspace switch
- `POST /api/v1/workspaces/switch` updates session — note it switches workspace context; tenantId remains the tenant (FACT: switchWorkspace updates activeWorkspace; session.tenantId unchanged? — the service sets session workspace; users must belong to same tenant).

## Gaps / leakage (FACT)
1. **C3**: `GET /api/v1/incidents/admin/all` — `requireAdmin` only; `getAllIncidents` returns ALL tenants' incidents (`incidentController.js:10-47`). Cross-tenant leak to any tenant admin.
2. `routes/incidents.js` and `routes/leadApproval.js` lack `enforceTenant` — currently mitigated by controller-level `tenantId` filters (queries do filter), but comment/reply mutations and several incident comment fetches (`getIncident` fetching comments by incidentId only) are inconsistent; fail-open if a query misses tenantId.
3. `incidentController` comment/reply/upvote queries use `incidentId` without always constraining `tenantId` — potential cross-tenant comment access by guessing IDs (INFERENCE from code snippets: `getIncident` fetches comments with only incidentId at controller lines 104-109).
4. Admin settings endpoints (`GET /admin/settings/lead-approval-settings`) guarded by auth only, returns tenant-scoped config — acceptable but no explicit role gate (FACT).
5. No query-builder enforcement: tenant filtering is manual per call site. Any missed `tenantId` in a new endpoint = leak. No tests to catch it.
6. Background jobs: automation executions run with `tenantId` carried from the triggering record (automationService takes tenantId param) — tenant-aware by construction; etenders_service is platform-wide (single stream) — OK by design.
7. Files/avatars: File model has tenantId? (File.js present; avatar stored as base64 on User — global read on every auth query).
8. Workspace is NOT an isolation boundary: records lack workspaceId — switching workspace filters nav/allowedObjects but the same records are visible across workspaces of the same tenant except via `allowedObjects`. DECISION NEEDED: should records be workspace-scoped?

## Verdict
Tenant isolation is implemented via session-derived tenantId + `enforceTenant` on nearly all routers + per-query tenantId filters. It is sound in design but fragile (manual, no query helper, two routes missing enforceTenant, one confirmed cross-tenant admin leak, no isolation tests).
