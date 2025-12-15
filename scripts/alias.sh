# scripts/alias.sh
# Usage:  source scripts/alias.sh [dev|prod]
# Then:   dcdjango python manage.py changepassword pomofarmer
# Also:   dcup / dcdown / dcps / dclogs / dcexec
#         dcdjpwd USER [NEWPWD]
#         dcdjlogs | dcwplogs | dcweblogs
#         dcdjup|dcdjdown  dcwpup|dcwpdown  dcwebup|dcwebdown

# must be sourced
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  echo "This file must be sourced, not executed. Use: source scripts/alias.sh [dev|prod]"
  exit 1
fi

# repo root (works no matter where you source from)
_BEELAB_ROOT="$(cd -- "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# -------------------------------------------------------------------
# ENVIRONMENT
# -------------------------------------------------------------------
_beelab_set_env() {
  local env="${1:-dev}"
  case "$env" in
    dev|prod) ;;
    *) echo "env must be 'dev' or 'prod'"; return 1 ;;
  esac

  export BEELAB_ENV="$env"
  export BEELAB_PROJECT="beelab_${env}"
  export BEELAB_ENV_FILE=".env.${env}"
  export BEELAB_PROFILE="$env"

  if [[ "$env" == "prod" ]]; then
    export BEELAB_DJANGO_SVC="django-prod"
    export BEELAB_WP_SVC="wordpress-prod"
    export BEELAB_WEB_SVC="web-prod"
    export BEELAB_WPCLI_SVC="wpcli-prod"
  else
    export BEELAB_DJANGO_SVC="django"
    export BEELAB_WP_SVC="wordpress"
    export BEELAB_WEB_SVC="web"
    export BEELAB_WPCLI_SVC="wpcli"
  fi
}

# initialize with arg or default dev
_beelab_set_env "${1:-dev}"

# switch env in the same shell after sourcing: blenv dev|prod
blenv() { _beelab_set_env "$1" && echo "beelab env → $BEELAB_ENV"; }

# -------------------------------------------------------------------
# DOCKER COMPOSE WRAPPERS
# -------------------------------------------------------------------
dc() {
  ( cd "$_BEELAB_ROOT" && \
    docker compose \
      -p "$BEELAB_PROJECT" \
      --env-file "$BEELAB_ENV_FILE" \
      --profile "$BEELAB_PROFILE" \
      "$@" )
}
dcup()   { dc up -d "$@"; }
dcdown() { dc down --remove-orphans "$@"; }
dcstop() { dc stop "$@"; }
dcps()   { dc ps "$@"; }
dclogs() { dc logs -f "$@"; }
dcbuild(){ dc build "$@"; }

# generic exec: dcexec SERVICE [cmd...]
dcexec() {
  local svc="${1:-}"; shift || true
  [[ -z "$svc" ]] && { echo "Usage: dcexec SERVICE [cmd]"; return 1; }
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi
  dc exec $tty_flags "$svc" "$@"
}

# -------------------------------------------------------------------
# SERVICE HELPERS
# -------------------------------------------------------------------
_beelab_ensure_wpcli() {
  if [[ -z "$(dc ps -q "$BEELAB_WPCLI_SVC")" ]]; then
    dc up -d "$BEELAB_WPCLI_SVC"
  fi
}
_beelab_ensure_django() {
  if [[ -z "$(dc ps -q "$BEELAB_DJANGO_SVC")" ]]; then
    echo "Starting $BEELAB_DJANGO_SVC..."
    dc up -d "$BEELAB_DJANGO_SVC"
    sleep 1
  fi
}

# -------------------------------------------------------------------
# DJANGO
# -------------------------------------------------------------------
dcdjango() {
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi
  dc exec $tty_flags "$BEELAB_DJANGO_SVC" "$@"
}
dcdjlogs()   { dclogs "$BEELAB_DJANGO_SVC" "$@"; }
dcdjup()     { dc up -d "$BEELAB_DJANGO_SVC"; }
dcdjdown()   { dc stop  "$BEELAB_DJANGO_SVC"; }
dcdjlsmedia(){ dcexec "$BEELAB_DJANGO_SVC" bash -lc "ls -lAh --group-directories-first /app/media/${1:-}"; }

