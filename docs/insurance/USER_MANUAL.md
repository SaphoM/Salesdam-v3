# Salesdam V3 Insurance Workspace — User Manual

A step-by-step guide to the insurance API. All endpoints are prefixed with `/api/v1/insurance`.

**Prerequisites:** a running MongoDB replica set, backend on port 5002, and a valid session cookie (obtained via `POST /api/v1/auth/login`).

---

## 1. Initial Setup (one-time per tenant)

### 1.1 Seed the insurance workspace

```bash
npm run seed:insurance
```

This creates 15 metadata objects (Product, Policy, Claim, Endorsement, etc.) in the tenant's workspace.

### 1.2 Create a Product and Product Version

```json
// POST /api/v1/insurance/products
{
  "name": "Funeral Plan",
  "status": "active"
}
```

```json
// POST /api/v1/insurance/product-versions
{
  "name": "FP v1",
  "product": "<product_id>",
  "status": "active",
  "effective_from": "2026-01-01",
  "allow_spouse": true,
  "allow_children": false,
  "min_entry_age": 18,
  "max_entry_age": 65,
  "requires_approval": false
}
```

**Key fields:**
- `requires_approval: true` — policy cannot be issued until an approver signs off
- `allow_spouse / allow_children` — which relations are permitted

### 1.3 Configure rates (Benefit Covers)

Create rate rows for each cover amount you want to offer:

```json
// POST /api/v1/insurance/benefit-covers
{
  "name": "main only 100k",
  "product_version": "<pv_id>",
  "rate_category": "main_member_only",
  "cover_amount": 100000,
  "min_age": 18,
  "max_age": 65,
  "premium": 250.00,
  "effective_from": "2026-01-01"
}
```

**Rate categories:** `main_member_only`, `main_member_spouse`, `main_member_children`, `main_member_spouse_children`, `extended_family`

---

## 2. New Business — Application Journey

### 2.1 Start an application

```json
// POST /api/v1/insurance/applications
{
  "channel": "website",
  "product_version_id": "<pv_id>"
}
```

Returns a policy record with `status: application_started` and an auto-generated `POL-` number.

### 2.2 Capture the main member

```json
// PUT /api/v1/insurance/applications/:id/main-member
{
  "id_number": "ID1234567890123",
  "first_name": "John",
  "last_name": "Doe",
  "age": 35,
  "cover_amount": 100000
}
```

The system matches or creates a Client automatically (exact ID → passport → email → mobile).

### 2.3 Add a premium payer (required before submit)

```json
// PUT /api/v1/insurance/applications/:id/premium-payer
{
  "id_number": "ID9876543210987",
  "first_name": "Jane",
  "last_name": "Doe"
}
```

### 2.4 Capture acceptance

```json
// POST /api/v1/insurance/applications/:id/acceptance
{
  "channel": "website",
  "accepted_terms_version": "1.0"
}
```

Channel-specific evidence:
- **Website:** `accepted_terms_version`
- **Branch:** `signature_captured: true`
- **Telephone:** `recording_reference: "REC-001"`

### 2.5 Submit

```bash
POST /api/v1/insurance/applications/:id/submit
```

Validates everything, calculates premium, persists `current_premium`. Status → `application_submitted`.

If `requires_approval` is `true`, a `policy_approval` record is created automatically.

---

## 3. Policy Approval (when `requires_approval = true`)

### 3.1 List approvals

```bash
GET /api/v1/insurance/policies/:id/approvals
```

### 3.2 Approve

```bash
POST /api/v1/insurance/approvals/:approvalId/approve
```

### 3.3 Reject

```json
// POST /api/v1/insurance/approvals/:approvalId/reject
{ "reason": "Underwriting declined" }
```

Policy stays in `application_submitted` until approved.

---

## 4. Issue the Policy

```bash
POST /api/v1/insurance/policies/:id/issue
```

- Straight-through (no approval flag): status → `active`
- With approval: only succeeds if an approved `policy_approval` exists; otherwise **409**

---

## 5. Policy Servicing

All actions: `POST /api/v1/insurance/policies/:id/{action}`

