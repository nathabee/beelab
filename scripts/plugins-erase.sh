#!/usr/bin/env bash

# 0) make sure wpcli is running
dc up -d wpcli

# 1) nuke everything related to PomoloBee + Competence in one go
dc exec -T wpcli bash -lc '
set -euo pipefail

# helper: delete all posts of a post_type (if any)
del_posts() {
  local pt="$1"
  local ids
  ids=$(wp post list --post_type="$pt" --format=ids 2>/dev/null || true)
  if [[ -n "$ids" ]]; then
    wp post delete $ids --force
  else
    echo "No posts for $pt"
  fi
}

# helper: delete a page by slug (if exists)
del_page_by_slug() {
  local slug="$1"
  local id
  id=$(wp post list --post_type=page --name="$slug" --field=ID 2>/dev/null || true)
  if [[ -n "$id" ]]; then
    wp post delete "$id" --force
  else
    echo "No page with slug: $slug"
  fi
}

echo "Deactivating & deleting plugins (if present)…"
wp plugin deactivate pomolobee competence >/dev/null 2>&1 || true
wp plugin delete     pomolobee competence >/dev/null 2>&1 || true

echo "Deleting CPT content…"
del_posts pomolobee_page
del_posts competence_page

echo "Deleting anchor pages (if your plugin created them)…"
del_page_by_slug pomolobee
del_page_by_slug competence
del_page_by_slug login

echo "Deleting options…"
for opt in pomolobee_api_url pomolobee_plugin_version competence_settings competence_plugin_version; do
  wp option delete "$opt" >/dev/null 2>&1 || true
done

echo "Deleting custom roles (if they exist)…"
for role in pomolobee_manager pomolobee_editor competence_manager competence_editor; do
  if wp role list --field=name | grep -qx "$role"; then
    wp role delete "$role" || true
  fi
done

echo "Clearing transients / cache / rewrites…"
wp transient delete --all >/dev/null 2>&1 || true
wp cache flush        >/dev/null 2>&1 || true
wp rewrite flush --hard

echo "✅ Done: site is clean regarding PomoloBee/Competence."
'
