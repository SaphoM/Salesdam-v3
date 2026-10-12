# Infrastructure Audit

## Repository configuration (FACT)
- Docker: `backend/Dockerfile`, `backend/compose.yaml`, `frontend/Dockerfile.prod` + `nginx.conf`, root `docker-compose.platform.yml` (mongo 8.2.11 replica set rs0 + auth + keyFile, backend :5001→5000, frontend :5174→80, mongo :27018 bound to 127.0.0.1).
- Deploy scripts: `deploy.sh`, `deploy-platform.sh` — tarball sync, env preserve, GH_TOKEN remote on VM (L6).
- CI/CD: `.github/workflows/deploy-test.yml`, `deploy-platform.yml` — SSH-based deploy to Azure VM on push to test/main; required secrets DEPLOY_HOST/USER/SSH_KEY; no test/build stage (FACT).
- nginx conf: `deploy/nginx-platform.salesdam.com.conf`, `frontend/nginx.conf`.
- Cloud hints: VM IP placeholder, azureuser (from deploy workflow) — Azure VM (INFERENCE from `azureuser` and secret names; not verified).

## Verified production infrastructure
UNKNOWN — repository alone cannot prove what runs in production. README/docs state test.salesdam.com and platform.salesdam.com targets (from docker-compose comments) — INFERENCE only.

## Not present
- Kubernetes manifests, Terraform/IaC, Azure DevOps, Render, Vercel configs, Helm charts.
- Monitoring/alerting (e.g. Datadog/Sentry) — winston logging to files/console only.
- Backups: no documented backup/restore for Mongo volume.
- Secrets manager: env files on VM.

## Gaps
- No IaC → infra not reproducible; single-VM deployment; no staging/prod parity asserts; no health-check dependency beyond compose; no log aggregation; no uptime checks.
