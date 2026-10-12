# API Audit

Base: `/api/v1`. Auth: session cookie or `x-api-key`. All routers (except noted) do `requireAuth + enforceTenant`.

| Router | Mount | Notable endpoints | Problems |
|---|---|---|---|
| auth | /auth | register, login, logout, me, forgot/reset/change-password, sessions | CSRF missing (M3); registration stores unused hub |
| users | /users | me/profile, role-based CRUD | avatar base64 (L5); canManageUsers gates |
| roles | /roles | CRUD + assign/remove | requireManageRoles |
| objects | /objects | CRUD + nested fields CRUD/reorder/related-list-config | writes need canManageObjects |
| fields | /fields | GET cross-object listing | inline model query in route |
| records | /records | list/get/create/update/delete/bulk-delete + /validate + /validate-formula + import/export | validation engine shared; uploads unfiltered (H3) |
| list-views | /list-views | per-object view CRUD | |
| action-buttons | /action-buttons | CRUD + reorder | |
| layouts | /layouts | GET/resolve/POST/PUT/DELETE | inline handlers |
| automations | /automations | CRUD + run-action + resume + debug + toggle + screen-flows | ~1200-line inline route file; condition DSL incomplete |
| analytics | /analytics | overview/report + salesdam-* + config | checkAppPermission canViewAnalytics |
| search | /search | global + suggest | regex injection (M2); unvalidated data.<field> keys (L1) |
| webhooks | /webhooks | CRUD + test | inline axios test; canManageWebhooks |
| admin | /admin | settings, stats, logs, storage, subscription mgmt, import/export, tenants superuser ops | several endpoints any-authed (lead-approval-settings) |
| ai | /ai | onboarding-status, onboarding, /chat | OpenAI passthrough; admin gate on POST /onboarding |
| notifications | /notifications | list/mark-read/read-all | inline |
| dashboards | /dashboards | CRUD + members + widget-data | inline aggregation engine in route |
| dashboard-folders | /dashboard-folders | CRUD | |
| external-objects | /external-objects | CRUD + fetch-schema/provision/sync/test | canManageIntegrations |
| custom-screens | /custom-screens | CRUD + fetch-data | |
| email-templates | /email-templates | CRUD + preview + categories | renders unsanitized HTML (H2) |
| api-keys | /api-keys | CRUD + revoke + usage | timing/comment issues (H5) |
| object-config | /object-config | GET/PUT per object | requireAdmin on PUT |
| email-senders | /email-senders | mine/list/create/update/delete/test | |
| workspaces | /workspaces | mine/switch + admin CRUD + object-groups | switch changes workspace context |
| pdf-templates | /pdf-templates | CRUD + duplicate + categories | XSS (H2) |
| files | /files | CRUD + soft delete | |
| superadmin | /superadmin | stats/audit-logs/tenants CRUD/suspend/activate/users/global users | requireSuperuser; regex injection (M2) |
| registration | /registration | free/paystack/verify-email/status/verify-payment | public + authLimiter |
| billing | /billing | public-plans + verify-transaction (public) + admin plans/invoices/payment-url | |
| subscription | /subscription | current/cancellation-info/cancel/reactivate | |
| incidents | /incidents | admin/all, CRUD, upvote, comments | MISSING enforceTenant + C3 leak |
| integrations | /integrations | verify-token (public) + CRUD + regenerate | requireAdmin |
| recurring-tasks | /recurring-tasks | series create/get/update/delete | |
| tenders | /tenders | search/save-as-lead/convert-to-deal/document-proxy | |
| leads | /leads | submit-for-approval/approve/reject/convert-to-deal/approval-info | MISSING enforceTenant (M4) |
| documents | /documents | generate-quote/invoice + get | |
| tenants (routes/tenants.js) | — | current + settings | NOT MOUNTED in app.js (dead code) |
| paystack-webhook | /api/paystack-webhook | POST | no auth (by design); HMAC bug (M1) |

## Duplicates/inconsistencies
- Two handler styles: controller-based vs inline-in-route (automations, dashboards, webhooks, layouts, fields, notifications, customScreens, eternalObjects, templates, apiKeys, leadApproval).
- `routes/tenants.js` dead (unmounted).
- Permission model mixes `checkAppPermission`, `checkObjectPermission`, `requireAdmin`, `requireSuperuser`, `systemRole` (H4).
- API base inconsistent: `fields.js` and leadApproval use `req.tenantId` vs sometimes `req.user.tenantId`.
