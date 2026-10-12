# Requirements Traceability

Mapping intended v3 capabilities → repository evidence → status.

| Requirement | Evidence | Status | Gap |
|---|---|---|---|
| Multi-tenant SaaS | Tenant model, session tenantId, enforceTenant on most routers, per-query tenantId | IMPLEMENTED (with leaks C3/M4) | enforceTenant missing on incidents/leads; no isolation tests |
| Tenant isolation | DynamicRecord.tenantId, ObjectMeta unique(tenantId,apiName) | PARTIALLY | manual enforcement; C3; no query helper/tests |
| Configurable objects | ObjectMeta + objectController + routes/objects | VERIFIED | none major |
| Configurable fields | FieldMeta + fieldController | VERIFIED | 21-type enum fixed |
| Relationships | lookup/master_detail only | PARTIALLY | no many-to-many |
| Page layouts | Layout model + LayoutBuilder + role-aware resolve | VERIFIED | seed layouts hardcoded to Salesdam |
| Validation rules w/o code | validationEngine + ObjectMeta.validationRules + `/records/validate` | VERIFIED | storage embedded only |
| Workflows w/o code | Automation node graph + automationService + FlowBuilder UI | IMPLEMENTED | condition DSL incomplete; 'changed' stub |
| Workspace engine | Workspace model + switch + members + allowedObjects + object groups | PARTIALLY | not a record-isolation boundary; no per-workspace branding/perms |
| RFQ capability | rfq_number fields + tender linkage | PARTIALLY | no RFQ object/workflow/UI |
| Procurement workspace | task.category enum, tender categories | MISSING | not implemented |
| Insurance workspace | Tenant.hub enum only | MISSING | not implemented |
| CRM (sales) | lead/deal/account/client/contact/quote/invoice/order/product/task/case + approval + tenders | VERIFIED | opportunity via conversion only |
| CRM Service | case object config | PARTIALLY | no assignment/SLA engine |
| CRM Marketing | — | MISSING | |
| RBAC/permissions | Role model + checkAppPermission + checkObjectPermission | IMPLEMENTED | systemRole inconsistency (H4) |
| Audit logs | AuditLog model + admin GET /logs | IMPLEMENTED | |
| API keys/integrations | ApiKey, Integration, webhooks | IMPLEMENTED | H5 timing/docs |
| Billing | Paystack billing/subscription + webhook | IMPLEMENTED | M1 HMAC bug; no idempotency |
| Background jobs | etenders cron; automationService events | IMPLEMENTED | no queue; synchronous |
| Email | nodemailer + templates + senders | IMPLEMENTED | XSS (H2) |
| Notifications | Notification model + dropdown | IMPLEMENTED | |
| Search | search routes | IMPLEMENTED | M2 regex |
| Analytics/dashboards | analytics routes + Dashboards + Salesdam dashboards | IMPLEMENTED | inline engine in routes |
| Testing | none | MISSING | |
| CI quality gate | deploy-only workflows | MISSING | |
| Monitoring | winston only | MISSING | |
| Production infra | Azure VM + Docker compose (repo config) | UNKNOWN (config exists; production unverified) | no IaC |
