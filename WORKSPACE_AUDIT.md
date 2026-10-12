# Workspace Audit

FACT-verified.

## What exists
- `backend/models/Workspace.js`: name, slug, description, isDefault, status, memberIds, allowedObjects, color/icon, tenantId.
- `backend/services/workspaceService.js#createDefaultWorkspace` — seeds "Sales Hub" (`apiName: 'sales_hub'`) at tenant creation; syncs `User.workspaceIds`.
- `backend/routes/workspaces.js` (mounted): `GET /mine`, `POST /switch`, admin CRUD, members add/remove, `PUT /:id/object-groups`.
- `backend/middleware/sessionMiddleware.js` stores `workspaceId` in session; `POST /switch` updates it.
- Frontend: `SidebarWorkspaceSelector` (useAuth switchWorkspace), `pages/Workspaces/*` (manager, detail, members, objects, object-groups, settings), feature nav filters by active workspace's `allowedObjects`.

## The four intended workspaces
| Intended | Status | Evidence |
|---|---|---|
| RFQ | PARTIALLY | Only `rfq_number` fields on lead/deal + tender linkage; no RFQ object, workflow, or page. |
| Procurement | NOT IMPLEMENTED | Enum labels only (`task.category: procurement`, tender categories, industry picklist). |
| Insurance | NOT IMPLEMENTED | `Tenant.hub` enum only; hub picker not wired in Register.jsx; no insurance objects/APIs/UI. |
| CRM | IMPLEMENTED | lead/deal/account/client/contact/quote/invoice/order/product/task/case configs, lead approval, conversion, dashboards, tenders. |

## Is a workspace a platform construct?
PARTIALLY. It is a real, configurable sub-tenant grouping (members, allowedObjects, object groups), but:
- Records are tenant-scoped, not workspace-scoped (DynamicRecord: tenantId+objectApiName, no workspaceId) — INFERENCE.
- Automation/layouts/validation are tenant-scoped — shared across workspaces.
- Workspace switching changes nav/object visibility, not data visibility beyond allowedObjects filter.
- No workspace-specific branding/theme, permissions, or config overrides.

## Object groups
`OBJECT_GROUPS_IMPLEMENTATION.md` + `updateObjectGroups` route + UI: groupings of objects per workspace; implemented.

## Verdict
Workspace = navigation/membership scope with object filtering. To make the v3 "workspace engine" real, decide: per-workspace records visibility and/or per-workspace layouts/automations/branding/permissions. Current model can host RFQ/Procurement/Insurance as workspace presets (allowedObjects + members) but cannot give them distinct data silos without schema changes.
