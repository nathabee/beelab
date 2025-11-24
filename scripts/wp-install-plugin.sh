#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# usage: ./scripts/wp-install-plugin.sh [dev|prod] PLUGIN_SLUG [--activate] [--force]
ENV="${1:-}"; PLUGIN="${2:-}"; shift 2 || true
[[ "$ENV" =~ ^(dev|prod)$ && -n "$PLUGIN" ]] || { echo "Usage: $0 [dev|prod] PLUGIN_SLUG [--activate] [--force]"; exit 1; }

ACTIVATE="no"; FORCE="no"
for a in "$@"; do
  case "$a" in
    --activate) ACTIVATE="yes" ;;
    --force)    FORCE="yes" ;;
    *) echo "Unknown arg: $a"; exit 1 ;;
  esac
done

ENV_FILE=".env.${ENV}"; [[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE"; exit 1; }
PROJECT="beelab_${ENV}"; PROFILE="$ENV"
WP_SVC=$([[ "$ENV" == "prod" ]] && echo "wordpress-prod" || echo "wordpress")
WPCLI_SVC=$([[ "$ENV" == "prod" ]] && echo "wpcli-prod" || echo "wpcli")

PLUGINS_SRC="./wordpress/wp-content/plugins"
SRC_DIR="${PLUGINS_SRC}/${PLUGIN}"
[[ -d "$SRC_DIR" ]] || { echo "Plugin folder not found: $SRC_DIR"; exit 1; }

compose(){ docker compose -p "$PROJECT" --env-file "$ENV_FILE" --profile "$PROFILE" "$@"; }

# ensure WP is running
compose up -d "$WP_SVC"

if [[ "$ENV" == "prod" ]]; then
  CID="$(compose ps -q "$WP_SVC" | head -n1)"
  [[ -n "$CID" ]] || { echo "WordPress container not found"; exit 1; }

  echo "→ Installing plugin '${PLUGIN}' into prod volume..."
  if [[ "$FORCE" == "yes" ]]; then
    docker exec -u 0 "$CID" bash -lc "rm -rf /var/www/html/wp-content/plugins/${PLUGIN}"
  fi

  docker exec -u 0 "$CID" bash -lc "install -d -m 775 -o www-data -g www-data /var/www/html/wp-content/plugins"
  docker cp "$SRC_DIR" "$CID:/var/www/html/wp-content/plugins/"

  docker exec -u 0 "$CID" bash -lc "
    chown -R www-data:www-data /var/www/html/wp-content/plugins/${PLUGIN} &&
    find /var/www/html/wp-content/plugins/${PLUGIN} -type d -exec chmod 775 {} \; &&
    find /var/www/html/wp-content/plugins/${PLUGIN} -type f -exec chmod 664 {} \;
  "
  echo "✓ Plugin files copied."
else
  echo "ℹ️ dev uses bind-mount; files already at $SRC_DIR"
fi

if [[ "$ACTIVATE" == "yes" ]]; then
  echo "→ Activating plugin '${PLUGIN}'..."
  compose run --rm "$WPCLI_SVC" wp plugin activate "$PLUGIN" || true
  echo "✓ Plugin activation attempted."
fi
