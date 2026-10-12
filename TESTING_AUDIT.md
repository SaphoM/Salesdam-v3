# Testing Audit

FACT: **No automated tests exist.** Search for `*.test.*`, `*.spec.*`, `__tests__` returned zero matches (excluding docs/node_modules). `jest`, `supertest`, `mongodb-memory-server` are in backend devDependencies but no test script or config uses them. No CI test stage; deploy workflows have no `npm test` step. Frontend/admin/landing/docs/etenders have no test setup.

## Coverage by critical area
| Area | Tests | Risk |
|---|---|---|
| Authn (login/session/lockout) | None | High |
| AuthZ (roles/permissions) | None | High |
| Tenant isolation | None | Critical — no regression guard for enforceTenant gaps |
| Config engine (validation/formula/rollup) | None | High — pure functions, highly testable |
| Automation engine | None | High |
| Billing webhook | None | High |
| Import/export | None | High |

## Recommendation (not executed)
- Add jest + mongodb-memory-server unit tests for `formulaParser`, `validationEngine`, `rollupService`, `automationService` condition evaluation.
- Supertest integration tests: auth flow, tenant isolation (two tenants assert no cross-reads), object/field CRUD, incident tenant filtering (would catch C3).
- CI: add `npm test` + build before deploy in both workflows.
