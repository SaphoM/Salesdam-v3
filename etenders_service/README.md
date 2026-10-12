# eTenders Service

Fetches tenders from the [eTenders SA](https://www.etenders.gov.za) portal twice a day, stores
them in MongoDB, and exposes them via a filterable, token-protected REST API with an interactive
Swagger UI.

## Folder structure

```
etenders-service/
├── package.json
├── .env.example
├── server.js                          # entry point: connects DB, starts cron, starts HTTP server
└── src/
    ├── app.js                         # express app: middleware, swagger ui, routes
    ├── config/
    │   ├── env.js                     # reads/normalizes environment variables
    │   └── db.js                      # mongoose connection
    ├── models/
    │   └── tender.model.js            # Mongoose schema (camelCase fields)
    ├── services/
    │   ├── etenders.service.js        # talks to the eTenders DataTable endpoint, paginates
    │   └── tender.service.js          # raw->camelCase mapping, upsert, filtering/query logic
    ├── jobs/
    │   └── fetchTenders.job.js        # node-cron schedule (twice daily) + manual runner
    ├── controllers/
    │   └── tender.controller.js       # request handlers for the tenders endpoints
    ├── routes/
    │   ├── index.js                   # mounts /api/health, /api/tenders, /api/admin
    │   ├── tender.routes.js           # GET /api/tenders, GET /api/tenders/:id (+ swagger docs)
    │   └── admin.routes.js            # POST /api/admin/sync (manual trigger)
    ├── middleware/
    │   ├── auth.middleware.js         # token check (Authorization: Bearer or x-api-key)
    │   ├── rateLimiter.middleware.js  # general + stricter admin rate limiters
    │   └── errorHandler.middleware.js # 404 + central error handler
    ├── utils/
    │   └── apiResponse.js             # consistent { success, message, data } response shape
    └── docs/
        └── swagger.js                 # swagger-jsdoc config, reads jsdoc comments in routes/*.js
```

## Setup

```bash
cp .env.example .env
# edit .env: set MONGO_URI and API_ACCESS_TOKENS at minimum
npm install
npm run dev     # or: npm start
```

Open **http://localhost:5000/api-docs** for the interactive Swagger UI — you can authorize with
your token (top-right "Authorize" button) and try the endpoints directly in the browser.

## Environment variables

| Variable | Description |
|---|---|
| `PORT` | HTTP port (default 5000) |
| `MONGO_URI` | MongoDB connection string |
| `API_ACCESS_TOKENS` | Comma-separated list of valid access tokens |
| `ETENDERS_BASE_URL` | eTenders DataTable endpoint |
| `ETENDERS_STATUS` | Status filter sent to eTenders (1 = Published) |
| `FETCH_PAGE_SIZE` | Page size used while paginating through eTenders |
| `FETCH_CRON_MORNING` / `FETCH_CRON_EVENING` | Cron expressions for the two daily syncs |
| `RUN_FETCH_ON_STARTUP` | If `true`, runs a sync immediately when the server boots |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | General limit for `/api/tenders*` and `/api/admin*` (default: 100 requests / 15 min) |
| `ADMIN_RATE_LIMIT_WINDOW_MS` / `ADMIN_RATE_LIMIT_MAX` | Extra, stricter limit just for `POST /api/admin/sync` (default: 5 requests / 15 min) |

## Authentication

Every `/api/tenders*` and `/api/admin*` route requires a token, sent either as:

```
Authorization: Bearer <token>
```
or
```
x-api-key: <token>
```

The token must be one of the comma-separated values in `API_ACCESS_TOKENS`. This is intentionally
simple (env-based) for now — swap `auth.middleware.js` for a DB-backed API-key model later if you
need per-client tokens or revocation.

## Rate limiting

`/api/tenders*` and `/api/admin*` share a general limit (`RATE_LIMIT_MAX` requests per
`RATE_LIMIT_WINDOW_MS`, default 100 / 15 min). `POST /api/admin/sync` has an additional, stricter
limit on top of that (`ADMIN_RATE_LIMIT_MAX`, default 5 / 15 min) since each call triggers a full
fetch-and-upsert cycle against the eTenders source. `GET /api/health` is never rate limited, so
load balancers/monitoring can poll it freely.

Limits are keyed by the caller's access token (so each client gets its own bucket), falling back
to IP address for unauthenticated requests. Exceeding a limit returns `429` with
`RateLimit-*` headers indicating the remaining quota and reset time.

## Endpoints

### `GET /api/tenders`
List tenders. All query params are optional and combine with AND logic.

| Param | Type | Notes |
|---|---|---|
| `page`, `limit` | number | `limit` capped at 100 |
| `sortBy` | string | `closingDate` (default), `datePublished`, `createdAt`, `tenderNumber`, `category` |
| `sortOrder` | string | `asc` / `desc` (default `desc`) |
| `search` | string | matches `description` or `tenderNumber` |
| `category`, `province`, `department`, `organOfState`, `status`, `tenderNumber` | string | case-insensitive partial match |
| `eSubmission`, `briefingCompulsory` | boolean | `true` / `false` |
| `datePublishedFrom`, `datePublishedTo` | date (`YYYY-MM-DD`) | inclusive range |
| `closingDateFrom`, `closingDateTo` | date (`YYYY-MM-DD`) | inclusive range |

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:5000/api/tenders?province=Mpumalanga&eSubmission=false&limit=10&page=1"
```

### `GET /api/tenders/:id`
Fetch one tender by Mongo `_id` or by the eTenders `sourceId` (the numeric `id` field from the
source payload).

```bash
curl -H "Authorization: Bearer <token>" "http://localhost:5000/api/tenders/166954"
```

### `POST /api/admin/sync`
Manually triggers a full fetch-and-upsert cycle (same logic the cron job runs). Useful for the
first run, or to force a refresh outside the schedule.

```bash
curl -X POST -H "Authorization: Bearer <token>" "http://localhost:5000/api/admin/sync"
```

### `GET /api/health`
Unauthenticated health check.

## How the sync works

1. `fetchTenders.job.js` runs on two cron schedules (default 06:00 and 18:00 server time), and can
   also be triggered on demand via `POST /api/admin/sync`.
2. `etenders.service.js` rebuilds the exact DataTables-style query the eTenders site itself sends
   (the long querystring with `columns[i][...]`, `order[0][...]`, `start`, `length`, `status`,
   etc.), and pages through `start`/`length` until it has retrieved `recordsTotal` records.
3. `tender.service.js` maps each raw record's mixed snake_case/PascalCase fields
   (`tender_No`, `date_Published`, `organ_of_State`, `surburb`, ...) into a clean camelCase shape
   (`tenderNumber`, `datePublished`, `organOfState`, `suburb`, ...) and stores the untouched
   original under `raw` for auditing.
4. Records are **upserted** on `sourceId` (the source's numeric `id`), so re-running the sync
   updates existing tenders (e.g. status or closing date changes) instead of duplicating them.

## Notes / next steps you may want

- Swap the static env-token auth for a DB-backed `ApiKey` model if you need per-user tokens, usage
  tracking, or revocation.
- For multi-instance deployments, move the rate limit store from in-memory to a shared store (e.g.
  `rate-limit-redis`) so limits are enforced consistently across instances.
- The full raw source payload is kept on each document (`raw` field, excluded from queries by
  default via `select: false`) in case you need fields not yet mapped.
