# Database Audit

FACT: MongoDB 8.2 (docker-compose `mongo:8.2.11`, replica set rs0, auth, keyFile, persisted volume). Mongoose 8 models in `backend/models/` (~34).

## Models (grouped)
- Tenant/identity: `Tenant`, `User`, `Session`, `Role`, `RegistrationToken`.
- Workspace: `Workspace`.
- Metadata/config: `ObjectMeta`, `FieldMeta`, `Layout`, `ObjectTypeConfig`, `ListView`, `ExternalObject`, `CustomScreen`, `DashboardFolder`, `Dashboard`, `PdfTemplate`, `EmailTemplate`, `EmailSender`, `Integration`, `ApiKey`, `ApiKeyUsageLog`.
- Data: `DynamicRecord` (generic `{data: Map}`, tenantId+objectApiName indexes), `File`, `RecentlyViewed`, `AutoNumberCounter`, `Notification`, `AuditLog`, `Incident`, `IncidentComment`, `Automation`, `Webhook`, `Workspace`.
- Supporting: `SalesdamObjects` (config), `supportDocument` seeds.

## Tenant identifiers
Every business doc carries `tenantId` (ObjectId ref Tenant). `User.tenantId`, `Session.tenantId`, `ApiKey.tenantId`, `Workspace.tenantId`. DynamicRecord indexed on `(tenantId, objectApiName, updatedAt)`-style; uniqueness enforced where relevant (ObjectMeta tenantId+apiName unique).

## Relationships
- Lookup/master_detail: `FieldMeta` types `lookup`/`master_detail`; rollups validate cascade requirement.
- User→Role populate; Tenant→Users; Session→User/Tenant; Incident→Tenant+User; DynamicRecord→ObjectMeta (implicit by objectApiName string).
- No DB-level FKs (Mongo) — referential integrity is application-level; delete cascades hand-written (ObjectMeta pre-deleteOne cascade).

## Suitability for v3 goals
- Multi-tenancy: yes (tenantId everywhere) — but enforced in app code only.
- Custom objects/fields: yes (metadata tables).
- Relationships: limited (lookup/master_detail; no m:m primitive).
- Workspaces/tenant config: yes (Workspace + ObjectTypeConfig + per-tenant roles/layouts).
- Workflows: yes (Automation doc graph).
- Constraints: no transactional guarantees across collections (even with replica set, multi-doc writes not transactional in code); formula/rollup recomputation is synchronous on write; `data: Map` precludes type-level indexing/query operators beyond string keys; no schema validation at DB level.

## Structural limitations
- `DynamicRecord.data` is schemaless per-object; queries like `data.<field>` rely on key conventions; tenant+object queries but not workspace-aware.
- IncidentComment/Reply stored inline? — `IncidentComment` separate model; comment queries by incidentId (see M4).
- base64 avatars inside User docs (L5).
- No TTL indexes on Session beyond expiresAt logic? (Session has expiresAt check at query time — fine but no TTL index observed.)

## Migrations
Manual node scripts in `backend/scripts` (seed, migrate:field-flags, backfill formula return types, migrate line-item rollups, merge fields, etc.) — ad-hoc, not framework-managed.