| Action | Effect |
|--------|--------|
| `lapse` | Status → `lapsed` (e.g. non-payment) |
| `reinstate` | Status → `active` (from lapsed) |
| `suspend` | Status → `inactive` |
| `reactivate` | Status → `active` (from inactive) |
| `cancel` | Status → `cancelled` (requires `reason`) |
| `close` | Status → `closed` |

Illegal transitions return **409**. Every transition is recorded in `policy_status_history`.

---

## 6. Endorsements (Policy Amendments)

### 6.1 Create an endorsement

```json
// POST /api/v1/insurance/policies/:id/endorsements
{
  "change_type": "cover_amount_change",
  "reason": "Client requested higher cover",
  "requires_approval": true
}
```

**Change types:** `cover_amount_change`, `add_insured_life`, `end_insured_life`, `beneficiary_change`, `premium_payer_change`, `payment_method_change`, `cancellation`, `reinstatement`, `other`

### 6.2 Submit → Approve → Apply

```bash
POST /api/v1/insurance/endorsements/:id/submit    # draft → pending_approval (or approved if requires_approval=false)
POST /api/v1/insurance/endorsements/:id/approve   # pending_approval → approved
POST /api/v1/insurance/endorsements/:id/apply     # approved → applied (executes the change)
```

### 6.3 Cover amount change

```json
// POST /api/v1/insurance/endorsements/:id/apply
{ "cover_amount": 200000 }
```

The system re-prices automatically and writes a `policy_premium_history` row.

### 6.4 Add a spouse

```json
// POST /api/v1/insurance/endorsements/:id/apply
{
  "relation": "spouse",
  "id_number": "ID1111111111111",
  "name": "Jane Doe",
  "age": 30
}
```

---

## 7. Claims

### 7.1 Report a claim

```json
// POST /api/v1/insurance/claims
{
  "policy_id": "<policy_id>",
  "insured_life_id": "<life_id>",
  "claimant": { "id_number": "ID2222222222222", "name": "Claimant Name" },
  "claim_type": "death",
  "event_date": "2026-10-01"
}
```

Status → `reported`. Auto-number `CLM-`.

### 7.2 Add requirements

```json
// POST /api/v1/insurance/claims/:id/requirements
{ "name": "Death certificate" }
```

Status → `documents_outstanding`.

### 7.3 Transition to review

```json
// POST /api/v1/insurance/claims/:id/transition
{ "to": "under_review" }
```

### 7.4 Mark requirements as accepted

```json
// PUT /api/v1/insurance/claims/:id/requirements/:requirementId
{ "status": "accepted" }
```

### 7.5 Approve the claim

```json
// POST /api/v1/insurance/claims/:id/transition
{ "to": "approved", "approved_amount": 5000 }
```

### 7.6 Record a payout

```json
// POST /api/v1/insurance/claims/:id/payments
{ "amount": 5000, "payment_method": "eft" }
```

Status → `paid`. Amount cannot exceed `approved_amount`.

### 7.7 Close

```json
// POST /api/v1/insurance/claims/:id/transition
{ "to": "closed" }
```

---

## 8. Quick Reference — Status Flows

```
Application:  application_started → quote_generated → application_submitted → active
 Servicing:   active → lapsed → active (reinstate)
              active → inactive → active (suspend/reactivate)
              active → cancelled / closed
Endorsement:  draft → pending_approval → approved → applied
              (or draft → approved → applied when requires_approval=false)
Approval:     pending → approved / rejected
Claim:        reported → documents_outstanding → under_review → approved → paid → closed
              (or under_review → declined)
```

---

## 9. Common Errors

| Code | Meaning |
|------|---------|
| 400 | Validation failed (missing field, bad value) |
| 403 | API key not authorised for this object scope |
| 404 | Record not found (or belongs to another tenant) |
| 409 | Illegal state transition |
| 422 | Configuration error (no rate found for cover/age) |

---

## 10. Testing

Run the full test suite:

```bash
cd backend
npm run test:insurance
```

Expected: 123 e2e checks + 17 Jest tests, all passing.
