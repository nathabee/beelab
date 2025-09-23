#!/usr/bin/env bash
set -euo pipefail

# ℹ️ This script is only used in DEV environment.
#    Reason: in DEV, the host's ./wordpress/wp-content is bind-mounted into Docker.
#    That means both the host user (e.g. nathalie) and the container user (www-data)
#    need to share write access. This script fixes ownership, group perms, and ACLs
#    so both sides can work without permission errors.
#
# In PROD there is no host bind mount — wp-content lives fully inside the container —
# so this script is NOT needed there. Permissions are handled by wp-init.sh.


WP_CONTENT="./wordpress/wp-content"
mkdir -p "$WP_CONTENT"

# Helpful but optional: add the current user to www-data so group perms help in shells/editors.
if ! id -nG "$USER" | grep -qw "www-data"; then
  echo "👉 Adding $USER to group www-data (log out/in to take effect) ..."
  sudo usermod -aG www-data "$USER" || true
fi

echo "👉 Enforcing Option A model (owner = www-data) on host bind mount: $WP_CONTENT"

# 1) Make www-data the owner/group of EVERYTHING under wp-content
sudo chown -R www-data:www-data "$WP_CONTENT"

# 2) Directories 2775 (setgid so new stuff inherits group), files 664
sudo find "$WP_CONTENT" -type d -print0 | xargs -0 sudo chmod 2775
sudo find "$WP_CONTENT" -type f -print0 | xargs -0 sudo chmod 0664

# 3) ACLs: give your user full rwx now AND by default on new files/dirs
if command -v setfacl >/dev/null 2>&1; then
  echo "👉 Applying ACLs for $USER ..."
  sudo setfacl -R -m u:"$USER":rwx,g:www-data:rwx "$WP_CONTENT"
  sudo setfacl -R -d -m u:"$USER":rwx,g:www-data:rwx "$WP_CONTENT"
else
  echo "⚠️ setfacl not found; install 'acl' package for best results."
fi

# 4) (Optional) Tighten 'others' a bit but keep read/exec for web static files
#    Skip if you need public write in dev (rare).
sudo chmod -R o=rX "$WP_CONTENT" || true

echo "✅ wp-content ready: owned by www-data, setgid=on, ACLs grant $USER full access."
