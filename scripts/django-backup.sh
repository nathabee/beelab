#!/usr/bin/env bash
set -euo pipefail

# usage: ./django-backup.sh [dev|prod] [--media]
ENV="${1:-undefinedEnv}"; [[ "${ENV}" =~ ^(dev|prod)$ ]] || { echo "Usage: $0 [dev|prod] [--media]"; exit 1; }
MEDIA_FLAG="${2:-}"

ENV_FILE=".env.${ENV}"
[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE"; exit 1; }

PROJECT="beelab_${ENV}"
DB_SERVICE=$([[ "$ENV" == "prod" ]] && echo "db-prod" || echo "db")
DJANGO_SERVICE=$([[ "$ENV" == "prod" ]] && echo "django-prod" || echo "django")

# load env for names/creds
set -a; source "$ENV_FILE"; set +a
DB_NAME="${POSTGRES_DB:-app}"
DB_USER="${POSTGRES_USER:-app}"

TS="$(date +%F_%H%M%S)"
OUT_DIR="backups/django"; mkdir -p "$OUT_DIR"
DB_OUT="${OUT_DIR}/${PROJECT}_db_${DB_NAME}_${TS}.sql.gz"
MEDIA_OUT="${OUT_DIR}/${PROJECT}_media_${TS}.tgz"

compose() { docker compose -p "$PROJECT" --env-file "$ENV_FILE" --profile "$ENV" "$@"; }

echo "→ Backing up ${ENV} DB (${DB_SERVICE}) → ${DB_OUT}"
compose up -d "$DB_SERVICE"
compose exec -T "$DB_SERVICE" pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$DB_OUT"
echo "✓ DB backup: $DB_OUT"

if [[ "$MEDIA_FLAG" == "--media" ]]; then
  echo "→ Backing up media files → ${MEDIA_OUT}"
  if [[ "$ENV" == "dev" && -d "./django/media" ]]; then
    tar czf "$MEDIA_OUT" -C ./django media
  else
    # prod (or dev fallback) — grab /app/media from the running Django container
    compose up -d "$DJANGO_SERVICE"
    compose exec -T "$DJANGO_SERVICE" sh -lc 'cd /app && tar cz media' > "$MEDIA_OUT"
  fi
  echo "✓ Media backup: $MEDIA_OUT"
fi
