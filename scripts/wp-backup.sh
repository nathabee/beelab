#!/usr/bin/env bash
set -euo pipefail

ENV="${1:-undefinedEnv}"
ENV_FILE=".env.${ENV}"
PROJECT="beelab_${ENV}"
WPDB_SERVICE=$([[ "$ENV" == "prod" ]] && echo "wpdb-prod" || echo "wpdb")
WPVOL="${PROJECT}_wp_data"
WPDBVOL="${PROJECT}_wp_db_data"
OUT_DIR="backups/wp"; mkdir -p "$OUT_DIR"

[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE"; exit 1; }
set -a; source "$ENV_FILE"; set +a
DB_NAME="${WP_DB_NAME:-wordpress}"

compose() { docker compose -p "$PROJECT" --env-file "$ENV_FILE" --profile "$ENV" "$@"; }

TS="$(date +%F_%H%M)"
SQL_OUT="${OUT_DIR}/${PROJECT}_wp_${DB_NAME}_${TS}.sql.gz"
FILES_OUT="${OUT_DIR}/${PROJECT}_wp_files_${TS}.tgz"
DBVOL_OUT="${OUT_DIR}/${PROJECT}_wp_db_volume_${TS}.tgz"

echo "→ Dumping MariaDB ($WPDB_SERVICE) to $SQL_OUT"
compose up -d "$WPDB_SERVICE"
compose exec -T "$WPDB_SERVICE" sh -lc '
  DB="${MARIADB_DATABASE:-$MYSQL_DATABASE}"; USER="${MARIADB_USER:-$MYSQL_USER}"; PASS="${MARIADB_PASSWORD:-$MYSQL_PASSWORD}";
  exec mariadb-dump -u"$USER" -p"$PASS" "$DB"
' | gzip > "$SQL_OUT"

echo "→ Archiving WP files volume ($WPVOL) to $FILES_OUT"
docker run --rm -v "${WPVOL}:/vol" -v "$PWD/${OUT_DIR}:/backup" alpine \
  sh -c "cd /vol && tar czf /backup/$(basename "$FILES_OUT") ."

echo "→ Archiving WP DB volume ($WPDBVOL) to $DBVOL_OUT"
docker run --rm -v "${WPDBVOL}:/vol" -v "$PWD/${OUT_DIR}:/backup" alpine \
  sh -c "cd /vol && tar czf /backup/$(basename "$DBVOL_OUT") ."

echo "✓ Done:"
printf "  - %s\n  - %s\n  - %s\n" "$SQL_OUT" "$FILES_OUT" "$DBVOL_OUT"
