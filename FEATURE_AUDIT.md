# Feature Audit

Statuses: VERIFIED WORKING (traced end-to-end in code), IMPLEMENTED, PARTIALLY, STUBBED, MOCKED, BROKEN, MISSING, UNKNOWN.

| Feature | Location | Status | Evidence | Notes |
|---|---|---|---|---|
| Registration (free + Paystack) | `backend/controllers/registrationController.js`, `routes/registration.js`, `frontend/src/pages/auth/*` | VERIFIED WORKING | authLimiter + validators + verifyEmail + PaymentCallback pages | Hub (insurance) stored but unused |
| Login/session/change password/reset | `authController.js`, `routes/auth.js` | VERIFIED WORKING | bcrypt, lockout, sessions list/revoke | CSRF missing (M3) |
| Custom objects | `objectController.js`, `routes/objects.js`, ObjectMeta | VERIFIED WORKING | seedDefaultFields on create, delete cascade | Limits embedded in ObjectMeta |
| Custom fields (21 types) | `fieldController.js`, FieldMeta | VERIFIED WORKING | formula/rollup config validated at write | |
| Validation rules (field + object) | `validationEngine.js`, `validationService.js`, `FormulaEditor` UI | VERIFIED WORKING | generic engine; `/records/validate` preview shares code | |
| Formula fields | `formulaParser.js`, `formulaService.js` | VERIFIED WORKING | eval-free parser | |
| Rollup summaries | `rollupService.js` | IMPLEMENTED | counts/sums/avg/min/max with filter formulas | |
| Auto-number | `autoNumberService.js`, AutoNumberCounter | IMPLEMENTED | | |
| Page layouts (tabs/sections/roles) | `Layout.js`, `routes/layouts.js`, LayoutBuilder | VERIFIED WORKING | role-aware resolve | Seeds hardcoded to Salesdam objects |
| List views | `ListView.js`, listViewService, RecordList UI | VERIFIED WORKING | shared/personal views, columns, filters | |
| Automations / flows | `automationService.js`, `routes/automations.js` (inline handlers), FlowBuilder | VERIFIED WORKING (core) | record_triggered + node graph + recursion guard | condition DSL separate/simple; 'changed' stub; run-action UI debug present |
| Dashboards + widget engine | `routes/dashboards.js` inline, DashboardBuilder | IMPLEMENTED (inline route code) | aggregation endpoint `POST /widget-data` | logic embedded in route |
| Workspaces | `Workspace.js`, `workspaceService`, `routes/workspaces.js`, Sidebar selector | VERIFIED WORKING | members, default, allowedObjects, switch | NOT a record-isolation boundary (see MULTI_TENANCY) |
| Object groups per workspace | `updateObjectGroups`, OBJECT_GROUPS_IMPLEMENTATION.md | IMPLEMENTED | UI + route present | |
| Leads + approval + convert to deal | `leadApprovalService.js`, routes/leadApproval.js | IMPLEMENTED | convert-to-deal endpoint | missing enforceTenant (M4) |
| CRM objects (lead/deal/account/client/contact/quote/invoice/order/product/task/case) | `backend/config/objects/*` | VERIFIED WORKING | config-driven objects + UI | "opportunity" via conversion target, not own object config file |
| Tenders (eTenders) | tenders routes/controller, etenders_service | IMPLEMENTED | search/save-as-lead/convert-to-deal/document-proxy | depends on external scraper freshness (UNKNOWN) |
| Incidents | incidents routes/controller/pages | PARTIALLY — BROKEN isolation | getAllIncidents leaks across tenants (C3); missing enforceTenant | |
| CRM Service (cases assignment/resolution) | `case` object config + records | PARTIALLY | no assignment rules/SLA engine | |
| CRM Marketing (campaigns) | — | MISSING | grep: no campaign models/routes/pages | |
| RFQ | `rfq_number` fields + tender linkage | PARTIALLY | no RFQ object/API/page | |
| Procurement | — | MISSING | labels only | |
| Insurance | Tenant.hub enum only | MISSING | no objects/routes/UI; hub UI not wired | |
| Billing/subscriptions (Paystack) | billing/subscription/paystackWebhook | IMPLEMENTED | webhook handlers: charge.success/fail, subscription create/disable, invoice | HMAC bug (M1), no idempotency |
| Email senders + templates | emailSenders/emailTemplates | IMPLEMENTED | SMTP test endpoint | templates render unsanitized HTML (H2) |
| PDF templates | pdfTemplates + GeneratePdfElement | IMPLEMENTED | | same XSS note |
| External objects sync | routes/externalObjects.js | IMPLEMENTED | fetch-schema/provision/sync/test | |
| Integrations + API keys | integrations, apiKeys | IMPLEMENTED | keys SHA-256 hashed, usage logs | timing compare issue (H5) |
| Recurring tasks | recurringTasks route/service | IMPLEMENTED | series CRUD | |
| Documents (quote/invoice gen) | routes/documents.js | IMPLEMENTED | generate-from-deal/order | |
| Global search | search routes/controller, Topbar | IMPLEMENTED | suggest + global | regex injection spots (M2) |
| Notifications | Notification model + route | IMPLEMENTED | | |
| AI onboarding | routes/ai.js + aiOnboardingService | PARTIALLY | OpenAI chat passthrough + status | depends on OPENAI key; no tests |
| Admin settings/subscription/storage | admin routes/controller | IMPLEMENTED | | systemRole inconsistency (H4) |
| Superadmin | superAdmin routes/controller | IMPLEMENTED | tenants list/suspend/activate/delete, global stats | regex injection (M2) |
| Frontend workspace switching | SidebarWorkspaceSelector | VERIFIED WORKING | switchWorkspace API → session | |
| Feature flags | frontend/src/config/features.js | IMPLEMENTED | gates pdfTemplates/automation/dashboards/etc | |
| Unrouted/dead pages | Settings/, Payment/PaymentCallback dup, RegisterComplete/VerificationPage, TenantManagement, RoleSelect | DEAD/PARTIALLY | not in App.jsx | |
| Tests | — | MISSING | no test files | jest/supertest unused |
| Monitoring/alerting | — | MISSING | winston logs only | |
| CSRF protection | — | MISSING | SameSite=None cookie | |
