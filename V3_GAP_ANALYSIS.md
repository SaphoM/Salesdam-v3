# V3 Gap Analysis

| Capability | Required for v3 | Exists | Working | Architecture Suitable | Gap | Priority |
|---|---|---|---|---|---|---|
| Multi-tenancy | Yes | Yes | Mostly | Yes w/ fixes | C3 leak, missing enforceTenant ×2, no tests | P0 |
| Tenant isolation | Yes | Yes | Fragile | Yes | no enforced helper; workspace≠silo | P0 |
| Custom objects | Yes | Yes | Yes | Yes | seeds Salesdam-biased | P2 |
| Custom fields | Yes | Yes | Yes | Yes | fixed 21-type enum | P2 |
| Relationships | Yes | Partial | Lookup/MD only | Partial | no m:m | P3 |
| Page layouts | Yes | Yes | Yes | Yes | hardcoded seeds | P2 |
| Validation rules | Yes | Yes | Yes | Yes | embedded only | P2 |
| Workflows | Yes | Yes | Yes (core) | Yes | 'changed' stub; separate condition DSL | P1 |
| Automations | Yes | Yes | Yes | Yes | inline route code; no test | P1 |
| Workspace engine | Yes | Partial | Nav/membership | Partial | not data boundary; no branding/perms | P1 |
| RFQ | Expect from V2 | Partial | Fields only | No as first-class | needs RFQ object+workflow | P1 |
| Procurement | Planned | No | — | — | NOT IMPLEMENTED | P2 |
| Insurance | Planned | No | — | — | NOT IMPLEMENTED (enum only) | P2 |
| CRM | Core | Yes | Yes | Yes | opportunity via conversion; service/marketing partial | P1 |
| Permissions | Yes | Yes | Mostly | Yes | systemRole inconsistency | P1 |
| Tenant customisation | Yes | Yes | Yes | Yes | conversion targets hardcoded | P2 |
| Administration | Yes | Yes | Yes | Yes | superadmin regex injection | P1 |
| Audit logs | Yes | Yes | Yes | Yes | | P3 |
| Testing | Must | None | — | — | jest deps unused; no CI gate | P0 |
| Deployment | Yes | Azure VM + compose | Unverified | Partial | no IaC, no backup/monitoring | P1 |
| Monitoring | Yes | No | — | — | winston only | P1 |
| Security posture | Must | Partial | — | — | C1–C3, H1–H5, M1–M5 | P0 |
