#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   scripts/wp_restore.sh dev|prod /path/to/db.sql /path/to/uploads.tgz [--wipe|--keep]
#
# Examples:
#   scripts/wp_restore.sh dev  ~/exports/wp-db/prod.sql  ~/exports/wp-files/prod_uploads.tgz --wipe
#   scripts/wp_restore.sh prod ~/exports/wp-db/monthly.sql ~/exports/wp-files/monthly_uploads.tgz --wipe

ENV_NAME="${1:-}"; DB_SQL="${2:-}"; UPLOADS_TGZ="${3:-}"; MODE="${4:---wipe}"

[[ "$ENV_NAME" == "dev" || "$ENV_NAME" == "prod" ]] || { echo "Usage: $0 dev|prod db.sql uploads.tgz [--wipe|--keep]"; exit 1; }
[[ -f "$DB_SQL" ]] || { echo "DB sql not found: $DB_SQL"; exit 1; }
[[ -f "$UPLOADS_TGZ" ]] || { echo "uploads tgz not found: $UPLOADS_TGZ"; exit 1; }
[[ "$MODE" == "--wipe" || "$MODE" == "--keep" ]] || { echo "mode must be --wipe or --keep"; exit 1; }

# Resolve repo root from script location (no hardcoded ~/beelab)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

source "$REPO_DIR/scripts/alias.sh" "$ENV_NAME"

dcup

echo "== Restore WordPress DB =="
dcwpdbrestore "$DB_SQL"

echo "== Restore WordPress uploads ($MODE) =="
dcwpuploadsunzip "$UPLOADS_TGZ" "$MODE"

echo "== Fix clone URLs (env-aware DB) =="
dcwpfixcloneurls

# Theme file URLs: in your workflow, the dev env should use a dev-safe ZIP.
# This fixes hardcoded prod URLs in theme exports (fonts/images in theme.json/templates).
if [[ "$ENV_NAME" == "dev" ]]; then
  echo "== Build dev theme ZIP (root-relative URLs) =="
  dcwpthemezip_make_dev "wordpress/build/beelab-theme.zip" "wordpress/build/beelab-theme-dev.zip"

  echo "== Install dev theme ZIP =="
  dcwpthemeinstall "wordpress/build/beelab-theme-dev.zip" "beelab-theme"
fi

echo "== Flush cache + rewrites =="
dcwpcachflush
dcwp rewrite flush --hard || true

echo "== Sanity =="
echo -n "home: "; dcwp option get home
echo -n "siteurl: "; dcwp option get siteurl
echo -n "theme stylesheet: "; dcwp option get stylesheet
echo -n "theme template: "; dcwp option get template
echo "active theme(s):"
dcwp theme list --status=active --format=table || true

echo "✓ Restore complete (env=$ENV_NAME)"
