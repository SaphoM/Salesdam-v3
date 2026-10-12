# Technical Debt

FACT/INFERENCE items.

## Dependencies & security
- `xlsx@0.18.5` unpatched CVEs (backend+frontend) — H1.
- Dual DnD libs (`react-beautiful-dnd` deprecated + `@hello-pangea/dnd`) in frontend.
- Version drift: admin (Vite 5/RR6/recharts 2/date-fns 3) vs frontend (Vite 8/RR7/recharts 3) vs backend — three tracks.
- `helmet` CSP disabled; no CSRF.

## Structure / code quality
- Inline handlers in routes (`automations.js` ~1200 lines with node-graph interpreter bits, `dashboards.js` widget aggregation engine, `layouts.js`, `webhooks.js`, `apiKeys.js`, `leadApproval.js`) — business logic belongs in services/controllers; duplicates patterns.
- `routes/tenants.js` dead (unmounted) — confusing duplicate of admin tenant CRUD.
- Permission checks inconsistent: `checkAppPermission` vs `checkObjectPermission` vs `requireAdmin` vs `systemRole` (H4).
- Dead/unrouted frontend pages (Settings/, Payment/PaymentCallback duplicate, RegisterComplete, VerificationPage, TenantManagement, RoleSelect) — repo noise.
- `backend/server.js` name `salesforce-mini-backend` — stale branding.
- `injectTenantId` exported but unused; `SESSION_SECRET`/`ENCRYPTION_KEY` defaults committed (C1/C2).
- Automation condition evaluator duplicates operator logic separate from formula DSL; `'changed'` stub.
- Base64 avatars on User doc (L5); 10k/15min global rate limit (L2).
- `dev-server.js` in-memory mode — untested against prod path; seeds via same code path as prod? (UNKNOWN).

## Data / ops
- Ad-hoc migration scripts (no framework); no TTL index checks; no backup docs.
- No monitoring/alerting/structured-log aggregation; deploy via SSH tarballs; GH_TOKEN in remote URL.

## Process
- No tests, no CI quality gate, no lint gate for backend (frontend has eslint config), no PR review workflow evidence.