# Change Django password for a user:
# - Interactive:  dcdjpwd alice
# - Non-interactive: dcdjpwd alice "NewPass123!"
dcdjpwd() {
  local user="${1:-}"; local pwd="${2:-}"
  if [[ -z "$user" ]]; then echo "Usage: dcdjpwd USER [NEW_PASSWORD]"; return 1; fi
  if [[ -z "$pwd" ]]; then
    dcdjango python manage.py changepassword "$user"
  else
    local esc_user esc_pwd
    esc_user=$(printf "%q" "$user")
    esc_pwd=$(printf "%q" "$pwd")
    dcdjango bash -lc "
U=$esc_user P=$esc_pwd python - <<'PY'
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
u = User.objects.get(username=os.environ['U'])
u.set_password(os.environ['P'])
u.save()
print('Password updated for', u.username)
PY"
  fi
}

# Demo utilities
dcdjshow_demos() {
  dcdjango bash -lc '
python - <<PY
import django, os
os.environ.setdefault("DJANGO_SETTINGS_MODULE","config.settings")
django.setup()
from django.utils import timezone
from UserCore.models import DemoAccount
now = timezone.now()
total = DemoAccount.objects.count()
active = DemoAccount.objects.filter(active=True).count()
expired = DemoAccount.objects.filter(expires_at__lte=now).count()
print(f"DemoAccounts -> total={total} active={active} expired={expired}")
for da in DemoAccount.objects.select_related("user").order_by("expires_at")[:10]:
    print(f"- {da.user.username:20} active={da.active} expires_at={da.expires_at.isoformat()}")
PY'
}
dcdjexpire_demo_all() {
  local flag="${1:-}"
  dcdjango bash -lc "
python - <<'PY'
import django, os
from datetime import timedelta
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
django.setup()
from django.utils import timezone
from UserCore.models import DemoAccount
now = timezone.now()
qs = DemoAccount.objects.all()
updated = qs.update(expires_at=now - timedelta(seconds=1))
print('Set expires_at to past for', updated, 'DemoAccount(s).')
if '${flag}' == '--deactivate':
    deact = qs.update(active=False)
    print('Also deactivated', deact, 'DemoAccount(s).')
PY"
}
dcdjexpire_demo_user() {
  local user="${1:-}"; local flag="${2:-}"
  if [[ -z "$user" ]]; then echo "Usage: dcdjexpire_demo_user USERNAME [--deactivate]"; return 1; fi
  dcdjango bash -lc "
U='$user'
python - <<'PY'
import django, os
from datetime import timedelta
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
django.setup()
from django.utils import timezone
from django.contrib.auth import get_user_model
from UserCore.models import DemoAccount
User = get_user_model()
try:
    u = User.objects.get(username=os.environ['U'])
except User.DoesNotExist:
    print('No such user:', os.environ['U']); raise SystemExit(1)
try:
    da = u.demo_account
except DemoAccount.DoesNotExist:
    print('User has no DemoAccount:', u.username); raise SystemExit(1)
da.expires_at = timezone.now() - timedelta(seconds=1)
print('Expired demo for', u.username)
if '${flag}' == '--deactivate':
    da.active = False
    print('Deactivated demo for', u.username)
da.save(update_fields=['expires_at','active'])
PY"
}
dcdjcleanup_demos() { dcdjango python manage.py cleanup_demo; }



