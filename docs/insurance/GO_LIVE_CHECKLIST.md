# Salesdam V3 — Insurance Workspace Go-Live Checklist

- **Date:** 2026-10-11
- **Rule:** the workspace is **NOT production-ready**. Platform Core items and the
  new-business, servicing, endorsement and claims engines show real, verified
  status; billing, collections, arrears, communications, document generation and
  reporting are not implemented.

## Release gate

| # | Criterion | Status | Evidence / note |
|---|-----------|--------|-----------------|
| 1 | No unresolved critical/high security defects | PARTIAL | SF-1/SF-2/SF-3 fixed; SF-6 fixed (API-key scope on insurance API); SF-4 open (low) |
| 2 | Tenant isolation regression tests pass | PASS (core + new business + claims + endorsements + approval) | `tests/tenant-isolation.e2e.mjs` 16/16; `tests/insurance-application.e2e.mjs` + `tests/insurance-servicing-claims.e2e.mjs` + `tests/insurance-endorsements.e2e.mjs` + `tests/insurance-approval.e2e.mjs` cross-tenant 404s |
| 3 | Permissions and audit trails functioning | PARTIAL | core authZ + `auditLogger` present; insurance start/submit/issue/acceptance/servicing/claim-intake/payout audited; reporting pending |
| 4 | Application/policy lifecycle rules correct | PARTIAL | new business (start→accept→submit→issue) + servicing (lapse/reinstate/suspend/reactivate/cancel/close) + endorsements (approval gate, re-pricing, premium history) + **policy approval (BRD §11.2)** validated and tested; **arrears-driven lapse needs billing** |
| 5 | Pricing + financial ledger verified | PARTIAL | authoritative pricing engine tested; financial/billing ledger **not implemented** |
| 6 | Payment retries cannot duplicate transactions | NOT MET | not implemented |
| 7 | Documents generated, secured, versioned | PARTIAL | contract/schedule auto-generated on issue, versioned File storage, manual generation endpoint — `tests/insurance-documents.e2e.mjs` 15/15. **Delivery (email/WhatsApp) not implemented.** |
| 7b | Customer communications logged | PARTIAL | durable `policy_communication` log, auto-logged on issue/lapse/reinstate/cancel — `tests/insurance-communications.e2e.mjs` 13/13. **Actual delivery not implemented.** |
| 8 | Claims cannot be incorrectly marked paid | MET (mechanics) | approval requires cleared requirements + approved amount; payout capped at approved amount; `paid` reachable only from `approved` with a recorded payment — `tests/insurance-servicing-claims.e2e.mjs`. **Real payout ledger not implemented.** |
| 9 | Required integrations verified | NOT MET | all `UNVERIFIED`/`MISSING CREDENTIALS` |
| 10 | Dashboards/reports reconcile to data | NOT MET | insurance reports not implemented |
| 11 | Migrations and deployment tested | PARTIAL | dev DB on replica set; migrations/prod procedure pending |
| 12 | Backups, rollback, incident response documented | NOT MET | not documented |
| 13 | Tenant config and production credentials verified | NOT MET | not supplied |
| 14 | Requirements matrix identifies all gaps | PASS | `BRD_REQUIREMENTS_MATRIX.md` |

## Pre-launch must-dos (in order)
1. Approve ERD + product/rate definitions and reconcile the seeded pack against them.
2. Build the remaining Stages 4–7: billing/collections/arrears, the real payout ledger, communications, reporting — each with per-object isolation and permission tests. (Endorsement mechanics, policy approval before issue, and document generation are done; the Approval Process Builder integration and document delivery remain.)
3. Add document generation (tenant approval step before issue is done).
4. Connect and sandbox-verify each launch-critical integration.
5. Complete a full security review (field-level, document access, webhooks).
6. Test migrations, rollback, backups and incident response.
7. Re-run the full evidence suite and update this checklist.

## Current verdict
**NOT READY FOR PRODUCTION.** Platform Core is operational and tenant isolation
is verified for core objects. The Insurance **new-business engine** (application →
acceptance → submit → issue, with authoritative pricing and identity matching),
**policy servicing** (validated lapse/reinstate/suspend/reactivate/cancel/close)
and the **claims engine** (intake → requirements → approval → payout, off the
premium ledger) are implemented and tested, as are **policy endorsements**
(BRD §17: approval gate, authoritative re-pricing, effective-dated premium
history) and **policy approval before issue** (BRD §11.2: product version flag,
`policy_approval` record, approve/reject) and **policy document generation**
(BRD §11.3: contract/schedule auto-generated on issue, versioned File storage)
and **communication logging** (BRD §16.3: durable policy_communication log);
billing/collections, arrears, document delivery, actual communication delivery,
reporting and all external integrations are not.
