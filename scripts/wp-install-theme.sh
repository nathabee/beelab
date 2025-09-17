#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# usage:
#   ./scripts/wp-install-theme.sh [dev|prod] CHILD_THEME \
#     [--activate] [--force] [--parent PARENT_SLUG] [--parent-version X.Y] [--auto-parent]
#
# notes:
# - parent is installed/copied but NEVER activated
# - --auto-parent reads "Template:" from child theme's style.css if parent not provided

ENV="${1:-}"; CHILD="${2:-}"; shift 2 || true
[[ "$ENV" =~ ^(dev|prod)$ && -n "$CHILD" ]] || { echo "Usage: $0 [dev|prod] CHILD_THEME [--activate] [--force] [--parent P] [--parent-version X.Y] [--auto-parent]"; exit 1; }

ACTIVATE=no
FORCE=no
PARENT=""
PARENT_VER=""
AUTO_PARENT=no

while (( "$#" )); do
  case "$1" in
    --activate)        ACTIVATE=yes; shift ;;
    --force)           FORCE=yes; shift ;;
    --parent)          PARENT="${2:-}"; shift 2 ;;
    --parent-version)  PARENT_VER="${2:-}"; shift 2 ;;
    --auto-parent)     AUTO_PARENT=yes; shift ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

ENV_FILE=".env.${ENV}"; [[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE"; exit 1; }
PROJECT="beelab_${ENV}"; PROFILE="$ENV"
WP_SVC=$([[ "$ENV" == "prod" ]] && echo "wordpress-prod" || echo "wordpress")
WPCLI_SVC=$([[ "$ENV" == "prod" ]] && echo "wpcli-prod" || echo "wpcli")
compose(){ docker compose -p "$PROJECT" --env-file "$ENV_FILE" --profile "$PROFILE" "$@"; }

set -a; source "$ENV_FILE"; set +a
: "${WP_THEME_DIR:=/var/www/html/wp-content/themes}"
THEMES_SRC="./wordpress/wp-content/themes"

# --- detect parent from child/style.css if requested ---
if [[ "$AUTO_PARENT" == "yes" && -z "$PARENT" ]]; then
  CHILD_STYLE="${THEMES_SRC}/${CHILD}/style.css"
  if [[ -f "$CHILD_STYLE" ]]; then
    PARENT="$(grep -iE '^\s*Template:\s*' "$CHILD_STYLE" | sed -E 's/^[Tt]emplate:\s*//; s/\r$//' | tr -d ' ')"
  fi
fi

echo "→ ENV=$ENV  CHILD=$CHILD  PARENT=${PARENT:-<none>}  PARENT_VER=${PARENT_VER:-<any>}  ACTIVATE=$ACTIVATE  FORCE=$FORCE"

# ensure WP is up and we have a container id
compose up -d "$WP_SVC"
CID="$(compose ps -q "$WP_SVC" | head -n1)"
[[ -n "$CID" ]] || { echo "WordPress container not found"; exit 1; }

# helpers ----------------------------------------------------------------------

# Copy a theme folder from the host repo into the container (used in prod).
copy_theme_into_container() {
  local slug="$1"
  local src="${THEMES_SRC}/${slug}"
  [[ -d "$src" ]] || return 1
  docker exec -u 0 "$CID" bash -lc "install -d -m 775 -o www-data -g www-data ${WP_THEME_DIR}"
  if [[ "$FORCE" == "yes" ]]; then
    docker exec -u 0 "$CID" bash -lc "rm -rf ${WP_THEME_DIR}/${slug}"
  fi
  docker cp "$src" "$CID:${WP_THEME_DIR}/"
  docker exec -u 0 "$CID" bash -lc "
    chown -R www-data:www-data ${WP_THEME_DIR}/${slug} &&
    find ${WP_THEME_DIR}/${slug} -type d -exec chmod 775 {} \; &&
    find ${WP_THEME_DIR}/${slug} -type f -exec chmod 664 {} \;
  "
  echo "✓ Copied theme '$slug' into container."
}

# In dev (bind-mount): ensure the parent exists in wp-content/themes.
ensure_parent_in_bind_mount() {
  local parent="$1"
  [[ -z "$parent" ]] && return 0
  # Already present in bind mount?
  if [[ -d "${THEMES_SRC}/${parent}" ]]; then
    return 0
  fi
  # Try copying from core themes shipped in the image (works for twentytwentyfive, etc.).
  compose exec -u 0 "$WP_SVC" bash -lc "
    set -e
    src=/usr/src/wordpress/wp-content/themes/${parent}
    dst=/var/www/html/wp-content/themes/${parent}
    if [ -d \"\$src\" ] && [ ! -d \"\$dst\" ]; then
      echo '→ Installing parent theme ${parent} into bind mount from core...'
      cp -a \"\$src\" \"\$dst\"
      chown -R www-data:www-data \"\$dst\"
      find \"\$dst\" -type d -exec chmod 775 {} \;
      find \"\$dst\" -type f -exec chmod 664 {} \;
    fi
  "

  # If still not present (not a core theme), install via wp-cli (downloads into bind mount).
  if [[ ! -d "${THEMES_SRC}/${parent}" ]]; then
    local vflag=()
    [[ -n "$PARENT_VER" ]] && vflag+=( "--version=$PARENT_VER" )
    compose run --rm "$WPCLI_SVC" wp theme install "$parent" "${vflag[@]}" $( [[ "$FORCE" == "yes" ]] && echo --force )
  fi
}

# logic ------------------------------------------------------------------------

# 1) Ensure parent exists (never activate it)
if [[ -n "$PARENT" ]]; then
  if [[ "$ENV" == "dev" ]]; then
    ensure_parent_in_bind_mount "$PARENT"
  else
    # prod: prefer local copy, else install from wp.org
    if ! copy_theme_into_container "$PARENT"; then
      echo "→ Local parent '$PARENT' not found, installing via wp-cli..."
      vflag=(); [[ -n "$PARENT_VER" ]] && vflag=( "--version=$PARENT_VER" )
      compose run --rm "$WPCLI_SVC" wp theme install "$PARENT" "${vflag[@]}" $( [[ "$FORCE" == "yes" ]] && echo --force )
    fi
  fi
fi

# 2) Ensure child exists, activate if requested
if [[ "$ENV" == "prod" ]]; then
  copy_theme_into_container "$CHILD" || { echo "✗ Child theme folder missing: ${THEMES_SRC}/${CHILD}"; exit 1; }
else
  echo "ℹ️ dev uses bind-mount; child files already present at ${THEMES_SRC}/${CHILD}"
  # activate the site
  # Run the in-container initializer (activates theme, permalinks, writes .htaccess, imports logo)
  compose run --rm  "$WPCLI_SVC"   bash /var/www/html/wp-content/themes/${CHILD}/scripts/init-site.sh
fi


# Make sure WP detects them (safe no-op if already there)
compose run --rm "$WPCLI_SVC" wp theme is-installed "$CHILD" || true
[[ -n "$PARENT" ]] && compose run --rm "$WPCLI_SVC" wp theme is-installed "$PARENT" || true

if [[ "$ACTIVATE" == "yes" ]]; then
  echo "→ Activating child '$CHILD' (parent remains unactivated)."
  compose run --rm "$WPCLI_SVC" wp theme activate "$CHILD" || true
fi

echo "✓ Theme install done (child=${CHILD}, parent=${PARENT:-none})"
