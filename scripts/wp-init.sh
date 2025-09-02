#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Make sure the theme init script is executable (host-side)
# chmod +x wordpress/wp-content/themes/pomolobee-theme/scripts/init-site.sh

# Start DB + WP
docker compose up -d wpdb wordpress

 

# Ensure bind-mount perms first in host side
./scripts/wp-perms.sh


# run perimission in docekr
docker compose exec -u 0 wordpress bash -lc '
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


# Run the in-container initializer (activates theme, permalinks, writes .htaccess, imports logo)
docker compose run --rm wpcli bash /var/www/html/wp-content/themes/beelab-theme/scripts/init-site.sh
