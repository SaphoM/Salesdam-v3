# System Architecture

FACT — verified by reading repository files.

## Components

| Component | Path | Tech | Responsibility |
|---|---|---|---|
| Core API | `backend/` | Node, Express 4, Mongoose 8, ESM | Multi-tenant CRM API, config engine, billing, automations |
| Main SPA | `frontend/` | React 18, Vite 8, React Query, RR7 | Tenant user UI |
| Super-admin SPA | `admin/` | React 18, Vite 5, RR6 | Tenant/platform admin UI |
| Landing site | `landing/` | Astro 4 | Marketing |
| Docs site | `docs/` | Astro 4 | User documentation |
| eTenders scraper | `etenders_service/` | Node, Express, node-cron, Mongoose | Periodic tender ingestion → Mongo → REST API |

## Request path (verified)

```
Browser → frontend SPA (Vite build / nginx)
  → axios/react-query → /api/v1/<resource>
    → app.js middleware chain:
      helmet → CORS (allowlist + X-Tenant-ID/X-API-Key headers) → compression
      → JSON(10mb) → mongoSanitize → morgan → sessionMiddleware(cookie crm.sid → Session doc)
      → global API rate limit → router
    → router: requireAuth (session or x-api-key) → tenantId set → enforceTenant (tenant exists/active, user.tenantId match)
      → checkAppPermission / checkObjectPermission / requireAdmin / requireSuperuser
    → controller/service → Mongoose → MongoDB (replica set, auth, --keyFile)
    → JSON response → UI state (React Query cache)
```

Background: `etenders_service` cron jobs scrape and upsert tenders; backend `tendersController` proxies/links to leads/deals. Paystack webhook at `/api/paystack-webhook` (signature verified, but see SECURITY_AUDIT). AI onboarding calls OpenAI from `routes/ai.js`.

## Entry points
- Backend: `backend/server.js` (dotenv → connectDB → listen :5000) → `backend/app.js` (all middleware + mounts).
- Frontend: `frontend/src/main.jsx` → `App.jsx` (route guards + feature flags in `src/config/features.js`).
- Admin: `admin/src/main.jsx`.
- eTenders: `etenders_service/server.js`.

## Configuration
- `.env.example` per deployable (root, backend, frontend, admin, etenders_service). Secrets: SESSION_SECRET, ENCRYPTION_KEY, PAYSTACK_*, SMTP_*, MONGO_URI, OPENAI_API_KEY.
- Feature flags in `frontend/src/config/features.js`.
- Standard-object seeds in `backend/config/objects/*` (FACT: hardcoded defaults, editable per-tenant metadata after seeding).

## Database
MongoDB 8.2 replica set (docker-compose `mongo` service, `rs0`, auth + keyFile, volume `salesdam_platform_mongo_data`). ~34 Mongoose models in `backend/models/`.

## AuthN/AuthZ
- AuthN: session cookie (`crm.sid`, Session collection, sliding expiry) or API keys (SHA-256 hashed, prefix lookup, IP whitelist, object scoping, usage logging).
- AuthZ: Role documents + `checkAppPermission(...)`, `checkObjectPermission(...)`, `requireAdmin`, `requireSuperuser`.
- Passwords: bcryptjs cost 12, lockout 5 attempts/30min (`User.js`).

## Testing / CI/CD
- No test files found (FACT). jest + supertest + mongodb-memory-server present in devDeps, unused.
- CI: `.github/workflows/deploy-test.yml`, `deploy-platform.yml` — deploy-only (tarball over SSH to Azure VM), no test/build gate (FACT).
