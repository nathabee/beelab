#!/usr/bin/env bash
set -euo pipefail

ENV="${1:-undefinedEnv}"
ENV_FILE=".env.${ENV}"
PROJECT="beelab_${ENV}"

[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE"; exit 1; }
set -a; source "$ENV_FILE"; set +a

# Fallbacks if not set in env files
WEB_URL="${WEB_BASE_URL:-http://localhost:9080}"
API_URL="${DJANGO_BASE_URL:-http://localhost:9001}"
WP_URL="${WP_BASE_URL:-http://localhost:9082}"

WPCLI_SERVICE=$([[ "$ENV" == "prod" ]] && echo "wpcli-prod" || echo "wpcli")

check() {
  local label="$1" url="$2"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url" || true)
  echo "• $label -> $url : HTTP $code"
}

echo "🔎 Pinging services ($ENV)..."
check "Web (Next.js)" "$WEB_URL"
check "Django health" "${API_URL%/}/health"
check "Django hello"  "${API_URL%/}/api/user/hello/"
check "WordPress"     "$WP_URL"

echo
echo "🧰 WP-CLI sanity ($WPCLI_SERVICE):"
docker compose -p "$PROJECT" --env-file "$ENV_FILE" --profile "$ENV" run --rm "$WPCLI_SERVICE" wp cache flush
docker compose -p "$PROJECT" --env-file "$ENV_FILE" --profile "$ENV" run --rm "$WPCLI_SERVICE" wp theme list
docker compose -p "$PROJECT" --env-file "$ENV_FILE" --profile "$ENV" run --rm "$WPCLI_SERVICE" wp option get blogname
docker compose -p "$PROJECT" --env-file "$ENV_FILE" --profile "$ENV" run --rm "$WPCLI_SERVICE" wp theme mod get custom_logo || true
docker compose -p "$PROJECT" --env-file "$ENV_FILE" --profile "$ENV" run --rm "$WPCLI_SERVICE" wp post list --post_type=attachment --fields=ID,post_title,guid --format=table || true
