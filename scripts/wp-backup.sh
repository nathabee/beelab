#!/usr/bin/env bash
set -euo pipefail

# BeeLab — production WordPress backup
# Daily + monthly rotation

echo "CAREFUL NOT TESTED YET!!!!!!!!!!!!!!"

ENV="prod"
BASE="$HOME/exports"
DATE="$(date +%Y-%m-%d)"
MONTH="$(date +%Y-%m)"

DB_DAILY="$BASE/wp-db/daily"
DB_MONTHLY="$BASE/wp-db/monthly"
FILES_DAILY="$BASE/wp-files/daily"
FILES_MONTHLY="$BASE/wp-files/monthly"

mkdir -p "$DB_DAILY" "$DB_MONTHLY" "$FILES_DAILY" "$FILES_MONTHLY"

source "$HOME/beelab/scripts/alias.sh" "$ENV"

echo "== BeeLab prod backup ($DATE) =="

# --- Daily backups ---
dcwpdbdump "wp-db/daily/prod.${DATE}.sql"
dcwpuploadszip "wp-files/daily/prod.${DATE}.uploads.tgz"

# --- Monthly snapshot (first day of month only) ---
if [[ "$(date +%d)" == "01" ]]; then
  echo "== Monthly snapshot =="
  dcwpdbdump "wp-db/monthly/prod.${MONTH}.sql"
  dcwpuploadszip "wp-files/monthly/prod.${MONTH}.uploads.tgz"
fi

# --- Retention ---
# keep last 7 daily backups
ls -1t "$DB_DAILY"/*.sql      | tail -n +8 | xargs -r rm --
ls -1t "$FILES_DAILY"/*.tgz  | tail -n +8 | xargs -r rm --

# keep last 12 monthly backups
ls -1t "$DB_MONTHLY"/*.sql     | tail -n +13 | xargs -r rm --
ls -1t "$FILES_MONTHLY"/*.tgz | tail -n +13 | xargs -r rm --

echo "✓ Backup complete"
