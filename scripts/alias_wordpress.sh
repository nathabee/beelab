#!/usr/bin/env bash
# WordPress aliases for BeeLab
# This file is sourced by scripts/alias.sh

# must be sourced
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  echo "This file must be sourced, not executed."
  exit 1
fi

# expects: _BEELAB_ROOT, dc, dclogs, dcexec, dcup, dcstop, BEELAB_* vars

# -------------------------------------------------------------------
# SERVICE HELPERS (WordPress)
# -------------------------------------------------------------------
_beelab_ensure_wpcli() {
  if [[ -z "$(dc ps --status running -q "$BEELAB_WPCLI_SVC" 2>/dev/null)" ]]; then
    dc up -d "$BEELAB_WPCLI_SVC"
  fi
}

# -------------------------------------------------------------------
# WORDPRESS
# -------------------------------------------------------------------
dcwplogs()   { dclogs "$BEELAB_WP_SVC" "$@"; }
dcwplog()    { dcwplogs "$@"; }
dcwpup()     {   dc up -d "$BEELAB_WP_SVC";   }
dcwpdown()   { dc stop  "$BEELAB_WP_SVC"; }
dcwplsmedia(){ dcexec "$BEELAB_WP_SVC" bash -lc "ls -lAh --group-directories-first /var/www/html/media/${1:-}"; }
dcwpcurlmedia(){ local path="${1:-/media}"; curl -I "http://localhost:9082${path}"; }

dcwpcliup()   { dc up -d "$BEELAB_WPCLI_SVC"; }
dcwpclidown() { dc stop  "$BEELAB_WPCLI_SVC"; }

dcwpcli() {
  _beelab_ensure_wpcli
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi
  dc exec $tty_flags "$BEELAB_WPCLI_SVC" "$@"
}

dcwpsanity() {
  _beelab_ensure_wpcli
  echo "home:      $(dcwp option get home)"
  echo "siteurl:   $(dcwp option get siteurl)"
  echo "theme:     $(dcwp option get stylesheet) (parent: $(dcwp option get template))"
  echo "plugins:"
  dcwp plugin list --status=active --field=name | sed 's/^/  - /'
}

dcwpfix_theme() {
  _beelab_ensure_wpcli
  dcwp theme activate beelab-theme || true
}

dcwp() {
  _beelab_ensure_wpcli
   local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi
  dc exec $tty_flags "$BEELAB_WPCLI_SVC" wp "$@"
}
#dcwp() {
#  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi
#  if [[ -z "$(dc ps --status running -q "$BEELAB_WPCLI_SVC")" ]]; then
#    dc run --rm $tty_flags "$BEELAB_WPCLI_SVC" wp "$@"
#  else
#    dc exec $tty_flags "$BEELAB_WPCLI_SVC" wp "$@"
#  fi
#}



dcwpcachflush() {
  _beelab_ensure_wpcli
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi
  dc exec $tty_flags "$BEELAB_WPCLI_SVC" bash -lc \
    'wp cache flush || true; rm -rf /var/www/html/wp-content/cache/* || true; echo "WP cache cleared."'
}

dcwpfixroutes() {
  _beelab_ensure_wpcli
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi
  dc exec $tty_flags "$BEELAB_WPCLI_SVC" bash -lc '
    echo "home:"; wp option get home;
    echo "siteurl:"; wp option get siteurl;
    echo "permalink before:"; wp option get permalink_structure;
    wp option update permalink_structure "/%postname%/" >/dev/null;
    wp rewrite flush --hard;
    echo "permalink after:"; wp option get permalink_structure;
    wp plugin list;
  '
}

# -------------------------------------------------
# CONTENT INSPECTION (read-only)
# -------------------------------------------------

# List pages (ID + title + slug + status). Optional: filter pattern (grep -i).
dcwplistpages() {
  local q="${1:-}"
  if [[ -z "$q" ]]; then
    dcwp post list --post_type=page --posts_per_page=200 \
      --fields=ID,post_title,post_name,post_status,post_date \
      --format=table
  else
    dcwp post list --post_type=page --posts_per_page=500 \
      --fields=ID,post_title,post_name,post_status,post_date \
      --format=csv | head -n 1 && \
    dcwp post list --post_type=page --posts_per_page=500 \
      --fields=ID,post_title,post_name,post_status,post_date \
      --format=csv | grep -i -- "$q" || true
  fi
}

