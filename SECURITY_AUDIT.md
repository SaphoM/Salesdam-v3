# Security Audit

Classified: CRITICAL / HIGH / MEDIUM / LOW / INFORMATIONAL. No exploitation performed.

## CRITICAL
- C1 Live-looking Paystack secret + default SESSION_SECRET/ENCRYPTION_KEY committed in `.env.example` files (`.env.example:14,45,52`, `backend/.env.example:49`). Rotation + purge required.
- C2 `.gitignore` (root) does not ignore `.env`; backend protection file is `.gitIgnore` (wrong case) — secret files not reliably excluded.
- C3 Cross-tenant incident leak: `GET /api/v1/incidents/admin/all` guarded only by `requireAdmin` (any tenant admin), returns all tenants' incidents with tenant populated (`routes/incidents.js:24`, `incidentController.js:10-47`).

## HIGH
- H1 `xlsx@^0.18.5` (backend+frontend) — CVE-2023-30533, CVE-2024-22363; parses untrusted uploads; npm line unmaintained → replace (e.g. exceljs) or isolate.
- H2 Stored XSS via `dangerouslySetInnerHTML` on user-editable HTML: PDF template header/footer, email template body, FlowWizard rich_text (`GeneratePdfElement.jsx:23,29`, `EmailTemplateEditor.jsx:135`, `FlowWizard.jsx:288`).
- H3 Upload endpoints accept any mimetype into memory (10MB) then parse xlsx/CSV (`routes/admin.js`, `routes/records.js`) — pairs with H1; DoS amplifier.
- H4 `systemRole` request state used for admin gating in incident controller; only set in some contexts → inconsistent authz (`incidentController.js:266,298,362,445`).
- H5 API key verification uses non-timing-safe `===` on SHA-256 hash; model comments claim bcrypt (false); `keyPrefix` doc says 8 chars, code uses 12 (`ApiKey.js:44-48`, `auth.js:71-91`).

## MEDIUM
- M1 Paystack webhook HMAC computed over re-serialized JSON body, non-timing-safe compare, no replay/idempotency (`paystackService.js:423-430`, `routes/paystackWebhook.js:44-53`).
- M2 Unescaped user input interpolated into Mongo `$regex` across many controllers → ReDoS/regex injection (incident/search/tenant/superAdmin/user/registration/auth, pdfTemplates, emailTemplates).
- M3 Session cookie `SameSite=None` in prod + credentialed CORS, no CSRF tokens (`sessionMiddleware.js:126-131`, `app.js:84-96`).
- M4 `enforceTenant` missing on `/api/v1/incidents` and `/api/v1/leads`; incident comment queries sometimes omit tenantId (mitigated by filters; fail-open design).
- M5 helmet CSP disabled; no CSP despite unsanitized HTML rendering (compounds H2).

## LOW
- L1 Dynamic `query['data.<field>']` without field allowlist (`searchController.js:193`) — mongoSanitize helps but keys are unvalidated.
- L2 Global API rate limit 10k/15min effectively permissive; auth limiter 10/15min OK.
- L3 `leadApproval.js` mixes `req.user.tenantId` vs `req.tenantId`; leadId CastError → 500 not 404.
- L4 ApiKey model comment/bcrypt mismatch and prefix length mismatch (see H5).
- L5 Base64 avatars on User document (5MB), loaded on every authed request (`userController.js:296-299`, `auth.js:24-26`).
- L6 `deploy.sh` restores secrets and embeds GH_TOKEN in git remote URL on the VM.

## Confirmed NOT vulnerable (FACT)
- `formulaParser.js` has no eval/new Function (grep clean).
- Passwords bcryptjs cost 12, lockout after 5 attempts/30min (`User.js`).
- No committed real `.env` (only examples) — but defaults are dangerous.
- `superAdmin` routes properly behind requireSuperuser; CORS allowlist-driven; no obvious open redirects.

## Informational
- No security tests; no dependency-vuln CI gate; no CSP; morgan logs to console+file (log hygiene UNKNOWN).
