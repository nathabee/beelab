#!/usr/bin/env bash
set -euo pipefail

PROFILE=${PROFILE:-dev}

check() {
  local label="$1" url="$2"
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url" || true)
  echo "• $label -> $url : HTTP $code"
}

echo "🔎 Pinging services..."
check "Web (Next.js)" "http://localhost:8080"
check "Django health" "http://localhost:8001/health"
check "Django hello"  "http://localhost:8001/api/user/hello/"
check "WordPress"     "http://localhost:8082"

echo
echo "🧰 WP-CLI sanity:"
docker compose --profile "$PROFILE" run --rm wpcli wp cache flush
docker compose --profile "$PROFILE" run --rm wpcli wp theme list
docker compose --profile "$PROFILE" run --rm wpcli wp option get blogname
docker compose --profile "$PROFILE" run --rm wpcli wp theme mod get custom_logo || true
docker compose --profile "$PROFILE" run --rm wpcli wp post list --post_type=attachment --fields=ID,post_title,guid --format=table || true
 