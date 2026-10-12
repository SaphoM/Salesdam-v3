# Salesdam V3 — BRD Requirements Matrix

- **Date:** 2026-10-11
- **Statuses:** `PASS` | `FAIL` | `PARTIAL` | `NOT IMPLEMENTED` | `BLOCKED` | `NOT VERIFIED`
- A requirement is only marked `PASS` with a test/location as evidence.

> Source of truth: **Salesdam V3 Insurance Workspace BRD v1.0** (06 Oct 2026),
> supplied by the client. The BRD (§5) designates a separate *"Salesdam V3
> Insurance Data Model and approved ERDs"* as authoritative for exact fields
> and cardinalities; that document has **not** been supplied, so this pack is
> the BRD-derived first pass and is expected to be reconciled against the ERD.
>
> Foundation pack landed: the 15 insurance objects below seed per-tenant as
> ordinary metadata (`backend/config/insurance/objects.js`), **opt-in** — not
> forced on every tenant.
>
> New-business engine landed (`backend/services/insurance/`, `routes/insurance.js`):
> authoritative pricing (`pricingService.js`), identity matching, application →
> acceptance → submit → issue lifecycle with durable status history, exposed on
> the versioned `/api/v1/insurance` API. Evidence: `tests/insurance-pricing.unit.test.js`
> (12/12), `tests/insurance-application.e2e.mjs` (33/33).
>
> Servicing + claims also landed: validated servicing actions (lapse, reinstate,
> suspend, reactivate, cancel, close) and claim intake → requirements →
> assessment → approval → payout (`services/insurance/claimService.js`), with the
> API-key object allow-list enforced on `/api/v1/insurance`. Evidence:
> `tests/insurance-servicing-claims.e2e.mjs` (32/32). Billing, collections,
> arrears, comms, reporting and document generation remain `NOT IMPLEMENTED`.
>
> Policy endorsements (BRD §17) also landed: field-level amendments with an
> explicit approval gate, authoritative re-pricing, effective-dated Policy Premium
> History and audit (`services/insurance/endorsementService.js`). Evidence:
> `tests/insurance-endorsements.e2e.mjs` (33/33).

## A. Insurance domain requirements

