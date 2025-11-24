#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Usage:
#   ./scripts/wp-init.sh [dev|prod]
#     [--theme T]
#     [--plugins "slug1,slug2" | --plugin slug ...]
#     [--activate] [--force]
#     [--parent PARENT_SLUG] [--parent-version X.Y] [--auto-parent]

ENV="${1:-}"; shift || true
[[ "$ENV" =~ ^(dev|prod)$ ]] || { echo "Usage: $0 [dev|prod] [--theme T] [--plugins list] [--plugin p] [--activate] [--force] [--parent P] [--parent-version X.Y] [--auto-parent]"; exit 1; }

THEME=""
PLUGINS_CSV=""
PLUGINS=()
ACTIVATE=no
FORCE=no
PARENT=""
PARENT_VER=""
AUTO_PARENT=no

while (( "$#" )); do
  case "${1:-}" in
    --theme)            THEME="${2:-}"; shift 2 ;;
    --plugins)          PLUGINS_CSV="${2:-}"; shift 2 ;;
    --plugin)           PLUGINS+=("${2:-}"); shift 2 ;;
    --activate)         ACTIVATE=yes; shift ;;
    --force)            FORCE=yes; shift ;;
    --parent)           PARENT="${2:-}"; shift 2 ;;
    --parent-version)   PARENT_VER="${2:-}"; shift 2 ;;
    --auto-parent)      AUTO_PARENT=yes; shift ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

ENV_FILE=".env.${ENV}"; [[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE"; exit 1; }
PROJECT="beelab_${ENV}"; PROFILE="$ENV"
WPDB_SVC=$([[ "$ENV" == "prod" ]] && echo "wpdb-prod" || echo "wpdb")
WP_SVC=$([[ "$ENV" == "prod" ]] && echo "wordpress-prod" || echo "wordpress")
WPCLI_SVC=$([[ "$ENV" == "prod" ]] && echo "wpcli-prod" || echo "wpcli")
compose(){ docker compose -p "$PROJECT" --env-file "$ENV_FILE" --profile "$PROFILE" "$@"; }

# load env (URL + defaults)
set -a; source "$ENV_FILE"; set +a
WP_URL="${WP_BASE_URL:-http://localhost:9082}"
THEME="${THEME:-${WP_THEME_NAME:-beelab-theme}}"
if [[ -n "${WP_PLUGINS:-}" ]]; then IFS=',' read -r -a _envp <<< "${WP_PLUGINS}"; PLUGINS+=("${_envp[@]}"); fi
if [[ -n "$PLUGINS_CSV" ]];  then IFS=',' read -r -a _csvp <<< "$PLUGINS_CSV"; PLUGINS+=("${_csvp[@]}"); fi
((${#PLUGINS[@]})) && mapfile -t PLUGINS < <(printf "%s\n" "${PLUGINS[@]}" | awk 'NF' | awk "!seen[\$0]++")

echo "ℹ️  Environment: $ENV (project: $PROJECT)"
echo "ℹ️  WP URL: ${WP_URL}"
echo "ℹ️  Theme:  ${THEME}  (parent=${PARENT:-auto:${AUTO_PARENT}})"
((${#PLUGINS[@]})) && echo "ℹ️  Plugins: ${PLUGINS[*]}"
echo

# Ensure bind-mount perms first in host side NTH addon
# scripts/wp-init.sh (dev/prod shared)

if [[ "$ENV" == "dev" &&  -x ./scripts/wp-perms.sh ]]; then
  ./scripts/wp-perms.sh || true
fi


echo "▶ Starting DB + WordPress..."
compose up -d "$WPDB_SVC" "$WP_SVC"


# minimal perms + .htaccess
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

# install parent (no activation) + child (activate if requested)
theme_args=( "$ENV" "$THEME" )
[[ "$ACTIVATE" == "yes" ]] && theme_args+=( --activate )
[[ "$FORCE" == "yes" ]] && theme_args+=( --force )
[[ -n "$PARENT" ]] && theme_args+=( --parent "$PARENT" )
[[ -n "$PARENT_VER" ]] && theme_args+=( --parent-version "$PARENT_VER" )
[[ "$AUTO_PARENT" == "yes" ]] && theme_args+=( --auto-parent )

./scripts/wp-install-theme.sh "${theme_args[@]}"

# plugins
if ((${#PLUGINS[@]})); then
  for p in "${PLUGINS[@]}"; do
    ./scripts/wp-install-plugin.sh "$ENV" "$p" $( [[ "$ACTIVATE" == "yes" ]] && echo --activate ) $( [[ "$FORCE" == "yes" ]] && echo --force )
  done
fi

# set siteurl/home
compose run --rm "$WPCLI_SVC" wp option update siteurl "${WP_URL}" || true
compose run --rm "$WPCLI_SVC" wp option update home    "${WP_URL}" || true
compose up -d "$WP_SVC"

# show quick status
if [[ "$ACTIVATE" == "yes" ]]; then
  compose run --rm "$WPCLI_SVC" wp theme list --status=active   || true
  compose run --rm "$WPCLI_SVC" wp plugin list --status=active  || true
fi

echo "✅ WP init finished for [$ENV]. Open: ${WP_URL%/}/wp-admin"
