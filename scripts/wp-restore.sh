#!/usr/bin/env bash
set -euo pipefail

echo "CAREFUL NOT TESTED YET!!!!!!!!!!!!!!"


# Usage:
#   scripts/wp_restore.sh dev  /path/to/db.sql  /path/to/uploads.tgz  [--wipe|--keep]
# Examples:
#   scripts/wp_restore.sh dev ~/exports/wp-db/prod.2025-12-17.sql ~/exports/wp-files/prod.2025-12-17.uploads.tgz --wipe
#   scripts/wp_restore.sh prod ~/exports/wp-db/monthly/prod.2025-12.sql ~/exports/wp-files/monthly/prod.2025-12.uploads.tgz --wipe

ENV_NAME="${1:-}"; shift || true
DB_SQL="${1:-}"; shift || true
UPLOADS_TGZ="${1:-}"; shift || true
MODE="${1:---wipe}"

[[ "$ENV_NAME" == "dev" || "$ENV_NAME" == "prod" ]] || { echo "Usage: $0 dev|prod db.sql uploads.tgz [--wipe|--keep]"; exit 1; }
[[ -f "$DB_SQL" ]] || { echo "DB sql not found: $DB_SQL"; exit 1; }
[[ -f "$UPLOADS_TGZ" ]] || { echo "uploads tgz not found: $UPLOADS_TGZ"; exit 1; }
[[ "$MODE" == "--wipe" || "$MODE" == "--keep" ]] || { echo "mode must be --wipe or --keep"; exit 1; }

REPO_DIR="${HOME}/beelab"
source "$REPO_DIR/scripts/alias.sh" "$ENV_NAME"

dcup

echo "== Restore WordPress DB =="
dcwpdbrestore "$DB_SQL"

echo "== Restore WordPress uploads ($MODE) =="
dcwpuploadsunzip "$UPLOADS_TGZ" "$MODE"

echo "== Fix clone URLs (env-aware) =="
dcwpfixcloneurls

echo "✓ Restore complete (env=$ENV_NAME)"