# List posts (ID + title + slug + status). Optional filter.
dcwplistposts() {
  local q="${1:-}"
  if [[ -z "$q" ]]; then
    dcwp post list --post_type=post --posts_per_page=200 \
      --fields=ID,post_title,post_name,post_status,post_date \
      --format=table
  else
    dcwp post list --post_type=post --posts_per_page=500 \
      --fields=ID,post_title,post_name,post_status,post_date \
      --format=csv | head -n 1 && \
    dcwp post list --post_type=post --posts_per_page=500 \
      --fields=ID,post_title,post_name,post_status,post_date \
      --format=csv | grep -i -- "$q" || true
  fi
}

# List recent content across pages+posts quickly
dcwplistrecent() {
  local n="${1:-30}"
  dcwp post list --post_type=post,page --orderby=date --order=DESC --posts_per_page="$n" \
    --fields=ID,post_type,post_title,post_name,post_status,post_date \
    --format=table
}

# Given a numeric ID, show key info (works for pages/posts/attachments/etc.)
dcwpid() {
  local id="${1:-}"
  [[ -z "$id" ]] && { echo "Usage: dcwpid ID"; return 1; }
  dcwp post get "$id" --fields=ID,post_type,post_title,post_name,post_status,post_date,guid --format=table
}

# Search posts/pages by keyword (wp search, not grep)
dcwpfind() {
  local term="${1:-}"
  [[ -z "$term" ]] && { echo "Usage: dcwpfind 'keyword'"; return 1; }
  dcwp post list --post_type=post,page --s="$term" --posts_per_page=200 \
    --fields=ID,post_type,post_title,post_name,post_status,post_date \
    --format=table
}

# -------------------------------------------------
# MENUS / NAVIGATION INSPECTION
# -------------------------------------------------

# List all nav menus (term_id + name + slug + count)
dcwplistmenus() {
  dcwp menu list --format=table
}

# List items inside a menu by menu slug/name/id
dcwpmenuitems() {
  local menu="${1:-}"
  [[ -z "$menu" ]] && { echo "Usage: dcwpmenuitems <menu-slug|name|id>"; return 1; }

  echo "== Menu =="
  dcwp menu list --format=table | (head -n 1; grep -i -- "$menu" || true)

  echo
  echo "== Items (raw) =="
  dcwp menu item list "$menu" --format=table
}

# Show where menus are assigned (theme locations)
dcwpmenu_locations() {
  dcwp menu location list --format=table
}

# -------------------------------------------------
# QUICK COUNTS (sanity check after import)
# -------------------------------------------------
dcwpcount() {
  echo "Pages: $(dcwp post list --post_type=page --format=count)"
  echo "Posts: $(dcwp post list --post_type=post --format=count)"
  echo "Drafts: $(dcwp post list --post_type=post,page --post_status=draft --format=count)"
  echo "Menus: $(dcwp menu list --format=csv | tail -n +2 | wc -l | tr -d ' ')"
}

# -------------------------------------------------------------------
# WORDPRESS — diagnostics
# -------------------------------------------------------------------
dcwpcheck_leftovers() {
  local slug="${1:-}"
  if [[ -z "$slug" ]]; then echo "Usage: dcwpcheck_leftovers <plugin-slug>"; return 1; fi
  _beelab_ensure_wpcli
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi

  local opt_keys=() cpt="" roles=() crons=() transients_pattern=""
  case "$slug" in
    pomolobee)
      opt_keys=("pomolobee_api_url"); cpt="pomolobee_page"; crons=("pomolobee_cron"); transients_pattern="^pomolobee_"
      ;;
    competence)
      opt_keys=("competence_settings"); cpt="competence_item"
      ;;
  esac

  dc exec $tty_flags "$BEELAB_WPCLI_SVC" bash -lc '
