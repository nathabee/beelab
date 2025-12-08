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
    sleep 2; t=$((t+2)); (( t >= timeout )) && { echo "⚠️  Timed out: $url"; return 1; }
  done
  echo "✅ $url is up"
}

need docker; need bash
[[ -f "compose.yaml" || -f "docker-compose.yml" ]] || abort "Run from repo root (compose.yaml)."

# load env (for URLs, creds, etc.)
set -a; source "$ENV_FILE"; set +a

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
    # list volumes belonging to this compose project
    vols=$(docker volume ls -q --filter "label=com.docker.compose.project=$PROJECT")
    echo "📦 Project volumes: $PROJECT"
    echo "$vols" | sed 's/^/  - /'

    if [[ "$ENV" == "dev" ]]; then
      # remove ONLY non-prod-suffixed volumes (dev ones)
      for v in $vols; do
        if [[ "$v" =~ _prod$ ]]; then
          echo "⏭️  keeping prod volume: $v"
        else
          echo "🗑️  removing dev volume: $v"; docker volume rm -f "$v" >/dev/null || true
        fi
      done
    else # prod
      # remove ONLY *_prod volumes (prod ones)
      for v in $vols; do
        if [[ "$v" =~ _prod$ ]]; then
          echo "🗑️  removing prod volume: $v"; docker volume rm -f "$v" >/dev/null || true
        else
          echo "⏭️  keeping dev volume: $v"
        fi
      done
    fi
  fi
else
  echo "➡️  Cancelled."; exit 0
fi

# --- seed web deps (dev only) ---
if [[ "$ENV" == "dev" ]]; then
  echo "📦 Seeding web/node modules (npm ci in one-off $WEB_SVC)..."
  compose run --rm "$WEB_SVC" npm ci || true
fi

# --- harden local media folder (only makes sense with dev bind mount) ---
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

# after: compose up -d --build
if [[ "$ENV" == "prod" ]]; then
  echo "🔧 Fixing Django volume ownership in prod..."
  compose exec -u 0 "$DJANGO_SVC" bash -lc "
    install -d -m 775 -o ${HOST_UID:-1000} -g ${HOST_GID:-1000} /app/media /app/staticfiles &&
    chown -R ${HOST_UID:-1000}:${HOST_GID:-1000} /app/media /app/staticfiles &&
    find /app/media /app/staticfiles -type d -exec chmod 775 {} \; &&
    find /app/media /app/staticfiles -type f -exec chmod 664 {} \;
  "
fi


# --- wait for Django health ---
API_URL="${DJANGO_BASE_URL:-http://localhost:9001}"
wait_http_200 "${API_URL%/}/health" 90 || true



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



# --- WordPress init (optional) ---
WP_URL="${WP_BASE_URL:-http://localhost:9082}"
echo "📋 Open WordPress installer at:  ${WP_URL%/}/wp-admin"

if yes_no "Run wp-init for base settings (theme, permalinks, logo)? (Plugins will NOT be installed automatically.)" no; then
  if [[ -x ./scripts/wp-init.sh ]]; then
    ./scripts/wp-init.sh "$ENV" \
      --theme beelab-theme \
      --auto-parent
  else
    echo "⚠️  ./scripts/wp-init.sh not found or not executable; skipping."
  fi
fi

echo "👉 Next steps to install plugins MANUALLY:"
echo "   1) Build zips: scripts/build-plugins.sh all"
echo "   2) In wp-admin → Plugins → Add New → Upload Plugin, upload:"
echo "      - wordpress/build/pomolobee.zip"
echo "      - wordpress/build/competence.zip"
echo "   3) Activate them in wp-admin."




# --- load fixtures (best-effort) ---
echo "📥 Loading Django fixtures (best-effort)..."
set +e
compose exec "$DJANGO_SVC" python manage.py seed_all --clear
#compose exec "$DJANGO_SVC" python manage.py seed_pomolobee --clear
#compose exec "$DJANGO_SVC" python manage.py loaddata PomoloBeeCore/fixtures/initial_groups.json
#compose exec "$DJANGO_SVC" python manage.py loaddata PomoloBeeCore/fixtures/initial_superuser.json
#compose exec "$DJANGO_SVC" python manage.py loaddata PomoloBeeCore/fixtures/initial_farms.json
#compose exec "$DJANGO_SVC" python manage.py loaddata PomoloBeeCore/fixtures/initial_fields.json
#compose exec "$DJANGO_SVC" python manage.py loaddata PomoloBeeCore/fixtures/initial_fruits.json
#compose exec "$DJANGO_SVC" python manage.py loaddata PomoloBeeCore/fixtures/initial_rows.json

#compose exec "$DJANGO_SVC" python manage.py seed_competence --clear
#compose exec "$DJANGO_SVC" python manage.py populate_data_init
#compose exec "$DJANGO_SVC" python manage.py create_groups_and_permissions
#compose exec "$DJANGO_SVC" python manage.py populate_demo
#compose exec "$DJANGO_SVC" python manage.py populate_translation


 

set -e

# --- health checks (env-aware) ---
if [[ -x ./scripts/healthcheck.sh ]]; then
  ./scripts/healthcheck.sh "$ENV"
else
  echo "⚠️  ./scripts/healthcheck.sh not found; skipping."
fi

echo
echo "✅ Done."
echo "🖥  Web:     ${WEB_BASE_URL:-http://localhost:9080}"
echo "🔌 Django:  ${API_URL%/}   (health: ${API_URL%/}/health)"
echo "📝 WP:      ${WP_URL}"
