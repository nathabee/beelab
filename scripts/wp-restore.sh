#!/usr/bin/env bash
set -euo pipefail

# usage: ./wp-restore.sh [dev|prod] [/path/to/wp_sql_dump.sql.gz]
ENV="${1:-undefinedEnv}"; shift || true
FILE="${1:-}"   # optional (auto-picks latest)

ENV_FILE=".env.${ENV}"
PROJECT="beelab_${ENV}"
WPDB_SERVICE=$([[ "$ENV" == "prod" ]] && echo "wpdb-prod" || echo "wpdb")

[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE"; exit 1; }

# Find latest if not provided
if [[ -z "$FILE" ]]; then
  FILE=$(ls -1t backups/wp/${PROJECT}_wp_*_*.sql.gz 2>/dev/null | head -n1 || true)
fi
[[ -n "$FILE" && -f "$FILE" ]] || { echo "WP dump not found. Provide file."; exit 1; }

compose() { docker compose -p "$PROJECT" --env-file "$ENV_FILE" --profile "$ENV" "$@"; }

echo "→ Restoring WP DB ($WPDB_SERVICE) from $FILE"
compose up -d "$WPDB_SERVICE"
gunzip -c "$FILE" | compose exec -T "$WPDB_SERVICE" sh -lc '
  DB="${MARIADB_DATABASE:-$MYSQL_DATABASE}"; USER="${MARIADB_USER:-$MYSQL_USER}"; PASS="${MARIADB_PASSWORD:-$MYSQL_PASSWORD}";
  exec mariadb -u"$USER" -p"$PASS" "$DB"
'
echo "✓ Restore complete"
