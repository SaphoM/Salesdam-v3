#!/usr/bin/env bash
set -euo pipefail

# ===== Config (platform.salesdam.com) =====
APP_DIR="${APP_DIR:-/opt/salesdam-platform}"
BRANCH="${DEPLOY_BRANCH:-main}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.platform.yml}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-salesdam-platform}"
APP_URL="${APP_URL:-https://platform.salesdam.com}"
DEPLOY_USER="${DEPLOY_USER:-azureuser}"
RELEASE_TARBALL="${RELEASE_TARBALL:-}"
DEPLOYED_SHA="${DEPLOYED_SHA:-}"
BACKEND_CONTAINER="${BACKEND_CONTAINER:-salesdam-platform-backend}"
MONGO_CONTAINER="${MONGO_CONTAINER:-salesdam-platform-mongo}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:5001/health}"

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

compose() {
  docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" "$@"
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
BAK_DIR="/tmp/salesdam-platform-deploy-bak-$(id -un)"
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
mkdir -p backend
cp -a "$BAK_DIR/backend.env" backend/.env
cp -a "$BAK_DIR/mongo-keyfile" mongo-keyfile 2>/dev/null || true
cp -a "$BAK_DIR/mongo-creds" .mongo-creds 2>/dev/null || true
# mongo-keyfile is root/mongodb-owned (mode 400); azureuser cannot chmod it.

log "Recording deploy marker"
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
ls -la docker-compose.platform.yml backend/Dockerfile frontend/Dockerfile.prod frontend/nginx.conf

log "Starting Mongo"
compose up -d mongo
log "Waiting for Mongo health"
for i in $(seq 1 30); do
  if docker exec "$MONGO_CONTAINER" mongosh --quiet --eval 'db.adminCommand("ping").ok' >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

log "Ensuring replica set + app users"
docker exec "$MONGO_CONTAINER" mongosh --quiet --eval '
  try { rs.status().ok } catch (e) {
    rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "mongo:27017" }] });
  }
' || true
for i in $(seq 1 20); do
  if docker exec "$MONGO_CONTAINER" mongosh --quiet --eval 'db.hello().isWritablePrimary === true' 2>/dev/null | grep -q true; then
    break
  fi
  sleep 2
done

if [ -f .mongo-creds ]; then
  # shellcheck disable=SC1091
  set -a
  . ./.mongo-creds
  set +a
  # First user can be created without auth (localhost exception).
  docker exec "$MONGO_CONTAINER" mongosh --quiet --eval "
    try {
      db.getSiblingDB('admin').createUser({
        user: '${MONGO_ADMIN_USER}',
        pwd: '${MONGO_ADMIN_PASS}',
        roles: [{ role: 'root', db: 'admin' }]
      });
    } catch (e) {}
  " || true
  # After the first user exists, further user writes need admin auth.
  docker exec -i "$MONGO_CONTAINER" mongosh \
    -u "$MONGO_ADMIN_USER" \
    -p "$MONGO_ADMIN_PASS" \
    --authenticationDatabase admin \
    --quiet <<EOF || true
const appUser = "$MONGO_APP_USER";
const appPass = "$MONGO_APP_PASS";
const admin = db.getSiblingDB("admin");
if (!admin.getUser(appUser)) {
  admin.createUser({
    user: appUser,
    pwd: appPass,
    roles: [
      { role: "readWrite", db: "salesdam" },
      { role: "readWrite", db: "admin" }
    ]
  });
}
EOF
fi

log "Building backend + frontend"
compose build backend frontend

log "Recreating backend + frontend"
compose up -d --no-deps --force-recreate backend frontend

log "Waiting for containers"
sleep 12
compose ps
docker logs "$BACKEND_CONTAINER" --tail=50 || true

log "Local health check"
ok=0
for i in $(seq 1 12); do
  if curl -fsS "$HEALTH_URL" >/dev/null; then
    ok=1
    break
  fi
  sleep 2
done
if [ "$ok" -ne 1 ]; then
  echo "Backend health check failed at $HEALTH_URL"
  docker logs "$BACKEND_CONTAINER" --tail=80 || true
  exit 1
fi
curl -fsS "$HEALTH_URL"
echo

log "Public smoke checks"
curl -s -o /dev/null -w "register=%{http_code}\n" "$APP_URL/register" || true
curl -s -o /dev/null -w "login=%{http_code}\n" "$APP_URL/login" || true
curl -s -o /dev/null -w "health=%{http_code}\n" "$APP_URL/health" || true

log "Deploy finished"
echo "DEPLOY_DONE"