set -euo pipefail
declare -a opt_keys=('"${opt_keys[@]@Q}"')
declare -a roles=('"${roles[@]@Q}"')
declare -a crons=('"${crons[@]@Q}"')
cpt="'"$cpt"'"
transients_pattern="'"$transients_pattern"'"
check_site() {
  local url="$1"
  echo "============================"
  echo "Site: ${url:-(single-site)}"
  echo "============================"
  if ((${#opt_keys[@]})); then
    for k in "${opt_keys[@]}"; do
      if wp ${url:+--url="$url"} option get "$k" >/dev/null 2>&1; then
        echo "Option still exists: $k = $(wp ${url:+--url="$url"} option get "$k" 2>/dev/null)"
      else
        echo "Option removed: $k"
      fi
    done
  fi
  if [[ -n "$cpt" ]]; then
    local cnt
    cnt=$(wp ${url:+--url="$url"} post list --post_type="$cpt" --post_status=any --format=count 2>/dev/null || echo 0)
    if [[ "$cnt" -gt 0 ]]; then
      echo "$cpt posts remaining: $cnt"
      wp ${url:+--url="$url"} post list --post_type="$cpt" --post_status=any --fields=ID,post_status,post_title --posts_per_page=10 2>/dev/null || true
    else
      echo "No $cpt posts remain"
    fi
  fi
  if ((${#roles[@]})); then
    for r in "${roles[@]}"; do
      if wp ${url:+--url="$url"} role exists "$r" >/dev/null 2>&1; then
        echo "Role still exists: $r"
      else
        echo "Role removed: $r"
      fi
    done
  fi
  if ((${#crons[@]})); then
    for h in "${crons[@]}"; do
      if wp ${url:+--url="$url"} cron event list | grep -qE "^\s*$h\b"; then
        echo "Cron hook still scheduled: $h"
      else
        echo "Cron hook not found: $h"
      fi
    done
  fi
  if [[ -n "$transients_pattern" ]]; then
    if wp ${url:+--url="$url"} cli has-command transient >/dev/null 2>&1; then
      local n
      n=$(wp ${url:+--url="$url"} transient list --search="$transients_pattern" --format=count 2>/dev/null || echo 0)
      [[ "$n" -gt 0 ]] && echo "Transients matching $transients_pattern: $n" || echo "No transients matching $transients_pattern"
    else
      local n
      n=$(wp ${url:+--url="$url"} db query --skip-column-names --quick \
        "SELECT COUNT(*) FROM $(wp ${url:+--url="$url"} db prefix --quiet)options WHERE option_name REGEXP '${transients_pattern}'" 2>/dev/null || echo 0)
      [[ "$n" -gt 0 ]] && echo "Options matching $transients_pattern: $n" || echo "No options matching $transients_pattern"
    fi
  fi
}
if wp core is-installed --network >/dev/null 2>&1; then
  while IFS= read -r url; do
    check_site "$url"
  done < <(wp site list --field=url)
else
  check_site ""
fi
'
}

dcwproutediagnose() {
  local slug="${1:-pomolobee}"
  local cpt="${2:-${slug}_page}"
  local name="${3:-$slug}"
  _beelab_ensure_wpcli
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi
  dc exec $tty_flags "$BEELAB_WPCLI_SVC" bash -lc '
set -euo pipefail
slug="'"$slug"'"
cpt="'"$cpt"'"
name="'"$name"'"
echo "========================"; echo "Site basics"; echo "========================"
echo -n "home: "; wp option get home
echo -n "siteurl: "; wp option get siteurl
echo -n "permalinks: "; wp option get permalink_structure
echo; echo "========================"; echo "Active plugins"; echo "========================"
wp plugin list --status=active --field=name | sed "s/^/- /"
echo; echo "========================"; echo "Post type + content checks"; echo "========================"
if wp cli has-command "post-type"; then
  if wp post-type list --field=name | grep -qx "$cpt"; then echo "CPT registered: $cpt"; else echo "CPT NOT registered: $cpt"; fi
fi
echo -n "CPT post count ($cpt): "; wp post list --post_type="$cpt" --post_status=any --format=count || true
echo "First few:"; wp post list --post_type="$cpt" --post_status=any --fields=ID,post_status,post_name,post_title --posts_per_page=5 || true
echo; echo "========================"; echo "Slug collisions"; echo "========================"
wp db query --skip-column-names --quick "
SELECT ID, post_type, post_status, post_name, post_title
FROM $(wp db prefix --quiet)posts
WHERE post_name = '${name}'
ORDER BY FIELD(post_type, '${cpt}','page','post') DESC, ID ASC
LIMIT 10"
echo; echo "========================"; echo "Rewrite rules containing /$slug"; echo "========================"
wp rewrite list | awk -v s="^'"$slug"'(/|$)" '\''$0 ~ s {print} '\'' || true
echo; echo "========================"; echo "Public query var?"; echo "========================"
wp eval "
global \$wp; \$vars = \$wp->public_query_vars;
echo in_array(\"${cpt}\", \$vars, true) ? \"query var '${cpt}' is public\n\" : \"query var '${cpt}' is NOT a public query var\n\";"
echo; echo "========================"; echo "Hard flush"; echo "========================"
wp rewrite flush --hard >/dev/null && echo "Flushed rewrite rules."
echo; echo "Done."
'
}

dcwproute() {
  local path="${1:-/}"
  _beelab_ensure_wpcli
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi
  dc exec $tty_flags "$BEELAB_WPCLI_SVC" bash -lc '
P="'"$path"'"
php -r '\''require "wp-load.php"; global $wp;
  $_GET=$_POST=[];
  $_SERVER["REQUEST_URI"]=getenv("P");
  $_SERVER["REQUEST_METHOD"]="GET";
  $wp->parse_request();
  printf("=== %s ===\n", getenv("P"));
  printf("matched_rule:  %s\n", $wp->matched_rule ?? "(none)");
  printf("matched_query: %s\n", $wp->matched_query ?? "(none)");
  printf("query_vars:    %s\n", json_encode($wp->query_vars, JSON_UNESCAPED_SLASHES));'\''
'
}

# -------------------------------------------------------------------
# Theme DB overrides reset + install ZIP
# -------------------------------------------------------------------
# Reset FSE DB overrides + remove theme directory (file-based state)
# Usage: dcwpthemereset [theme-dirname]
dcwpthemereset() {
  local theme_dir="${1:-beelab-theme}"

  _beelab_ensure_wpcli
  dc exec -T -u 33:33 "$BEELAB_WPCLI_SVC" sh -lc "
set -euo pipefail

echo '== Active theme =='
wp theme list --status=active --format=table || true

delete_posts() {
  pt=\"\$1\"
  ids=\$(wp post list --post_type=\"\$pt\" --field=ID 2>/dev/null || true)
  if [ -n \"\$ids\" ]; then
    wp post delete \$ids --force >/dev/null || true
    echo \"Deleted \$pt overrides.\"
  else
    echo \"No \$pt overrides.\"
  fi
}

echo '== Deleting FSE DB overrides (templates/parts/styles) =='
delete_posts wp_template
delete_posts wp_template_part
delete_posts wp_global_styles

echo '== Removing theme directory from filesystem =='
cd /var/www/html/wp-content/themes
rm -rf \"${theme_dir}\" && echo \"Removed themes/${theme_dir}\" || true

echo '== Flush cache + rewrites =='
wp cache flush || true
rm -rf /var/www/html/wp-content/cache/* || true
wp rewrite flush --hard || true

echo 'Theme reset complete (env=$BEELAB_ENV).'
"
}



# Install a theme ZIP that exists on the machine running this command
# Usage: dcwpthemeinstall /path/to/beelab-theme.zip [theme-dirname]
# Install a theme ZIP that exists on the machine running this command
# Usage: dcwpthemeinstall /path/to/beelab-theme.zip [theme-dirname] [--wipe|--keep]
dcwpthemeinstall() {
  local zip_path="${1:-}"
  local theme_dir="${2:-beelab-theme}"

  [[ -n "$zip_path" ]] || { echo "Usage: dcwpthemeinstall /path/to/theme.zip [theme-dirname]"; return 1; }
  [[ -f "$zip_path" ]] || { echo "ZIP not found: $zip_path"; return 1; }

  _beelab_ensure_wpcli

  echo "== Copy ZIP =="
  dc cp "$zip_path" "${BEELAB_WPCLI_SVC}:/tmp/theme.zip" || return 1

  echo "== Install into /var/www/html/wp-content/themes/${theme_dir} as UID 33 =="
  dc exec -T -u 33:33 "$BEELAB_WPCLI_SVC" sh -lc "
set -euo pipefail
dest=/var/www/html/wp-content/themes/${theme_dir}
mkdir -p \"\$dest\"
rm -rf \"\$dest\"/*
unzip -o /tmp/theme.zip -d \"\$dest\"
test -f \"\$dest/style.css\"
" || { echo "❌ Theme install failed (permissions)."; return 1; }

  dcwpcachflush || true
  echo "✅ Theme installed (env=$BEELAB_ENV)."
}





# -------------------------------------------------------------------
# WORDPRESS — DB + uploads dump/restore (env-agnostic)
# -------------------------------------------------------------------
_beelab_wpdb_svc() {
  if [[ "${BEELAB_ENV:-dev}" == "prod" ]]; then
    echo "wpdb-prod"
  else
    echo "wpdb"
  fi
}

dcwpdbdump() {
  local out="${1:-}"
  [[ -z "$out" ]] && {
    echo "Usage: dcwpdbdump wp-db/<name>.sql"
    echo "Example: dcwpdbdump wp-db/prod.20251216-1335.sql"
    return 1
  }

  # Always resolve to ~/exports
  local OUT="$HOME/exports/$out"
  local dir; dir="$(dirname "$OUT")"
  mkdir -p "$dir"

  local svc; svc="$(_beelab_wpdb_svc)"
  echo "== dumping WordPress DB (env=$BEELAB_ENV svc=$svc) -> $OUT =="

  dc exec -T "$svc" bash -lc '
set -euo pipefail
mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"
' > "$OUT"

  echo "DB dump written: $OUT"
}


dcwpdbrestore() {
  local in="${1:-}"
  [[ -z "$in" ]] && { echo "Usage: dcwpdbrestore /path/to/in.sql"; return 1; }
  [[ ! -f "$in" ]] && { echo "SQL file not found: $in"; return 1; }

  local svc; svc="$(_beelab_wpdb_svc)"
  echo "== restoring WordPress DB (env=$BEELAB_ENV svc=$svc) from $in =="
  echo "This will DROP and recreate the WordPress database in this env."

  dc exec -T "$svc" bash -lc '
set -euo pipefail
mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" -e "
DROP DATABASE IF EXISTS \`$MARIADB_DATABASE\`;
CREATE DATABASE \`$MARIADB_DATABASE\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS \`$MARIADB_USER\`@'\''%'\'' IDENTIFIED BY '\''$MARIADB_PASSWORD'\'';
ALTER USER \`$MARIADB_USER\`@'\''%'\'' IDENTIFIED BY '\''$MARIADB_PASSWORD'\'';

GRANT ALL PRIVILEGES ON \`$MARIADB_DATABASE\`.* TO \`$MARIADB_USER\`@'\''%'\'' ;
FLUSH PRIVILEGES;
"
'

  dc exec -T "$svc" bash -lc '
set -euo pipefail
mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"
' < "$in"

  echo "DB restored from: $in"
}

dcwpuploadszip() {
  local out="${1:-}"
  [[ -z "$out" ]] && {
    echo "Usage: dcwpuploadszip wp-files/<name>.tgz"
    echo "Example: dcwpuploadszip wp-files/prod.20251216-1145.uploads.tgz"
    return 1
  }

  # Always resolve to ~/exports
  local OUT="$HOME/exports/$out"
  local dir
  dir="$(dirname "$OUT")"
  mkdir -p "$dir"

  echo "== zipping WordPress uploads (env=$BEELAB_ENV) -> $OUT =="

  dc exec -T "$BEELAB_WP_SVC" bash -lc '
set -euo pipefail
cd /var/www/html/wp-content
test -d uploads || { echo "❌ uploads/ not found"; ls -lah; exit 1; }
tar -czf /tmp/wp-uploads.tgz uploads
echo "✓ /tmp/wp-uploads.tgz created"
'

  dc cp "${BEELAB_WP_SVC}:/tmp/wp-uploads.tgz" "$OUT"
  echo "✓ uploads archive written: $OUT"
}


dcwpuploadsunzip() {
  local in="${1:-}"
  local mode="${2:---keep}"

  [[ -n "$in" ]] || { echo "Usage: dcwpuploadsunzip /path/to/uploads.tgz [--wipe|--keep]"; return 1; }
  [[ -f "$in" ]] || { echo "archive not found: $in"; return 1; }

  _beelab_ensure_wpcli
  echo "== restoring uploads (env=$BEELAB_ENV) from $in (mode=$mode) =="

  dc cp "$in" "${BEELAB_WPCLI_SVC}:/tmp/uploads.tgz"

  dc exec -T -u 33:33 -e MODE="$mode" "$BEELAB_WPCLI_SVC" bash -lc '
set -euo pipefail
cd /var/www/html/wp-content

if [[ "${MODE}" == "--wipe" ]]; then
  echo "Wiping existing uploads/..."
  rm -rf uploads
fi

tar -xzf /tmp/uploads.tgz --no-same-owner --no-same-permissions
echo "✓ extracted uploads into wp-content"
'

  echo "uploads restored from: $in"
}




# -------------------------------------------------------------------
# Clone URL fix (prod <-> dev)
# -------------------------------------------------------------------
# Usage:
#   dcwpfixcloneurls prod2dev
#   dcwpfixcloneurls dev2prod
# or:
#   dcwpfixcloneurls "https://beelab-wp.nathabee.de" "http://localhost:9082"
# Fix URLs after cloning between prod <-> dev.
# Target is the currently sourced env ($BEELAB_ENV).
# - In dev: rewrites prod -> localhost
# - In prod: rewrites localhost -> prod domain
#
# in dev it calls:
# dc exec -T "$BEELAB_WPCLI_SVC"   sh -lc  'wp option update home "http://localhost:9082"'
# dc exec -T "$BEELAB_WPCLI_SVC"   sh -lc  'wp option update siteurl "http://localhost:9082"'
# dc exec -T "$BEELAB_WPCLI_SVC"   sh -lc  'wp option get home && wp option get siteurl'
# dc exec -T "$BEELAB_WPCLI_SVC"   sh -lc  'wp search-replace "https://beelab-wp.nathabee.de" "http://localhost:9082" --all-tables 
# dc exec -T "$BEELAB_WPCLI_SVC" sh -lc 'wp search-replace "https:\\/\\/beelab-wp.nathabee.de" "http:\\/\\/localhost:9082" --all-tables dcwpcachflush
# dc exec -T "$BEELAB_WPCLI_SVC" sh -lc 'wp rewrite flush --hard'

dcwpfixcloneurls() {
  _beelab_ensure_wpcli

  local env="${BEELAB_ENV:-dev}"
  local prod="https://beelab-wp.nathabee.de"
  local dev="http://localhost:9082"

  local from="" to=""
  if [[ "$env" == "prod" ]]; then
    from="$dev"
    to="$prod"
  else
    from="$prod"
    to="$dev"
  fi

  echo "== dcwpfixcloneurls (target env=$env) =="
  echo "expected base: $to"
  echo

  # Read current base URLs
  local cur_home cur_siteurl
  cur_home="$(dc exec -T "$BEELAB_WPCLI_SVC" sh -lc "wp option get home 2>/dev/null || true" | tr -d '\r')"
  cur_siteurl="$(dc exec -T "$BEELAB_WPCLI_SVC" sh -lc "wp option get siteurl 2>/dev/null || true" | tr -d '\r')"

  echo "current home:   ${cur_home:-<empty>}"
  echo "current siteurl:${cur_siteurl:-<empty>}"
  echo

  # Safety: refuse if we're on an unexpected third URL (prevents accidental damage).
  if [[ -n "$cur_home" && "$cur_home" != "$to" && "$cur_home" != "$from" ]]; then
    echo "❌ Refusing: 'home' is neither expected ($to) nor source ($from): $cur_home"
    return 1
  fi
  if [[ -n "$cur_siteurl" && "$cur_siteurl" != "$to" && "$cur_siteurl" != "$from" ]]; then
    echo "❌ Refusing: 'siteurl' is neither expected ($to) nor source ($from): $cur_siteurl"
    return 1
  fi

  # Always enforce canonical base URLs (idempotent).
  dc exec -T "$BEELAB_WPCLI_SVC" sh -lc "
set -euo pipefail
wp option update home   '$to' >/dev/null
wp option update siteurl '$to' >/dev/null
"

  # Use WP's table prefix (never assume wp_).
  local prefix
  prefix="$(dc exec -T "$BEELAB_WPCLI_SVC" sh -lc "wp db prefix --quiet 2>/dev/null || echo wp_" | tr -d '\r')"

  # Detect whether the "from" URL exists anywhere important (posts + options + postmeta).
  # This catches fonts/CSS stored in options, serialized theme settings, etc.
  local n_posts n_opts n_meta n_total
  n_posts="$(dc exec -T "$BEELAB_WPCLI_SVC" sh -lc \
    "wp db query --skip-column-names --quick \
     \"SELECT COUNT(*) FROM ${prefix}posts WHERE post_content LIKE '%${from}%'\" 2>/dev/null || echo 0" \
    | tr -d '\r' | tail -n 1)"
  n_opts="$(dc exec -T "$BEELAB_WPCLI_SVC" sh -lc \
    "wp db query --skip-column-names --quick \
     \"SELECT COUNT(*) FROM ${prefix}options WHERE option_value LIKE '%${from}%'\" 2>/dev/null || echo 0" \
    | tr -d '\r' | tail -n 1)"
  n_meta="$(dc exec -T "$BEELAB_WPCLI_SVC" sh -lc \
    "wp db query --skip-column-names --quick \
     \"SELECT COUNT(*) FROM ${prefix}postmeta WHERE meta_value LIKE '%${from}%'\" 2>/dev/null || echo 0" \
    | tr -d '\r' | tail -n 1)"

  # Sum safely (bash arithmetic).
  n_total=$(( ${n_posts:-0} + ${n_opts:-0} + ${n_meta:-0} ))

  echo "matches (plain '$from'):"
  echo "  posts:    ${n_posts:-0}"
  echo "  options:  ${n_opts:-0}"
  echo "  postmeta: ${n_meta:-0}"
  echo "  total:    ${n_total:-0}"
  echo

  # If there's anything to replace, do it once across all tables.
  # (Even if 0, it's safe to skip to avoid unnecessary DB churn.)
  if [[ "${n_total:-0}" != "0" ]]; then
    echo "== replacing plain URLs across ALL tables =="
    dc exec -T "$BEELAB_WPCLI_SVC" sh -lc "
set -euo pipefail
wp search-replace '$from' '$to' --all-tables --precise --recurse-objects
"
  else
    echo "== plain replace skipped (no matches detected in posts/options/postmeta) =="
  fi

  # Also fix JSON-escaped variants (https:\/\/example.com) which often appear in block/theme JSON.
  local from_esc to_esc n_esc
  from_esc="${from//\//\\/}"
  to_esc="${to//\//\\/}"

  n_esc="$(dc exec -T "$BEELAB_WPCLI_SVC" sh -lc \
    "wp db query --skip-column-names --quick \
     \"SELECT (
        (SELECT COUNT(*) FROM ${prefix}posts    WHERE post_content LIKE '%${from_esc}%')
      + (SELECT COUNT(*) FROM ${prefix}options  WHERE option_value LIKE '%${from_esc}%')
      + (SELECT COUNT(*) FROM ${prefix}postmeta WHERE meta_value   LIKE '%${from_esc}%')
     )\" 2>/dev/null || echo 0" \
    | tr -d '\r' | tail -n 1)"

  echo
  echo "matches (escaped '$from_esc'): ${n_esc:-0}"

  if [[ "${n_esc:-0}" != "0" ]]; then
    echo "== replacing escaped URLs across ALL tables =="
    dc exec -T "$BEELAB_WPCLI_SVC" sh -lc "
set -euo pipefail
wp search-replace '$from_esc' '$to_esc' --all-tables --precise --recurse-objects
"
  else
    echo "== escaped replace skipped (no matches detected) =="
  fi

  # Flush (idempotent)
  dcwpcachflush
  dc exec -T "$BEELAB_WPCLI_SVC" sh -lc "wp rewrite flush --hard >/dev/null || true"

  echo "✅ dcwpfixcloneurls done."
}

dcwpthemezip_make_dev() {
  # Usage:
  #   dcwpthemezip_make_dev [in_zip_rel_to_repo] [out_zip_rel_to_repo]
  #
  # Defaults (relative to repo root):
  #   wordpress/build/beelab-theme.zip
  #   wordpress/build/beelab-theme-dev.zip

  local in_rel="${1:-wordpress/build/beelab-theme.zip}"
  local out_rel="${2:-wordpress/build/beelab-theme-dev.zip}"

  local prod="https://beelab-wp.nathabee.de"
  local dev="http://localhost:9082"

  [[ -n "${_BEELAB_ROOT:-}" ]] || { echo "❌ _BEELAB_ROOT not set (did you source scripts/alias.sh ?)"; return 1; }

  local in_zip="$_BEELAB_ROOT/$in_rel"
  local out_zip="$_BEELAB_ROOT/$out_rel"

  [[ -f "$in_zip" ]] || { echo "❌ Input ZIP not found: $in_zip"; return 1; }

  local tmp; tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' RETURN

  rm -f "$out_zip" 2>/dev/null || true
  mkdir -p "$(dirname "$out_zip")"

  # Unpack
  ( cd "$tmp" && unzip -q "$in_zip" )

  # Sanity: ensure we actually extracted something meaningful
  if ! ( cd "$tmp" && find . -type f -name "style.css" | grep -q . ); then
    echo "❌ ZIP did not look like a theme export (style.css not found). Input: $in_zip"
    return 1
  fi

  # Rewrite only typical theme text assets
  ( cd "$tmp" && \
    find . -type f \( -name "*.json" -o -name "*.html" -o -name "*.css" \) -print0 \
      | xargs -0 sed -i \
        -e "s|${prod}/wp-content/|/wp-content/|g" \
        -e "s|${dev}/wp-content/|/wp-content/|g" \
        -e "s|${prod//\//\\/}\\/wp-content\\/|\\/wp-content\\/|g" \
        -e "s|${dev//\//\\/}\\/wp-content\\/|\\/wp-content\\/|g" \
  )

  # Re-pack
  ( cd "$tmp" && zip -qr "$out_zip" . )

  echo "✅ Dev theme ZIP written: $out_zip"
  echo "   Source ZIP preserved: $in_zip"
}


# -------------------------------------------------------------------
# HELP SECTION (WordPress only)
# -------------------------------------------------------------------
dchelp_wordpress() {
  cat <<'EOF'
###### WORDPRESS #####
dcwplogs | dcwplog   # follow wordpress logs
dcwpup / dcwpdown    # start/stop wordpress only
dcwp ARGS...         # run wp-cli (e.g. dcwp plugin list)
dcwpcachflush        # flush wp cache (object + /wp-content/cache)
dcwpcliup / dcwpclidown
dcwplsmedia [subdir] # list MEDIA inside wordpress container
dcwpcurlmedia [path] # HEAD request to WP media URL
dcwpfixroutes        # fix home/siteurl, permalinks, flush rewrites
dcwpcheck_leftovers <plugin-slug>
dcwproutediagnose [slug [cpt [post_name]]]
dcwproute /slug/path

###### CONTENT INSPECTION #####
dcwplistpages [filter]
dcwplistposts [filter]
dcwplistrecent [N]
dcwpfind "keyword"
dcwpid ID
dcwplistmenus
dcwpmenuitems <menu>
dcwpmenu_locations
dcwpcount

########
# check in case env reset
########
dcwpsanity
dcwpfix_theme
############################################################################
## clone wordpress style from source (usually dev) to target (usually) prod :
############################################################################
0) on source wordpress:
export theme ZIP from Site Editor
1) log on target server, to reset DB overrides and theme files into target environment (prod)
source scripts/alias.sh <target env>
# 2) switch away (keeps site stable while you remove the theme folder)
dcwp theme activate twentytwentyfive
# 3) reset DB overrides + remove old theme folder
dcwpthemereset beelab-theme
# 4) 2 possibilities
# 4-1 - install new theme files
dcwpthemeinstall ./path/to/beelab-theme.zip beelab-theme
# 4-2 - per wordpress admin interface : menu theme
add new theme (export made in 0)
# 5) activate your theme again
dcwp theme activate beelab-theme
# 6) flush
dcwpcachflush

dcwpfixcloneurls
#   dcwpfixcloneurls prod2dev
#   dcwpfixcloneurls dev2prod
# or:
#   dcwpfixcloneurls "https://beelab-wp.nathabee.de" "http://localhost:9082"

############################################################################
## clone wordpress and uploads environement (usually from prod into dev)
############################################################################
source scripts/alias.sh prod
dcup
dcwpdbdump ./_exports/wp-db/prod.sql
dcwpuploadszip ./_exports/wp-files/prod_uploads.tgz

source scripts/alias.sh dev
dcup
dcwpdbrestore ./_exports/wp-db/prod.sql
dcwpuploadsunzip ./_exports/wp-files/prod_uploads.tgz --wipe

# Fix URLs if needed
dcwp search-replace "https://beelab-wp.nathabee.de" "http://localhost:9082" --all-tables --precise
dcwp rewrite flush --hard
dcwpcachflush

# this help :
dchelp_wordpress
EOF
}
