#!/usr/bin/env bash
set -euo pipefail

# usage:
#   ./django-restore.sh [dev|prod] [db_dump.sql.gz] [--reset] [--media media.tgz]
ENV="${1:-undefinedEnv}"; shift || true
[[ "${ENV}" =~ ^(dev|prod)$ ]] || { echo "Usage: $0 [dev|prod] [db_dump.sql.gz] [--reset] [--media media.tgz]"; exit 1; }

ENV_FILE=".env.${ENV}"
[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE"; exit 1; }

PROJECT="beelab_${ENV}"
DB_SERVICE=$([[ "$ENV" == "prod" ]] && echo "db-prod" || echo "db")
DJANGO_SERVICE=$([[ "$ENV" == "prod" ]] && echo "django-prod" || echo "django")

DB_FILE=""; RESET_SCHEMA="no"; MEDIA_FILE=""

# parse args
while (( "$#" )); do
  case "${1:-}" in
    --reset) RESET_SCHEMA="yes"; shift ;;
    --media) MEDIA_FILE="${2:-}"; shift 2 ;;
    *) DB_FILE="${1:-}"; shift ;;
  esac
done

set -a; source "$ENV_FILE"; set +a
DB_NAME="${POSTGRES_DB:-app}"
DB_USER="${POSTGRES_USER:-app}"

compose() { docker compose -p "$PROJECT" --env-file "$ENV_FILE" --profile "$ENV" "$@"; }

# pick latest DB dump if not provided
if [[ -z "$DB_FILE" ]]; then
  DB_FILE=$(ls -1t backups/django/${PROJECT}_db_${DB_NAME}_*.sql.gz 2>/dev/null | head -n1 || true)
fi
[[ -n "$DB_FILE" && -f "$DB_FILE" ]] || { echo "DB dump not found. Provide a file."; exit 1; }

echo "→ Restoring ${ENV} DB (${DB_SERVICE}) from ${DB_FILE}"
compose up -d "$DB_SERVICE"

if [[ "$RESET_SCHEMA" == "yes" ]]; then
  echo "⚠️  Dropping and recreating public schema..."
  compose exec -T "$DB_SERVICE" psql -U "$DB_USER" -d "$DB_NAME" -c \
    "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO $DB_USER;"
fi

gunzip -c "$DB_FILE" | compose exec -T "$DB_SERVICE" psql -U "$DB_USER" -d "$DB_NAME"
echo "✓ DB restore complete"

# media restore (optional)
if [[ -n "$MEDIA_FILE" ]]; then
  [[ -f "$MEDIA_FILE" ]] || { echo "Media tar not found: $MEDIA_FILE"; exit 1; }
  echo "→ Restoring media from ${MEDIA_FILE}"
  compose up -d "$DJANGO_SERVICE"
  # extract into /app (expects archive root to be 'media/')
  compose exec -T "$DJANGO_SERVICE" sh -lc 'mkdir -p /app/media && tar xz -C /app' < "$MEDIA_FILE"
  echo "✓ Media restore complete"
fi
