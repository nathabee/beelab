#!/usr/bin/env bash
set -euo pipefail
cd /var/www/html

# Make sure WP is installed
if ! wp core is-installed > /dev/null 2>&1; then
  echo "❌ WordPress not installed yet. Open http://localhost:9082 to finish setup."
  exit 1
fi

# Parent theme if you’re a child of 2025
if grep -qi '^Template:\s*twentytwentyfive' wp-content/themes/beelab-theme/style.css; then
  wp theme is-installed twentytwentyfive || wp theme install twentytwentyfive
fi

# Activate your theme (idempotent)
wp theme activate beelab-theme || true

# Site basics + permalinks
wp option update blogname 'BeeLab'
wp option update blogdescription ' Dockerized Multiservice (Django + Next.js plugins + WordPress + databases)'
wp option update permalink_structure '/%postname%/'
wp rewrite flush --hard || true   # may warn; that’s fine if .htaccess is present

# Import & set logo
LOGO='/var/www/html/wp-content/themes/beelab-theme/assets/images/logo.png'
if [[ -f "$LOGO" ]]; then
  CUR="$(wp theme mod get custom_logo --format=value 2>/dev/null || true)"
  if [[ -z "${CUR:-}" || "$CUR" == "0" ]]; then
    echo "Importing logo from $LOGO ..."
    ID="$(wp media import "$LOGO" --porcelain)"
    echo "✅ Imported attachment ID: $ID"
    wp theme mod set custom_logo "$ID"
    wp option update site_logo "$ID" || wp option add site_logo "$ID"
  else
    echo "Logo already set to attachment ID: $CUR"
  fi
else
  echo "⚠️ Logo file not found at $LOGO"
fi

# Debug: show attachments + current logo
echo "— Attachments —"
wp post list --post_type=attachment --fields=ID,post_title,guid,post_mime_type --format=table
echo -n "custom_logo: "
wp theme mod get custom_logo || true
echo -n "site_logo: "
wp option get site_logo || true

wp cache flush || true
echo "✅ init-site done."
