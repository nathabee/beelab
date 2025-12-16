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
  if [[ -z "$(dc ps -q "$BEELAB_WPCLI_SVC")" ]]; then
    dc up -d "$BEELAB_WPCLI_SVC"
  fi
}

# -------------------------------------------------------------------
# WORDPRESS
# -------------------------------------------------------------------
dcwplogs()   { dclogs "$BEELAB_WP_SVC" "$@"; }
dcwplog()    { dcwplogs "$@"; }
dcwpup()     { dc up -d "$BEELAB_WP_SVC"; }
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

dcwp() {
  _beelab_ensure_wpcli
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi
  dc exec $tty_flags "$BEELAB_WPCLI_SVC" wp "$@"
}

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
  [[ -z "$out" ]] && { echo "Usage: dcwpdbdump /path/to/out.sql"; return 1; }

  local dir; dir="$(dirname "$out")"
  mkdir -p "$dir"

  local svc; svc="$(_beelab_wpdb_svc)"
  echo "== dumping WordPress DB (env=$BEELAB_ENV svc=$svc) -> $out =="

  dc exec -T "$svc" bash -lc '
set -euo pipefail
mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"
' > "$out"

  echo "DB dump written: $out"
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
GRANT ALL PRIVILEGES ON \`$MARIADB_DATABASE\`.* TO \`$MARIADB_USER\`@%\`;
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
  [[ -z "$out" ]] && { echo "Usage: dcwpuploadszip /path/to/uploads.tgz"; return 1; }

  local dir; dir="$(dirname "$out")"
  mkdir -p "$dir"

  _beelab_ensure_wpcli
  echo "== zipping uploads (env=$BEELAB_ENV) -> $out =="

  dc exec -T "$BEELAB_WPCLI_SVC" bash -lc '
set -euo pipefail
cd /var/www/html/wp-content
test -d uploads || { echo "uploads/ not found"; exit 1; }
tar -czf /tmp/uploads.tgz uploads
'

  dc cp "${BEELAB_WPCLI_SVC}:/tmp/uploads.tgz" "$out"
  echo "uploads archive written: $out"
}

dcwpuploadsunzip() {
  local in="${1:-}"
  local mode="${2:---keep}"

  [[ -z "$in" ]] && { echo "Usage: dcwpuploadsunzip /path/to/uploads.tgz [--wipe|--keep]"; return 1; }
  [[ ! -f "$in" ]] && { echo "archive not found: $in"; return 1; }

  _beelab_ensure_wpcli
  echo "== restoring uploads (env=$BEELAB_ENV) from $in (mode=$mode) =="

  dc cp "$in" "${BEELAB_WPCLI_SVC}:/tmp/uploads.tgz"

  dc exec -T "$BEELAB_WPCLI_SVC" bash -lc "
set -euo pipefail
cd /var/www/html/wp-content
if [[ '$mode' == '--wipe' ]]; then
  echo 'Wiping existing uploads/...'
  rm -rf uploads
fi
tar -xzf /tmp/uploads.tgz
chown -R www-data:www-data uploads || true
"

  echo "uploads restored from: $in"
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