dcdjsuperuser() { 
dcdjango python manage.py createsuperuser; }

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
        echo "❌ Option still exists: $k = $(wp ${url:+--url="$url"} option get "$k" 2>/dev/null)"
      else
        echo "✅ Option removed: $k"
      fi
    done
  fi
  if [[ -n "$cpt" ]]; then
    local cnt
    cnt=$(wp ${url:+--url="$url"} post list --post_type="$cpt" --post_status=any --format=count 2>/dev/null || echo 0)
    if [[ "$cnt" -gt 0 ]]; then
      echo "❌ $cpt posts remaining: $cnt"
      wp ${url:+--url="$url"} post list --post_type="$cpt" --post_status=any --fields=ID,post_status,post_title --posts_per_page=10 2>/dev/null || true
    else
      echo "✅ No $cpt posts remain"
    fi
  fi
  if ((${#roles[@]})); then
    for r in "${roles[@]}"; do
      if wp ${url:+--url="$url"} role exists "$r" >/dev/null 2>&1; then
        echo "❌ Role still exists: $r"
      else
        echo "✅ Role removed: $r"
      fi
    done
  fi
  if ((${#crons[@]})); then
    for h in "${crons[@]}"; do
      if wp ${url:+--url="$url"} cron event list | grep -qE "^\s*$h\b"; then
        echo "❌ Cron hook still scheduled: $h"
      else
        echo "✅ Cron hook not found: $h"
      fi
    done
  fi
  if [[ -n "$transients_pattern" ]]; then
    if wp ${url:+--url="$url"} cli has-command transient >/dev/null 2>&1; then
      local n
      n=$(wp ${url:+--url="$url"} transient list --search="$transients_pattern" --format=count 2>/dev/null || echo 0)
      [[ "$n" -gt 0 ]] && echo "❌ Transients matching $transients_pattern: $n" || echo "✅ No transients matching $transients_pattern"
    else
      local n
      n=$(wp ${url:+--url="$url"} db query --skip-column-names --quick \
        "SELECT COUNT(*) FROM $(wp ${url:+--url="$url"} db prefix --quiet)options WHERE option_name REGEXP '${transients_pattern}'" 2>/dev/null || echo 0)
      [[ "$n" -gt 0 ]] && echo "❌ Options matching $transients_pattern: $n" || echo "✅ No options matching $transients_pattern"
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
echo "========================"; echo "🌐 Site basics"; echo "========================"
echo -n "home: "; wp option get home
echo -n "siteurl: "; wp option get siteurl
echo -n "permalinks: "; wp option get permalink_structure
echo; echo "========================"; echo "🔌 Active plugins"; echo "========================"
wp plugin list --status=active --field=name | sed "s/^/- /"
echo; echo "========================"; echo "🧱 Post type + content checks"; echo "========================"
if wp cli has-command "post-type"; then
  if wp post-type list --field=name | grep -qx "$cpt"; then echo "✅ CPT registered: $cpt"; else echo "❌ CPT NOT registered: $cpt"; fi
fi
echo -n "CPT post count ($cpt): "; wp post list --post_type="$cpt" --post_status=any --format=count || true
echo "First few:"; wp post list --post_type="$cpt" --post_status=any --fields=ID,post_status,post_name,post_title --posts_per_page=5 || true
echo; echo "========================"; echo "🧭 Slug collisions"; echo "========================"
wp db query --skip-column-names --quick "
SELECT ID, post_type, post_status, post_name, post_title
FROM $(wp db prefix --quiet)posts
WHERE post_name = '${name}'
ORDER BY FIELD(post_type, '${cpt}','page','post') DESC, ID ASC
LIMIT 10"
echo; echo "========================"; echo "🔁 Rewrite rules containing /$slug"; echo "========================"
wp rewrite list | awk -v s="^'"$slug"'(/|$)" '\''$0 ~ s {print} '\'' || true
echo; echo "========================"; echo "❓ Public query var?"; echo "========================"
wp eval "
global \$wp; \$vars = \$wp->public_query_vars;
echo in_array(\"${cpt}\", \$vars, true) ? \"✅ query var '${cpt}' is public\n\" : \"ℹ️ query var '${cpt}' is NOT a public query var\n\";"
echo; echo "========================"; echo "🧰 Hard flush"; echo "========================"
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

# Resets the DB overrides for templates/parts/styles + flushes cache/rewrite.
# we do that before deploying a theme

dcwpthemeresetdb() {
  _beelab_ensure_wpcli
  local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi

  dc exec $tty_flags "$BEELAB_WPCLI_SVC" bash -lc '
set -euo pipefail
echo "== Active theme =="
wp theme list --status=active

echo "== Deleting FSE DB overrides (templates/parts/styles) =="
wp post delete $(wp post list --post_type=wp_template --field=ID 2>/dev/null || true) --force 2>/dev/null || true
wp post delete $(wp post list --post_type=wp_template_part --field=ID 2>/dev/null || true) --force 2>/dev/null || true
wp post delete $(wp post list --post_type=wp_global_styles --field=ID 2>/dev/null || true) --force 2>/dev/null || true

echo "== Flush cache + rewrites =="
wp cache flush || true
rm -rf /var/www/html/wp-content/cache/* || true
wp rewrite flush --hard || true

echo "✅ Theme DB overrides reset (env='"$BEELAB_ENV"')."
'
}

#dcwpthemeresetinstallzip <zip-on-host> [theme-dirname]
#Copies a ZIP from host → container, unzips into themes as www-data, optional ownership fix.

dcwpthemeresetinstallzip() {
  local zip_path="${1:-}"
  local theme_dir="${2:-beelab-theme}"

  if [[ -z "$zip_path" ]]; then
    echo "Usage: dcwpthemeresetinstallzip /absolute/or/relative/path/to/theme.zip [theme-dirname]"
    return 1
  fi
  if [[ ! -f "$zip_path" ]]; then
    echo "❌ ZIP not found: $zip_path"
    return 1
  fi

  _beelab_ensure_wpcli

  echo "== Copy ZIP into $BEELAB_WPCLI_SVC =="
  dc cp "$zip_path" "${BEELAB_WPCLI_SVC}:/tmp/theme.zip"

  echo "== Unzip as www-data into /var/www/html/wp-content/themes =="
  dc exec -T -u www-data "$BEELAB_WPCLI_SVC" bash -lc '
set -euo pipefail
cd /var/www/html/wp-content/themes
unzip -o /tmp/theme.zip
'

  echo "== Ensure ownership (best-effort) =="
  dc exec -T "$BEELAB_WPCLI_SVC" bash -lc "
chown -R www-data:www-data /var/www/html/wp-content/themes/${theme_dir} 2>/dev/null || true
"

  dcwpcachflush
  echo "✅ Installed theme ZIP into container (env=$BEELAB_ENV)."
}


# -------------------------------------------------------------------
# WORDPRESS — DB + uploads dump/restore (env-agnostic)
# -------------------------------------------------------------------

# internal: pick the right WP DB service name for current env
_beelab_wpdb_svc() {
  if [[ "${BEELAB_ENV:-dev}" == "prod" ]]; then
    echo "wpdb-prod"
  else
    echo "wpdb"
  fi
}

# Dump the current env WordPress MariaDB to a SQL file on the host
# Usage: dcwpdbdump ./_exports/wp-db/wordpress.sql
dcwpdbdump() {
  local out="${1:-}"
  [[ -z "$out" ]] && { echo "Usage: dcwpdbdump /path/to/out.sql"; return 1; }

  local dir; dir="$(dirname "$out")"
  mkdir -p "$dir"

  local svc; svc="$(_beelab_wpdb_svc)"
  echo "== dumping WordPress DB (env=$BEELAB_ENV svc=$svc) -> $out =="

  # Use mariadb-dump from inside the DB container; write to host via stdout redirect
  dc exec -T "$svc" bash -lc '
set -euo pipefail
mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"
' > "$out"

  echo "✅ DB dump written: $out"
}

# Restore a SQL dump into the current env WordPress MariaDB (DESTRUCTIVE)
# Drops + recreates the database, then imports.
# Usage: dcwpdbrestore ./_exports/wp-db/wordpress.sql
dcwpdbrestore() {
  local in="${1:-}"
  [[ -z "$in" ]] && { echo "Usage: dcwpdbrestore /path/to/in.sql"; return 1; }
  [[ ! -f "$in" ]] && { echo "❌ SQL file not found: $in"; return 1; }

  local svc; svc="$(_beelab_wpdb_svc)"
  echo "== restoring WordPress DB (env=$BEELAB_ENV svc=$svc) from $in =="
  echo "⚠️  This will DROP and recreate the WordPress database in this env."

  # Drop + recreate DB (keep user grants sane)
  dc exec -T "$svc" bash -lc '
set -euo pipefail
mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" -e "
DROP DATABASE IF EXISTS \`$MARIADB_DATABASE\`;
CREATE DATABASE \`$MARIADB_DATABASE\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON \`$MARIADB_DATABASE\`.* TO \`$MARIADB_USER\`@%\`;
FLUSH PRIVILEGES;
"
'

  # Import SQL from host into container stdin
  dc exec -T "$svc" bash -lc '
set -euo pipefail
mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"
' < "$in"

  echo "✅ DB restored from: $in"
}

# Zip uploads directory from current env WP volume to a tgz on the host
# Usage: dcwpuploadszip ./_exports/wp-files/uploads.tgz
dcwpuploadszip() {
  local out="${1:-}"
  [[ -z "$out" ]] && { echo "Usage: dcwpuploadszip /path/to/uploads.tgz"; return 1; }

  local dir; dir="$(dirname "$out")"
  mkdir -p "$dir"

  _beelab_ensure_wpcli
  echo "== zipping uploads (env=$BEELAB_ENV) -> $out =="

  # Create archive inside wpcli container, then copy out
  dc exec -T "$BEELAB_WPCLI_SVC" bash -lc '
set -euo pipefail
cd /var/www/html/wp-content
test -d uploads || { echo "❌ uploads/ not found"; exit 1; }
tar -czf /tmp/uploads.tgz uploads
'

  dc cp "${BEELAB_WPCLI_SVC}:/tmp/uploads.tgz" "$out"
  echo "✅ uploads archive written: $out"
}

# Restore uploads tgz into current env WP volume (DESTRUCTIVE-ish if you wipe first)
# Usage: dcwpuploadsunzip ./_exports/wp-files/uploads.tgz [--wipe]
dcwpuploadsunzip() {
  local in="${1:-}"
  local mode="${2:---keep}"

  [[ -z "$in" ]] && { echo "Usage: dcwpuploadsunzip /path/to/uploads.tgz [--wipe|--keep]"; return 1; }
  [[ ! -f "$in" ]] && { echo "❌ archive not found: $in"; return 1; }

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

  echo "✅ uploads restored from: $in"
}


# -------------------------------------------------------------------
# WEB
# -------------------------------------------------------------------
dcweblogs() { dclogs "$BEELAB_WEB_SVC" "$@"; }
dcwebup()   { dc up -d "$BEELAB_WEB_SVC"; }
dcwebdown() { dc stop  "$BEELAB_WEB_SVC"; }

# -------------------------------------------------------------------
# LOGS (host json-file driver + in-container files)
# -------------------------------------------------------------------
_dc_container_ids() {
  if [[ $# -gt 0 ]]; then
    for svc in "$@"; do dc ps -q "$svc"; done | awk 'NF'
  else
    dc ps -q
  fi
}
dclogspath() {
  local cids; cids=$(_dc_container_ids "$@")
  [[ -z "$cids" ]] && { echo "No containers found."; return 0; }
  while read -r cid; do
    [[ -z "$cid" ]] && continue
    docker inspect --format='{{.Name}} {{.LogPath}}' "$cid" 2>/dev/null
  done <<< "$cids"
}
dclogsize() {
  local cids; cids=$(_dc_container_ids "$@")
  [[ -z "$cids" ]] && { echo "No containers found."; return 0; }
  while read -r cid; do
    [[ -z "$cid" ]] && continue
    local name path
    name=$(docker inspect --format='{{.Name}}' "$cid" | sed 's#^/##')
    path=$(docker inspect --format='{{.LogPath}}' "$cid" 2>/dev/null)
    if [[ -n "$path" && -e "$path" ]]; then
      du -h "$path" | awk -v n="$name" '{print "• " n ": " $1 "  " $2}'
    else
      echo "• $name: (no log path)"
    fi
  done <<< "$cids"
}
dclogzero() {
  local cids; cids=$(_dc_container_ids "$@")
  [[ -z "$cids" ]] && { echo "No containers found."; return 0; }
  local ok=0 fail=0
  while read -r cid; do
    [[ -z "$cid" ]] && continue
    local name path
    name=$(docker inspect --format='{{.Name}}' "$cid" | sed 's#^/##')
    path=$(docker inspect --format='{{.LogPath}}' "$cid" 2>/dev/null)
    if [[ -z "$path" ]]; then
      echo "⚠️  $name: no log path (driver?)"; ((fail++)); continue
    fi
    if truncate -s 0 "$path" 2>/dev/null || : > "$path" 2>/dev/null; then
      echo "✅ $name: truncated $path"; ((ok++))
    elif command -v sudo >/dev/null 2>&1 && sudo sh -lc ": > '$path'"; then
      echo "✅ $name: truncated with sudo $path"; ((ok++))
    else
      echo "❌ $name: cannot truncate $path (need permissions?)"; ((fail++))
    fi
  done <<< "$cids"
  echo "Done. success=$ok fail=$fail"
}
# zero *file logs inside* a service container (paths you pass)
# Usage: dclogzero_in SERVICE /path/to/log [/path2 ...]
dclogzero_in() {
  local svc="${1:-}"; shift || true
  [[ -z "$svc" || $# -lt 1 ]] && { echo "Usage: dclogzero_in SERVICE /path [/path...]"; return 1; }
  local cmd="set -e; "
  for p in "$@"; do cmd+="if [[ -e '$p' ]]; then : > '$p' || true; echo 'zeroed: $p'; else echo 'missing: $p'; fi; "; done
  dcexec "$svc" bash -lc "$cmd"
}

# -------------------------------------------------------------------
# TEST STACK (pytest)
# -------------------------------------------------------------------
dt() {
  ( cd "$_BEELAB_ROOT" && \
    docker compose \
      -p "beelab_test" \
      --env-file "$BEELAB_ENV_FILE" \
      --profile "test" \
      "$@" )
}
dtup()    { dt up -d "$@"; }
dtdown()  { dt down --remove-orphans "$@"; }
dtstop()  { dt stop "$@"; }
dtps()    { dt ps "$@"; }
dtlogs()  { dt logs -f "$@"; }
dtbuild() { dt build "$@"; }
dtexec()  { local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi; dt exec $tty_flags "${1:?SERVICE}" "${@:2}"; }
dtdjango(){ local tty_flags; if [[ -t 0 && -t 1 ]]; then tty_flags="-it"; else tty_flags="-T"; fi; dt exec $tty_flags django-tests "$@"; }
dttest()  { dt run --rm django-tests pytest -q "$@"; }
dttestcov(){
  dt run --rm django-tests \
    pytest --cov=UserCore --cov=CompetenceCore --cov=PomoloBeeCore \
    --cov-report=term-missing \
    --cov-report=html:/app/media/test-coverage/user \
    --junitxml=/app/media/test-reports/junit_user.xml \
    -o cache_dir=/app/media/.pytest_cache -q "$@"
}
dttestfile(){ local t="${1:-}"; shift || true; [[ -z "$t" ]] && { echo "Usage: dttestfile path/to/test.py[::node]"; return 1; }; dt run --rm django-tests pytest -q "$t" "$@"; }
dttestk()  { local k="${1:-}"; shift || true; [[ -z "$k" ]] && { echo "Usage: dttestk 'pattern'"; return 1; }; dt run --rm django-tests pytest -q -k "$k" "$@"; }
dttest_usercore(){
  dt run --rm django-tests pytest -q --ignore=PomoloBeeCore --ignore=CompetenceCore --cov=UserCore "$@"
}
dttestcov_usercore(){
  dt run --rm django-tests \
    pytest -q UserCore/tests \
    --cov=UserCore \
    --cov-report=term-missing \
    --cov-report=html:/app/media/test-coverage/user \
    --junitxml=/app/media/test-reports/junit_user.xml \
    -o cache_dir=/app/media/.pytest_cache "$@"
}

# -------------------------------------------------------------------
# SEEDING
# -------------------------------------------------------------------
dcdjseed_pomolobee() {
  _beelab_ensure_django
  dcdjango python manage.py seed_pomolobee --mode copy --clear
  dcdjango python manage.py loaddata PomoloBeeCore/fixtures/initial_groups.json
  dcdjango python manage.py loaddata PomoloBeeCore/fixtures/initial_superuser.json
  dcdjango python manage.py loaddata PomoloBeeCore/fixtures/initial_farms.json
  dcdjango python manage.py loaddata PomoloBeeCore/fixtures/initial_fields.json
  dcdjango python manage.py loaddata PomoloBeeCore/fixtures/initial_fruits.json
  dcdjango python manage.py loaddata PomoloBeeCore/fixtures/initial_rows.json
}
dcdjseed_competence() {
  _beelab_ensure_django
  dcdjango python manage.py seed_competence --mode copy --clear
  dcdjango python manage.py populate_data_init
  dcdjango python manage.py create_groups_and_permissions
  dcdjango python manage.py populate_demo 
}
dcdjseed_beefont() { 
  _beelab_ensure_django

  # KEINE MigrationRecorder-Manipulation mehr
  # KEIN makemigrations / migrate mehr hier

  # ggf. eigene Seed-Command
  dcdjango python manage.py seed_beefont --mode copy --clear || true

  # Fixtures laden
  dcdjango python manage.py loaddata BeeFontCore/fixtures/initial_beefont_languages.json
  dcdjango python manage.py loaddata BeeFontCore/fixtures/initial_beefont_templates.json
  dcdjango python manage.py loaddata BeeFontCore/fixtures/initial_beefont_palettes.json
}
 
dcdjseed_all() { dcdjseed_pomolobee && dcdjseed_competence && dcdjseed_beefont; }

# DEV RESET / RESEED HELPERS
dcdjmm() {
  echo "🛠 django makemigrations/migrate (env=$BEELAB_ENV)"
  if [[ "$BEELAB_ENV" == "dev" ]]; then
  
    dcdjango python manage.py makemigrations --noinput || true
  else
    echo "ℹ️ skipping makemigrations (not dev)"
  fi
  dcdjango python manage.py migrate --noinput
}
__beelab_loaddata_all_json_in_core() {
  local core="${1:-}"
  local dir="${core}/fixtures"
  if [[ -d "$dir" ]]; then
    echo "📥 Loading fixtures from $dir ..."
    local f; for f in "$dir"/*.json; do
      [[ -f "$f" ]] || continue
      echo "  -> loaddata $f"
      dcdjango python manage.py loaddata "$f" || true
    done
  else
    echo "ℹ️ No fixtures dir: $dir"
  fi
}
dcdjreseed() {
  local mode="soft" args=()
  while (( "$#" )); do
    case "$1" in
      --soft|--flush|--hard) mode="${1#--}"; shift ;;
      -h|--help)
        cat <<'EOF'
Usage: dcdjreseed [--soft|--flush|--hard] [Core ...]
Cores: CompetenceCore PomolobeeCore UserCore (default: all)
--soft  : migrate, then seed
--flush : migrate, flush DB, then seed
--hard  : dc down -v (drop DB), dc up, migrate, then seed
EOF
        return 0;;
      *) args+=("$1"); shift ;;
    esac
  done
  local cores=()
  if ((${#args[@]}==0)); then
    cores=("CompetenceCore" "PomoloBeeCore" "UserCore")
  else
    for c in "${args[@]}"; do
      case "${c,,}" in
        competencecore|competence) cores+=("CompetenceCore");;
        pomolobeecore|pomolobee)   cores+=("PomoloBeeCore");;
        usercore|user)             cores+=("UserCore");;
        beefontcore|beefont)             cores+=("BeeFontCore");;
        *) echo "⚠️ Unknown core: $c (skipping)";;
      esac
    done
  fi

  echo "🔁 dcdjreseed mode=$mode cores=${cores[*]}"
  if [[ "$mode" == "hard" ]]; then
    echo "💣 Bringing stack down and dropping volumes..."
    dcdown -v
    echo "🚀 Bringing stack up..."
    dcup -d
  fi

  _beelab_ensure_django
  dcdjmm

  if [[ "$mode" == "flush" ]]; then
    echo "🧹 Flushing DB ..."
    dcdjango python manage.py flush --no-input
  fi


  for c in "${cores[@]}"; do
    case "$c" in
      CompetenceCore) echo "🌱 Seeding CompetenceCore ..."; dcdjseed_competence ;;
      PomoloBeeCore)  echo "🌱 Seeding PomoloBeeCore ...";  dcdjseed_pomolobee ;;
      BeeFontCore)  echo "🌱 Seeding BeeFontCore ...";  dcdjseed_beefont ;;
      UserCore)       echo "🌱 Seeding UserCore fixtures ..."; __beelab_loaddata_all_json_in_core "UserCore" ;;
    esac
  done

  echo "🧺 collectstatic (best-effort) ..."
  dcdjango python manage.py collectstatic --noinput || true
  echo "✅ reseed finished. (mode=$mode cores=${cores[*]})"
}

# -------------------------------------------------------------------
# BeeFont aliases (externalised)
# -------------------------------------------------------------------
if [[ -f "$_BEELAB_ROOT/scripts/alias_beefont.sh" ]]; then
  # shellcheck source=/dev/null
  source "$_BEELAB_ROOT/scripts/alias_beefont.sh"
fi

 
# -------------------------------------------------------------------
# HELP
# -------------------------------------------------------------------
dchelp() {
  cat <<'EOF'
###### MISC ##########
blenv dev|prod       # switch env in this shell (updates compose flags)

###### DOCKER ########
dcup                 # start current env stack
dcbuild              # build images (optionally: dcbuild web django)
dcdown               # stop stack (remove orphans)
dcstop SERVICE       # stop one service
dcps                 # docker compose ps
dclogs [SERVICE]     # follow logs for the whole stack or a service
dcexec SERVICE CMD   # exec inside a service (tty-aware)

###### LOGS ##########
dclogspath [SVC...]      # show docker log file paths
dclogsize  [SVC...]      # show docker log file sizes
dclogzero  [SVC...]      # truncate docker JSON logs (all if no SVC)
dclogzero_in SVC /path   # zero file logs inside container

###### DJANGO ########
dcdjango CMD...      # run manage.py, shell, etc.
dcdjlogs             # follow django logs
dcdjup / dcdjdown    # start/stop django only
dcdjpwd USER [NEW]   # change password (interactive if NEW omitted)
dcdjlsmedia [subdir] # list MEDIA inside django container
dcdjshow_demos       # list DemoAccount summary
dcdjexpire_demo_user USER [--deactivate]
dcdjexpire_demo_all [--deactivate]
dcdjcleanup_demos    # run the cleaner NOW
dcdjsuperuser        # create a superuser

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

## clone wordpress style from dev to prod :
0) go in wordpress site editor, select a template in ..., tools- export => create a ZIP
1) reset DB overrides in prod
dcwpthemeresetdb
2) install the theme ZIP from 0) into prod containers
dcwpthemeresetinstallzip /path/to/beelab-theme.zip beelab-theme

## clone prod in dev  
# 1) Dump prod
source scripts/alias.sh prod
dcup
dcwpdbdump ./_exports/wp-db/prod.sql
dcwpuploadszip ./_exports/wp-files/prod_uploads.tgz

# 2) Restore into dev
source scripts/alias.sh dev
dcup
dcwpdbrestore ./_exports/wp-db/prod.sql
dcwpuploadsunzip ./_exports/wp-files/prod_uploads.tgz --wipe

# 3) Fix URLs in dev content if needed
dcwp search-replace "https://beelab-wp.nathabee.de" "http://localhost:9082" --all-tables --precise
dcwp rewrite flush --hard
dcwpcachflush



###### WEB (Next.js) ##
dcweblogs            # follow web logs
dcwebup / dcwebdown  # start/stop web only

###### SEED / RESET ###
dcdjseed_pomolobee   # seed pomolobee core (media + fixtures)
dcdjseed_competence  # seed competence core (media + commands)

dcdjseed_beefont  # seed beefont core (media + fixtures)
dcdjseed_all         # seed both cores
dcdjmm               # makemigrations (dev) + migrate
dcdjreseed [mode] [cores]
  modes: --soft (default), --flush, --hard
  cores: CompetenceCore PomolobeeCore UserCore (default: all)
  examples:
    dcdjreseed --flush CompetenceCore
    dcdjreseed --hard
    dcdjreseed PomoloBeeCore UserCore
    # force reseed 
    dcdjreseed --hard user beefont pomolobee competence

###### TESTS (dev only) ####
dtup / dtdown        # start/stop test stack
dtps / dtlogs        # ps / logs (test stack)
dtbuild              # build (test profile)
dtexec SERVICE CMD   # exec (test)
dtdjango CMD...      # manage.py in django-tests container
dttest [args]        # run full pytest suite
dttestcov [args]     # with coverage (UserCore/CompetenceCore/PomoloBeeCore)
dttestfile path[..]  # run specific file/node
dttestk 'expr'       # run tests matching -k expression
dttest_usercore      # run only UserCore tests
dttestcov_usercore   # run UserCore tests with coverage
# --- BeeFont integration (Django ↔ REST ↔ WP simulation) ---
beefonthelp         # help for BeeFont tests
EOF
}

echo "beelab aliases loaded → env=$BEELAB_ENV project=$BEELAB_PROJECT profile=$BEELAB_PROFILE"
echo "try:"
dchelp
