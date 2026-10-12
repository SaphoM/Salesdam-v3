#!/usr/bin/env bash
set -euo pipefail

# ===== Config =====
APP_DIR="/opt/salesdam-v3"
BRANCH="${DEPLOY_BRANCH:-test}"
COMPOSE_FILE="docker-compose.prod.yml"
APP_URL="${APP_URL:-https://test.salesdam.com}"
DEPLOY_USER="${DEPLOY_USER:-azureuser}"
RELEASE_TARBALL="${RELEASE_TARBALL:-}"
# Real git SHA of the release being deployed (set by Actions for tarball deploys).
DEPLOYED_SHA="${DEPLOYED_SHA:-}"

# ===== Helpers =====
log() { printf "\n[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1"
    exit 1
  }
}

run_as_repo_user() {
  if [ "$(id -un)" = "$DEPLOY_USER" ]; then
    "$@"
  else
    sudo -u "$DEPLOY_USER" "$@"
  fi
}

# ===== Preflight =====
require_cmd git
require_cmd docker
require_cmd curl

if [ ! -d "$APP_DIR" ]; then
  echo "App dir not found at $APP_DIR"
  exit 1
fi

cd "$APP_DIR"

git config --global --add safe.directory "$APP_DIR" || true
run_as_repo_user git config --global --add safe.directory "$APP_DIR" || true

log "Backing up secrets"
BAK_DIR="/tmp/salesdam-deploy-bak-$(id -un)"
rm -rf "$BAK_DIR"
mkdir -p "$BAK_DIR"
cp -a backend/.env "$BAK_DIR/backend.env"
cp -a mongo-keyfile "$BAK_DIR/mongo-keyfile" 2>/dev/null || true
cp -a .mongo-creds "$BAK_DIR/mongo-creds" 2>/dev/null || true

if [ -n "$RELEASE_TARBALL" ]; then
  require_cmd tar
  if [ ! -f "$RELEASE_TARBALL" ]; then
    echo "Release tarball missing: $RELEASE_TARBALL"
    exit 1
  fi

  log "Applying release tarball $RELEASE_TARBALL"
  # Preserve secrets + deploy helpers that are VM-local.
  tar -xzf "$RELEASE_TARBALL" \
    --exclude='backend/.env' \
    --exclude='mongo-keyfile' \
    --exclude='.mongo-creds' \
    -C "$APP_DIR"
  rm -f "$RELEASE_TARBALL"
else
  log "Fetching origin/$BRANCH"
  if [ -n "${GH_TOKEN:-}" ]; then
    FETCH_URL="https://x-access-token:${GH_TOKEN}@github.com/Digital-Fingerprint/Salesdam-v3.git"
    run_as_repo_user git remote set-url origin \
      "https://github.com/Digital-Fingerprint/Salesdam-v3.git"
    run_as_repo_user git fetch --force "$FETCH_URL" \
      "refs/heads/${BRANCH}:refs/remotes/origin/${BRANCH}"
  else
    run_as_repo_user git fetch --force origin "$BRANCH"
  fi

  log "Checking out origin/$BRANCH"
  run_as_repo_user git checkout -f -B "$BRANCH" "origin/$BRANCH"
  run_as_repo_user git reset --hard "origin/$BRANCH"
  run_as_repo_user git clean -fd \
    --exclude=backend/.env \
    --exclude=mongo-keyfile \
    --exclude=.mongo-creds \
    --exclude=deploy
fi

log "Restoring secrets"
cp -a "$BAK_DIR/backend.env" backend/.env
cp -a "$BAK_DIR/mongo-keyfile" mongo-keyfile 2>/dev/null || true
cp -a "$BAK_DIR/mongo-creds" .mongo-creds 2>/dev/null || true

log "Recording deploy marker"
# Prefer the SHA passed from CI (tarball deploys leave the VM git checkout stale).
if [ -n "$DEPLOYED_SHA" ]; then
  printf '%s\n' "$DEPLOYED_SHA" >.deployed-sha
elif [ -n "$RELEASE_TARBALL" ] || [ ! -d .git ]; then
  echo "tarball-$(date -u +%Y%m%dT%H%M%SZ)" >.deployed-sha
else
  run_as_repo_user git rev-parse HEAD >.deployed-sha
fi
{
  echo "deployed_sha=$(cat .deployed-sha)"
  echo "deployed_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "deploy_branch=${BRANCH}"
  echo "deploy_mode=$([ -n "${RELEASE_TARBALL:-}" ] && echo tarball || echo git)"
} | tee .deployed-meta
run_as_repo_user git log -3 --oneline 2>/dev/null || true
cat .deployed-sha

log "Ensuring compose files present"
ls -la docker-compose.prod.yml backend/Dockerfile frontend/Dockerfile.prod frontend/nginx.conf

log "Building backend + frontend"
docker compose -f "$COMPOSE_FILE" build backend frontend

log "Recreating backend + frontend"
docker compose -f "$COMPOSE_FILE" up -d --no-deps --force-recreate backend frontend

log "Waiting for containers"
sleep 12
docker compose -f "$COMPOSE_FILE" ps
docker logs salesdam-v3-backend --tail=50 || true

log "Local health check"
curl -fsS "http://127.0.0.1:5000/health" || true
echo

log "Public smoke checks"
curl -s -o /dev/null -w "register=%{http_code}\n" "$APP_URL/register" || true
curl -s -o /dev/null -w "login=%{http_code}\n" "$APP_URL/login" || true
curl -s -o /dev/null -w "health=%{http_code}\n" "$APP_URL/health" || true

log "Deploy finished"
echo "DEPLOY_DONE"
