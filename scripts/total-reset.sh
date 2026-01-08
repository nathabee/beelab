#!/usr/bin/env bash
set -euo pipefail

# usage: ./scripts/total-reset.sh [dev|prod]
ENV="${1:-undefinedEnv}"                              # dev | prod
[[ "$ENV" =~ ^(dev|prod)$ ]] || { echo "Usage: $0 [dev|prod]"; exit 1; }

ENV_FILE=".env.${ENV}"
[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE"; exit 1; }

PROJECT="beelab_${ENV}"
PROFILE="$ENV"

# service names per env (match your compose.yaml)
DJANGO_SVC=$([[ "$ENV" == "prod" ]] && echo "django-prod" || echo "django")
WEB_SVC=$([[ "$ENV" == "prod" ]] && echo "web-prod" || echo "web")
WP_SVC=$([[ "$ENV" == "prod" ]] && echo "wordpress-prod" || echo "wordpress")
WPCLI_SVC=$([[ "$ENV" == "prod" ]] && echo "wpcli-prod" || echo "wpcli")
DB_SVC=$([[ "$ENV" == "prod" ]] && echo "db-prod" || echo "db")
WPDB_SVC=$([[ "$ENV" == "prod" ]] && echo "wpdb-prod" || echo "wpdb")

abort() { echo "❌ $*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || abort "Missing dependency: $1"; }

require_env() {
  local k="$1"
  if [[ -z "${!k:-}" ]]; then
    echo "❌ Missing required env var: $k (set it in $ENV_FILE)" >&2
    exit 1
  fi
}

require_env_many() {
  local missing=0
  for k in "$@"; do
    if [[ -z "${!k:-}" ]]; then
      echo "❌ Missing required env var: $k (set it in $ENV_FILE)" >&2
      missing=1
    fi
  done
  [[ $missing -eq 0 ]] || exit 1
}

yes_no() {
  local q="$1" def="${2:-no}" ans prompt="[y/N]"
  [[ "$def" == "yes" ]] && prompt="[Y/n]"
  read -r -p "$q $prompt " ans || true
  ans="${ans,,}"
  if [[ -z "$ans" ]]; then [[ "$def" == "yes" ]]; else [[ "$ans" =~ ^y(es)?$ ]]; fi
}

wait_http_200() {
  local url="$1" timeout="${2:-90}" t=0
  echo "⏳ Waiting for $url ..."
  until curl -fsS "$url" >/dev/null 2>&1; do
    sleep 2; t=$((t+2))
    (( t >= timeout )) && { echo "⚠️  Timed out: $url"; return 1; }
  done
  echo "✅ $url is up"
}

wait_tcp() {
  local host="$1" port="$2" timeout="${3:-60}" t=0
  echo "⏳ Waiting for TCP ${host}:${port} ..."
  while ! (echo >/dev/tcp/"$host"/"$port") >/dev/null 2>&1; do
    sleep 2; t=$((t+2))
    (( t >= timeout )) && { echo "⚠️  Timed out: ${host}:${port}"; return 1; }
  done
  echo "✅ TCP ${host}:${port} is reachable"
}

need docker; need bash
[[ -f "compose.yaml" || -f "docker-compose.yml" ]] || abort "Run from repo root (compose.yaml)."

# load env (for URLs, creds, etc.)
set -a; source "$ENV_FILE"; set +a

# ---- required env vars (fail fast) ----
require_env_many \
  DJANGO_BASE_URL \
  WEB_BASE_URL \
  WP_BASE_URL \
  HOST_UID \
  HOST_GID \
  POSTGRES_DB \
  POSTGRES_USER \
  POSTGRES_PASSWORD \
  WP_DB_NAME \
  WP_DB_USER \
  WP_DB_PASSWORD \
  SECRET_KEY \
  ALLOWED_HOSTS \
  CORS_ALLOWED_ORIGINS \
  CSRF_TRUSTED_ORIGINS \
  NEXT_PUBLIC_API_BASE

# WordPress core install credentials (WP-CLI)
require_env_many \
  WP_TITLE \
  WP_ADMIN_USER \
  WP_ADMIN_PASSWORD \
  WP_ADMIN_EMAIL

# Compose helper
compose() { docker compose -p "$PROJECT" --env-file "$ENV_FILE" --profile "$PROFILE" "$@"; }

echo "ℹ️  Environment: $ENV  (ENV file: $ENV_FILE, project: $PROJECT)"
echo "ℹ️  Running from: $(pwd)"
echo

# --- confirm destructive reset ---
if yes_no "Are you sure you want a TOTAL RESET of containers/images/*volumes* for [$ENV]? This ERASES all data for this env." no; then
  # --- down & prune ------------------------------------------------
  if yes_no "Remove containers/images now?" yes; then
    echo "🧹 containers/images (no volumes)"
    compose down --rmi local --remove-orphans
  else
    echo "➡️  Skipping container/image prune."
  fi

  # --- targeted volume prune --------------------------------------
  if yes_no "Also remove named volumes for [$ENV]?" no; then
    vols=$(docker volume ls -q --filter "label=com.docker.compose.project=$PROJECT" || true)
    echo "📦 Project volumes: $PROJECT"
    echo "$vols" | sed 's/^/  - /' || true

    if [[ "$ENV" == "dev" ]]; then
      for v in $vols; do
        if [[ "$v" =~ _prod$ ]]; then
          echo "⏭️  keeping prod volume: $v"
        else
          echo "🗑️  removing dev volume: $v"
          docker volume rm -f "$v" >/dev/null 2>&1 || true
        fi
      done
    else
      for v in $vols; do
        if [[ "$v" =~ _prod$ ]]; then
          echo "🗑️  removing prod volume: $v"
          docker volume rm -f "$v" >/dev/null 2>&1 || true
        else
          echo "⏭️  keeping dev volume: $v"
        fi
      done
    fi
  fi
else
  echo "➡️  Cancelled."
  exit 0
fi

# --- seed web deps (dev only) ---
if [[ "$ENV" == "dev" ]]; then
  echo "📦 Seeding web/node modules (npm ci in one-off $WEB_SVC)..."
  compose run --rm "$WEB_SVC" npm ci || true
fi

# --- harden local media folder (dev bind mount only) ---
if [[ "$ENV" == "dev" ]]; then
  mkdir -p ./django/media
  cat > ./django/media/.htaccess << "EOF"
Options -Indexes
<FilesMatch "\.(php|phps|phtml|phar)$">
  Require all denied
</FilesMatch>
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/* "access plus 30 days"
</IfModule>
EOF
  chmod 644 ./django/media/.htaccess
fi

# --- bring stack up ---
echo "🚀 Starting $ENV stack"
compose up -d --build

# --- prod: fix volume ownership for django media/static ---
if [[ "$ENV" == "prod" ]]; then
  echo "🔧 Fixing Django volume ownership in prod..."
  compose exec -u 0 "$DJANGO_SVC" bash -lc "
    install -d -m 775 -o ${HOST_UID} -g ${HOST_GID} /app/media /app/staticfiles &&
    chown -R ${HOST_UID}:${HOST_GID} /app/media /app/staticfiles &&
    find /app/media /app/staticfiles -type d -exec chmod 775 {} \; &&
    find /app/media /app/staticfiles -type f -exec chmod 664 {} \;
  " || true
fi

# --- wait for django health ---
require_env DJANGO_BASE_URL
API_URL="${DJANGO_BASE_URL}"
HEALTH_URL="${API_URL%/}/health"

# Prefer internal probe to avoid external routing dependency.
# If ALLOWED_HOSTS is strict in prod, we temporarily extend it for this one probe.
echo "⏳ Waiting for Django health (internal probe)..."
set +e
compose exec -T \
  -e "ALLOWED_HOSTS=${ALLOWED_HOSTS},localhost,127.0.0.1,django" \
  "$DJANGO_SVC" python -c "import sys,urllib.request; urllib.request.urlopen('http://localhost:8000/health'); sys.exit(0)" >/dev/null 2>&1
RC=$?
set -e
if [[ $RC -ne 0 ]]; then
  wait_http_200 "$HEALTH_URL" 120 || true
else
  echo "✅ Django health reachable at http://localhost:8000/health"
fi

# --- migrations ---
if [[ "$ENV" == "dev" ]]; then
  echo "🛠 Running makemigrations (dev)..."
  compose exec "$DJANGO_SVC" python manage.py makemigrations --noinput || true
fi

echo "🛠 Running migrate..."
compose exec "$DJANGO_SVC" python manage.py migrate --noinput

# --- createsuperuser (optional) ---
if yes_no "Create Django superuser now?" no; then
  compose exec "$DJANGO_SVC" python manage.py createsuperuser
fi

# --- collectstatic ---
echo "🧺 collectstatic..."
compose exec "$DJANGO_SVC" python manage.py collectstatic --noinput || true

# --- WordPress: core install via WP-CLI (NO theme, NO plugins) ---
require_env_many WP_BASE_URL WP_TITLE WP_ADMIN_USER WP_ADMIN_PASSWORD WP_ADMIN_EMAIL

WP_URL="${WP_BASE_URL}"

echo
echo "=============================="
echo "WordPress: core install (WP-CLI)"
echo "=============================="

# Wait for MariaDB in the wp network namespace.
# Hostname from WP-CLI container is the compose service name.
wait_tcp "$WPDB_SVC" 3306 90 || true

set +e
compose exec -T "$WPCLI_SVC" wp core is-installed --allow-root >/dev/null 2>&1
IS_INSTALLED=$?
set -e

if [[ $IS_INSTALLED -eq 0 ]]; then
  echo "✅ WordPress is already installed (wp core is-installed)."
else
  echo "🧱 Installing WordPress core..."
  compose exec -T "$WPCLI_SVC" wp core install \
    --url="${WP_URL%/}" \
    --title="$WP_TITLE" \
    --admin_user="$WP_ADMIN_USER" \
    --admin_password="$WP_ADMIN_PASSWORD" \
    --admin_email="$WP_ADMIN_EMAIL" \
    --skip-email \
    --allow-root
  echo "✅ WordPress core installed."
fi

echo "🔧 Setting permalinks to /%postname%/ ..."
compose exec -T "$WPCLI_SVC" wp rewrite structure '/%postname%/' --hard --allow-root >/dev/null 2>&1 || true
compose exec -T "$WPCLI_SVC" wp rewrite flush --hard --allow-root >/dev/null 2>&1 || true

echo
echo "=============================="
echo "WordPress: manual next steps (UI)"
echo "=============================="
echo "📋 WP Admin:  ${WP_URL%/}/wp-admin"
echo
echo "Optional manual steps:"
echo "1) (If you want) Install your theme:"
echo "   Appearance → Themes → Add New → Upload Theme"
echo
echo "2) (If you want) Install your plugins:"
echo "   Plugins → Add New → Upload Plugin"
echo
echo "3) Permalinks:"
echo "   Settings → Permalinks → Save Changes"
echo

# --- load fixtures (best-effort; don't break if command missing) ---
echo "📥 Loading Django fixtures (best-effort)..."
set +e
compose exec "$DJANGO_SVC" python manage.py seed_all --clear
set -e

# --- health checks (env-aware) ---
if [[ -x ./scripts/healthcheck.sh ]]; then
  ./scripts/healthcheck.sh "$ENV" || true
else
  echo "⚠️  ./scripts/healthcheck.sh not found; skipping."
fi

echo
echo "✅ Done."
echo "🖥  Web:     ${WEB_BASE_URL}"
echo "🔌 Django:  ${API_URL%/}   (health: ${API_URL%/}/health)"
echo "📝 WP:      ${WP_URL%/}"