| Area | Requirement (BRD) | Status | Location / Note |
|------|-------------------|--------|-----------------|
| Navigation | 15 insurance nav items (Home…Settings) | PARTIAL | Insurance Workspace + object groups seeded (`seedInsuranceWorkspace`, `services/insuranceMetadataService.js`); Home/Collections/Inbox/Reports/Settings are app-shell surfaces, not objects, and are not built |
| Data model | Policy, Policy Party, Insured Life, Product, Product Version, Benefit Cover, Child Benefit Rule, Claim, Claim Requirement, Claim Payment, Endorsement, histories, Policy Acceptance | PARTIAL | 15 objects seeded as metadata: `config/insurance/objects.js`, `services/insuranceMetadataService.js`, `scripts/seed-insurance-objects.js`; evidence `tests/insurance-metadata.e2e.mjs` 9/9. Exact fields/cardinalities pending authoritative data model. |
| Leads | Lead capture (web/Meta/Google/branch/phone), assignment via Flow engine, duplicate detection | NOT IMPLEMENTED | Core Lead object exists via metadata only |
| New business | Single authoritative application journey (web/branch/phone) | PASS | `services/insurance/applicationService.js` (`startApplication` … `submitApplication`); one engine for all 3 channels; evidence `tests/insurance-application.e2e.mjs` 33/33 |
| Identity matching | Exact-ID-first matching within tenant only | PASS | `services/insurance/identityMatching.js`; reuse-by-ID-number verified in e2e |
| Pricing | Product versions, age bands, member limits, underwriter/tenant markup | PASS | Authoritative `services/insurance/pricingService.js` (no silent defaults); 5 rate categories, age bands, member limits, child-cover rule, extended family, gated manual override; `tests/insurance-pricing.unit.test.js` 12/12 + e2e |
| Acceptance | Website/branch/telephone acceptance evidence | PASS | `captureAcceptance` enforces per-channel evidence (branch signature, telephone recording, terms version); e2e covers branch-reject/website-accept |
| Policy issue | Numbering, activation criteria, document generation | PARTIAL | Auto-number (`POL-…`) + straight-through activation via `issuePolicy`; **tenant approval step (BRD §11.2) implemented** — product version `requires_approval` flag + `policy_approval` record + approve/reject endpoints; `tests/insurance-approval.e2e.mjs` 16/16; **document generation (BRD §11.3) implemented** — contract/schedule auto-generated on issue, versioned File storage, manual generation endpoint; **automatic email delivery with attachments** on issue via `communicationDispatcher`; `tests/insurance-documents.e2e.mjs` 15/15 |
| Lifecycle | Effective-dated status history, lapse, reinstatement, cancellation | PARTIAL | Validated transition table + durable `policy_status_history`; servicing endpoints exposed (`POST /policies/:id/{lapse,reinstate,suspend,reactivate,cancel,close}`) and rejected when illegal; **auto-lapse service implemented** (`services/insurance/autoLapseService.js`, `tests/insurance-auto-lapse.e2e.mjs` 8/8); **reinstatement service implemented** (`services/insurance/reinstatementService.js`, `tests/insurance-reinstatement.e2e.mjs` 18/18) with eligibility, financial settlement, endorsement, documents, comms; scheduled cron integration NOT IMPLEMENTED; evidence `tests/insurance-servicing-claims.e2e.mjs` |
| Billing | Premium debits, billing keys, idempotency | PARTIAL | Core `Account` object wired; `premium_transaction` object added; billing engine `services/insurance/billingEngine.js` with debit/credit/allocation, idempotent billing keys; **billing run service** `services/insurance/billingRunService.js` + runner `scripts/run-billing-cycle.js`; tests `tests/insurance-billing.test.mjs` 16/16 + `tests/insurance-billing-run.e2e.mjs` 11/11. Scheduled Flow integration NOT IMPLEMENTED. |
| Collections | Debit orders, Pay@, EasyPay, gateways, retries, reconciliation | NOT IMPLEMENTED | Adapter interfaces required |
| Arrears | 3-missed-payment lapse default (configurable), non-consecutive counting | PARTIAL | Pure rule `evaluateArrears` in `services/insurance/billingEngine.js`; auto-lapse service `services/insurance/autoLapseService.js` + runner script `scripts/run-auto-lapse.js`; tests `tests/insurance-billing.test.mjs` 16/16 + `tests/insurance-auto-lapse.e2e.mjs` 8/8. Scheduled cron integration NOT IMPLEMENTED. |
| Communications | Templates/automations for all lifecycle events | PARTIAL | Core logging (`policy_communication` object, `communicationService`); **template system** (`communicationTemplates.js` with dynamic `{{field.path}}` substitution, versioning, multi-channel); **automated triggers** (`communicationTriggers.js` for all BRD §16.1-16.2 events: payment due/received/failed, missed payments 1-3, policy issued/lapsed/reinstated/cancelled, endorsement, claim events, child age events, waiting period); tests `tests/insurance-communication-templates.test.mjs` 8/8 + `tests/insurance-communication-triggers.e2e.mjs` 15/15. Delivery via Automation engine NOT IMPLEMENTED. |
| Amendments | Endorsements with approval engine | PASS (mechanics) | `services/insurance/endorsementService.js`: field-level `policy_endorsement` + `policy_endorsement_item`, draft → [pending_approval →] approved → applied, authoritative re-price + effective-dated `policy_premium_history`, cancellation/reinstatement drive the policy lifecycle. Approval is an endorsement-level gate standing in for the core Approval Process Builder (not present in repo); **document regeneration not implemented**; evidence `tests/insurance-endorsements.e2e.mjs` 33/33 |
| Call centre | Euphoria click-to-call, email-to-case, omnichannel inbox | NOT IMPLEMENTED | Integrations not verified |
| Claims | Intake, eligibility, requirements, approvals, separate payout ledger | PARTIAL | `services/insurance/claimService.js`: intake + eligibility check, requirements checklist, validated workflow (reported → documents_outstanding → under_review → approved/declined → paid → closed), approval blocked while requirements outstanding, payout recorded as `claim_payment` only (never on the premium ledger) with amount capped at the approved amount; **real financial ledger not implemented**; evidence `tests/insurance-servicing-claims.e2e.mjs` |
| Remittance | Underwriter remittance reporting | NOT IMPLEMENTED | Analytics core exists |
| Reporting | Operational/financial/portfolio/claims dashboards | NOT IMPLEMENTED | Dashboard core exists |
| Config | Tenant-level insurance configuration | NOT IMPLEMENTED | — |
| API | `/api/v1/insurance/*` versioned business API | PASS | `routes/insurance.js` mounted in `app.js`; tenant from credential only, correlation IDs, idempotent start, servicing + claims + endorsement + approval + document + communication routes, API-key object allow-list enforced; evidence e2e 33/33 + 32/32 + 33/33 + 16/16 + 15/15 + 13/13 |

## B. Platform Core requirements (existing, reusable)

