#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# usage: ./scripts/wp-init.sh [dev|prod]
ENV="${1:-undefinedEnv}"
[[ "$ENV" =~ ^(dev|prod)$ ]] || { echo "Usage: $0 [dev|prod]"; exit 1; }

ENV_FILE=".env.${ENV}"
[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE"; exit 1; }

PROJECT="beelab_${ENV}"
PROFILE="$ENV"

# service names per env (must match your compose.yaml)
WPDB_SVC=$([[ "$ENV" == "prod" ]] && echo "wpdb-prod" || echo "wpdb")
WP_SVC=$([[ "$ENV" == "prod" ]] && echo "wordpress-prod" || echo "wordpress")
WPCLI_SVC=$([[ "$ENV" == "prod" ]] && echo "wpcli-prod" || echo "wpcli")

# theme dir inside the container (override with WP_THEME_DIR in your .env.* if needed)
THEME_DIR="${WP_THEME_DIR:-/var/www/html/wp-content/themes/beelab-theme}"

# helper: docker compose with env/project/profile wired
compose() { docker compose -p "$PROJECT" --env-file "$ENV_FILE" --profile "$PROFILE" "$@"; }

# load env for WP_BASE_URL (and any overrides)
set -a; source "$ENV_FILE"; set +a
WP_URL="${WP_BASE_URL:-http://localhost:9082}"

echo "ℹ️  Environment: $ENV  (env file: $ENV_FILE, project: $PROJECT)"
echo "ℹ️  WP URL: ${WP_URL}"
echo

echo "▶ Starting DB + WordPress..."
compose up -d "$WPDB_SVC" "$WP_SVC"

# Ensure host-side perms for bind mounts (if your dev uses them)
if [[ -x ./scripts/wp-perms.sh ]]; then
  ./scripts/wp-perms.sh "$ENV" || true
fi

echo "🔧 Fixing permissions and writing .htaccess inside the container..."
compose exec -u 0 "$WP_SVC" bash -lc '
  set -e
  install -d -m 775 -o www-data -g www-data /var/www/html/wp-content/uploads
  chown -R www-data:www-data /var/www/html/wp-content
  find /var/www/html/wp-content -type d -exec chmod 775 {} \;
  find /var/www/html/wp-content -type f -exec chmod 664 {} \;
  cat > /var/www/html/.htaccess << "EOF"
# BEGIN WordPress
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /
RewriteRule ^index\.php$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.php [L]
</IfModule>
# END WordPress
EOF
  chown www-data:www-data /var/www/html/.htaccess
'

# Run the in-container site initializer (theme, permalinks, logo, etc.)
INIT_SCRIPT="${THEME_DIR}/scripts/init-site.sh"
echo "🎬 Running theme init: ${INIT_SCRIPT}"
compose run --rm "$WPCLI_SVC" bash "$INIT_SCRIPT" || {
  echo "⚠️  Theme init script not found/executable: ${INIT_SCRIPT} (skipping)"; true;
}

# Set siteurl/home from env (no hardcoded ports)
echo "📝 Setting siteurl/home to ${WP_URL}"
compose run --rm "$WPCLI_SVC" wp option update siteurl "${WP_URL}"
compose run --rm "$WPCLI_SVC" wp option update home    "${WP_URL}"

# Show current values
compose run --rm "$WPCLI_SVC" wp option get siteurl
compose run --rm "$WPCLI_SVC" wp option get home

# Ensure WP is up after changes
compose up -d "$WP_SVC"

echo "✅ WP init finished for [$ENV]. Open: ${WP_URL%/}/wp-admin"
