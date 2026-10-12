# Salesdam V3 — Insurance Workspace Implementation Plan

- **Date:** 2026-10-11
- Architecture per brief: **Platform Core → insurance domain services → shared
  validation/rules engine → DB/transaction layer → APIs, flows, automations, UI**.

> Realistic status: this is a multi-stage program. **Stage 0** and the **Stage 1
> security slice** are complete; **Stage 2** (metadata/workspace), **Stage 3**
> (new business), **Stage 4** (servicing + endorsement mechanics), **Stage 5**
> (claims mechanics) are partial. Billing, collections, arrears, communications,
> reporting and document generation are `NOT IMPLEMENTED`. Do not mark a stage
> complete because a screen exists.

## Stage 0 — Discovery and risk assessment — **COMPLETE**
- Repository audit → `REPOSITORY_AUDIT.md`.
- Requirements matrix → `BRD_REQUIREMENTS_MATRIX.md`.
- Security findings → `SECURITY_FINDINGS.md`.
- External dependencies → `INTEGRATION_REGISTER.md`.

## Stage 1 — Stabilisation and architecture — **COMPLETE (core slice)**
- Tenant isolation hardening:
  - Removed client-header tenant fallback in `middleware/auth.js`.
  - Added `tenantId` to the search re-hydration query (`controllers/searchController.js`).
- Regression test: `backend/tests/tenant-isolation.e2e.mjs` — **16/16 pass**.
- Single-node replica set (`rs0`) enabled for transactional correctness.
- Remaining: expand isolation tests to every insurance object as it is built.

## Stage 2 — Insurance foundation — **PARTIAL (metadata + workspace landed)**
Deliverables:
1. ~~Tenant-scoped insurance metadata objects~~ — **done**: 15 objects seed per-tenant
   (`config/insurance/objects.js`), evidence `tests/insurance-metadata.e2e.mjs` 9/9.
2. Permissions: object/record/field for each new object — **pending** (objects inherit
   core permission model; explicit per-object permission seeds not yet added).
3. ~~Navigation items and workspace registration~~ — **partial**: `seedInsuranceWorkspace`
   creates the "Insurance" Workspace with object groups; app-shell surfaces
   (Home/Reports/Settings) are not objects and not built.
4. Indexes specific to insurance — **pending** (core compound indexes cover tenant reads).
5. Reversible, backward-compatible migrations — **pending**.
Dependencies: approved ERD fields/cardinalities (not present in repo — required).

## Stage 3 — New business and policy issuance — **PARTIAL (engine landed)**
- ~~One authoritative application engine (web/branch/telephone) with resumable state~~ —
  **done**: `services/insurance/applicationService.js`, exposed on `/api/v1/insurance`;
  evidence `tests/insurance-application.e2e.mjs` 33/33.
- ~~Exact-ID-first identity matching within tenant only~~ — **done**:
  `services/insurance/identityMatching.js`.
- ~~Product/version config + authoritative pricing service (no silent defaults)~~ — **done**:
  `services/insurance/pricingService.js`; `tests/insurance-pricing.unit.test.js` 12/12.
- ~~Acceptance records per channel; submission validation; policy numbering~~ — **done**:
  `captureAcceptance` (per-channel evidence), `submitApplication`, auto-number `POL-…`.
- ~~Tenant-configured approval step before issue (BRD §11.2)~~ — **done (mechanics)**:
  `services/insurance/approvalService.js` — product version `requires_approval` flag,
  `policy_approval` record created on submit, approve/reject endpoints; policy stays
  in SUBMITTED until approved; evidence `tests/insurance-approval.e2e.mjs` 16/16.
- ~~Document generation (BRD §11.3)~~ — **done (mechanics)**:
  `services/insurance/policyDocumentService.js` — contract/schedule auto-generated
  on issue, stored as versioned `File` records against the policy, manual generation
  endpoint (`POST /policies/:id/documents/:type`), regeneration after repricing
  endorsements; evidence `tests/insurance-documents.e2e.mjs` 15/15.
  **Remaining**: document delivery (email/WhatsApp) via configured channel.
- ~~Communication logging (BRD §16.3)~~ — **done (mechanics)**:
  `services/insurance/communicationService.js` — durable `policy_communication` log;
  auto-logged on policy issue, lapse, reinstate, cancel; manual logging endpoint;
  evidence `tests/insurance-communications.e2e.mjs` 13/13.
  **Remaining**: actual delivery (email/WhatsApp) via the Automation engine.

## Stage 4 — Policy servicing and financial operations — **PARTIAL**
- ~~Policy servicing actions (lapse, reinstate, suspend, reactivate, cancel,
  close) on the validated transition table, plus tenant-scoped policy list/read~~ —
  **done**: `services/insurance/applicationService.js` (`applyPolicyAction`,
  `listPolicies`), exposed on `/api/v1/insurance`; evidence
  `tests/insurance-servicing-claims.e2e.mjs` 32/32. Note: these are operator/service
  actions — automatic arrears-driven lapse needs billing first.
- Premium billing on the core Account/Transaction ledger with billing keys and idempotency — **NOT IMPLEMENTED**.
- Collections adapters (debit order, Pay@, EasyPay, gateways) behind interfaces + tests — **NOT IMPLEMENTED**.
- Allocation/reversal/reconciliation; paid-through derivation from settlement — **NOT IMPLEMENTED**.
- Arrears/non-consecutive missed-payment counting — **NOT IMPLEMENTED**.
- ~~Endorsements (BRD §17)~~ — **done (mechanics)**:
  `services/insurance/endorsementService.js` — field-level
  `policy_endorsement` + `policy_endorsement_item`, draft → [pending_approval →]
  applied, authoritative re-price with effective-dated `policy_premium_history`,
  cancellation/reinstatement drive the policy lifecycle; evidence
  `tests/insurance-endorsements.e2e.mjs` 33/33. Approval is an endorsement-level
  gate standing in for the core Approval Process Builder (not present in repo);
  document regeneration not implemented.

## Stage 5 — Claims and customer service — **PARTIAL**
- ~~Claim intake/eligibility/requirements/approvals; payouts kept off the premium
  ledger~~ — **done (mechanics)**: `services/insurance/claimService.js`; validated
  workflow, approval gated on cleared requirements, payout capped at the approved
  amount and recorded only as `claim_payment`; evidence
  `tests/insurance-servicing-claims.e2e.mjs` 32/32.
- ~~Policy endorsements (BRD §17)~~ — **done (mechanics)**: see Stage 4.
- **Remaining**: real financial payout ledger, claim communications.
- Cases, email-to-case, Euphoria telephony, omnichannel inbox — **NOT IMPLEMENTED**.

## Stage 6 — Reporting and integration hardening — **NOT IMPLEMENTED**
- Operational/financial/portfolio/claims dashboards on verified, tenant-scoped data.
- Underwriter remittance reporting; OpenAPI docs; webhook signature/retry/idempotency.

## Stage 7 — Release readiness — **NOT IMPLEMENTED**
- Full regression + security review; deployment/rollback; tenant config; go-live gate.

## Sequencing rules
- No UI work that skips Stage 1 security or the Stage 2 data model.
- Every new object ships with tenant isolation and permission tests in the same change.
- External integrations stay behind adapters and remain `UNVERIFIED` until a real
  or provider-approved sandbox test succeeds.