| Capability | Status | Evidence |
|------------|--------|----------|
| Object metadata engine | PASS | `models/ObjectMeta.js`, `FieldMeta`, `Layout`, `ListView` |
| Dynamic records + tenant scoping | PASS | `controllers/recordController.js` (all queries scoped by `req.tenantId`) |
| Authentication (session + API key) | PASS | `middleware/auth.js`, live browser login verified |
| Rate limiting | PASS | burst → 429 verified |
| Authorisation (object/app/field) | PASS | `middleware/permissions.js` |
| Role seeding | PASS | `services/roleService.js` |
| Tenant isolation | PARTIAL → **PASS (core objects)** | `tests/tenant-isolation.e2e.mjs` 16/16 (files, roles, users, records, search, header spoof) |
| Files / document access | PASS | `routes/files.js` (tenant-scoped-by-id) |
| Transactational consistency | PASS | single-node replica set `rs0` enabled |
| Audit trail | PARTIAL | `utils/auditLogger.js`; application start/submit/issue, acceptance, servicing actions, claim intake and payouts are audited; other insurance actions pending |
| Reporting/analytics | PARTIAL | scaffolding present; insurance definitions pending |
| Automated tests | PARTIAL | Jest 17/17 (2 suites); isolation e2e 16/16; insurance metadata e2e 9/9; insurance application e2e 33/33; servicing+claims e2e 32/32; endorsements e2e 33/33; approval e2e 16/16; documents e2e 15/15; communications e2e 13/13 |

## C. Verification status

| Verification | Status | Evidence |
|--------------|--------|----------|
| Insurance pricing engine | PASS | `tests/insurance-pricing.unit.test.js` 12/12 (categories, age bands, child cap, extended family, config errors, gated override) |
| Insurance application → issue journey | PASS | `tests/insurance-application.e2e.mjs` 33/33 (two tenants, idempotency, ID matching, acceptance evidence, cross-tenant 404) |
| `/api/v1/insurance` API surface | PASS | `routes/insurance.js`, mounted in `app.js`; exercised by the e2e test |
| Browser login (real Chromium) | PASS | CDP session, `/auth/login` 200, session persists |
| Cross-tenant isolation (core) | PASS | 16/16 checks |
| Insurance metadata seeding/isolation | PASS | `tests/insurance-metadata.e2e.mjs` 9/9 (seeds 15 objects, opt-in isolation, idempotent) |
| Insurance new-business behaviour (pricing, matching, accept, submit, issue) | PASS | `tests/insurance-pricing.unit.test.js` 12/12 + `tests/insurance-application.e2e.mjs` 33/33 |
| Insurance servicing (lapse/reinstate/suspend/reactivate/cancel/close) | PASS (mechanics + auto-lapse + reinstatement) | `tests/insurance-servicing-claims.e2e.mjs` 32/32 + `tests/insurance-auto-lapse.e2e.mjs` 8/8 + `tests/insurance-reinstatement.e2e.mjs` 18/18 |
| Insurance claims (intake → approval → payout) | PASS (mechanics) | `tests/insurance-servicing-claims.e2e.mjs` 32/32; payout recorded off-ledger, real ledger NOT IMPLEMENTED |
| Insurance endorsements (BRD §17) | PASS (mechanics) | `tests/insurance-endorsements.e2e.mjs` 33/33; approval gate + re-pricing + premium history; Approval Process Builder + document regeneration NOT IMPLEMENTED |
| Insurance policy approval before issue (BRD §11.2) | PASS (mechanics) | `tests/insurance-approval.e2e.mjs` 16/16; product version `requires_approval` flag + `policy_approval` record; approve/reject endpoints; straight-through when flag is false |
| Insurance policy documents (BRD §11.3) | PARTIAL (mechanics + delivery) | `tests/insurance-documents.e2e.mjs` 15/15; contract/schedule auto-generated on issue/endorsement, versioned File storage, manual generation endpoint; **automatic email delivery with attachments on issue/endorsement via `communicationDispatcher`** |
| Insurance communication logging (BRD §16.3) | PASS (mechanics) | `tests/insurance-communications.e2e.mjs` 13/13; durable `policy_communication` log, auto-logged on issue/lapse/reinstate/cancel; actual delivery NOT IMPLEMENTED |
| Insurance billing/arrears/lapse rule | PARTIAL (core + auto-lapse) | `tests/insurance-billing.test.mjs` 16/16 + `tests/insurance-auto-lapse.e2e.mjs` 8/8 (billing keys, FIFO allocation, non-consecutive missed, partials, grace, configurable threshold, paid-through date, auto-lapse transition with status history). Scheduled cron integration NOT IMPLEMENTED. |
| Integration tests (providers) | BLOCKED | no credentials/sandbox |
